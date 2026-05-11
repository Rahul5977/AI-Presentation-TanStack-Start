import pino from 'pino'
import { captureWebException, initWebSentry } from '@/server/observability/sentry'

initWebSentry()

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: {
    service: 'ppt-web',
  },
})

process.on('uncaughtException', (error) => {
  captureWebException(error, { scope: 'uncaughtException' })
})

process.on('unhandledRejection', (reason) => {
  captureWebException(reason, { scope: 'unhandledRejection' })
})
