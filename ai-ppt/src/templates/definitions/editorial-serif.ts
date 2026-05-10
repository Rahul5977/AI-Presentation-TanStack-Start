import { createBaseLayouts } from '@/templates/definitions/base-layouts'
import type { TemplateConfig } from '@/templates/schema'

export const editorialSerifTemplate: TemplateConfig = {
  metadata: {
    id: 'EDITORIAL_SERIF',
    name: 'Editorial Serif',
    description: 'Magazine-like serif elegance for narratives and research decks.',
    previewImage: '/templates/editorial-serif-preview.png',
  },
  colors: {
    background: '#f8f4ec',
    foreground: '#262018',
    accent: '#7f4f24',
    accentForeground: '#fff4e6',
    muted: '#6b5e54',
    border: '#d8c8b5',
  },
  typography: {
    fontFamilyDisplay: '"Merriweather Variable", "Georgia", serif',
    fontFamilyBody: '"Source Serif 4", "Georgia", serif',
    titleSize: '2.15rem',
    bodySize: '1.04rem',
    captionSize: '0.84rem',
    titleWeight: 650,
    bodyWeight: 420,
  },
  layouts: createBaseLayouts({
    content: {
      containerClasses: 'max-w-[92%] mx-auto',
    },
    quote: {
      bodyClasses: 'italic text-lg',
    },
    closing: {
      containerClasses: 'justify-end text-center',
      titleClasses: 'italic',
    },
  }),
  motion: {
    enterDuration: 0.28,
    enterEase: 'easeOut',
    staggerMs: 80,
  },
}
