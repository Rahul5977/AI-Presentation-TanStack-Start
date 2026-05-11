import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { logger } from '@/server/logging/logger'
import { captureWebException } from '@/server/observability/sentry'
import { createDraftFromInput } from '@/server/presentations/outline-service'
import { normalizePresentationInput } from '@/server/presentations/schemas'
import {
  buildPromptFromSource,
  extractImportSource,
} from '@/server/presentations/source-import'
import {
  assertRateLimit,
  rateLimitErrorMessage,
} from '@/server/usage/rate-limit'
import {
  assertQuota,
  quotaErrorMessage,
  recordUsage,
} from '@/server/usage/service'

function readText(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function readOptionalNumber(formData: FormData, key: string) {
  const value = readText(formData, key)
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const Route = createFileRoute('/api/presentations/import')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })

        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          await assertRateLimit({
            userId: session.user.id,
            bucket: 'import',
          })
          await assertQuota(session.user.id, 'SOURCE_IMPORTS')
          await assertQuota(session.user.id, 'PRESENTATIONS_CREATED')

          const formData = await request.formData()
          const mode = readText(formData, 'sourceMode')

          const basePayload = {
            prompt: readText(formData, 'prompt'),
            audience: readText(formData, 'audience'),
            audienceCustom: readText(formData, 'audienceCustom') || undefined,
            tone: readText(formData, 'tone'),
            lengthPreset: readText(formData, 'lengthPreset'),
            customSlideCount: readOptionalNumber(formData, 'customSlideCount'),
            language: readText(formData, 'language'),
            template: readText(formData, 'template'),
            imageStyle: readText(formData, 'imageStyle'),
            depth: readText(formData, 'depth'),
          }

          let sourceText = ''
          let sourceLabel = ''

          if (mode === 'text') {
            const text = readText(formData, 'sourceText')
            const extracted = await extractImportSource({ mode, text })
            sourceText = extracted.sourceText
            sourceLabel = extracted.sourceLabel
          } else if (mode === 'url') {
            const url = readText(formData, 'sourceUrl')
            const extracted = await extractImportSource({ mode, url })
            sourceText = extracted.sourceText
            sourceLabel = extracted.sourceLabel
          } else if (mode === 'pdf') {
            const fileValue = formData.get('sourceFile')
            if (!(fileValue instanceof File)) {
              return json({ error: 'Please upload a PDF file.' }, { status: 400 })
            }
            const extracted = await extractImportSource({
              mode,
              file: fileValue,
            })
            sourceText = extracted.sourceText
            sourceLabel = extracted.sourceLabel
          } else {
            return json(
              { error: 'Invalid source mode. Expected text, url, or pdf.' },
              { status: 400 },
            )
          }

          const parsed = normalizePresentationInput({
            ...basePayload,
            prompt: buildPromptFromSource({
              basePrompt: basePayload.prompt,
              sourceText,
              sourceLabel,
            }),
          })

          if (!parsed.success) {
            return json(
              { error: 'Invalid payload', issues: parsed.error.flatten() },
              { status: 400 },
            )
          }

          const draft = await createDraftFromInput(session.user.id, parsed.data)

          await recordUsage({
            userId: session.user.id,
            metric: 'SOURCE_IMPORTS',
            type: 'SOURCE_IMPORTED',
            presentationId: draft.presentationId,
            metadata: {
              mode,
              sourceLabel,
            },
          })
          await recordUsage({
            userId: session.user.id,
            metric: 'PRESENTATIONS_CREATED',
            type: 'PRESENTATION_CREATED',
            presentationId: draft.presentationId,
            metadata: {
              sourceMode: mode,
            },
          })

          return json(draft)
        } catch (error) {
          captureWebException(error, {
            endpoint: 'presentations-import',
            userId: session.user.id,
          })
          logger.error(
            {
              userId: session.user.id,
              err: error instanceof Error ? error.message : String(error),
            },
            'Source import presentation creation failed',
          )

          const message =
            error instanceof Error && error.name === 'RateLimitError'
              ? rateLimitErrorMessage(error)
              : quotaErrorMessage(error)
          const isQuota = message.startsWith('Quota reached') || message.startsWith('Rate limit')
          return json(
            { error: message },
            { status: isQuota ? 429 : 503 },
          )
        }
      },
    },
  },
})
