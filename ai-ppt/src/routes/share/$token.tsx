import { createFileRoute } from '@tanstack/react-router'
import { resolveTemplate } from '@/templates/theme'
import type { ThemeOverrides } from '@/templates/theme'
import type { TemplateKind } from '@/templates/schema'
import SlideRenderer from '@/components/slides/SlideRenderer'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type SharedSlide = {
  id: string
  position: number
  title: string
  intent: string
  bullets: unknown
  visualConcept: string
  speakerNotes: string | null
  layoutHints: unknown
  slideData: unknown
  imageUrl: string | null
  status: string
}

type SharedPresentation = {
  presentationId: string
  title: string
  template: TemplateKind
  themeOverrides?: ThemeOverrides | null
  slides: SharedSlide[]
}

export const Route = createFileRoute('/share/$token')({
  component: SharePage,
})

function SharePage() {
  const { token } = Route.useParams()
  const [presentation, setPresentation] = useState<SharedPresentation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/share/${token}`)
        const data = (await res.json()) as SharedPresentation | { error: string }
        if (!res.ok || 'error' in data) throw new Error('Not found')
        setPresentation(data)
      } catch {
        toast.error('This presentation is not available.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [token])

  const goTo = useCallback(
    (index: number) => {
      if (!presentation) return
      setCurrentIndex(Math.max(0, Math.min(index, presentation.slides.length - 1)))
    },
    [presentation],
  )

  const next = useCallback(() => {
    if (presentation) goTo(currentIndex + 1)
  }, [currentIndex, goTo, presentation])
  const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev])

  const currentSlide = useMemo(
    () => (presentation ? presentation.slides[currentIndex] : null),
    [presentation, currentIndex],
  )

  const resolved = useMemo(
    () => resolveTemplate(presentation?.template ?? 'MINIMAL_MONO', presentation?.themeOverrides ?? null),
    [presentation?.template, presentation?.themeOverrides],
  )
  const template = resolved.template

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading shared presentation…</p>
      </div>
    )
  }

  if (!presentation || !currentSlide) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-lg font-semibold">Presentation not found</p>
        <p className="text-sm text-muted-foreground">
          This link may have expired or sharing has been disabled.
        </p>
      </div>
    )
  }

  const totalSlides = presentation.slides.length

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/60 px-6 py-3 flex items-center justify-between">
        <h1 className="text-sm font-semibold truncate">{presentation.title}</h1>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} / {totalSlides}
        </span>
      </div>

      {/* Slide */}
      <div className="relative flex flex-1 items-center justify-center p-6">
        <button
          type="button"
          onClick={prev}
          disabled={currentIndex === 0}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground/40 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="w-full max-w-5xl">
          <SlideRenderer slide={currentSlide} template={template} logoUrl={resolved.logoUrl} />
        </div>

        <button
          type="button"
          onClick={next}
          disabled={currentIndex >= totalSlides - 1}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground/40 transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Dot nav */}
      <div className="flex justify-center gap-1.5 pb-6">
        {presentation.slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === currentIndex
                ? 'w-4 bg-foreground'
                : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60',
            )}
          />
        ))}
      </div>

      {/* Branding */}
      <p className="pb-3 text-center text-xs text-muted-foreground/40">
        Made with AI Presentation Builder
      </p>
    </div>
  )
}
