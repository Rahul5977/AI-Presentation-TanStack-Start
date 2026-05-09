export type OutlineSlide = {
  id: string
  position: number
  title: string
  intent: string
  bullets: string[]
  visualConcept: string
  speakerNotesHint: string | null
}

export type OutlineDraft = {
  draftId: string
  presentationId: string
  title: string
  prompt: string
  slides: OutlineSlide[]
  updatedAt: string
}
