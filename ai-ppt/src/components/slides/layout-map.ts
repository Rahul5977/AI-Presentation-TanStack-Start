import type { SlideVariantKey } from '@/templates/schema'

type LayoutHints = {
  layoutType?: unknown
}

export type SlideVariantInput = {
  layoutHints?: unknown
  bulletsCount: number
  /** Slide has a generated/uploaded image. */
  hasImage?: boolean
  /** Slide has structured data (chart/table/timeline/metrics). */
  hasData?: boolean
  /** Slide index (0-based) and deck length, used for cover/closing detection. */
  position?: number
  total?: number
}

/** Specific AI layout hints we trust outright. Generic hints (title/content/two)
 *  fall through to content-aware derivation. */
function mapSpecificHint(normalized: string): SlideVariantKey | null {
  if (normalized.includes('section')) return 'sectionDivider'
  if (normalized.includes('closing') || normalized.includes('thank')) return 'closing'
  if (normalized.includes('quote')) return 'quote'
  if (normalized.includes('stats')) return 'stats'
  if (normalized.includes('image-right') || normalized.includes('imageright')) return 'imageRight'
  if (normalized.includes('image-left') || normalized.includes('imageleft')) return 'imageLeft'
  if (
    normalized.includes('image-top') ||
    normalized.includes('imagetop') ||
    normalized.includes('top-image') ||
    normalized.includes('cover') ||
    normalized.includes('hero')
  ) {
    return 'imageTop'
  }
  return null
}

/**
 * Deterministically pick the most "designed" layout from the slide's actual
 * content — so a slide looks intentional regardless of how much text it has.
 */
function deriveVariant(input: SlideVariantInput): SlideVariantKey {
  const { bulletsCount, hasImage, hasData, position, total } = input

  // Data-driven slides get the structured/stats layout.
  if (hasData) return 'stats'

  // Cover (first) and closing (last) slides.
  if (typeof position === 'number' && position === 0) {
    return hasImage ? 'imageTop' : 'title'
  }
  if (
    typeof position === 'number' &&
    typeof total === 'number' &&
    total > 1 &&
    position === total - 1 &&
    bulletsCount <= 3
  ) {
    return 'closing'
  }

  // Image-bearing slides: full-bleed top for sparse text, side-by-side otherwise
  // (alternating sides gives the deck visual rhythm).
  if (hasImage) {
    if (bulletsCount <= 1) return 'imageTop'
    return (position ?? 0) % 2 === 0 ? 'imageLeft' : 'imageRight'
  }

  // Text-only slides scale layout to content density.
  if (bulletsCount <= 1) return 'title'
  if (bulletsCount <= 3) return 'content'
  if (bulletsCount <= 6) return 'twoColumn'
  return 'content'
}

export function resolveSlideVariant(input: SlideVariantInput): SlideVariantKey {
  if (input.layoutHints && typeof input.layoutHints === 'object') {
    const normalized = String((input.layoutHints as LayoutHints).layoutType ?? '')
      .toLowerCase()
      .trim()
    const specific = mapSpecificHint(normalized)
    if (specific) return specific
    // Respect an explicit two-column request even when generic.
    if (normalized.includes('two')) return 'twoColumn'
  }
  return deriveVariant(input)
}
