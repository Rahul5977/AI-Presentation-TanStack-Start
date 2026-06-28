import { createBaseLayouts } from '@/templates/definitions/base-layouts'
import type { TemplateConfig } from '@/templates/schema'

export const midnightProTemplate: TemplateConfig = {
  metadata: {
    id: 'MIDNIGHT_PRO',
    name: 'Midnight Pro',
    description: 'Premium near-black deck with gold accents for executive and investor decks.',
    previewImage: '/templates/midnight-pro-preview.png',
  },
  colors: {
    background: '#0c0c10',
    foreground: '#f0ede6',
    accent: '#d4af6a',
    accentForeground: '#1a1407',
    muted: '#9a948a',
    border: '#2c2a26',
  },
  typography: {
    fontFamilyDisplay: '"Fraunces", "Times New Roman", serif',
    fontFamilyBody: '"Inter", "Helvetica Neue", sans-serif',
    titleSize: '2.4rem',
    bodySize: '1rem',
    captionSize: '0.83rem',
    titleWeight: 620,
    bodyWeight: 420,
  },
  layouts: createBaseLayouts({
    title: {
      titleClasses: 'tracking-tight',
    },
    stats: {
      bodyClasses: 'rounded-lg border px-3 py-2',
    },
  }),
  motion: {
    enterDuration: 0.3,
    enterEase: 'easeOut',
    staggerMs: 78,
  },
}
