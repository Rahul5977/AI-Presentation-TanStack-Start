import amqplib from 'amqplib'

import { classifyError } from '../../../src/server/ai/runtime'
import {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_RETRY_BASE_MS,
  queuePrefetch,
  queueRetryName,
} from '../../../src/server/queue/queues'
import { ensureQueueTopology } from '../../../src/server/queue/topology'
import { logger } from './logger'
import { prisma } from './prisma'
import { captureWorkerException } from './sentry'

let connectionPromise: Promise<amqplib.ChannelModel> | null = null
let channelPromise: Promise<amqplib.Channel> | null = null
let activeJobCount = 0
let isDraining = false

function getRabbitUrl() {
  return process.env.RABBITMQ_URL ?? 'amqp://localhost:5672'
}

function resetRabbitState() {
  // Drop cached promises so the next call re-establishes the connection/channel.
  connectionPromise = null
  channelPromise = null
}

async function getConnection() {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      const connection = await amqplib.connect(getRabbitUrl())
      // A dropped broker connection must not leave a stale cached promise, or
      // publishing/consuming breaks until process restart. Reset on error/close
      // so the next call reconnects.
      connection.on('error', (err) => {
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'RabbitMQ connection error')
      })
      connection.on('close', () => {
        if (!isDraining) logger.warn('RabbitMQ connection closed; will reconnect on next use')
        resetRabbitState()
      })
      return connection
    })().catch((err) => {
      resetRabbitState()
      throw err
    })
  }
  return await connectionPromise
}

export async function getWorkerChannel() {
  if (!channelPromise) {
    channelPromise = (async () => {
      const connection = await getConnection()
      const channel = await connection.createChannel()
      channel.prefetch(5)
      channel.on('error', (err) => {
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'RabbitMQ channel error')
      })
      channel.on('close', () => {
        channelPromise = null
      })
      await ensureQueueTopology(channel)
      return channel
    })().catch((err) => {
      channelPromise = null
      throw err
    })
  }
  return await channelPromise
}

type JobHandler<TPayload extends { attempt?: number }> = (
  payload: TPayload,
) => Promise<void>

export async function enqueueJson(
  queueName: string,
  payload: Record<string, unknown>,
  opts?: {
    delayMs?: number
    messageId?: string
    correlationId?: string
  },
) {
  const channel = await getWorkerChannel()
  const targetQueue =
    opts?.delayMs && opts.delayMs > 0 ? queueRetryName(queueName) : queueName
  channel.sendToQueue(targetQueue, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: 'application/json',
    messageId: opts?.messageId,
    correlationId: opts?.correlationId,
    timestamp: Date.now(),
    expiration: opts?.delayMs ? String(opts.delayMs) : undefined,
  })
}

export async function consumeJsonQueue<
  TPayload extends { attempt?: number; jobId?: string },
>(queueName: string, handler: JobHandler<TPayload>) {
  const channel = await getWorkerChannel()
  // Per-consumer prefetch (global=false) so each queue class gets its own limit.
  await channel.prefetch(queuePrefetch(queueName), false)

  await channel.consume(queueName, async (message) => {
    if (!message) return

    if (isDraining) {
      channel.nack(message, false, true)
      return
    }

    let payload: TPayload
    try {
      payload = JSON.parse(message.content.toString()) as TPayload
    } catch {
      channel.reject(message, false)
      return
    }

    activeJobCount += 1
    try {
      await handler(payload)
      channel.ack(message)
    } catch (error) {
      const attempt = Number(payload.attempt ?? 0)
      const nextAttempt = attempt + 1
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown worker error'

      // Honor a per-job maxAttempts override when present (falls back to the env
      // default). Terminal errors (bad input / unparseable output / budget) are
      // dead-lettered immediately rather than retried through every attempt.
      let maxAttempts = DEFAULT_MAX_ATTEMPTS
      if (payload.jobId) {
        const job = await prisma.generationJob.findUnique({
          where: { id: payload.jobId },
          select: { maxAttempts: true },
        })
        if (job?.maxAttempts && job.maxAttempts > 0) maxAttempts = job.maxAttempts
      }
      const isTerminal = classifyError(error) === 'terminal'
      const giveUp = isTerminal || nextAttempt >= maxAttempts

      if (payload.jobId) {
        await prisma.generationJob.updateMany({
          where: { id: payload.jobId },
          data: {
            attempt: nextAttempt,
            lastError: errorMessage,
            status: giveUp ? 'DEAD_LETTER' : 'PENDING',
            deadLetteredAt: giveUp ? new Date() : null,
          },
        })
      }

      if (giveUp) {
        logger.error(
          { queueName, payload, err: errorMessage, terminal: isTerminal, attempt: nextAttempt },
          isTerminal ? 'Job dead-lettered (terminal error)' : 'Job moved to dead letter',
        )
        captureWorkerException(error, {
          queueName,
          attempt: nextAttempt,
          payload,
          final: true,
          terminal: isTerminal,
        })
        channel.reject(message, false)
        return
      }

      const delayMs = DEFAULT_RETRY_BASE_MS * 2 ** attempt
      logger.warn(
        {
          queueName,
          payload,
          attempt: nextAttempt,
          delayMs,
          err: errorMessage,
        },
        'Retrying worker job',
      )
      await enqueueJson(
        queueName,
        {
          ...payload,
          attempt: nextAttempt,
        },
        {
          delayMs,
          messageId: payload.jobId,
        },
      )
      channel.ack(message)
      captureWorkerException(error, {
        queueName,
        attempt: nextAttempt,
        payload,
        final: false,
      })
    } finally {
      activeJobCount = Math.max(0, activeJobCount - 1)
    }
  })
}

export async function beginWorkerDrain(timeoutMs = 30_000) {
  isDraining = true
  const startedAt = Date.now()
  while (activeJobCount > 0 && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

export async function closeWorkerRabbit() {
  if (channelPromise) {
    const channel = await channelPromise
    await channel.close()
    channelPromise = null
  }

  if (connectionPromise) {
    const connection = await connectionPromise
    await connection.close()
    connectionPromise = null
  }
}
