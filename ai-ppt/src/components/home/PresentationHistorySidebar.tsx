import { Button } from '#/components/ui/button'
import { cn } from '@/lib/utils'
import { FileText, Plus } from 'lucide-react'

export type PresentationHistoryItem = {
  id: string
  title: string
  status: 'DRAFT' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED'
  lastEditedAt: string
}

type PresentationHistorySidebarProps = {
  items: PresentationHistoryItem[]
  onNewPresentation: () => void
  onOpenPresentation: (presentationId: string) => void
}

const statusClasses: Record<PresentationHistoryItem['status'], string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  QUEUED: 'bg-sky-500/20 text-sky-700 dark:text-sky-300',
  GENERATING: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  READY: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  FAILED: 'bg-destructive/20 text-destructive',
}

export default function PresentationHistorySidebar({
  items,
  onNewPresentation,
  onOpenPresentation,
}: PresentationHistorySidebarProps) {
  return (
    <aside className="sticky top-24 rounded-[2rem] border border-border/60 bg-card/90 p-5 shadow-2xl shadow-black/5 ring-1 ring-white/10 backdrop-blur dark:shadow-black/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Library
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            Your presentations
          </h2>
        </div>
        <Button
          size="icon-sm"
          onClick={onNewPresentation}
          className="rounded-2xl"
          aria-label="New presentation"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/80 bg-background/60 p-5 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileText className="size-5" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              No decks yet
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Create your first presentation and it will appear here.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenPresentation(item.id)}
              className="w-full rounded-3xl border border-border/70 bg-background/70 p-4 text-left transition hover:border-primary/30 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
                  {item.title}
                </h3>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    statusClasses[item.status],
                  )}
                >
                  {item.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Last edited{' '}
                {new Date(item.lastEditedAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </button>
          ))
        )}
      </div>
    </aside>
  )
}
