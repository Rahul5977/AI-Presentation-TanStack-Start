'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { History, RotateCcw } from 'lucide-react'

type VersionEntry = {
  id: string
  label: string | null
  createdAt: string
  slideCount: number
}

type VersionHistoryDialogProps = {
  open: boolean
  onClose: () => void
  presentationId: string
  onRestored: () => void
}

export default function VersionHistoryDialog({
  open,
  onClose,
  presentationId,
  onRestored,
}: VersionHistoryDialogProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/presentations/${presentationId}/versions/`)
      const data = (await res.json()) as { versions?: VersionEntry[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to load versions')
      setVersions(data.versions ?? [])
    } catch {
      toast.error('Could not load version history.')
    } finally {
      setIsLoading(false)
    }
  }, [presentationId])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const restore = async (versionId: string) => {
    setRestoringId(versionId)
    try {
      const res = await fetch(
        `/api/presentations/${presentationId}/versions/${versionId}/restore`,
        { method: 'POST' },
      )
      if (!res.ok) throw new Error('Restore failed')
      toast.success('Version restored.')
      onRestored()
      onClose()
    } catch {
      toast.error('Could not restore this version.')
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History size={16} />
            Version history
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-1">
          {isLoading && (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
          )}
          {!isLoading && versions.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No saved versions yet. Versions are captured automatically as you edit.
            </p>
          )}
          {versions.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {v.label ?? 'Auto-saved snapshot'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })} ·{' '}
                  {v.slideCount} slides
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={restoringId === v.id}
                onClick={() => void restore(v.id)}
                title="Restore this version"
              >
                <RotateCcw size={14} />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
