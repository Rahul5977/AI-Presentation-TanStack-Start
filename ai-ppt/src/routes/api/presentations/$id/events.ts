import { createFileRoute } from '@tanstack/react-router'
import Redis from 'ioredis'

import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { getPresentationProgressForUser } from '@/server/presentations/progress-service'

function formatSseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export const Route = createFileRoute('/api/presentations/$id/events')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) {
          return new Response('Unauthorized', { status: 401 })
        }

        const initialSnapshot = await getPresentationProgressForUser(
          session.user.id,
          params.id,
        )
        if (!initialSnapshot) {
          return new Response('Not Found', { status: 404 })
        }

        const encoder = new TextEncoder()
        const channelName = `presentation:${params.id}:events`
        const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')

        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: string, payload: unknown) => {
              controller.enqueue(encoder.encode(formatSseEvent(event, payload)))
            }

            send('snapshot', initialSnapshot)

            const onMessage = (incomingChannel: string, message: string) => {
              if (incomingChannel !== channelName) return
              try {
                send('progress', JSON.parse(message))
              } catch {
                send('progress', { raw: message })
              }
            }

            await redis.subscribe(channelName)
            redis.on('message', onMessage)

            const heartbeatTimer = setInterval(() => {
              send('heartbeat', { at: new Date().toISOString() })
            }, 15000)

            const cleanup = async () => {
              clearInterval(heartbeatTimer)
              redis.off('message', onMessage)
              await redis.unsubscribe(channelName)
              await redis.quit()
              controller.close()
            }

            request.signal.addEventListener('abort', () => {
              void cleanup()
            })
          },
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        })
      },
    },
  },
})
