import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { authClient } from '#/lib/auth-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { openBillingPortal, openProCheckout } from '@/lib/billing-client'

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
})

type BillingMe = {
  plan: 'FREE' | 'PRO'
  status: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

const FREE_FEATURES = [
  '5 AI presentations / month',
  'Up to 10 slides per deck',
  'PPTX & PDF export (with watermark)',
  'Slide editor + AI assistant',
]

const PRO_FEATURES = [
  '200 AI presentations / month',
  'Unlimited slides per deck',
  'No watermark',
  'Premium AI model (sharper content)',
  'Visualize: charts, tables, timelines',
  'AI image regeneration',
  'Priority generation',
]

function PricingPage() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [annual, setAnnual] = useState(true)
  const [me, setMe] = useState<BillingMe | null>(null)
  const [busy, setBusy] = useState(false)

  const loadMe = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/billing/me', { credentials: 'same-origin' })
      if (res.ok) setMe((await res.json()) as BillingMe)
    } catch {
      // non-fatal
    }
  }, [session?.user])

  useEffect(() => {
    void loadMe()
  }, [loadMe])

  // Returning from a completed checkout: poll a few times for the webhook.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('upgraded') !== '1') return
    toast.success('Payment received — activating your Pro plan…')
    let tries = 0
    const timer = setInterval(async () => {
      tries += 1
      await loadMe()
      if (tries >= 5) clearInterval(timer)
    }, 2000)
    return () => clearInterval(timer)
  }, [loadMe])

  const isPro = me?.plan === 'PRO'

  const handleUpgrade = async () => {
    if (!session?.user) {
      void navigate({ to: '/login' })
      return
    }
    setBusy(true)
    const result = await openProCheckout(annual ? 'annual' : 'monthly', (event) => {
      if (event?.name === 'checkout.completed') {
        toast.success('Payment received — activating your Pro plan…')
        setTimeout(() => void loadMe(), 2500)
      }
    })
    setBusy(false)
    if (!result.ok) {
      toast.error(
        result.reason === 'not_configured'
          ? 'Billing isn’t enabled yet. Please check back soon.'
          : 'Could not start checkout. Please try again.',
      )
    }
  }

  const handleManage = async () => {
    setBusy(true)
    const result = await openBillingPortal()
    setBusy(false)
    if (!result.ok) toast.error(result.error ?? 'Could not open the billing portal.')
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, honest pricing</h1>
        <p className="mt-3 text-muted-foreground">
          Start free. Upgrade when you need more decks, longer presentations, and premium AI.
        </p>
        <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/60 px-4 py-2">
          <span className={annual ? 'text-muted-foreground' : 'font-semibold'}>Monthly</span>
          <Switch checked={annual} onCheckedChange={setAnnual} aria-label="Toggle annual billing" />
          <span className={annual ? 'font-semibold' : 'text-muted-foreground'}>
            Annual <Badge variant="secondary" className="ml-1">Save 25%</Badge>
          </span>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {/* Free */}
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>For trying things out.</CardDescription>
            <div className="pt-2 text-4xl font-bold">$0</div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-muted-foreground" />
                {f}
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full rounded-xl" disabled={!isPro && Boolean(session?.user)}>
              {isPro ? 'Included' : 'Current plan'}
            </Button>
          </CardFooter>
        </Card>

        {/* Pro */}
        <Card className="relative rounded-3xl border-primary/40 shadow-lg shadow-primary/10">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="gap-1">
              <Sparkles className="size-3" /> Most popular
            </Badge>
          </div>
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>For people who present often.</CardDescription>
            <div className="flex items-baseline gap-1 pt-2">
              <span className="text-4xl font-bold">${annual ? 9 : 12}</span>
              <span className="text-muted-foreground">/ month</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {annual ? 'Billed $108 / year' : 'Billed monthly'}
            </p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {PRO_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-primary" />
                {f}
              </div>
            ))}
          </CardContent>
          <CardFooter>
            {isPro ? (
              <Button onClick={handleManage} disabled={busy} className="w-full rounded-xl">
                Manage subscription
              </Button>
            ) : (
              <Button onClick={handleUpgrade} disabled={busy} className="w-full rounded-xl">
                {busy ? 'Opening checkout…' : session?.user ? 'Upgrade to Pro' : 'Sign in to upgrade'}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {isPro && me?.cancelAtPeriodEnd ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Your Pro plan is set to cancel at the end of the current period.
        </p>
      ) : null}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Payments are processed securely by Paddle, our Merchant of Record. Prices in USD; taxes
        applied at checkout. Manage or cancel anytime.{' '}
        <Link to="/refund-and-cancellation-policy" className="underline">
          Refund policy
        </Link>
        .
      </p>
    </main>
  )
}
