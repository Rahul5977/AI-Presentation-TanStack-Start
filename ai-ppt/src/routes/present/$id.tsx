import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { AUTH_LOGIN_PATH } from '@/lib/auth-path'
import { getSession } from '@/lib/auth-function'
import { getTemplateByKind } from '@/templates/registry'
import type { TemplateKind } from '@/templates/schema'
import SlideRenderer from '@/components/slides/SlideRenderer'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { X, ChevronLeft, ChevronRight, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

type PresentSlide = {
  id: string
  position: number
  title: string
  intent: string
  bullets: unknown
  visualConcept: string
  speakerNotes: string | null
  layoutHints: unknown
  imageUrl: string | null
}

type PresentPresentation = {
  presentationId: string
  title: string
  template: TemplateKind
  slides: PresentSlide[]
}

export const Route = createFileRoute('/present/$id')({
  beforeLoad: async ({ location }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({
        to: AUTH_LOGIN_PATH,
        search: { redirect: location.href },
      })
    }
  },
  component: PresentModePage,
})

function PresentModePage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const [presentation, setPresentation] = useState<PresentPresentation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showNotes, setShowNotes] = useState(false)
  const [, setIsFullscreen] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/presentations/${id}/`)
        const data = (await res.json()) as PresentPresentation & { status?: string }
        if (!res.ok) throw new Error('Failed to load presentation')
        setPresentation(data)
      } catch {
        toast.error('Could not load presentation for presenting.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [id])

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

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        prev()
      } else if (e.key === 'Escape') {
        void navigate({ to: '/presentation/$id', params: { id } })
      } else if (e.key === 'n' || e.key === 'N') {
        setShowNotes((p) => !p)
      } else if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          void document.documentElement.requestFullscreen()
          setIsFullscreen(true)
        } else {
          void document.exitFullscreen()
          setIsFullscreen(false)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev, navigate, id])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const currentSlide = useMemo(
    () => (presentation ? presentation.slides[currentIndex] : null),
    [presentation, currentIndex],
  )

  const template = useMemo(
    () => getTemplateByKind(presentation?.template ?? 'MINIMAL_MONO'),
    [presentation?.template],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-white/50">Loading…</p>
      </div>
    )
  }

  if (!presentation || !currentSlide) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-white/50">Could not load presentation.</p>
      </div>
    )
  }

  const totalSlides = presentation.slides.length

  return (
    <div
      className="flex min-h-screen flex-col bg-black"
      style={{ userSelect: 'none' }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-white/40">
        <span className="truncate font-medium text-white/60">{presentation.title}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowNotes((p) => !p)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:text-white',
              showNotes && 'text-white',
            )}
            title="Toggle speaker notes (N)"
          >
            <Monitor size={12} />
            Notes
          </button>
          <button
            type="button"
            onClick={() => void navigate({ to: '/presentation/$id', params: { id } })}
            className="flex items-center gap-1 rounded-md px-2 py-1 hover:text-white"
            title="Exit presentation (Esc)"
          >
            <X size={12} />
            Exit
          </button>
        </div>
      </div>

      {/* ── Main slide area ──────────────────────────────────────────────── */}
      <div className="relative flex flex-1 items-center justify-center p-6">
        {/* Prev arrow */}
        <button
          type="button"
          onClick={prev}
          disabled={currentIndex === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/30 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronLeft size={28} />
        </button>

        {/* Slide */}
        <div
          className="w-full max-w-5xl"
          onClick={next}
          style={{ cursor: currentIndex < totalSlides - 1 ? 'pointer' : 'default' }}
        >
          <SlideRenderer slide={currentSlide} template={template} />
        </div>

        {/* Next arrow */}
        <button
          type="button"
          onClick={next}
          disabled={currentIndex >= totalSlides - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/30 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {/* ── Speaker notes ────────────────────────────────────────────────── */}
      {showNotes && currentSlide.speakerNotes && (
        <div className="border-t border-white/10 bg-black/80 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
            Speaker notes
          </p>
          <p className="mt-1 max-h-28 overflow-y-auto text-sm text-white/70">
            {currentSlide.speakerNotes}
          </p>
        </div>
      )}

      {/* ── Bottom navigation bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3">
        {/* Slide dots */}
        <div className="flex gap-1.5">
          {presentation.slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === currentIndex
                  ? 'w-5 bg-white'
                  : 'w-1.5 bg-white/25 hover:bg-white/50',
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <span className="text-xs text-white/30">
          {currentIndex + 1} / {totalSlides}
          <span className="ml-3 hidden sm:inline opacity-50">
            ← → to navigate · N notes · F fullscreen · Esc exit
          </span>
        </span>
      </div>
    </div>
  )
}
