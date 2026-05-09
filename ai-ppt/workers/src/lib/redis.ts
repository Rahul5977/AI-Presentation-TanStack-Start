import Redis from 'ioredis'

let redisClient: Redis | null = null

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')
  }
  return redisClient
}

export async function publishProgressEvent(
  presentationId: string,
  event: Record<string, unknown>,
) {
  const redis = getRedisClient()
  await redis.publish(
    `presentation:${presentationId}:events`,
    JSON.stringify({
      ts: new Date().toISOString(),
      ...event,
    }),
  )
}
