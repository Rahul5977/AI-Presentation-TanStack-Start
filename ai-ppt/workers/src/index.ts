import { startContentConsumer } from './consumers/content-consumer'
import { startFinalizeConsumer } from './consumers/finalize-consumer'
import { startImageConsumer } from './consumers/image-consumer'
import { startOutlineConsumer } from './consumers/outline-consumer'
import { startUploadConsumer } from './consumers/upload-consumer'
import {
  WORKER_CLASSES,
  isWorkerClass,
  type WorkerClass,
} from '../../src/server/workers/classes'
import { startWorkerHeartbeat } from './lib/heartbeat'
import { logger } from './lib/logger'
import { beginWorkerDrain, closeWorkerRabbit } from './lib/rabbit'
import { prisma } from './lib/prisma'
import { captureWorkerException, initWorkerSentry } from './lib/sentry'

let isShuttingDown = false
const heartbeatStops: Array<() => Promise<void>> = []

function selectedWorkerClasses(): WorkerClass[] {
  const raw = process.env.WORKER_CLASSES
  if (!raw?.trim()) return [...WORKER_CLASSES]

  const parsed = raw
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)

  const valid = parsed.filter(isWorkerClass)
  if (valid.length === 0) return [...WORKER_CLASSES]
  return Array.from(new Set(valid))
}

async function shutdown(signal: string) {
  if (isShuttingDown) return
  isShuttingDown = true
  logger.info({ signal }, 'Worker shutting down')
  await beginWorkerDrain()
  await Promise.all(heartbeatStops.map((stop) => stop()))
  await closeWorkerRabbit()
  await prisma.$disconnect()
  process.exit(0)
}

async function start() {
  initWorkerSentry()
  const classes = selectedWorkerClasses()
  logger.info({ classes }, 'Starting worker consumers')

  const starters: Record<WorkerClass, () => Promise<void>> = {
    outline: startOutlineConsumer,
    content: startContentConsumer,
    image: startImageConsumer,
    upload: startUploadConsumer,
    finalize: startFinalizeConsumer,
  }

  const starts = classes.map(async (workerClass) => {
    await starters[workerClass]()
    const handle = await startWorkerHeartbeat(workerClass)
    heartbeatStops.push(handle.stop)
  })

  await Promise.all(starts)
  logger.info({ classes }, 'All worker consumers are running')
}

void start().catch((error) => {
  captureWorkerException(error, { scope: 'startup' })
  logger.error({ err: error }, 'Worker failed to start')
  process.exit(1)
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('uncaughtException', (error) => {
  captureWorkerException(error, { scope: 'uncaughtException' })
})

process.on('unhandledRejection', (reason) => {
  captureWorkerException(reason, { scope: 'unhandledRejection' })
})
