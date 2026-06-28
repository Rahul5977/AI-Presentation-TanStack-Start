import type { SubscriptionPlan, UsageMetric } from '@/generated/prisma/client'

type QuotaConfig = Record<UsageMetric, number>

const DEFAULT_FREE: QuotaConfig = {
  PRESENTATIONS_CREATED: 5,
  SLIDES_GENERATED: 60,
  EXPORTS: 10,
  SOURCE_IMPORTS: 10,
  SLIDE_ASSISTANT_REQUESTS: 50,
}

const DEFAULT_PRO: QuotaConfig = {
  PRESENTATIONS_CREATED: 200,
  SLIDES_GENERATED: 4_000,
  EXPORTS: 500,
  SOURCE_IMPORTS: 1_000,
  SLIDE_ASSISTANT_REQUESTS: 5_000,
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function readPlanCaps(prefix: 'PLAN_FREE' | 'PLAN_PRO', fallback: QuotaConfig): QuotaConfig {
  return {
    PRESENTATIONS_CREATED: readInt(`${prefix}_PRESENTATIONS_CREATED`, fallback.PRESENTATIONS_CREATED),
    SLIDES_GENERATED: readInt(`${prefix}_SLIDES_GENERATED`, fallback.SLIDES_GENERATED),
    EXPORTS: readInt(`${prefix}_EXPORTS`, fallback.EXPORTS),
    SOURCE_IMPORTS: readInt(`${prefix}_SOURCE_IMPORTS`, fallback.SOURCE_IMPORTS),
    SLIDE_ASSISTANT_REQUESTS: readInt(
      `${prefix}_SLIDE_ASSISTANT_REQUESTS`,
      fallback.SLIDE_ASSISTANT_REQUESTS,
    ),
  }
}

export function getPlanQuota(plan: SubscriptionPlan): QuotaConfig {
  if (plan === 'PRO') {
    return readPlanCaps('PLAN_PRO', DEFAULT_PRO)
  }
  return readPlanCaps('PLAN_FREE', DEFAULT_FREE)
}
