import { describe, expect, it } from 'vitest'

import { resolveSlideVariant } from './layout-map'

describe('resolveSlideVariant (adaptive layout)', () => {
  it('trusts specific AI hints', () => {
    expect(resolveSlideVariant({ layoutHints: { layoutType: 'quote' }, bulletsCount: 1 })).toBe('quote')
    expect(resolveSlideVariant({ layoutHints: { layoutType: 'sectionDivider' }, bulletsCount: 0 })).toBe(
      'sectionDivider',
    )
    expect(resolveSlideVariant({ layoutHints: { layoutType: 'image-left' }, bulletsCount: 3 })).toBe(
      'imageLeft',
    )
  })

  it('routes structured data to the stats layout', () => {
    expect(resolveSlideVariant({ bulletsCount: 4, hasData: true })).toBe('stats')
  })

  it('detects cover and closing slides by position', () => {
    expect(resolveSlideVariant({ bulletsCount: 1, position: 0, total: 8 })).toBe('title')
    expect(resolveSlideVariant({ bulletsCount: 0, position: 0, total: 8, hasImage: true })).toBe('imageTop')
    expect(resolveSlideVariant({ bulletsCount: 2, position: 7, total: 8 })).toBe('closing')
  })

  it('alternates image sides for rhythm', () => {
    expect(resolveSlideVariant({ bulletsCount: 3, hasImage: true, position: 2 })).toBe('imageLeft')
    expect(resolveSlideVariant({ bulletsCount: 3, hasImage: true, position: 3 })).toBe('imageRight')
    expect(resolveSlideVariant({ bulletsCount: 1, hasImage: true, position: 4 })).toBe('imageTop')
  })

  it('scales text-only layouts to content density', () => {
    expect(resolveSlideVariant({ bulletsCount: 1 })).toBe('title')
    expect(resolveSlideVariant({ bulletsCount: 3 })).toBe('content')
    expect(resolveSlideVariant({ bulletsCount: 6 })).toBe('twoColumn')
    expect(resolveSlideVariant({ bulletsCount: 9 })).toBe('content')
  })
})
