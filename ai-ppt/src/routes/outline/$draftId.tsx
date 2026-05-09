import OutlineSlideList from '@/components/outline/OutlineSlideList'
import OutlineToolbar from '@/components/outline/OutlineToolbar'
import type { OutlineDraft, OutlineSlide } from '@/components/outline/types'
import { AUTH_LOGIN_PATH } from '@/lib/auth-path'
import { getSession } from '@/lib/auth-function'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/outline/$draftId')({
  beforeLoad: async ({ location }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({
        to: AUTH_LOGIN_PATH,
        search: { redirect: location.href },
      })
    }
  },
  component: OutlineRouteComponent,
})

function reorderLocalSlides(slides: OutlineSlide[], slideIds: string[]) {
  const lookup = new Map(slides.map((slide) => [slide.id, slide]))
  return slideIds
    .map((id, index) => {
      const slide = lookup.get(id)
      if (!slide) return null
      return {
        ...slide,
        position: index,
      }
    })
    .filter((slide): slide is OutlineSlide => slide !== null)
}

function OutlineRouteComponent() {
  const { draftId } = Route.useParams()
  const navigate = useNavigate()

  const [draft, setDraft] = useState<OutlineDraft | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [savingSlideId, setSavingSlideId] = useState<string | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadDraft = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/drafts/${draftId}/`)
      const payload = (await response.json()) as OutlineDraft | { error: string }
      if (!response.ok || 'error' in payload) {
        throw new Error(
          'error' in payload ? payload.error : 'Could not load draft outline.',
        )
      }
      setDraft(payload)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load draft.')
    } finally {
      setIsLoading(false)
    }
  }, [draftId])

  useEffect(() => {
    void loadDraft()
  }, [loadDraft])

  const saveSlide = useCallback(
    async (slide: OutlineSlide) => {
      setSavingSlideId(slide.id)
      try {
        const response = await fetch(`/api/drafts/${draftId}/`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'update-slide',
            slideId: slide.id,
            data: {
              title: slide.title.trim(),
              intent: slide.intent.trim(),
              bullets: slide.bullets,
              visualConcept: slide.visualConcept.trim(),
              speakerNotesHint: slide.speakerNotesHint,
            },
          }),
        })
        if (!response.ok) {
          throw new Error('Failed to save slide changes.')
        }
      } catch {
        toast.error('Could not save this slide yet. Please retry.')
      } finally {
        setSavingSlideId(null)
      }
    },
    [draftId],
  )

  const handleSlideChange = useCallback(
    (nextSlide: OutlineSlide) => {
      setDraft((current) => {
        if (!current) return current
        return {
          ...current,
          slides: current.slides.map((slide) =>
            slide.id === nextSlide.id ? nextSlide : slide,
          ),
        }
      })

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        void saveSlide(nextSlide)
      }, 500)
    },
    [saveSlide],
  )

  const handleReorder = useCallback(
    async (slideIds: string[]) => {
      setDraft((current) => {
        if (!current) return current
        return {
          ...current,
          slides: reorderLocalSlides(current.slides, slideIds),
        }
      })

      try {
        const response = await fetch(`/api/drafts/${draftId}/`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'reorder',
            slideIds,
          }),
        })
        if (!response.ok) {
          throw new Error('Failed to reorder slides.')
        }
      } catch {
        toast.error('Could not reorder slides. Refresh and try again.')
      }
    },
    [draftId],
  )

  const handleDeleteSlide = useCallback(
    async (slideId: string) => {
      try {
        const response = await fetch(`/api/drafts/${draftId}/slides/${slideId}`, {
          method: 'DELETE',
        })
        const payload = (await response.json()) as OutlineDraft | { error: string }
        if (!response.ok || 'error' in payload) {
          throw new Error(
            'error' in payload ? payload.error : 'Could not delete this slide.',
          )
        }
        setDraft(payload)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not delete slide.')
      }
    },
    [draftId],
  )

  const handleAddSlide = useCallback(async () => {
    try {
      const response = await fetch(`/api/drafts/${draftId}/slides/`, {
        method: 'POST',
      })
      const payload = (await response.json()) as OutlineDraft | { error: string }
      if (!response.ok || 'error' in payload) {
        throw new Error(
          'error' in payload ? payload.error : 'Could not add a new slide.',
        )
      }
      setDraft(payload)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add slide.')
    }
  }, [draftId])

  const handleRegenerate = useCallback(async () => {
    try {
      setIsRegenerating(true)
      const response = await fetch(`/api/drafts/${draftId}/regenerate`, {
        method: 'POST',
      })
      const payload = (await response.json()) as OutlineDraft | { error: string }
      if (!response.ok || 'error' in payload) {
        throw new Error(
          'error' in payload ? payload.error : 'Outline regeneration failed.',
        )
      }
      setDraft(payload)
      toast.success('Outline regenerated.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not regenerate outline.',
      )
    } finally {
      setIsRegenerating(false)
    }
  }, [draftId])

  const handleGeneratePresentation = useCallback(async () => {
    try {
      setIsGeneratingPresentation(true)
      const response = await fetch(`/api/drafts/${draftId}/generate`, {
        method: 'POST',
      })
      const payload = (await response.json()) as
        | { presentationId: string }
        | { error: string }
      if (!response.ok || 'error' in payload) {
        throw new Error(
          'error' in payload ? payload.error : 'Could not start presentation generation.',
        )
      }
      await navigate({ to: '/presentation/$id', params: { id: payload.presentationId } })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not queue generation jobs.',
      )
    } finally {
      setIsGeneratingPresentation(false)
    }
  }, [draftId, navigate])

  const slideCountLabel = useMemo(() => {
    if (!draft) return ''
    return `${draft.slides.length} slides in outline`
  }, [draft])

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Loading outline...</p>
      </main>
    )
  }

  if (!draft) {
    return (
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          Draft not found. Return to home and try again.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <OutlineToolbar
        title={draft.title}
        updatedAt={draft.updatedAt}
        isRegenerating={isRegenerating}
        isGeneratingPresentation={isGeneratingPresentation}
        onRegenerate={handleRegenerate}
        onAddSlide={handleAddSlide}
        onGeneratePresentation={handleGeneratePresentation}
      />

      <p className="text-sm text-muted-foreground">{slideCountLabel}</p>

      <OutlineSlideList
        slides={draft.slides}
        savingSlideId={savingSlideId}
        onSlideChange={handleSlideChange}
        onDeleteSlide={handleDeleteSlide}
        onReorder={handleReorder}
      />
    </main>
  )
}
