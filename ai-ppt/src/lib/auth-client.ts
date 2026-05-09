import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  // Use explicit URL when provided; otherwise Better Auth uses current origin.
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL || undefined,
})