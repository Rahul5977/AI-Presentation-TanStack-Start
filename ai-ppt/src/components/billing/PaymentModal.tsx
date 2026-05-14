'use client'

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
        name: 'Kodexa',
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

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Unlock a new deck</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your first deck was free. Pay ₹{priceInr} to create another deck.
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">1 deck credit</span>
            <span className="font-semibold text-foreground">₹{priceInr}</span>
          </div>
        </div>

        <button
          onClick={handlePay}
          disabled={isLoading}
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Opening payment…' : `Pay ₹${priceInr}`}
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Secured by Razorpay · UPI, Cards, Net Banking accepted
        </p>
      </div>
    </div>
  )
}
