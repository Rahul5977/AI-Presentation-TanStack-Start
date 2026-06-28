import { describe, expect, it, vi } from 'vitest'

// entitlements imports '@/lib/db' (builds a pg pool at load). Mock it.
vi.mock('@/lib/db', () => ({ prisma: {} }))

import { getPlanFeatures, planTier } from './entitlements'
import { effectivePlan, mapPaddleStatus, planForPriceId, statusGrantsPro } from './paddle'

describe('entitlements', () => {
  it('Free is gated, Pro is not', () => {
    const free = getPlanFeatures('FREE')
    expect(free.watermark).toBe(true)
    expect(free.canVisualize).toBe(false)
    expect(free.modelTier).toBe('free')

    const pro = getPlanFeatures('PRO')
    expect(pro.watermark).toBe(false)
    expect(pro.canVisualize).toBe(true)
    expect(pro.modelTier).toBe('pro')
    expect(pro.maxSlides).toBeGreaterThan(free.maxSlides)
  })

  it('planTier maps plan to model tier', () => {
    expect(planTier('PRO')).toBe('pro')
    expect(planTier('FREE')).toBe('free')
  })
})

describe('paddle mapping', () => {
  it('maps subscription statuses to our enum', () => {
    expect(mapPaddleStatus('active')).toBe('ACTIVE')
    expect(mapPaddleStatus('trialing')).toBe('TRIALING')
    expect(mapPaddleStatus('past_due')).toBe('PAST_DUE')
    expect(mapPaddleStatus('paused')).toBe('PAST_DUE')
    expect(mapPaddleStatus('canceled')).toBe('CANCELED')
    expect(mapPaddleStatus(undefined)).toBe('EXPIRED')
  })

  it('grants Pro only for active-ish statuses', () => {
    expect(statusGrantsPro('ACTIVE')).toBe(true)
    expect(statusGrantsPro('TRIALING')).toBe(true)
    expect(statusGrantsPro('PAST_DUE')).toBe(true) // keep access during dunning
    expect(statusGrantsPro('CANCELED')).toBe(false)
    expect(statusGrantsPro('EXPIRED')).toBe(false)
  })

  it('resolves plan from price id and effective plan from status', () => {
    expect(planForPriceId(null)).toBe('FREE')
    expect(planForPriceId('pri_abc')).toBe('PRO')
    expect(effectivePlan('PRO', 'ACTIVE')).toBe('PRO')
    expect(effectivePlan('PRO', 'CANCELED')).toBe('FREE')
    expect(effectivePlan('PRO', 'EXPIRED')).toBe('FREE')
  })
})
