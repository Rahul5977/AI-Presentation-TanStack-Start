/** Tiny logging seam for ai-runtime. Decoupled from the web/worker pino loggers
 *  (which init Sentry / process handlers per-context) so this module is safe to
 *  import in either process. Emits structured JSON lines. */
export const runtimeLog = {
  warn(msg: string, meta?: Record<string, unknown>) {
    console.warn(JSON.stringify({ level: 'warn', src: 'ai-runtime', msg, ...meta }))
  },
  error(msg: string, meta?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: 'error', src: 'ai-runtime', msg, ...meta }))
  },
}
