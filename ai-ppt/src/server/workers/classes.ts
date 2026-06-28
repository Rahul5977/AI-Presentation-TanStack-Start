export const WORKER_CLASSES = ['outline', 'content', 'image', 'upload', 'finalize'] as const

export type WorkerClass = (typeof WORKER_CLASSES)[number]

export function isWorkerClass(value: string): value is WorkerClass {
  return WORKER_CLASSES.includes(value as WorkerClass)
}

export function workerHeartbeatKey(workerClass: WorkerClass) {
  return `workers:heartbeat:${workerClass}`
}
