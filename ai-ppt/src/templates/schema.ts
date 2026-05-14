export const TEMPLATE_KINDS = [
  'MINIMAL_MONO',
  'BOLD_GRADIENT',
  'EDITORIAL_SERIF',
  'TECH_DARK',
] as const

export type TemplateKind = (typeof TEMPLATE_KINDS)[number]

export type SlideVariantKey =
  | 'title'
  | 'content'
  | 'twoColumn'
  | 'imageLeft'
  | 'imageRight'
  | 'imageTop'
  | 'quote'
  | 'stats'
  | 'sectionDivider'
  | 'closing'

export type TemplateLayoutVariant = {
  key: SlideVariantKey
  gridTemplateColumns: string
  gridTemplateRows: string
  templateAreas: string
  containerClasses?: string
  titleClasses?: string
  bodyClasses?: string
  mediaClasses?: string
  footerClasses?: string
}

export type TemplateMetadata = {
  id: TemplateKind
  name: string
  description: string
  previewImage: string
}

export type TemplateColorTokens = {
  background: string
  foreground: string
  accent: string
  accentForeground: string
  muted: string
  border: string
}

export type TemplateTypographyScale = {
  fontFamilyDisplay: string
  fontFamilyBody: string
  titleSize: string
  bodySize: string
  captionSize: string
  titleWeight: number
  bodyWeight: number
}

export type TemplateMotionPreset = {
  enterDuration: number
  enterEase: string
  staggerMs: number
}

export type TemplateConfig = {
  metadata: TemplateMetadata
  colors: TemplateColorTokens
  typography: TemplateTypographyScale
  layouts: Record<SlideVariantKey, TemplateLayoutVariant>
  motion: TemplateMotionPreset
}
