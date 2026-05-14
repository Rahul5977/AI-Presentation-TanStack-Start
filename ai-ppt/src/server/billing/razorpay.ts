import Razorpay from 'razorpay'
import crypto from 'crypto'

export const DECK_PRICE_INR = 20

let _razorpay: Razorpay | null = null

export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keyId || !keySecret) {
      throw new Error(
        'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables.',
      )
    }
    _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })
  }
  return _razorpay
}

export function verifyRazorpaySignature(params: {
  orderId: string
  paymentId: string
  signature: string
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) return false
  const body = `${params.orderId}|${params.paymentId}`
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex')
  return expected === params.signature
}
