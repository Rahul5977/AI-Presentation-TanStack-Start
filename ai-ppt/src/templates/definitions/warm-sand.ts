import { createBaseLayouts } from '@/templates/definitions/base-layouts'
import type { TemplateConfig } from '@/templates/schema'

export const warmSandTemplate: TemplateConfig = {
  metadata: {
    id: 'WARM_SAND',
    name: 'Warm Sand',
    description: 'Warm, earthy editorial look with serif headlines for storytelling decks.',
    previewImage: '/templates/warm-sand-preview.png',
  },
  colors: {
    background: '#faf4ea',
    foreground: '#2c2317',
    accent: '#c2683b',
    accentForeground: '#fff7ee',
    muted: '#7a6c57',
    border: '#e6d8c3',
  },
  typography: {
    fontFamilyDisplay: '"Fraunces", "Georgia", serif',
    fontFamilyBody: '"Inter", "Georgia", serif',
    titleSize: '2.4rem',
    bodySize: '1.02rem',
    captionSize: '0.84rem',
    titleWeight: 600,
    bodyWeight: 420,
  },
  layouts: createBaseLayouts({
    quote: {
      titleClasses: 'italic',
    },
    twoColumn: {
      gridTemplateColumns: '1.1fr 0.9fr',
    },
  }),
  motion: {
    enterDuration: 0.32,
    enterEase: 'easeOut',
    staggerMs: 80,
  },
}
