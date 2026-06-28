import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import Navbar from '@/components/navbar'
import Footer from '@/components/Footer'
import { ThemeProvider } from '@/providers/theme-provider'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import QueryClientProvider from '@/integrations/tanstack-query/root-provider'
import { Toaster } from '#/components/ui/sonner'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Kodexa.ai — AI Presentation Studio',
      },
      {
        name: 'description',
        content:
          'Kodexa.ai helps you create polished AI-powered presentation decks in minutes with flexible templates, image generation, and rapid export.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/kodexa-mark.svg',
      },
    ],
  }),
  component: RootLayout,
  shellComponent: RootDocument,
})

function RootLayout() {
  return (
    <ThemeProvider defaultMode="dark" defaultColorTheme="midnight">
      <div className="flex min-h-svh flex-col">
        <Navbar />
        <div className="flex-1">
          <Outlet />
        </div>
        <Footer />
      </div>
    </ThemeProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="dark"
      data-color-theme="midnight"
    >
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased bg-background text-foreground selection:bg-primary/20">
        <QueryClientProvider>
          {children}
          <Toaster closeButton position="top-center" richColors />
          <Scripts />
        </QueryClientProvider>
      </body>
    </html>
  )
}
