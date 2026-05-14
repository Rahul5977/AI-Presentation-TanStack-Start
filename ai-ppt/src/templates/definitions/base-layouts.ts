import type { SlideVariantKey, TemplateLayoutVariant } from '@/templates/schema'

function variant(
  key: SlideVariantKey,
  partial: Partial<TemplateLayoutVariant>,
): TemplateLayoutVariant {
  return {
    key,
    gridTemplateColumns: '1fr',
    gridTemplateRows: 'auto 1fr minmax(0, 1fr) auto',
    templateAreas: '"title" "body" "media" "footer"',
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
      gridTemplateRows: 'minmax(0, 1fr) auto auto auto',
      templateAreas: '"media" "title" "body" "footer"',
      containerClasses: 'text-center',
    }),
    content: variant('content', {
      gridTemplateColumns: '1.05fr 0.95fr',
      gridTemplateRows: 'auto 1fr auto',
      templateAreas: '"title title" "body media" "footer footer"',
    }),
    twoColumn: variant('twoColumn', {
      gridTemplateColumns: '0.95fr 1.05fr',
      gridTemplateRows: 'auto 1fr auto',
      templateAreas: '"title title" "body media" "footer footer"',
    }),
    imageLeft: variant('imageLeft', {
      gridTemplateColumns: '1.1fr 0.9fr',
      gridTemplateRows: 'auto 1fr auto',
      templateAreas: '"title title" "media body" "footer footer"',
    }),
    imageRight: variant('imageRight', {
      gridTemplateColumns: '0.85fr 1.15fr',
      gridTemplateRows: 'auto 1fr auto',
      templateAreas: '"title title" "body media" "footer footer"',
    }),
    imageTop: variant('imageTop', {
      gridTemplateColumns: '1fr',
      gridTemplateRows: 'minmax(0, 1.25fr) auto 1fr auto',
      templateAreas: '"media" "title" "body" "footer"',
    }),
    quote: variant('quote', {
      gridTemplateColumns: '1fr 0.9fr',
      gridTemplateRows: 'auto 1fr auto',
      templateAreas: '"title title" "body media" "footer footer"',
      containerClasses: 'justify-center',
      titleClasses: 'text-center',
      bodyClasses: 'text-center max-w-[95%]',
      footerClasses: 'text-center',
    }),
    stats: variant('stats', {
      gridTemplateColumns: '1.1fr 0.9fr',
      gridTemplateRows: 'auto 1fr auto',
      templateAreas: '"title title" "body media" "footer footer"',
    }),
    sectionDivider: variant('sectionDivider', {
      gridTemplateColumns: '1fr',
      gridTemplateRows: 'minmax(0, 1.1fr) auto auto auto',
      templateAreas: '"media" "title" "body" "footer"',
      containerClasses: 'justify-center text-center',
      titleClasses: 'text-center',
      bodyClasses: 'text-center',
      footerClasses: 'text-center',
    }),
    closing: variant('closing', {
      gridTemplateColumns: '1fr',
      gridTemplateRows: 'minmax(0, 1.1fr) auto auto auto',
      templateAreas: '"media" "title" "body" "footer"',
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
