import amqplib from 'amqplib'

import { DEFAULT_MAX_ATTEMPTS, DEFAULT_RETRY_BASE_MS } from '../../../src/server/queue/queues'
import { logger } from './logger'
import { prisma } from './prisma'

let connectionPromise: Promise<amqplib.ChannelModel> | null = null
let channelPromise: Promise<amqplib.Channel> | null = null

function getRabbitUrl() {
  return process.env.RABBITMQ_URL ?? 'amqp://localhost:5672'
}

async function getConnection() {
  if (!connectionPromise) {
    connectionPromise = amqplib.connect(getRabbitUrl())
  }
  return await connectionPromise
}

export async function getWorkerChannel() {
  if (!channelPromise) {
    channelPromise = (async () => {
      const connection = await getConnection()
      const channel = await connection.createChannel()
      channel.prefetch(5)
      return channel
    })()
  }
  return await channelPromise
}

type JobHandler<TPayload extends { attempt?: number }> = (
  payload: TPayload,
) => Promise<void>

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function consumeJsonQueue<TPayload extends { attempt?: number; jobId?: string }>(
  queueName: string,
  handler: JobHandler<TPayload>,
) {
  const channel = await getWorkerChannel()
  await channel.assertQueue(queueName, { durable: true })

  await channel.consume(queueName, async (message) => {
    if (!message) return

    let payload: TPayload
    try {
      payload = JSON.parse(message.content.toString()) as TPayload
    } catch {
      channel.reject(message, false)
      return
    }

    try {
      await handler(payload)
      channel.ack(message)
    } catch (error) {
      const attempt = Number(payload.attempt ?? 0)
      const nextAttempt = attempt + 1
      const maxAttempts = DEFAULT_MAX_ATTEMPTS
      const errorMessage = error instanceof Error ? error.message : 'Unknown worker error'

      if (payload.jobId) {
        await prisma.generationJob.updateMany({
          where: { id: payload.jobId },
          data: {
            attempt: nextAttempt,
            lastError: errorMessage,
            status: nextAttempt >= maxAttempts ? 'DEAD_LETTER' : 'PENDING',
            deadLetteredAt: nextAttempt >= maxAttempts ? new Date() : null,
          },
        })
      }

      if (nextAttempt >= maxAttempts) {
        logger.error({ queueName, payload, err: errorMessage }, 'Job moved to dead letter')
        channel.reject(message, false)
        return
      }

      const delayMs = DEFAULT_RETRY_BASE_MS * 2 ** attempt
      logger.warn(
        { queueName, payload, attempt: nextAttempt, delayMs, err: errorMessage },
        'Retrying worker job',
      )
      await sleep(delayMs)
      channel.sendToQueue(
        queueName,
        Buffer.from(
          JSON.stringify({
            ...payload,
            attempt: nextAttempt,
          }),
        ),
        {
          persistent: true,
          contentType: 'application/json',
        },
      )
      channel.ack(message)
    }
  })
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
