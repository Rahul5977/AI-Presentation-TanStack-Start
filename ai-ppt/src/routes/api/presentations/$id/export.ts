import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { exportPptx } from '@/server/presentations/export-service'

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
          const result = await exportPptx(session.user.id, params.id)
          if (!result) return json({ error: 'Presentation not found' }, { status: 404 })

          return new Response(new Uint8Array(result.buffer), {
            headers: {
              'Content-Type':
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'Content-Disposition': `attachment; filename="${result.filename}"`,
              'Content-Length': String(result.buffer.byteLength),
            },
          })
        }

        return json(
          { error: `Format "${format}" is not supported. Use ?format=pptx` },
          { status: 400 },
        )
      },
    },
  },
})
