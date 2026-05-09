import 'dotenv/config'

import { startContentConsumer } from './consumers/content-consumer'
import { startFinalizeConsumer } from './consumers/finalize-consumer'
import { startImageConsumer } from './consumers/image-consumer'
import { startUploadConsumer } from './consumers/upload-consumer'
import { logger } from './lib/logger'
import { closeWorkerRabbit } from './lib/rabbit'
import { prisma } from './lib/prisma'

let isShuttingDown = false

async function shutdown(signal: string) {
  if (isShuttingDown) return
  isShuttingDown = true
  logger.info({ signal }, 'Worker shutting down')
  await closeWorkerRabbit()
  await prisma.$disconnect()
  process.exit(0)
}

async function start() {
  logger.info('Starting worker consumers')
  await Promise.all([
    startContentConsumer(),
    startImageConsumer(),
    startUploadConsumer(),
    startFinalizeConsumer(),
  ])
  logger.info('All worker consumers are running')
}

void start().catch((error) => {
  logger.error({ err: error }, 'Worker failed to start')
  process.exit(1)
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})
