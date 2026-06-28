import { prisma } from '@/lib/db'

export const DECK_PRICE_INR = 20

/**
 * Owner accounts that bypass deck-payment gating, configured via the
 * OWNER_EMAILS env var (comma-separated). Empty by default.
 *
 * SECURITY: never match on the OAuth display `name` — it is user-controllable,
 * so any account could rename itself to obtain a free bypass. Match on the
 * verified email only.
 */
const OWNER_EMAILS = new Set(
  (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
)

type UserIdentity = {
  email: string
}

export class DeckPaymentRequiredError extends Error {
  constructor(
    public readonly priceInr: number,
    public readonly freeDecksUsed: number,
  ) {
    super(`Payment required. ₹${priceInr} per additional deck.`)
    this.name = 'DeckPaymentRequiredError'
  }
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

export function isOwnerAccount(user: UserIdentity): boolean {
  if (OWNER_EMAILS.size === 0) return false
  return OWNER_EMAILS.has(normalize(user.email))
}

async function getPaidDeckCredits(userId: string): Promise<number> {
  const payments = await prisma.deckPayment.findMany({
    where: { userId, status: 'PAID' },
    select: { credits: true },
  })
  return payments.reduce((sum, p) => sum + p.credits, 0)
}

export async function assertDeckCreationAllowed(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (!user) throw new Error('User not found.')

  if (isOwnerAccount(user)) {
    return
  }

  const totalDecksCreated = await prisma.presentation.count({
    where: { userId },
  })

  // 1 free deck always allowed
  if (totalDecksCreated < 1) {
    return
  }

  // Each paid credit unlocks 1 additional deck
  const paidCredits = await getPaidDeckCredits(userId)
  const allowedDecks = 1 + paidCredits

  if (totalDecksCreated >= allowedDecks) {
    throw new DeckPaymentRequiredError(DECK_PRICE_INR, totalDecksCreated)
  }
}

export function deckPaymentErrorMessage(error: unknown): string {
  if (error instanceof DeckPaymentRequiredError) {
    return `Your first deck is free. Next deck costs ₹${error.priceInr}.`
  }
  return error instanceof Error ? error.message : 'Payment validation failed.'
}
