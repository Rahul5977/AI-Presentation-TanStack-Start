import { prisma } from '@/lib/db'
import type { SubscriptionPlan } from '@/generated/prisma/client'

/**
 * Per-plan feature entitlements (beyond the monthly quota counts in limits.ts).
 * Quotas cap *how much*; these flags cap *what*. All overridable via env.
 */
export type PlanFeatures = {
  /** Max slides allowed in a single generated deck. */
  maxSlides: number
  /** Whether exported / shared decks carry the app watermark. */
  watermark: boolean
  /** Access to the premium Visualize feature (charts/tables/timelines) and
   *  manual AI image regeneration. */
  canVisualize: boolean
  /** Which text model tier this plan uses (free = cheaper/faster). */
  modelTier: 'free' | 'pro'
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function freeFeatures(): PlanFeatures {
  return {
    maxSlides: readInt('PLAN_FREE_MAX_SLIDES', 10),
    watermark: true,
    canVisualize: false,
    modelTier: 'free',
  }
}

function proFeatures(): PlanFeatures {
  return {
    maxSlides: readInt('PLAN_PRO_MAX_SLIDES', 100),
    watermark: false,
    canVisualize: true,
    modelTier: 'pro',
  }
}

export function getPlanFeatures(plan: SubscriptionPlan): PlanFeatures {
  return plan === 'PRO' ? proFeatures() : freeFeatures()
}

export function planTier(plan: SubscriptionPlan): 'free' | 'pro' {
  return plan === 'PRO' ? 'pro' : 'free'
}

/** Current entitlement plan for a user (denormalized on User.subscriptionPlan,
 *  kept in sync by the billing webhook). */
export async function resolveUserPlan(userId: string): Promise<SubscriptionPlan> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionPlan: true },
  })
  return user?.subscriptionPlan ?? 'FREE'
}

export async function getUserEntitlements(
  userId: string,
): Promise<{ plan: SubscriptionPlan; features: PlanFeatures }> {
  const plan = await resolveUserPlan(userId)
  return { plan, features: getPlanFeatures(plan) }
}
