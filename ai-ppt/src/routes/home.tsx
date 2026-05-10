import HomeHero from '@/components/home/HomeHero'
import PromptComposer from '@/components/home/PromptComposer'
import PresentationHistorySidebar from '@/components/home/PresentationHistorySidebar'
import { authClient } from '@/lib/auth-client'
import { AUTH_LOGIN_PATH } from '@/lib/auth-path'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { PresentationFormValues } from '@/components/home/PromptComposer'
import type { PresentationHistoryItem } from '@/components/home/PresentationHistorySidebar'

import { getSession } from '#/lib/auth-function'

const defaultFormValues: PresentationFormValues = {
  prompt: '',
  audience: 'GENERAL',
  tone: 'EDUCATIONAL',
  lengthPreset: 'MEDIUM',
  language: 'English',
  template: 'MINIMAL_MONO',
  imageStyle: 'ILLUSTRATION',
  depth: 'BALANCED',
}

function normalizePresentationPayload(
  values: PresentationFormValues,
): PresentationFormValues {
  const prompt = values.prompt.trim()
  const next: PresentationFormValues = {
    ...values,
    prompt,
  }

  if (next.lengthPreset !== 'CUSTOM') {
    delete next.customSlideCount
  } else if (
    next.customSlideCount !== undefined &&
    (!Number.isFinite(next.customSlideCount) ||
      next.customSlideCount < 1 ||
      next.customSlideCount > 60)
  ) {
    delete next.customSlideCount
  }

  if (next.audience !== 'CUSTOM') {
    delete next.audienceCustom
  }

  return next
}

export const Route = createFileRoute('/home')({
  beforeLoad: async ({ location }) => {
    const session = await getSession()

    if (!session) {
      throw redirect({
        to: AUTH_LOGIN_PATH,
        search: { redirect: location.href },
      })
    }
  },
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const { data } = authClient.useSession()
  const [formValues, setFormValues] =
    useState<PresentationFormValues>(defaultFormValues)
  const [history, setHistory] = useState<PresentationHistoryItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)

  const firstName = useMemo(() => {
    const full = data?.user.name.trim() ?? ''
    if (!full) return undefined
    return full.split(/\s+/)[0]
  }, [data])

  const loadHistory = useCallback(async () => {
    try {
      setIsHistoryLoading(true)
      const response = await fetch('/api/presentations/history')
      if (!response.ok) {
        throw new Error('Failed to load presentations')
      }
      const payload = (await response.json()) as {
        items: PresentationHistoryItem[]
      }
      setHistory(payload.items)
    } catch {
      toast.error('Could not load your presentation history.')
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const handleGenerate = useCallback(async () => {
    try {
      setIsSubmitting(true)
      const payload = normalizePresentationPayload(formValues)
      const response = await fetch('/api/presentations/outline', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      })
      const result = (await response.json()) as {
        error?: string
        draftId?: string
      }
      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Your session expired. Please sign in again.')
          return
        }
        if (response.status === 400 && result.error === 'Invalid payload') {
          toast.error(
            'Some options look invalid. Check custom slide count or your brief and try again.',
          )
          return
        }
        toast.error(
          result.error ?? 'Unable to create presentation. Please try again.',
        )
        return
      }
      if (!result.draftId) {
        toast.error('Outline was created but draft id is missing.')
        return
      }
      toast.success('Outline draft created.')
      setFormValues(defaultFormValues)
      await loadHistory()
      await navigate({
        to: '/outline/$draftId',
        params: { draftId: result.draftId },
      })
    } catch {
      toast.error('Unable to create presentation. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [formValues, loadHistory, navigate])

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-6 top-0 -z-10 h-96 rounded-full bg-linear-to-br from-primary/15 via-transparent to-primary/10 blur-3xl" />
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="space-y-6"
        >
          <HomeHero firstName={firstName} />
          <PromptComposer
            values={formValues}
            onChange={setFormValues}
            onSubmit={handleGenerate}
            isSubmitting={isSubmitting}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
        >
          <PresentationHistorySidebar
            items={isHistoryLoading ? [] : history}
            onNewPresentation={() => setFormValues(defaultFormValues)}
          />
        </motion.section>
      </div>
    </main>
  )
}
