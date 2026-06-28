'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import SlideRenderer from '@/components/slides/SlideRenderer'
import {
  fontPairingPresets,
  palettePresets,
  resolveTemplate,
} from '@/templates/theme'
import type { ThemeOverrides } from '@/templates/theme'
import type { TemplateColorTokens, TemplateKind } from '@/templates/schema'
import { toast } from 'sonner'
import { Check, RotateCcw, Save, Trash2 } from 'lucide-react'

type BrandKitSummary = {
  id: string
  name: string
  baseTemplate: TemplateKind
  overrides: ThemeOverrides | null
  logoUrl: string | null
}

type ThemeCustomizerProps = {
  open: boolean
  onClose: () => void
  presentationId: string
  baseTemplate: TemplateKind
  initialOverrides: ThemeOverrides | null
  onApplied: (overrides: ThemeOverrides | null) => void
}

const colorFields: Array<{ key: keyof TemplateColorTokens; label: string }> = [
  { key: 'background', label: 'Background' },
  { key: 'foreground', label: 'Text' },
  { key: 'accent', label: 'Accent' },
  { key: 'accentForeground', label: 'On accent' },
  { key: 'muted', label: 'Muted' },
  { key: 'border', label: 'Border' },
]

const previewSlide = {
  id: 'theme-preview',
  title: 'Your brand, your deck',
  intent: 'A live preview of the current theme',
  bullets: ['Clear, on-brand typography', 'Custom palette applied everywhere', 'Logo on every slide'],
  visualConcept: '',
  speakerNotes: null,
  layoutHints: { layoutType: 'content' },
  imageUrl: null,
}

