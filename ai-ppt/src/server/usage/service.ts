import { prisma } from '@/lib/db'
import type { UsageEventType, UsageMetric } from '@/generated/prisma/client'
import { getPlanQuota } from '@/server/usage/limits'

export class QuotaExceededError extends Error {
  constructor(
    public readonly metric: UsageMetric,
    public readonly limit: number,
    public readonly current: number,
  ) {
    super(`Quota exceeded for ${metric}. Limit ${limit}, current ${current}.`)
    this.name = 'QuotaExceededError'
  }
}

function currentWindow(now = new Date()) {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return { periodStart, periodEnd }
}

export async function assertQuota(userId: string, metric: UsageMetric, quantity = 1) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionPlan: true },
  })
  if (!user) {
    throw new Error('User not found.')
  }

  const limits = getPlanQuota(user.subscriptionPlan)
  const limit = limits[metric]
  const { periodStart } = currentWindow()

  const counter = await prisma.userUsageCounter.findUnique({
    where: {
      userId_metric_periodStart: {
        userId,
        metric,
        periodStart,
      },
    },
    select: { count: true },
  })

  const current = counter?.count ?? 0
  if (current + quantity > limit) {
    throw new QuotaExceededError(metric, limit, current)
  }
}

export async function recordUsage(params: {
  userId: string
  metric: UsageMetric
  quantity?: number
  type: UsageEventType
  presentationId?: string
  metadata?: unknown
}) {
  const quantity = params.quantity ?? 1
  const { periodStart, periodEnd } = currentWindow()

  await prisma.$transaction(async (tx) => {
    await tx.userUsageCounter.upsert({
      where: {
        userId_metric_periodStart: {
          userId: params.userId,
          metric: params.metric,
          periodStart,
        },
      },
      create: {
        userId: params.userId,
        metric: params.metric,
        periodStart,
        periodEnd,
        count: quantity,
      },
      update: {
        count: { increment: quantity },
        periodEnd,
      },
    })

    await tx.usageEvent.create({
      data: {
        userId: params.userId,
        presentationId: params.presentationId,
        metric: params.metric,
        quantity,
        type: params.type,
        metadata:
          params.metadata && typeof params.metadata === 'object'
            ? (params.metadata as Record<string, unknown>)
            : undefined,
      },
    })
  })
}

export function quotaErrorMessage(error: unknown): string {
  if (error instanceof QuotaExceededError) {
    return `Quota reached for ${error.metric}. Upgrade your plan or wait for monthly reset.`
  }
  return error instanceof Error ? error.message : 'Operation failed.'
}
