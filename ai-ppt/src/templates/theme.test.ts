import { describe, expect, it } from 'vitest'

import {
  parseThemeOverrides,
  resolveTemplate,
  themeOverridesSchema,
} from '@/templates/theme'
import { getTemplateByKind } from '@/templates/registry'

describe('themeOverridesSchema', () => {
  it('accepts a partial override', () => {
    const result = themeOverridesSchema.safeParse({
      colors: { accent: '#ff0000' },
      logoUrl: 'https://example.com/logo.png',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid hex colors', () => {
    const result = themeOverridesSchema.safeParse({ colors: { accent: 'red' } })
    expect(result.success).toBe(false)
  })

  it('rejects unknown keys (strict)', () => {
    const result = themeOverridesSchema.safeParse({ nope: true })
    expect(result.success).toBe(false)
  })
})

describe('parseThemeOverrides', () => {
  it('returns null for nullish or invalid input', () => {
    expect(parseThemeOverrides(null)).toBeNull()
    expect(parseThemeOverrides(undefined)).toBeNull()
    expect(parseThemeOverrides({ colors: { accent: 'nope' } })).toBeNull()
  })

  it('parses valid overrides', () => {
    expect(parseThemeOverrides({ colors: { accent: '#abcdef' } })).toEqual({
      colors: { accent: '#abcdef' },
    })
  })
})

describe('resolveTemplate', () => {
  it('returns the base template untouched when there are no overrides', () => {
    const base = getTemplateByKind('MINIMAL_MONO')
    const resolved = resolveTemplate('MINIMAL_MONO', null)
    expect(resolved.template.colors).toEqual(base.colors)
    expect(resolved.isCustomized).toBe(false)
    expect(resolved.logoUrl).toBeNull()
  })

  it('merges color and typography overrides onto the base', () => {
    const base = getTemplateByKind('MINIMAL_MONO')
    const resolved = resolveTemplate('MINIMAL_MONO', {
      colors: { accent: '#123456' },
      typography: { titleWeight: 800 },
      logoUrl: 'https://example.com/logo.png',
    })
    // overridden
    expect(resolved.template.colors.accent).toBe('#123456')
    expect(resolved.template.typography.titleWeight).toBe(800)
    // untouched base tokens preserved
    expect(resolved.template.colors.background).toBe(base.colors.background)
    expect(resolved.template.typography.fontFamilyBody).toBe(base.typography.fontFamilyBody)
    expect(resolved.logoUrl).toBe('https://example.com/logo.png')
    expect(resolved.isCustomized).toBe(true)
  })

  it('preserves the base layouts and motion (only tokens change)', () => {
    const base = getTemplateByKind('TECH_DARK')
    const resolved = resolveTemplate('TECH_DARK', { colors: { accent: '#000000' } })
    expect(resolved.template.layouts).toBe(base.layouts)
    expect(resolved.template.motion).toBe(base.motion)
  })
})
