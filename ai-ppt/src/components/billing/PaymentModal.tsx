'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Lock, Shield, Sparkles, X, Zap } from 'lucide-react'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpaySuccessResponse) => void
  prefill?: { name?: string; email?: string }
  theme?: { color?: string }
  modal?: { ondismiss?: () => void }
}

interface RazorpayInstance {
  open(): void
}

interface RazorpaySuccessResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface PaymentModalProps {
  open: boolean
  priceInr: number
  userEmail?: string
  userName?: string
  onSuccess: () => void
  onClose: () => void
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function PaymentModal({
  open,
  priceInr,
  userEmail,
  userName,
  onSuccess,
  onClose,
}: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handlePay = useCallback(async () => {
    try {
      setIsLoading(true)

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        toast.error('Payment gateway failed to load. Please try again.')
        return
      }

      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        credentials: 'same-origin',
      })
      const order = (await orderRes.json()) as {
        orderId?: string
        amount?: number
        currency?: string
        keyId?: string
        error?: string
      }

      if (!orderRes.ok || !order.orderId || !order.keyId) {
        toast.error(order.error ?? 'Failed to initiate payment.')
        return
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount ?? priceInr * 100,
        currency: order.currency ?? 'INR',
        name: 'Kodexa.ai',
        description: `Deck credit — ₹${priceInr}`,
        order_id: order.orderId,
        prefill: {
          name: userName,
          email: userEmail,
        },
        theme: { color: '#6366f1' },
        handler: async (response) => {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })
            const result = (await verifyRes.json()) as {
              success?: boolean
              error?: string
            }
            if (!verifyRes.ok || !result.success) {
              toast.error(result.error ?? 'Payment verification failed.')
              return
            }
            toast.success('Payment successful! You can now create your next deck.')
            onSuccess()
          } catch {
            toast.error('Payment verified but we could not update your account. Contact support.')
          }
        },
        modal: {
          ondismiss: () => {
            onClose()
          },
        },
      })

      rzp.open()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [priceInr, userEmail, userName, onSuccess, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          style={{ backdropFilter: 'blur(8px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="glass-strong relative w-full max-w-md overflow-hidden rounded-3xl border border-border/70"
          >
            <div className="h-1 bg-linear-to-r from-primary via-primary/80 to-primary/60" />

            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>

            <div className="p-6 pt-7">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 inline-flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary ring-4 ring-primary/10">
                  <Sparkles className="size-6" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Unlock a new deck</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your first deck is free. Pay <strong>₹{priceInr}</strong> to continue.
                </p>
              </div>

              <div className="mb-5 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">1 deck credit</span>
                  <span className="font-semibold text-foreground">₹{priceInr}</span>
                </div>
                <div className="my-3 h-px bg-border/70" />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Total due today</span>
                  <span className="text-base font-semibold text-foreground">₹{priceInr}</span>
                </div>
              </div>

              <div className="mb-5 space-y-2">
                {[
                  'Generate and edit new deck instantly',
                  'Full image + content pipeline',
                  'Saved in your history for later access',
                ].map((line) => (
                  <p key={line} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Zap className="size-2.5" />
                    </span>
                    {line}
                  </p>
                ))}
              </div>

              <button
                onClick={handlePay}
                disabled={isLoading}
                className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all duration-150 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Opening payment gateway…
                  </span>
                ) : (
                  `Pay ₹${priceInr}`
                )}
              </button>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Shield className="size-3.5 text-primary" />
                  Razorpay secured
                </span>
                <span className="inline-flex items-center gap-1">
                  <Lock className="size-3.5 text-primary" />
                  256-bit SSL
                </span>
                <span>UPI · Cards · NetBanking</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
