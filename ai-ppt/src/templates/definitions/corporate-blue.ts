import { createBaseLayouts } from '@/templates/definitions/base-layouts'
import type { TemplateConfig } from '@/templates/schema'

export const corporateBlueTemplate: TemplateConfig = {
  metadata: {
    id: 'CORPORATE_BLUE',
    name: 'Corporate Blue',
    description: 'Crisp, professional blue palette for consulting, sales, and board decks.',
    previewImage: '/templates/corporate-blue-preview.png',
  },
  colors: {
    background: '#ffffff',
    foreground: '#0f1f3d',
    accent: '#2563eb',
    accentForeground: '#ffffff',
    muted: '#5b6b86',
    border: '#d7e0ee',
  },
  typography: {
    fontFamilyDisplay: '"Inter", "Helvetica Neue", sans-serif',
    fontFamilyBody: '"Inter", "Helvetica Neue", sans-serif',
    titleSize: '2.2rem',
    bodySize: '1rem',
    captionSize: '0.83rem',
    titleWeight: 680,
    bodyWeight: 420,
  },
  layouts: createBaseLayouts({
    twoColumn: {
      gridTemplateColumns: '1fr 1fr',
    },
    stats: {
      bodyClasses: 'rounded-lg border px-3 py-2',
    },
  }),
  motion: {
    enterDuration: 0.28,
    enterEase: 'easeOut',
    staggerMs: 70,
  },
}