export default function ThemeCustomizer({
  open,
  onClose,
  presentationId,
  baseTemplate,
  initialOverrides,
  onApplied,
}: ThemeCustomizerProps) {
  const [overrides, setOverrides] = useState<ThemeOverrides>(initialOverrides ?? {})
  const [saving, setSaving] = useState(false)
  const [kits, setKits] = useState<BrandKitSummary[]>([])
  const [kitName, setKitName] = useState('')

  useEffect(() => {
    if (open) setOverrides(initialOverrides ?? {})
  }, [open, initialOverrides])

  useEffect(() => {
    if (!open) return
    void fetch('/api/brand-kits/')
      .then((r) => (r.ok ? r.json() : { brandKits: [] }))
      .then((d: { brandKits?: BrandKitSummary[] }) => setKits(d.brandKits ?? []))
      .catch(() => setKits([]))
  }, [open])

  const resolved = useMemo(
    () => resolveTemplate(baseTemplate, overrides),
    [baseTemplate, overrides],
  )
  const colors = resolved.template.colors

  const setColor = (key: keyof TemplateColorTokens, value: string) =>
    setOverrides((cur) => ({ ...cur, colors: { ...cur.colors, [key]: value } }))

  const applyPalette = (id: string) => {
    const preset = palettePresets.find((p) => p.id === id)
    if (!preset) return
    setOverrides((cur) => ({
      ...cur,
      colors: { ...preset.colors },
      palettePreset: id,
    }))
  }

  const applyFontPairing = (id: string) => {
    const preset = fontPairingPresets.find((p) => p.id === id)
    if (!preset) return
    setOverrides((cur) => ({
      ...cur,
      typography: {
        ...cur.typography,
        fontFamilyDisplay: preset.fontFamilyDisplay,
        fontFamilyBody: preset.fontFamilyBody,
      },
      fontPairingPreset: id,
    }))
  }

  const setLogo = (url: string) =>
    setOverrides((cur) => ({ ...cur, logoUrl: url.trim() ? url.trim() : null }))

  const persist = async (next: ThemeOverrides | null) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/presentations/${presentationId}/brand-kit`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ themeOverrides: next }),
      })
      const data = (await res.json()) as { themeOverrides?: ThemeOverrides | null; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Could not apply theme')
      onApplied(data.themeOverrides ?? null)
      toast.success(next ? 'Theme applied to deck.' : 'Theme reset to base template.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not apply theme.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => void persist(null)
  const handleApply = () => void persist(overrides)

  const handleSaveKit = async () => {
    const name = kitName.trim()
    if (!name) {
      toast.error('Name your brand kit first.')
      return
    }
    try {
      const res = await fetch('/api/brand-kits/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, baseTemplate, overrides }),
      })
      const data = (await res.json()) as { brandKit?: BrandKitSummary; error?: string }
      if (!res.ok || !data.brandKit) throw new Error(data.error ?? 'Could not save kit')
      setKits((cur) => [data.brandKit!, ...cur])
      setKitName('')
      toast.success('Brand kit saved.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save kit.')
    }
  }

  const handleDeleteKit = async (kitId: string) => {
    const res = await fetch(`/api/brand-kits/${kitId}`, { method: 'DELETE' })
    if (res.ok) setKits((cur) => cur.filter((k) => k.id !== kitId))
  }

  const loadKit = (kit: BrandKitSummary) => {
    setOverrides(kit.overrides ?? {})
    toast.info(`Loaded "${kit.name}". Click Apply to use it.`)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Brand builder</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
          {/* ── Controls ──────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Palettes */}
            <section>
              <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                Palette presets
              </Label>
              <div className="flex flex-wrap gap-2">
                {palettePresets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPalette(p.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition',
                      overrides.palettePreset === p.id
                        ? 'border-foreground'
                        : 'border-border/60 hover:border-border',
                    )}
                    title={p.name}
                  >
                    <span className="flex">
                      {[p.colors.background, p.colors.foreground, p.colors.accent].map((c, i) => (
                        <span
                          key={i}
                          className="h-4 w-4 rounded-full border border-black/10 -ml-1 first:ml-0"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                    {p.name}
                  </button>
                ))}
              </div>
            </section>

            {/* Individual colors */}
            <section>
              <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                Colors
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                {colorFields.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5"
                  >
                    <input
                      type="color"
                      value={normalizeHex(colors[field.key])}
                      onChange={(e) => setColor(field.key, e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <span className="text-xs">{field.label}</span>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      {colors[field.key]}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Fonts */}
            <section>
              <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                Font pairing
              </Label>
              <div className="flex flex-wrap gap-2">
                {fontPairingPresets.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => applyFontPairing(f.id)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-xs transition',
                      overrides.fontPairingPreset === f.id
                        ? 'border-foreground'
                        : 'border-border/60 hover:border-border',
                    )}
                    style={{ fontFamily: f.fontFamilyDisplay }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </section>

            {/* Logo */}
            <section>
              <Label htmlFor="brand-logo" className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                Brand logo URL
              </Label>
              <Input
                id="brand-logo"
                placeholder="https://…/logo.png"
                value={overrides.logoUrl ?? ''}
                onChange={(e) => setLogo(e.target.value)}
              />
            </section>

            {/* Saved kits */}
            <section>
              <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                Saved brand kits
              </Label>
              {kits.length === 0 ? (
                <p className="text-xs text-muted-foreground">No saved kits yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {kits.map((kit) => (
                    <div
                      key={kit.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-2.5 py-1.5"
                    >
                      <button
                        type="button"
                        className="text-xs font-medium hover:underline"
                        onClick={() => loadKit(kit)}
                      >
                        {kit.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteKit(kit.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete brand kit"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Save current as kit…"
                  value={kitName}
                  onChange={(e) => setKitName(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button type="button" size="sm" variant="outline" onClick={() => void handleSaveKit()}>
                  <Save size={13} className="mr-1" /> Save
                </Button>
              </div>
            </section>
          </div>

          {/* ── Live preview ──────────────────────────────────────── */}
          <div className="space-y-3">
            <Label className="block text-xs uppercase tracking-wide text-muted-foreground">
              Live preview
            </Label>
            <SlideRenderer
              slide={previewSlide}
              template={resolved.template}
              logoUrl={resolved.logoUrl}
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleReset} disabled={saving}>
            <RotateCcw size={14} className="mr-1.5" /> Reset to base
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleApply} disabled={saving}>
              <Check size={14} className="mr-1.5" /> Apply to deck
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// `<input type="color">` only accepts 6-digit hex; coerce gracefully.
function normalizeHex(value: string): string {
  const v = value.trim()
  if (/^#[0-9a-fA-F]{6}$/u.test(v)) return v
  if (/^#[0-9a-fA-F]{3}$/u.test(v)) {
    return '#' + v.slice(1).split('').map((c) => c + c).join('')
  }
  return '#000000'
}
