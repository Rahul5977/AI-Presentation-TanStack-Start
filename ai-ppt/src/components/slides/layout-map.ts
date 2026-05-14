import type { SlideVariantKey } from '@/templates/schema'

type LayoutHints = {
  layoutType?: unknown
}

const fallbackByBullets: Array<[number, SlideVariantKey]> = [
  [2, 'title'],
  [4, 'content'],
  [8, 'twoColumn'],
]

export function resolveSlideVariant(
  layoutHints: unknown,
  bulletsCount: number,
): SlideVariantKey {
  if (layoutHints && typeof layoutHints === 'object') {
    const normalized = String((layoutHints as LayoutHints).layoutType ?? '')
      .toLowerCase()
      .trim()

    if (normalized.includes('section')) return 'sectionDivider'
    if (normalized.includes('closing') || normalized.includes('thank')) return 'closing'
    if (normalized.includes('quote')) return 'quote'
    if (normalized.includes('stats')) return 'stats'
    if (normalized.includes('image-right')) return 'imageRight'
    if (normalized.includes('imageright')) return 'imageRight'
    if (normalized.includes('image-left')) return 'imageLeft'
    if (normalized.includes('imageleft')) return 'imageLeft'
    if (normalized.includes('image-top')) return 'imageTop'
    if (normalized.includes('imagetop')) return 'imageTop'
    if (normalized.includes('top-image')) return 'imageTop'
    if (normalized.includes('cover')) return 'imageTop'
    if (normalized.includes('hero')) return 'imageTop'
    if (normalized.includes('right')) return 'imageRight'
    if (normalized.includes('left')) return 'imageLeft'
    if (normalized.includes('top')) return 'imageTop'
    if (normalized.includes('two')) return 'twoColumn'
    if (normalized.includes('title')) return 'title'
  }

  for (const [maxBullets, variant] of fallbackByBullets) {
    if (bulletsCount <= maxBullets) return variant
  }
  return 'content'
}
