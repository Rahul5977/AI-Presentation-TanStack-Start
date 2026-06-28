import { useCallback, useEffect, useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type Member = {
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  user: { id: string; name: string; email: string }
}

export default function MembersDialog({
  open,
  onOpenChange,
  presentationId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  presentationId: string
}) {
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/presentations/${presentationId}/members`, {
      credentials: 'same-origin',
    })
    if (res.ok) {
      const data = (await res.json()) as { items: Member[] }
      setMembers(data.items ?? [])
    }
  }, [presentationId])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const invite = async () => {
    if (!email.trim()) return
    setBusy(true)
    const res = await fetch(`/api/presentations/${presentationId}/members`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email: email.trim(), role }),
    })
    setBusy(false)
    const data = (await res.json().catch(() => ({}))) as { items?: Member[]; error?: string }
    if (!res.ok) {
      toast.error(data.error ?? 'Could not invite that person.')
      return
    }
    setMembers(data.items ?? [])
    setEmail('')
    toast.success('Collaborator added.')
  }

  const remove = async (userId: string) => {
    const res = await fetch(`/api/presentations/${presentationId}/members`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ userId }),
    })
    const data = (await res.json().catch(() => ({}))) as { items?: Member[]; error?: string }
    if (!res.ok) {
      toast.error(data.error ?? 'Could not remove collaborator.')
      return
    }
    setMembers(data.items ?? [])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Collaborators</DialogTitle>
          <DialogDescription>
            Invite people by email to view or edit this deck. They need a Kodexa account.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Email</label>
            <Input
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void invite()
              }}
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'EDITOR' | 'VIEWER')}
            className="h-9 rounded-xl border border-border/60 bg-background px-2 text-sm"
            aria-label="Role"
          >
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <Button onClick={() => void invite()} disabled={busy} size="sm" className="rounded-xl">
            <UserPlus className="mr-1.5 size-4" />
            Invite
          </Button>
        </div>

        <div className="mt-2 space-y-2">
          {members.map((m) => (
            <div
              key={m.user.id}
              className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.user.name || m.user.email}</p>
                <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={m.role === 'OWNER' ? 'default' : 'secondary'} className="text-[10px]">
                  {m.role === 'OWNER' ? 'Owner' : m.role === 'EDITOR' ? 'Editor' : 'Viewer'}
                </Badge>
                {m.role !== 'OWNER' ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${m.user.email}`}
                    onClick={() => void remove(m.user.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
