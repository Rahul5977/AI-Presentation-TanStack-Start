import { Button } from '#/components/ui/button'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, FileText, Layers, Plus, Sparkles, Zap } from 'lucide-react'

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
  isLoading?: boolean
}

const statusClasses: Record<PresentationHistoryItem['status'], string> = {
  DRAFT: 'bg-muted/70 text-muted-foreground',
  QUEUED: 'bg-sky-500/20 text-sky-700 dark:text-sky-300',
  GENERATING: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  READY: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  FAILED: 'bg-destructive/20 text-destructive',
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  const diffMs = Date.now() - timestamp
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) return 'Just now'
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export default function PresentationHistorySidebar({
  items,
  onNewPresentation,
  onOpenPresentation,
  isLoading = false,
}: PresentationHistorySidebarProps) {
  const readyCount = items.filter((item) => item.status === 'READY').length

  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-24 overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-2xl shadow-black/20 backdrop-blur-xl"
    >
      <div className="border-b border-border/60 p-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Layers className="size-3.5" />
          Library
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Your decks</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {readyCount} ready · {items.length} total
            </p>
          </div>
          <Button
            size="icon-sm"
            onClick={onNewPresentation}
            className="rounded-xl shadow-lg shadow-primary/25"
            aria-label="New presentation"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-[60vh] space-y-2.5 overflow-y-auto p-4">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <div key="loading" className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl border border-border/50 bg-muted/50"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-2xl border border-dashed border-border/80 bg-background/60 p-5 text-center"
            >
              <div className="mx-auto inline-flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Sparkles className="size-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">No decks yet</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Your generated decks will appear here.
              </p>
              <button
                type="button"
                onClick={onNewPresentation}
                className="mt-3 text-xs font-semibold text-primary hover:underline"
              >
                Create first deck
              </button>
            </motion.div>
          ) : (
            items.map((item, index) => (
              <motion.button
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                type="button"
                onClick={() => onOpenPresentation(item.id)}
                className="group w-full rounded-2xl border border-border/70 bg-background/60 p-3.5 text-left transition-all duration-200 hover:border-primary/35 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex items-start gap-3">
                  <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <FileText className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground transition-colors group-hover:text-primary">
                        {item.title}
                      </h3>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          statusClasses[item.status],
                        )}
                      >
                        <span
                          className={cn(
                            'size-1.5 rounded-full bg-current',
                            item.status === 'GENERATING' && 'animate-pulse',
                          )}
                        />
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3.5" />
                      {formatRelativeTime(item.lastEditedAt)}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))
          )}
        </AnimatePresence>
      </div>

      {items.length > 0 ? (
        <div className="border-t border-border/60 px-4 py-3">
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="size-3.5 text-primary" />
            Click any deck to open the editor
          </p>
        </div>
      ) : null}
    </motion.aside>
  )
}
