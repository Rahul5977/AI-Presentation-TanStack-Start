import { createBaseLayouts } from '@/templates/definitions/base-layouts'
import type { TemplateConfig } from '@/templates/schema'

export const vibrantPopTemplate: TemplateConfig = {
  metadata: {
    id: 'VIBRANT_POP',
    name: 'Vibrant Pop',
    description: 'Energetic, colorful style for marketing, launches, and creative pitches.',
    previewImage: '/templates/vibrant-pop-preview.png',
  },
  colors: {
    background: '#fffdf8',
    foreground: '#1a1320',
    accent: '#ff4d8d',
    accentForeground: '#ffffff',
    muted: '#6b5b73',
    border: '#f3d9e4',
  },
  typography: {
    fontFamilyDisplay: '"Poppins", "Inter", sans-serif',
    fontFamilyBody: '"Inter", "Poppins", sans-serif',
    titleSize: '2.5rem',
    bodySize: '1.02rem',
    captionSize: '0.84rem',
    titleWeight: 720,
    bodyWeight: 440,
  },
  layouts: createBaseLayouts({
    imageRight: {
      gridTemplateColumns: '0.8fr 1.2fr',
    },
    stats: {
      bodyClasses: 'rounded-2xl border px-3 py-2',
    },
  }),
  motion: {
    enterDuration: 0.34,
    enterEase: 'easeOut',
    staggerMs: 85,
  },
}
