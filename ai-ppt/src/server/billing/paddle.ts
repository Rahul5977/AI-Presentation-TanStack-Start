import { Environment, Paddle } from '@paddle/paddle-node-sdk'

import type { SubscriptionPlan, SubscriptionStatus } from '@/generated/prisma/client'

let client: Paddle | null = null

export function isPaddleConfigured(): boolean {
  return Boolean(process.env.PADDLE_API_KEY?.trim())
}

export function getPaddle(): Paddle {
  if (!isPaddleConfigured()) {
    throw new Error('PADDLE_API_KEY is not configured.')
  }
  if (!client) {
    client = new Paddle(process.env.PADDLE_API_KEY as string, {
      environment:
        process.env.PADDLE_ENV === 'production' ? Environment.production : Environment.sandbox,
    })
  }
  return client
}

export const paddleConfig = {
  webhookSecret: () => process.env.PADDLE_WEBHOOK_SECRET ?? '',
  clientToken: () => process.env.PADDLE_CLIENT_TOKEN ?? '',
  environment: () => (process.env.PADDLE_ENV === 'production' ? 'production' : 'sandbox'),
  priceProMonthly: () => process.env.PADDLE_PRICE_PRO_MONTHLY ?? '',
  priceProAnnual: () => process.env.PADDLE_PRICE_PRO_ANNUAL ?? '',
}

/** Map a Paddle subscription status string to our enum. */
export function mapPaddleStatus(status: string | undefined): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'TRIALING'
    case 'active':
      return 'ACTIVE'
    case 'past_due':
    case 'paused':
      // Keep entitlement during dunning/pause; downgrade only on cancel/expire.
      return 'PAST_DUE'
    case 'canceled':
      return 'CANCELED'
    default:
      return 'EXPIRED'
  }
}

/** Whether a subscription status grants Pro entitlement. */
export function statusGrantsPro(status: SubscriptionStatus): boolean {
  return status === 'ACTIVE' || status === 'TRIALING' || status === 'PAST_DUE'
}

/** Resolve which plan a Paddle price id maps to. Only Pro prices are configured;
 *  any other paid price is treated as Pro defensively. */
export function planForPriceId(priceId: string | undefined | null): SubscriptionPlan {
  if (!priceId) return 'FREE'
  return 'PRO'
}

/** The plan that should be reflected on the User given a subscription status. */
export function effectivePlan(plan: SubscriptionPlan, status: SubscriptionStatus): SubscriptionPlan {
  return statusGrantsPro(status) ? plan : 'FREE'
}
