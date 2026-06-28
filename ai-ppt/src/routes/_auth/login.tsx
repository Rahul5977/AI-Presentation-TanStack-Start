import LoginForm from '#/components/auth/login-form'
import { KodexaLogoMark, KodexaWordmark } from '@/components/brand/KodexaLogo'
import { authClient } from '#/lib/auth-client'
import { getSession } from '#/lib/auth-function'
import { AUTH_HOME_PATH } from '#/lib/auth-path'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  BarChart3,
  BrainCircuit,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useEffect } from 'react'
import { z } from 'zod'

export const Route = createFileRoute('/_auth/login')({
  beforeLoad: async () => {
    const session = await getSession()

    if (session) {
      throw redirect({ to: AUTH_HOME_PATH })
    }
  },
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect: redirectTo } = Route.useSearch()
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()

  useEffect(() => {
    if (!session) return
    void navigate({ to: AUTH_HOME_PATH })
  }, [navigate, session])

  const features = [
    {
      title: 'AI Outlines',
      description: 'Structured story flow from one prompt.',
      Icon: BrainCircuit,
    },
    {
      title: 'Flexible Layouts',
      description: 'Modern slide styles for every narrative.',
      Icon: Layers,
    },
    {
      title: 'Usage Insights',
      description: 'Track decks, exports, and generation trends.',
      Icon: BarChart3,
    },
    {
      title: 'Fast Generation',
      description: 'Create review-ready decks in minutes.',
      Icon: Zap,
    },
  ] as const

  return (
    <div className="min-h-screen lg:flex">
      <section className="relative hidden overflow-hidden border-r border-border/60 bg-card lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-10 xl:w-3/5">
        <div className="pointer-events-none absolute -left-20 -top-24 size-80 rounded-full bg-primary/15 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 size-80 rounded-full bg-primary/10 blur-[80px]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/25" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-104 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <Link to="/" className="inline-flex items-center gap-3 no-underline">
            <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/25">
              <KodexaLogoMark variant="onPrimary" className="size-10" />
            </div>
            <div>
              <p className="text-2xl font-semibold">
                <KodexaWordmark />
              </p>
              <p className="text-sm text-muted-foreground">AI Presentation Studio</p>
            </div>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="relative mx-auto w-full max-w-2xl"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            AI Presentation Studio
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground xl:text-5xl">
            Create decks that <span className="gradient-text">impress</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Build high-impact presentations with AI-assisted structure, content, and visuals
            tuned for your audience.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map(({ title, description, Icon }, index) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + index * 0.05 }}
                className="glass rounded-2xl p-4"
              >
                <div className="mb-3 inline-flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="size-4.5" />
                </div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              </motion.article>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative inline-flex items-center gap-2 text-sm text-emerald-400"
        >
          <span className="size-2 rounded-full bg-emerald-400" />
          First presentation is completely free.
        </motion.p>
      </section>

      <section className="flex flex-1 items-center justify-center px-4 pb-10 pt-24 sm:px-6 lg:px-8 lg:pt-28">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2.5 no-underline">
              <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <KodexaLogoMark variant="onPrimary" className="size-8" />
              </div>
            </Link>
            <h1 className="mt-2 text-lg font-semibold">
              <KodexaWordmark />
            </h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-3xl p-8"
          >
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to continue creating beautiful decks.
              </p>
            </div>
            <LoginForm redirectTo={redirectTo} />
            <p className="mt-6 text-center text-xs text-muted-foreground">
              By continuing, you agree to our{' '}
              <Link to="/terms-and-conditions" className="text-primary hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy-policy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </motion.div>

          <p className="flex items-center justify-center gap-2 text-xs text-emerald-500">
            <span className="size-2 rounded-full bg-emerald-500" />
            First deck free · ₹20 per additional deck
          </p>
        </div>
      </section>
    </div>
  )
}