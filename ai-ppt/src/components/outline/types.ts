export type OutlineSlide = {
  id: string
  position: number
  title: string
  intent: string
  bullets: string[]
  visualConcept: string
  speakerNotesHint: string | null
}

export type DraftStatus =
  | 'OUTLINE_PENDING'
  | 'OUTLINE_GENERATING'
  | 'OUTLINE_READY'
  | 'OUTLINE_FAILED'

export type OutlineDraft = {
  draftId: string
  presentationId: string
  title: string
  prompt: string
  status: DraftStatus
  slides: OutlineSlide[]
  updatedAt: string
}
