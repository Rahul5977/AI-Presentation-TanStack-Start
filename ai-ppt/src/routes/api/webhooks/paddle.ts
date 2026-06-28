import { createFileRoute } from '@tanstack/react-router'

import { prisma } from '@/lib/db'
import { logger } from '@/server/logging/logger'
import { captureWebException } from '@/server/observability/sentry'
import {
  getPaddle,
  isPaddleConfigured,
  mapPaddleStatus,
  paddleConfig,
  planForPriceId,
} from '@/server/billing/paddle'
import {
  applySubscriptionUpdate,
  findUserIdForSubscription,
} from '@/server/billing/subscription-service'

/** Loosely-typed view of a Paddle subscription event's data. */
type PaddleSubscriptionData = {
  id?: string
  customerId?: string
  status?: string
  customData?: { userId?: string } | null
  items?: Array<{ price?: { id?: string } | null }>
  currentBillingPeriod?: { startsAt?: string; endsAt?: string } | null
  scheduledChange?: { action?: string } | null
}

function toDate(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export const Route = createFileRoute('/api/webhooks/paddle')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isPaddleConfigured() || !paddleConfig.webhookSecret()) {
          return new Response('Billing not configured', { status: 503 })
        }

        // Signature verification REQUIRES the raw, unparsed body.
        const rawBody = await request.text()
        const signature = request.headers.get('paddle-signature') ?? ''

        let event
        try {
          event = await getPaddle().webhooks.unmarshal(
            rawBody,
            paddleConfig.webhookSecret(),
            signature,
          )
        } catch (error) {
          logger.warn(
            { err: error instanceof Error ? error.message : String(error) },
            'Paddle webhook signature verification failed',
          )
          return new Response('Invalid signature', { status: 400 })
        }
        if (!event) return new Response('Unprocessable', { status: 400 })

        // Idempotency: skip events we've already recorded.
        const existing = await prisma.webhookEvent.findUnique({
          where: { gatewayEventId: event.eventId },
          select: { id: true },
        })
        if (existing) return new Response('ok', { status: 200 })

        try {
          if (event.eventType.startsWith('subscription.')) {
            const data = event.data as PaddleSubscriptionData
            const gatewaySubscriptionId = data.id ?? null
            const gatewayCustomerId = data.customerId ?? null
            const userId =
              data.customData?.userId ??
              (await findUserIdForSubscription({ gatewaySubscriptionId, gatewayCustomerId }))

            if (!userId) {
              logger.warn(
                { eventType: event.eventType, gatewaySubscriptionId },
                'Paddle subscription event without resolvable userId; recording and skipping',
              )
            } else {
              const priceId = data.items?.[0]?.price?.id ?? null
              const status = mapPaddleStatus(data.status)
              await applySubscriptionUpdate({
                userId,
                gatewayCustomerId,
                gatewaySubscriptionId,
                priceId,
                plan: planForPriceId(priceId),
                status,
                currentPeriodStart: toDate(data.currentBillingPeriod?.startsAt),
                currentPeriodEnd: toDate(data.currentBillingPeriod?.endsAt),
                cancelAtPeriodEnd: data.scheduledChange?.action === 'cancel',
              })
            }
          }
          // Other event types (transaction.*) are acknowledged but not acted on.

          // Record only after successful processing so a mid-processing crash
          // re-delivers and re-runs the idempotent upsert.
          await prisma.webhookEvent.create({
            data: {
              gateway: 'paddle',
              gatewayEventId: event.eventId,
              type: event.eventType,
              payload: JSON.parse(rawBody),
            },
          })
        } catch (error) {
          // Duplicate (race) → already processed; otherwise report and 500 so
          // Paddle retries.
          if (
            typeof error === 'object' &&
            error !== null &&
            (error as { code?: string }).code === 'P2002'
          ) {
            return new Response('ok', { status: 200 })
          }
          captureWebException(error, { endpoint: 'paddle-webhook', eventType: event.eventType })
          logger.error(
            { eventType: event.eventType, err: error instanceof Error ? error.message : String(error) },
            'Paddle webhook processing failed',
          )
          return new Response('processing error', { status: 500 })
        }

        return new Response('ok', { status: 200 })
      },
    },
  },
})
