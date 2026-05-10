import { createBaseLayouts } from '@/templates/definitions/base-layouts'
import type { TemplateConfig } from '@/templates/schema'

export const boldGradientTemplate: TemplateConfig = {
  metadata: {
    id: 'BOLD_GRADIENT',
    name: 'Bold Gradient',
    description: 'Vibrant gradients and energetic accents for high-impact pitches.',
    previewImage: '/templates/bold-gradient-preview.png',
  },
  colors: {
    background: 'linear-gradient(135deg, #120b2f 0%, #37216d 48%, #0f7cc0 100%)',
    foreground: '#f8f8ff',
    accent: '#ffd447',
    accentForeground: '#1f1146',
    muted: '#d6d7ff',
    border: '#8ca2ff',
  },
  typography: {
    fontFamilyDisplay: '"Sora", "Inter", sans-serif',
    fontFamilyBody: '"Inter", "DM Sans", sans-serif',
    titleSize: '2.35rem',
    bodySize: '1.02rem',
    captionSize: '0.84rem',
    titleWeight: 700,
    bodyWeight: 450,
  },
  layouts: createBaseLayouts({
    title: {
      containerClasses: 'justify-center text-center',
      titleClasses: 'tracking-tight',
    },
    stats: {
      bodyClasses: 'rounded-xl border px-3 py-2',
    },
  }),
  motion: {
    enterDuration: 0.34,
    enterEase: 'easeOut',
    staggerMs: 90,
  },
}
