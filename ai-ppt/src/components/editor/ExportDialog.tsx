'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download, FileText } from 'lucide-react'
import { toast } from 'sonner'

type ExportDialogProps = {
  open: boolean
  onClose: () => void
  presentationId: string
}

type Format = {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  available: boolean
}

const FORMATS: Format[] = [
  {
    id: 'pptx',
    label: 'PowerPoint (.pptx)',
    description: 'Edit in Microsoft PowerPoint or Google Slides',
    icon: <FileText size={18} />,
    available: true,
  },
]

export default function ExportDialog({ open, onClose, presentationId }: ExportDialogProps) {
  const [downloading, setDownloading] = useState<string | null>(null)

  const download = async (format: string) => {
    setDownloading(format)
    try {
      const res = await fetch(`/api/presentations/${presentationId}/export?format=${format}`)
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? 'Export failed')
      }

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = /filename="([^"]+)"/.exec(disposition)
      const filename = match?.[1] ?? `presentation.${format}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Downloading ${filename}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={16} />
            Export presentation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-1">
          {FORMATS.map((fmt) => (
            <button
              key={fmt.id}
              type="button"
              disabled={!fmt.available || downloading === fmt.id}
              onClick={() => fmt.available && void download(fmt.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3 text-left transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-muted-foreground">{fmt.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{fmt.label}</p>
                <p className="text-xs text-muted-foreground">{fmt.description}</p>
              </div>
              {downloading === fmt.id && (
                <span className="text-xs text-muted-foreground">Preparing…</span>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
