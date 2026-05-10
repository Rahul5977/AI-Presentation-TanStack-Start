import { createBaseLayouts } from '@/templates/definitions/base-layouts'
import type { TemplateConfig } from '@/templates/schema'

export const minimalMonoTemplate: TemplateConfig = {
  metadata: {
    id: 'MINIMAL_MONO',
    name: 'Minimal Mono',
    description: 'Clean monochrome design for clear, distraction-free storytelling.',
    previewImage: '/templates/minimal-mono-preview.png',
  },
  colors: {
    background: '#0b0b0d',
    foreground: '#f5f5f7',
    accent: '#9be15d',
    accentForeground: '#0b0b0d',
    muted: '#a1a1aa',
    border: '#27272a',
  },
  typography: {
    fontFamilyDisplay: '"Inter", "SF Pro Display", sans-serif',
    fontFamilyBody: '"Inter", "SF Pro Text", sans-serif',
    titleSize: '2.25rem',
    bodySize: '1rem',
    captionSize: '0.825rem',
    titleWeight: 650,
    bodyWeight: 430,
  },
  layouts: createBaseLayouts({
    title: {
      containerClasses: 'justify-center text-center',
    },
    quote: {
      bodyClasses: 'italic',
    },
  }),
  motion: {
    enterDuration: 0.26,
    enterEase: 'easeOut',
    staggerMs: 70,
  },
}
