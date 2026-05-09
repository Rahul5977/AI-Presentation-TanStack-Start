import ThemeToggle from '#/components/ThemeToggle'
import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'
import { getSession } from '#/lib/auth-function'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ location }) => {
    const session = await getSession()

    if (!session) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }

    return { user: session.user }
  },
  component: HomePage,
})

function HomePage() {
  return (
    <div className='p-8'>
      <h1 className='text-4xl font-bold'>HomePage</h1>
      <p className='text-lg'>
        Welcome to the home page
      </p>
      <ThemeToggle />
      {/* <Button>
        <Button onClick={() => authClient.signOut()}>Logout</Button>
      </Button> */}
    </div>
  )
}
