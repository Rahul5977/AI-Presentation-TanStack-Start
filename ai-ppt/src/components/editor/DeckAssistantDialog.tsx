import { useState } from 'react'
import { Bot, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Turn = { role: 'user' | 'agent'; text: string }

const SUGGESTIONS = [
  'Make the whole deck more concise',
  'Add a slide about pricing after the solution',
  'Reorder so the demo comes before pricing',
  'Restyle the deck to Midnight Pro',
]

export default function DeckAssistantDialog({
  open,
  onOpenChange,
  presentationId,
  onApplied,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  presentationId: string
  onApplied: () => void
}) {
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || busy) return
    setTurns((t) => [...t, { role: 'user', text: message }])
    setInput('')
    setBusy(true)
    try {
      const res = await fetch(`/api/presentations/${presentationId}/agent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ message }),
      })
      const data = (await res.json().catch(() => ({}))) as { summary?: string; error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'The deck assistant could not complete that.')
        setTurns((t) => [...t, { role: 'agent', text: data.error ?? 'Something went wrong.' }])
        return
      }
      setTurns((t) => [...t, { role: 'agent', text: data.summary ?? 'Done.' }])
      onApplied()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-5 text-primary" />
            Deck Assistant
          </DialogTitle>
          <DialogDescription>
            Ask the AI to edit your whole deck — add, rewrite, reorder, delete slides, or restyle it.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {turns.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  disabled={busy}
                  className="rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            turns.map((turn, i) => (
              <div
                key={i}
                className={
                  turn.role === 'user'
                    ? 'ml-auto max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground'
                    : 'mr-auto max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm'
                }
              >
                {turn.role === 'agent' ? (
                  <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="size-3" /> Assistant
                  </span>
                ) : null}
                {turn.text}
              </div>
            ))
          )}
          {busy ? (
            <div className="mr-auto max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              Working on your deck…
            </div>
          ) : null}
        </div>

        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send(input)
              }
            }}
            rows={2}
            placeholder="e.g. Add a competitor-comparison slide and tighten every bullet"
            className="flex-1 resize-none rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
          <Button onClick={() => void send(input)} disabled={busy || !input.trim()} size="icon" className="rounded-xl">
            <Send className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
