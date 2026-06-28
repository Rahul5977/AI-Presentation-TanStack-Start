import { afterEach, describe, expect, it, vi } from 'vitest'

// Keep the test hermetic: deck-access imports '@/lib/db' which builds a real
// Postgres pool at module load. We don't touch the DB here.
vi.mock('@/lib/db', () => ({ prisma: {} }))

async function loadIsOwner(ownerEmails: string | undefined) {
  vi.resetModules()
  if (ownerEmails === undefined) {
    delete process.env.OWNER_EMAILS
  } else {
    process.env.OWNER_EMAILS = ownerEmails
  }
  const mod = await import('./deck-access')
  return mod.isOwnerAccount
}

afterEach(() => {
  delete process.env.OWNER_EMAILS
})

describe('isOwnerAccount', () => {
  it('returns false for everyone when OWNER_EMAILS is unset', async () => {
    const isOwner = await loadIsOwner(undefined)
    expect(isOwner({ email: 'rahul.raj9237@gmail.com' })).toBe(false)
    expect(isOwner({ email: 'anyone@example.com' })).toBe(false)
  })

  it('matches only configured emails (case-insensitive)', async () => {
    const isOwner = await loadIsOwner('owner@example.com, second@example.com')
    expect(isOwner({ email: 'owner@example.com' })).toBe(true)
    expect(isOwner({ email: 'OWNER@example.com' })).toBe(true)
    expect(isOwner({ email: 'second@example.com' })).toBe(true)
    expect(isOwner({ email: 'stranger@example.com' })).toBe(false)
  })

  it('does NOT grant ownership based on a user-controllable display name (regression)', async () => {
    // Previously any account whose OAuth display name was "rahul raj"/"Rahul5977"
    // got unlimited free decks. The function no longer accepts a name at all.
    const isOwner = await loadIsOwner('owner@example.com')
    expect(isOwner({ email: 'attacker@evil.com' })).toBe(false)
  })
})
