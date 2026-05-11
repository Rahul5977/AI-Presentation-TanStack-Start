import type { TextTransformAction } from '@/generated/prisma/client'

// v1.1 scaffold contracts for editor copilots and brand controls.
export type TextActionRequest = {
  action: TextTransformAction
  selectedText: string
  context?: string
}

export type BrandKitDraft = {
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
}

export type CitationModeConfig = {
  enabled: boolean
}
