'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Link, Copy, Check } from 'lucide-react'

type ShareDialogProps = {
  open: boolean
  onClose: () => void
  presentationId: string
  initialIsPublic: boolean
  initialToken: string | null
}

export default function ShareDialog({
  open,
  onClose,
  presentationId,
  initialIsPublic,
  initialToken,
}: ShareDialogProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [token, setToken] = useState<string | null>(initialToken)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${token}`
    : null

  const toggle = async (enabled: boolean) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/presentations/${presentationId}/share`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enable: enabled }),
      })
      const data = (await res.json()) as { isPublic: boolean; shareToken: string | null }
      if (!res.ok) throw new Error('Failed to update sharing settings')
      setIsPublic(data.isPublic)
      setToken(data.shareToken)
    } catch {
      toast.error('Could not update sharing settings.')
    } finally {
      setIsSaving(false)
    }
  }

  const copyLink = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Link copied to clipboard')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link size={16} />
            Share presentation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Public link</Label>
              <p className="text-xs text-muted-foreground">
                Anyone with the link can view this presentation
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={toggle}
              disabled={isSaving}
            />
          </div>

          {isPublic && shareUrl && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Share link</Label>
              <div className="flex gap-2">
                <Input readOnly value={shareUrl} className="text-xs" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyLink}
                  title="Copy link"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
            </div>
          )}

          {!isPublic && (
            <p className="text-sm text-muted-foreground">
              Enable the public link to share this presentation with anyone.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
