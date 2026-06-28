import { z } from 'zod'

import { getTemplateByKind } from '@/templates/registry'
import type { TemplateConfig, TemplateKind } from '@/templates/schema'

// ─── overrides schema ────────────────────────────────────────────────────────
//
// A "theme override" is a partial set of design tokens layered on top of one of
// the base templates. This is what powers the Brand Builder: a user picks a base
// template for its layouts + motion, then overrides colors, typography, and a
// brand logo to match their identity. Overrides are stored as JSON on the
// presentation (and copied to its draft) and can be saved as a reusable BrandKit.

const hexColor = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u, 'Expected a hex color')

const themeColorsSchema = z
  .object({
    background: hexColor,
    foreground: hexColor,
    accent: hexColor,
    accentForeground: hexColor,
    muted: hexColor,
    border: hexColor,
  })
  .partial()

const themeTypographySchema = z
  .object({
    fontFamilyDisplay: z.string().trim().min(1).max(160),
    fontFamilyBody: z.string().trim().min(1).max(160),
    titleWeight: z.number().int().min(100).max(900),
    bodyWeight: z.number().int().min(100).max(900),
  })
  .partial()

export const themeOverridesSchema = z
  .object({
    colors: themeColorsSchema.optional(),
    typography: themeTypographySchema.optional(),
    logoUrl: z.string().trim().url().max(2048).nullable().optional(),
    // Identifies the preset the user started from, for UI round-tripping.
    palettePreset: z.string().trim().max(64).optional(),
    fontPairingPreset: z.string().trim().max(64).optional(),
  })
  .strict()

export type ThemeOverrides = z.infer<typeof themeOverridesSchema>

/** Parse loosely-typed JSON (e.g. a Prisma Json column) into safe overrides. */
export function parseThemeOverrides(value: unknown): ThemeOverrides | null {
  if (value == null) return null
  const result = themeOverridesSchema.safeParse(value)
  return result.success ? result.data : null
}

// ─── resolution ──────────────────────────────────────────────────────────────

export type ResolvedTheme = {
  template: TemplateConfig
  logoUrl: string | null
  isCustomized: boolean
}

/**
 * Merge theme overrides onto a base template, returning a fully-formed
 * TemplateConfig plus the brand logo. This is the single source of truth used by
 * every render surface (editor, present, share) and the PPTX exporter, so that a
 * deck looks identical everywhere.
 */
export function resolveTemplate(
  baseKind: TemplateKind,
  overrides?: ThemeOverrides | null,
): ResolvedTheme {
  const base = getTemplateByKind(baseKind)
  if (!overrides) {
    return { template: base, logoUrl: null, isCustomized: false }
  }

  const isCustomized = Boolean(
    overrides.colors ||
      overrides.typography ||
      overrides.logoUrl ||
      overrides.palettePreset ||
      overrides.fontPairingPreset,
  )

  const template: TemplateConfig = {
    ...base,
    colors: { ...base.colors, ...(overrides.colors ?? {}) },
    typography: { ...base.typography, ...(overrides.typography ?? {}) },
  }

  return {
    template,
    logoUrl: overrides.logoUrl ?? null,
    isCustomized,
  }
}

// ─── curated presets (fast, useful defaults for the builder) ─────────────────

export type PalettePreset = {
  id: string
  name: string
  colors: Required<z.infer<typeof themeColorsSchema>>
}

export const palettePresets: ReadonlyArray<PalettePreset> = [
  {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      background: '#0b0b0d',
      foreground: '#f5f5f7',
      accent: '#7c9cff',
      accentForeground: '#0b0b0d',
      muted: '#a1a1aa',
      border: '#27272a',
    },
  },
  {
    id: 'paper',
    name: 'Paper',
    colors: {
      background: '#fbfaf7',
      foreground: '#1a1a1a',
      accent: '#1f6feb',
      accentForeground: '#ffffff',
      muted: '#6b7280',
      border: '#e5e1d8',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      background: '#0c1410',
      foreground: '#eaf4ec',
      accent: '#34d399',
      accentForeground: '#04130b',
      muted: '#8aa092',
      border: '#1e2c24',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      background: '#1a0f14',
      foreground: '#fdeee6',
      accent: '#fb7185',
      accentForeground: '#1a0f14',
      muted: '#c79aa0',
      border: '#3a212a',
    },
  },
  {
    id: 'corporate',
    name: 'Corporate',
    colors: {
      background: '#ffffff',
      foreground: '#0f172a',
      accent: '#2563eb',
      accentForeground: '#ffffff',
      muted: '#64748b',
      border: '#e2e8f0',
    },
  },
  {
    id: 'mono',
    name: 'Mono',
    colors: {
      background: '#111111',
      foreground: '#fafafa',
      accent: '#fafafa',
      accentForeground: '#111111',
      muted: '#9ca3af',
      border: '#2a2a2a',
    },
  },
]

export type FontPairingPreset = {
  id: string
  name: string
  fontFamilyDisplay: string
  fontFamilyBody: string
}

export const fontPairingPresets: ReadonlyArray<FontPairingPreset> = [
  {
    id: 'inter',
    name: 'Inter (modern)',
    fontFamilyDisplay: '"Inter", "SF Pro Display", sans-serif',
    fontFamilyBody: '"Inter", "SF Pro Text", sans-serif',
  },
  {
    id: 'editorial',
    name: 'Merriweather + Inter (editorial)',
    fontFamilyDisplay: '"Merriweather Variable", Georgia, serif',
    fontFamilyBody: '"Inter", system-ui, sans-serif',
  },
  {
    id: 'grotesk',
    name: 'Space Grotesk (tech)',
    fontFamilyDisplay: '"Space Grotesk", "Inter", sans-serif',
    fontFamilyBody: '"Inter", system-ui, sans-serif',
  },
  {
    id: 'humanist',
    name: 'System humanist',
    fontFamilyDisplay: 'system-ui, "Segoe UI", sans-serif',
    fontFamilyBody: 'system-ui, "Segoe UI", sans-serif',
  },
]

export function findPalettePreset(id: string | undefined | null) {
  return palettePresets.find((p) => p.id === id) ?? null
}

export function findFontPairingPreset(id: string | undefined | null) {
  return fontPairingPresets.find((p) => p.id === id) ?? null
}
