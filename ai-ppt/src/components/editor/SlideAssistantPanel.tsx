'use client'

import { Button } from '#/components/ui/button'
import type { EditableSlide } from '@/components/editor/SlideEditorCard'
import { Bot, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type SlideAssistantPanelProps = {
  presentationId: string
  slides: EditableSlide[]
  selectedSlideId: string | null
  onSelectSlide: (slideId: string) => void
  onSlideApplied: (slide: EditableSlide) => void
}

type Suggestion = {
  title: string
  intent: string
  bullets: string[]
  speakerNotes: string
}

export default function SlideAssistantPanel({
  presentationId,
  slides,
  selectedSlideId,
  onSelectSlide,
  onSlideApplied,
}: SlideAssistantPanelProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)

  const selectedSlide = useMemo(
    () => slides.find((slide) => slide.id === selectedSlideId) ?? null,
    [slides, selectedSlideId],
  )

  const runAssistant = async (apply: boolean) => {
    if (!selectedSlide) {
      toast.error('Select a slide to continue.')
      return
    }
    if (!message.trim()) {
      toast.error('Add an instruction for the assistant.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(
        `/api/presentations/${presentationId}/slides/${selectedSlide.id}/chat`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message, apply }),
        },
      )
      const payload = (await response.json()) as {
        error?: string
        summary?: string
        suggestion?: Suggestion
        applied?: EditableSlide
      }

      if (!response.ok) {
        toast.error(payload.error ?? 'Assistant failed.')
        return
      }

      if (payload.summary) setSummary(payload.summary)
      if (payload.suggestion) setSuggestion(payload.suggestion)
      if (payload.applied) {
        onSlideApplied(payload.applied)
        toast.success('Assistant suggestion applied.')
      } else {
        toast.success('Suggestion ready. Apply when you are ready.')
      }
    } catch {
      toast.error('Assistant request failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <aside className="rounded-3xl border border-border/70 bg-card/90 p-4 lg:sticky lg:top-24">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Bot size={16} />
        </div>
        <div>
          <p className="text-sm font-semibold">Improve this slide</p>
          <p className="text-xs text-muted-foreground">
            Assistant is scoped to the selected slide.
          </p>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Slide
        </p>
        <select
          value={selectedSlideId ?? ''}
          onChange={(e) => onSelectSlide(e.target.value)}
          className="h-10 w-full rounded-xl border border-border/70 bg-background/80 px-3 text-sm outline-none"
        >
          {slides.map((slide) => (
            <option key={slide.id} value={slide.id}>
              Slide {slide.position + 1}: {slide.title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Instruction
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Example: make this slide shorter and more formal for senior executives."
          className="w-full resize-y rounded-2xl border border-border/70 bg-background/80 px-3 py-2 text-sm outline-none"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => void runAssistant(false)}
        >
          {isSubmitting ? 'Thinking...' : 'Suggest'}
        </Button>
        <Button
          size="sm"
          disabled={isSubmitting}
          onClick={() => void runAssistant(true)}
        >
          <Sparkles size={14} className="mr-1.5" />
          {isSubmitting ? 'Applying...' : 'Suggest + apply'}
        </Button>
      </div>

      {summary ? (
        <div className="mt-4 rounded-xl border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
          {summary}
        </div>
      ) : null}

      {suggestion ? (
        <div className="mt-3 space-y-2 rounded-xl border border-border/60 bg-background/70 p-3">
          <p className="text-xs font-semibold text-foreground">{suggestion.title}</p>
          <p className="text-xs text-muted-foreground">{suggestion.intent}</p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {suggestion.bullets.slice(0, 3).map((bullet, index) => (
              <li key={`${bullet}-${index}`}>{bullet}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  )
}
