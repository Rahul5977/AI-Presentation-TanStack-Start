import type { SlideVariantKey, TemplateLayoutVariant } from '@/templates/schema'

function variant(
  key: SlideVariantKey,
  partial: Partial<TemplateLayoutVariant>,
): TemplateLayoutVariant {
  return {
    key,
    gridTemplateColumns: '1fr',
    gridTemplateRows: 'auto 1fr auto',
    templateAreas: '"title" "body" "footer"',
    containerClasses: '',
    titleClasses: '',
    bodyClasses: '',
    mediaClasses: '',
    footerClasses: '',
    ...partial,
  }
}

export function createBaseLayouts(
  overrides: Partial<Record<SlideVariantKey, Partial<TemplateLayoutVariant>>>,
) {
  const base: Record<SlideVariantKey, TemplateLayoutVariant> = {
    title: variant('title', {
      gridTemplateColumns: '1fr',
      gridTemplateRows: 'auto auto 1fr',
      templateAreas: '"title" "body" "footer"',
      containerClasses: 'text-center',
    }),
    content: variant('content', {
      templateAreas: '"title" "body" "footer"',
    }),
    twoColumn: variant('twoColumn', {
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: 'auto 1fr auto',
      templateAreas: '"title title" "body media" "footer footer"',
    }),
    imageLeft: variant('imageLeft', {
      gridTemplateColumns: '1.1fr 0.9fr',
      gridTemplateRows: 'auto 1fr auto',
      templateAreas: '"title title" "media body" "footer footer"',
    }),
    quote: variant('quote', {
      containerClasses: 'justify-center',
      titleClasses: 'text-center',
      bodyClasses: 'text-center',
      footerClasses: 'text-center',
    }),
    stats: variant('stats', {
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gridTemplateRows: 'auto auto auto',
      templateAreas: '"title title title" "body body body" "footer footer footer"',
    }),
    sectionDivider: variant('sectionDivider', {
      containerClasses: 'justify-center text-center',
      titleClasses: 'text-center',
      bodyClasses: 'text-center',
      footerClasses: 'text-center',
    }),
    closing: variant('closing', {
      containerClasses: 'justify-end text-center',
      titleClasses: 'text-center',
      bodyClasses: 'text-center',
      footerClasses: 'text-center',
    }),
  }

  const entries = Object.entries(overrides) as Array<
    [SlideVariantKey, Partial<TemplateLayoutVariant> | undefined]
  >

  for (const [key, override] of entries) {
    if (!override) continue
    base[key] = { ...base[key], ...override }
  }

  return base
}
