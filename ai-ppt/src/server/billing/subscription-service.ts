import { prisma } from '@/lib/db'
import { effectivePlan } from '@/server/billing/paddle'
import type { SubscriptionPlan, SubscriptionStatus } from '@/generated/prisma/client'

export type SubscriptionUpdate = {
  userId: string
  gatewayCustomerId?: string | null
  gatewaySubscriptionId?: string | null
  priceId?: string | null
  plan: SubscriptionPlan
  status: SubscriptionStatus
  currentPeriodStart?: Date | null
  currentPeriodEnd?: Date | null
  cancelAtPeriodEnd?: boolean
}

/**
 * Upsert the subscription record AND mirror the resulting entitlement plan onto
 * User.subscriptionPlan (which the quota/feature system reads) — in one
 * transaction so they never diverge. Idempotent: safe to re-apply the same event.
 */
export async function applySubscriptionUpdate(update: SubscriptionUpdate): Promise<void> {
  const userPlan = effectivePlan(update.plan, update.status)

  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { userId: update.userId },
      create: {
        userId: update.userId,
        gateway: 'paddle',
        gatewayCustomerId: update.gatewayCustomerId ?? null,
        gatewaySubscriptionId: update.gatewaySubscriptionId ?? null,
        priceId: update.priceId ?? null,
        plan: update.plan,
        status: update.status,
        currentPeriodStart: update.currentPeriodStart ?? null,
        currentPeriodEnd: update.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: update.cancelAtPeriodEnd ?? false,
      },
      update: {
        gatewayCustomerId: update.gatewayCustomerId ?? undefined,
        gatewaySubscriptionId: update.gatewaySubscriptionId ?? undefined,
        priceId: update.priceId ?? undefined,
        plan: update.plan,
        status: update.status,
        currentPeriodStart: update.currentPeriodStart ?? undefined,
        currentPeriodEnd: update.currentPeriodEnd ?? undefined,
        cancelAtPeriodEnd: update.cancelAtPeriodEnd ?? false,
      },
    }),
    prisma.user.update({
      where: { id: update.userId },
      data: { subscriptionPlan: userPlan },
    }),
  ])
}

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({ where: { userId } })
}

/** Find the local user id for a subscription event that lacks customData,
 *  by matching the Paddle subscription or customer id we've already stored. */
export async function findUserIdForSubscription(params: {
  gatewaySubscriptionId?: string | null
  gatewayCustomerId?: string | null
}): Promise<string | null> {
  const sub = await prisma.subscription.findFirst({
    where: {
      OR: [
        params.gatewaySubscriptionId ? { gatewaySubscriptionId: params.gatewaySubscriptionId } : undefined,
        params.gatewayCustomerId ? { gatewayCustomerId: params.gatewayCustomerId } : undefined,
      ].filter(Boolean) as object[],
    },
    select: { userId: true },
  })
  return sub?.userId ?? null
}
