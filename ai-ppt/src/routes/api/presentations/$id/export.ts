import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { getUserEntitlements } from '@/server/billing/entitlements'
import { exportPptx } from '@/server/presentations/export-service'
import { captureWebException } from '@/server/observability/sentry'
import { assertQuota, quotaErrorMessage, recordUsage } from '@/server/usage/service'
import { assertRateLimit, rateLimitErrorMessage } from '@/server/usage/rate-limit'

export const Route = createFileRoute('/api/presentations/$id/export')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const url = new URL(request.url)
        const format = url.searchParams.get('format') ?? 'pptx'

        if (format === 'pptx') {
          try {
            await assertRateLimit({
              userId: session.user.id,
              bucket: 'export',
            })
          } catch (error) {
            return json({ error: rateLimitErrorMessage(error) }, { status: 429 })
          }

          try {
            await assertQuota(session.user.id, 'EXPORTS')
          } catch (error) {
            return json({ error: quotaErrorMessage(error) }, { status: 429 })
          }

          try {
            const { features } = await getUserEntitlements(session.user.id)
            const result = await exportPptx(session.user.id, params.id, {
              watermark: features.watermark,
            })
            if (!result) return json({ error: 'Presentation not found' }, { status: 404 })

            await recordUsage({
              userId: session.user.id,
              presentationId: params.id,
              metric: 'EXPORTS',
              type: 'EXPORT_DOWNLOADED',
              metadata: { format: 'pptx' },
            })

            return new Response(new Uint8Array(result.buffer), {
              headers: {
                'Content-Type':
                  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'Content-Disposition': `attachment; filename="${result.filename}"`,
                'Content-Length': String(result.buffer.byteLength),
              },
            })
          } catch (error) {
            captureWebException(error, {
              endpoint: 'presentation-export',
              userId: session.user.id,
              presentationId: params.id,
            })
            return json({ error: 'Export failed.' }, { status: 503 })
          }
        }

        return json(
          { error: `Format "${format}" is not supported. Use ?format=pptx` },
          { status: 400 },
        )
      },
    },
  },
})
