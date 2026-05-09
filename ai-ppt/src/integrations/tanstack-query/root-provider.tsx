import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export const queryClient = new QueryClient()

export default function RootQueryClientProvider({
  children,
}: {
  children: ReactNode
}) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
