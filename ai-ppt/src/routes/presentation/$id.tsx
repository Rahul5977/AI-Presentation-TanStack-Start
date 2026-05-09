import { AUTH_LOGIN_PATH } from '@/lib/auth-path'
import { getSession } from '@/lib/auth-function'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

type SlideProgress = {
  id: string
  position: number
  title: string
  status: 'PENDING' | 'CONTENT_READY' | 'IMAGE_READY' | 'READY' | 'FAILED'
  imageUrl: string | null
}

type PresentationProgress = {
  presentationId: string
  title: string
  status: 'DRAFT' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED'
  slides: SlideProgress[]
}

const slideStatusLabel: Record<SlideProgress['status'], string> = {
  PENDING: 'Queued',
  CONTENT_READY: 'Writing content done',
  IMAGE_READY: 'Image done',
  READY: 'Ready',
  FAILED: 'Failed',
}

export const Route = createFileRoute('/presentation/$id')({
  beforeLoad: async ({ location }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({
        to: AUTH_LOGIN_PATH,
        search: { redirect: location.href },
      })
    }
  },
  component: PresentationProgressPage,
})

function PresentationProgressPage() {
  const { id } = Route.useParams()
  const [presentation, setPresentation] = useState<PresentationProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const lastStatusRef = useRef<PresentationProgress['status'] | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/presentations/${id}/`)
        const payload = (await response.json()) as
          | PresentationProgress
          | { error: string }
        if (!mounted) return
        if (!response.ok || 'error' in payload) {
          throw new Error(
            'error' in payload ? payload.error : 'Failed to load presentation.',
          )
        }
        setPresentation(payload)
      } catch (error) {
        if (mounted) {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Could not load presentation progress.',
          )
        }
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [id])

  useEffect(() => {
    const source = new EventSource(`/api/presentations/${id}/events`)

    source.addEventListener('snapshot', (event) => {
      if (!(event instanceof MessageEvent)) return
      const payload = JSON.parse(event.data) as PresentationProgress
      setPresentation(payload)
      lastStatusRef.current = payload.status
    })

    source.addEventListener('progress', (event) => {
      if (!(event instanceof MessageEvent)) return
      const payload = JSON.parse(event.data) as
        | {
            type: 'presentation.finalized'
            status: PresentationProgress['status']
            readyCount?: number
            totalSlides?: number
          }
        | {
            type: 'presentation.progress'
            status: PresentationProgress['status']
            readyCount?: number
            totalSlides?: number
          }
        | {
            type: 'slide.content.ready' | 'slide.image.generated' | 'slide.image.uploaded'
            slideId: string
            status: SlideProgress['status']
            imageUrl?: string
          }

      setPresentation((current) => {
        if (!current) return current

        if (
          payload.type === 'presentation.finalized' ||
          payload.type === 'presentation.progress'
        ) {
          return {
            ...current,
            status: payload.status,
          }
        }

        return {
          ...current,
          slides: current.slides.map((slide) =>
            slide.id === payload.slideId
              ? {
                  ...slide,
                  status: payload.status,
                  imageUrl: payload.imageUrl ?? slide.imageUrl,
                }
              : slide,
          ),
        }
      })
    })

    source.onerror = () => {
      source.close()
    }

    return () => {
      source.close()
    }
  }, [id])

  useEffect(() => {
    if (!presentation) return
    if (lastStatusRef.current === presentation.status) return

    if (presentation.status === 'READY') {
      toast.success('Presentation generation completed.')
    }
    if (presentation.status === 'FAILED') {
      toast.error('Presentation generation failed.')
    }
    lastStatusRef.current = presentation.status
  }, [presentation])

  const completionSummary = useMemo(() => {
    if (!presentation) return ''
    const readyCount = presentation.slides.filter((slide) => slide.status === 'READY')
      .length
    return `${readyCount}/${presentation.slides.length} slides ready`
  }, [presentation])

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Loading presentation timeline...</p>
      </main>
    )
  }

  if (!presentation) {
    return (
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          Could not load this presentation.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <header className="rounded-3xl border border-border/70 bg-card/90 p-5">
        <h1 className="text-2xl font-semibold tracking-tight">{presentation.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status: <span className="font-medium">{presentation.status}</span> ·{' '}
          {completionSummary}
        </p>
      </header>

      <section className="space-y-3">
        {presentation.slides.map((slide) => (
          <article
            key={slide.id}
            className="rounded-2xl border border-border/70 bg-background/70 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Slide {slide.position + 1}
                </p>
                <h2 className="text-base font-semibold">{slide.title}</h2>
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                {slideStatusLabel[slide.status]}
              </span>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
