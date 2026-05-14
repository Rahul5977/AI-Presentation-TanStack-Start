import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/server/logging/logger'
import { verifyRazorpaySignature } from '@/server/billing/razorpay'

export const Route = createFileRoute('/api/payment/verify')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })

        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = (await request.json()) as {
          razorpay_order_id?: string
          razorpay_payment_id?: string
          razorpay_signature?: string
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return json({ error: 'Missing payment details.' }, { status: 400 })
        }

        const isValid = verifyRazorpaySignature({
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          signature: razorpay_signature,
        })

        if (!isValid) {
          logger.warn(
            { userId: session.user.id, orderId: razorpay_order_id },
            'Invalid Razorpay signature',
          )
          return json({ error: 'Payment verification failed.' }, { status: 400 })
        }

        const payment = await prisma.deckPayment.findFirst({
          where: {
            razorpayOrderId: razorpay_order_id,
            userId: session.user.id,
          },
        })

        if (!payment) {
          return json({ error: 'Order not found.' }, { status: 404 })
        }

        if (payment.status === 'PAID') {
          return json({ success: true, creditsAdded: 0 })
        }

        await prisma.deckPayment.update({
          where: { id: payment.id },
          data: {
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            status: 'PAID',
          },
        })

        logger.info(
          { userId: session.user.id, orderId: razorpay_order_id, credits: payment.credits },
          'Payment verified and deck credit granted',
        )

        return json({ success: true, creditsAdded: payment.credits })
      },
    },
  },
})
