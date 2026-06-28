import { describe, expect, it } from 'vitest'

import { buildOutlineSystemInstruction } from '@/server/ai/outline-prompt'
import {
  TEXT_ACTIONS,
  buildTextActionSystemInstruction,
} from '@/server/ai/text-action-prompt'
import type { PresentationInput } from '@/server/presentations/schemas'

const baseInput: PresentationInput = {
  prompt: 'The future of solar energy',
  audience: 'INVESTORS',
  tone: 'PERSUASIVE',
  lengthPreset: 'MEDIUM',
  language: 'Spanish',
  template: 'MINIMAL_MONO',
  imageStyle: 'ILLUSTRATION',
  depth: 'BALANCED',
}

describe('buildOutlineSystemInstruction', () => {
  it('embeds slide count, language, and audience guidance', () => {
    const out = buildOutlineSystemInstruction(baseInput, 9)
    expect(out).toContain('exactly 9 slides')
    expect(out).toContain('Spanish')
    expect(out).toContain('opportunity') // investor guidance
    expect(out).toContain('call-to-action')
  })

  it('uses the custom audience label when provided', () => {
    const out = buildOutlineSystemInstruction(
      { ...baseInput, audience: 'CUSTOM', audienceCustom: 'City council members' },
      6,
    )
    expect(out).toContain('City council members')
  })
})

describe('buildTextActionSystemInstruction', () => {
  it('covers every TextTransformAction', () => {
    for (const action of TEXT_ACTIONS) {
      const out = buildTextActionSystemInstruction(action)
      expect(out).toContain('bullets')
      expect(out.length).toBeGreaterThan(40)
    }
  })

  it('differs per action', () => {
    const shorter = buildTextActionSystemInstruction('MAKE_SHORTER')
    const formal = buildTextActionSystemInstruction('MORE_FORMAL')
    expect(shorter).not.toEqual(formal)
  })
})
