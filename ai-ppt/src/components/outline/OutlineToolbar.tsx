import { Button } from '#/components/ui/button'
import { RefreshCcw, Sparkles } from 'lucide-react'

type OutlineToolbarProps = {
  title: string
  updatedAt: string
  isRegenerating: boolean
  isGeneratingPresentation: boolean
  onRegenerate: () => void
  onAddSlide: () => void
  onGeneratePresentation: () => void
}

export default function OutlineToolbar({
  title,
  updatedAt,
  isRegenerating,
  isGeneratingPresentation,
  onRegenerate,
  onAddSlide,
  onGeneratePresentation,
}: OutlineToolbarProps) {
  return (
    <header className="sticky top-20 z-10 rounded-3xl border border-border/70 bg-card/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Last updated{' '}
            {new Date(updatedAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={onAddSlide}>
            Add slide
          </Button>
          <Button type="button" variant="outline" onClick={onRegenerate} disabled={isRegenerating}>
            <RefreshCcw className="size-4" />
            {isRegenerating ? 'Regenerating...' : 'Regenerate outline'}
          </Button>
          <Button
            type="button"
            onClick={onGeneratePresentation}
            disabled={isGeneratingPresentation}
          >
            <Sparkles className="size-4" />
            {isGeneratingPresentation ? 'Queuing jobs...' : 'Generate Presentation'}
          </Button>
        </div>
      </div>
    </header>
  )
}
