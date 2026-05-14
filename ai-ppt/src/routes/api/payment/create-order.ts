import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/server/logging/logger'
import { DECK_PRICE_INR, getRazorpay } from '@/server/billing/razorpay'

export const Route = createFileRoute('/api/payment/create-order')({
  server: {
    handlers: {
      POST: async () => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })

        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const razorpay = getRazorpay()

          const order = await razorpay.orders.create({
            amount: DECK_PRICE_INR * 100,
            currency: 'INR',
            receipt: `deck_${session.user.id}_${Date.now()}`,
            notes: {
              userId: session.user.id,
              purpose: 'deck_credit',
            },
          })

          await prisma.deckPayment.create({
            data: {
              userId: session.user.id,
              razorpayOrderId: order.id,
              amountInr: DECK_PRICE_INR,
              status: 'PENDING',
              credits: 1,
            },
          })

          return json({
            orderId: order.id,
            amount: DECK_PRICE_INR * 100,
            currency: 'INR',
            keyId: process.env.RAZORPAY_KEY_ID,
          })
        } catch (error) {
          logger.error(
            { err: error instanceof Error ? error.message : String(error) },
            'Failed to create Razorpay order',
          )
          return json({ error: 'Payment initiation failed. Please try again.' }, { status: 503 })
        }
      },
    },
  },
})
