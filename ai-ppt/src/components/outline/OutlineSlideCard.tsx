import { Button } from '#/components/ui/button'
import { GripVertical, Trash2 } from 'lucide-react'

import type { OutlineSlide } from '@/components/outline/types'

type OutlineSlideCardProps = {
  slide: OutlineSlide
  isSaving?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
  onChange: (next: OutlineSlide) => void
  onDelete: (slideId: string) => void
}

function bulletsToText(bullets: string[]) {
  return bullets.join('\n')
}

function textToBullets(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export default function OutlineSlideCard({
  slide,
  isSaving = false,
  dragHandleProps,
  onChange,
  onDelete,
}: OutlineSlideCardProps) {
  return (
    <article className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Reorder slide"
            className="rounded-xl border border-border/70 p-2 text-muted-foreground"
            {...dragHandleProps}
          >
            <GripVertical className="size-4" />
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Slide {slide.position + 1}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onDelete(slide.id)}
          aria-label="Delete slide"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="grid gap-3">
        <input
          value={slide.title}
          onChange={(event) => onChange({ ...slide, title: event.target.value })}
          placeholder="Slide title"
          className="h-11 rounded-xl border border-border/70 bg-background/80 px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
        />
        <input
          value={slide.intent}
          onChange={(event) => onChange({ ...slide, intent: event.target.value })}
          placeholder="Slide intent / objective"
          className="h-11 rounded-xl border border-border/70 bg-background/80 px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
        />
        <textarea
          value={bulletsToText(slide.bullets)}
          onChange={(event) =>
            onChange({ ...slide, bullets: textToBullets(event.target.value) })
          }
          rows={4}
          placeholder="One bullet per line"
          className="w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
        />
        <input
          value={slide.visualConcept}
          onChange={(event) =>
            onChange({ ...slide, visualConcept: event.target.value })
          }
          placeholder="Suggested visual concept"
          className="h-11 rounded-xl border border-border/70 bg-background/80 px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
        />
        <textarea
          value={slide.speakerNotesHint ?? ''}
          onChange={(event) =>
            onChange({
              ...slide,
              speakerNotesHint: event.target.value || null,
            })
          }
          rows={2}
          placeholder="Speaker notes hint (optional)"
          className="w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
        />
      </div>

      {isSaving ? (
        <p className="mt-2 text-xs text-muted-foreground">Saving changes...</p>
      ) : null}
    </article>
  )
}
