'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type RegenMode = 'content' | 'image'

type SlideRegenerateDialogProps = {
  open: boolean
  onClose: () => void
  onRegenContent: (overrides: { prompt?: string; tone?: string; depth?: string }) => Promise<void>
  onRegenImage: (overrides: { imageStyle?: string }) => Promise<void>
  currentTone?: string
  currentDepth?: string
  currentImageStyle?: string
}

const TONE_OPTIONS = [
  { value: 'FORMAL', label: 'Formal' },
  { value: 'CASUAL', label: 'Casual' },
  { value: 'PERSUASIVE', label: 'Persuasive' },
  { value: 'EDUCATIONAL', label: 'Educational' },
  { value: 'INSPIRATIONAL', label: 'Inspirational' },
]

const DEPTH_OPTIONS = [
  { value: 'HIGH_LEVEL', label: 'High-level' },
  { value: 'BALANCED', label: 'Balanced' },
  { value: 'DETAILED', label: 'Detailed' },
]

const IMAGE_STYLE_OPTIONS = [
  { value: 'REALISTIC', label: 'Realistic photo' },
  { value: 'ILLUSTRATION', label: 'Illustration' },
  { value: 'MINIMAL', label: 'Minimal' },
  { value: 'THREE_D', label: '3-D render' },
]

export default function SlideRegenerateDialog({
  open,
  onClose,
  onRegenContent,
  onRegenImage,
  currentTone = 'EDUCATIONAL',
  currentDepth = 'BALANCED',
  currentImageStyle = 'ILLUSTRATION',
}: SlideRegenerateDialogProps) {
  const [mode, setMode] = useState<RegenMode>('content')
  const [prompt, setPrompt] = useState('')
  const [tone, setTone] = useState(currentTone)
  const [depth, setDepth] = useState(currentDepth)
  const [imageStyle, setImageStyle] = useState(currentImageStyle)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      if (mode === 'content') {
        await onRegenContent({
          prompt: prompt.trim() || undefined,
          tone,
          depth,
        })
      } else {
        await onRegenImage({ imageStyle })
      }
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Regenerate slide</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Mode toggle */}
          <div className="flex gap-2 rounded-xl border border-border/60 bg-muted/30 p-1">
            {(['content', 'image'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'content' ? 'Content & text' : 'Image only'}
              </button>
            ))}
          </div>

          {mode === 'content' ? (
            <>
              <div className="space-y-1.5">
                <Label>Custom prompt (optional)</Label>
                <Textarea
                  placeholder="E.g. Focus more on market data and ROI figures"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Depth</Label>
                  <Select value={depth} onValueChange={setDepth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPTH_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label>Image style</Label>
              <Select value={imageStyle} onValueChange={setImageStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_STYLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Queuing…' : 'Regenerate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
