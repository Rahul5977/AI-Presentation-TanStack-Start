import { createFileRoute } from '@tanstack/react-router'
import Redis from 'ioredis'

import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { getDraftForUser } from '@/server/presentations/outline-service'

function formatSseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export const Route = createFileRoute('/api/drafts/$draftId/events')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) {
          return new Response('Unauthorized', { status: 401 })
        }

        // Ownership check + initial snapshot (status + any slides so far).
        const initialSnapshot = await getDraftForUser(session.user.id, params.draftId)
        if (!initialSnapshot) {
          return new Response('Not Found', { status: 404 })
        }

        const encoder = new TextEncoder()
        const channelName = `draft:${params.draftId}:events`
        const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')

        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: string, payload: unknown) => {
              controller.enqueue(encoder.encode(formatSseEvent(event, payload)))
            }

            send('snapshot', initialSnapshot)

            // If the outline is already terminal at connect time, no events will
            // arrive — the client reads the snapshot status and acts on it.
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
