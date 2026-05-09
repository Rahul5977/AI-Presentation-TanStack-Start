import { getSession } from '#/lib/auth-function'
import { AUTH_HOME_PATH, AUTH_LOGIN_PATH } from '#/lib/auth-path'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await getSession()
    throw redirect({ to: session ? AUTH_HOME_PATH : AUTH_LOGIN_PATH })
  },
  component: IndexRedirect,
})

function IndexRedirect() {
  return null
}
