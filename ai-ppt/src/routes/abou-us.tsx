import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/abou-us')({
  beforeLoad: async () => {
    throw redirect({ to: '/about-us' })
  },
  component: AboutAliasRedirect,
})

function AboutAliasRedirect() {
  return null
}
