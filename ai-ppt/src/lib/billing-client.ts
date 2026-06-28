import { initializePaddle, type Paddle, type PaddleEventData } from '@paddle/paddle-js'

export type CheckoutConfig = {
  configured: boolean
  clientToken: string
  environment: 'sandbox' | 'production'
  prices: { monthly: string; annual: string }
  customer: { email: string }
  userId: string
}

let paddlePromise: Promise<Paddle | undefined> | null = null

async function fetchConfig(): Promise<CheckoutConfig> {
  const res = await fetch('/api/billing/checkout', { credentials: 'same-origin' })
  if (!res.ok) throw new Error('Could not load billing configuration.')
  return (await res.json()) as CheckoutConfig
}

async function getPaddle(
  cfg: CheckoutConfig,
  onEvent?: (event: PaddleEventData) => void,
): Promise<Paddle> {
  if (!paddlePromise) {
    paddlePromise = initializePaddle({
      environment: cfg.environment,
      token: cfg.clientToken,
      eventCallback: onEvent,
    })
  }
  const paddle = await paddlePromise
  if (!paddle) throw new Error('Paddle failed to initialize.')
  return paddle
}

export type CheckoutResult = { ok: true } | { ok: false; reason: 'not_configured' | 'no_price' | 'error' }

/** Open the Paddle overlay checkout for the Pro plan. The webhook (not this
 *  client) is what actually grants Pro — this just collects payment. */
export async function openProCheckout(
  interval: 'monthly' | 'annual',
  onEvent?: (event: PaddleEventData) => void,
): Promise<CheckoutResult> {
  try {
    const cfg = await fetchConfig()
    if (!cfg.configured) return { ok: false, reason: 'not_configured' }
    const priceId = interval === 'annual' ? cfg.prices.annual : cfg.prices.monthly
    if (!priceId) return { ok: false, reason: 'no_price' }

    const paddle = await getPaddle(cfg, onEvent)
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: cfg.customer.email },
      customData: { userId: cfg.userId },
    })
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/** Redirect the user to the Paddle customer portal to manage / cancel. */
export async function openBillingPortal(): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/billing/portal', {
    method: 'POST',
    credentials: 'same-origin',
  })
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok || !data.url) return { ok: false, error: data.error ?? 'Could not open billing portal.' }
  window.location.href = data.url
  return { ok: true }
}
