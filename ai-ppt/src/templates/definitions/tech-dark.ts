import { createBaseLayouts } from '@/templates/definitions/base-layouts'
import type { TemplateConfig } from '@/templates/schema'

export const techDarkTemplate: TemplateConfig = {
  metadata: {
    id: 'TECH_DARK',
    name: 'Tech Dark',
    description: 'Futuristic dark interface with neon accents for product and AI demos.',
    previewImage: '/templates/tech-dark-preview.png',
  },
  colors: {
    background: '#070b14',
    foreground: '#e6f1ff',
    accent: '#2ee6ff',
    accentForeground: '#06212b',
    muted: '#8fa8c9',
    border: '#223d65',
  },
  typography: {
    fontFamilyDisplay: '"Space Grotesk", "Inter", sans-serif',
    fontFamilyBody: '"Inter", "Space Grotesk", sans-serif',
    titleSize: '2.3rem',
    bodySize: '0.99rem',
    captionSize: '0.82rem',
    titleWeight: 640,
    bodyWeight: 430,
  },
  layouts: createBaseLayouts({
    twoColumn: {
      gridTemplateColumns: '0.95fr 1.05fr',
    },
    imageLeft: {
      gridTemplateColumns: '1.2fr 0.8fr',
    },
    stats: {
      bodyClasses: 'rounded-lg border px-3 py-2 backdrop-blur-sm',
    },
  }),
  motion: {
    enterDuration: 0.3,
    enterEase: 'easeOut',
    staggerMs: 75,
  },
}
