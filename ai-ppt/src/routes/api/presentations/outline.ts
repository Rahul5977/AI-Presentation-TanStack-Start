import { createFileRoute } from '@tanstack/react-router'

import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { logger } from '@/server/logging/logger'
import { captureWebException } from '@/server/observability/sentry'
import { createDraftFromInput } from '@/server/presentations/outline-service'
import { normalizePresentationInput } from '@/server/presentations/schemas'
import {
  assertDeckCreationAllowed,
  DeckPaymentRequiredError,
  deckPaymentErrorMessage,
} from '@/server/billing/deck-access'
import {
  assertRateLimit,
  rateLimitErrorMessage,
} from '@/server/usage/rate-limit'
import {
  assertQuota,
  quotaErrorMessage,
  recordUsage,
} from '@/server/usage/service'

export const Route = createFileRoute('/api/presentations/outline')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        logger.info({ url: request.url }, 'outline POST: handler entered')
        try {
          const headers = getRequestHeaders()
          const session = await auth.api.getSession({ headers })

          if (!session) {
            logger.warn('outline POST: no session, returning 401')
            return json({ error: 'Unauthorized' }, { status: 401 })
          }

          let body: unknown
          try {
            body = await request.json()
          } catch (parseErr) {
            logger.error(
              { err: parseErr instanceof Error ? parseErr.message : String(parseErr) },
              'outline POST: request.json() failed',
            )
            return json({ error: 'Invalid JSON body.' }, { status: 400 })
          }

          const parsed = normalizePresentationInput(body)
          if (!parsed.success) {
            logger.warn(
              { issues: parsed.error.flatten() },
              'outline POST: payload validation failed',
            )
            return json(
              { error: 'Invalid payload', issues: parsed.error.flatten() },
              { status: 400 },
            )
          }

          try {
            await assertRateLimit({
              userId: session.user.id,
              bucket: 'outline',
            })
            await assertDeckCreationAllowed(session.user.id)
            await assertQuota(session.user.id, 'PRESENTATIONS_CREATED')
            const draft = await createDraftFromInput(session.user.id, parsed.data)
            await recordUsage({
              userId: session.user.id,
              metric: 'PRESENTATIONS_CREATED',
              type: 'PRESENTATION_CREATED',
              presentationId: draft.presentationId,
              metadata: { sourceMode: 'manual' },
            })
            logger.info(
              { userId: session.user.id, draftId: draft.draftId },
              'outline POST: success',
            )
            return json(draft)
          } catch (error) {
            captureWebException(error, {
              endpoint: 'presentations-outline',
              userId: session.user.id,
            })
            logger.error(
              {
                userId: session.user.id,
                err: error instanceof Error ? error.message : String(error),
              },
              'Outline generation failed',
            )
            const message =
              error instanceof DeckPaymentRequiredError
                ? deckPaymentErrorMessage(error)
                : error instanceof Error && error.name === 'RateLimitError'
                  ? rateLimitErrorMessage(error)
                  : quotaErrorMessage(error)
            if (error instanceof DeckPaymentRequiredError) {
              return json(
                {
                  error: message,
                  paymentRequired: true,
                  priceInr: error.priceInr,
                },
                { status: 402 },
              )
            }
            const isQuota =
              message.startsWith('Quota reached') || message.startsWith('Rate limit')
            return json(
              { error: message },
              { status: isQuota ? 429 : 503 },
            )
          }
        } catch (outerErr) {
          // Belt-and-suspenders: ensure we never return an empty response.
          logger.error(
            { err: outerErr instanceof Error ? outerErr.message : String(outerErr) },
            'outline POST: unexpected outer error',
          )
          return json(
            { error: 'Unexpected server error in outline handler.' },
            { status: 500 },
          )
        }
      },
    },
  },
})
