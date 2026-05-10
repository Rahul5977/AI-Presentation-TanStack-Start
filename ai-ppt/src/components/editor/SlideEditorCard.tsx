'use client'

import { useRef, useState, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import SlideRenderer from '@/components/slides/SlideRenderer'
import EditableField from '@/components/editor/EditableField'
import SlideRegenerateDialog from '@/components/editor/SlideRegenerateDialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { TemplateConfig } from '@/templates/schema'
import {
  GripVertical,
  Trash2,
  Copy,
  RefreshCw,
  ImagePlus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export type EditableSlide = {
  id: string
  position: number
  title: string
  intent: string
  bullets: string[]
  visualConcept: string
  speakerNotes: string | null
  layoutHints: unknown
  imageUrl: string | null
  imagePrompt: string | null
  status: 'PENDING' | 'CONTENT_READY' | 'IMAGE_READY' | 'READY' | 'FAILED'
}

type SlideEditorCardProps = {
  slide: EditableSlide
  template: TemplateConfig
  presentationTone?: string
  presentationDepth?: string
  presentationImageStyle?: string
  isDragging?: boolean
  onChange: (updated: EditableSlide) => void
  onSave: (updated: EditableSlide) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onRegenContent: (
    slideId: string,
    overrides: { prompt?: string; tone?: string; depth?: string },
  ) => Promise<void>
  onRegenImage: (slideId: string, overrides: { imageStyle?: string }) => Promise<void>
  onImageUpload: (slideId: string, file: File) => Promise<void>
}

const slideStatusLabel: Record<EditableSlide['status'], string> = {
  PENDING: 'Queued',
  CONTENT_READY: 'Writing done',
  IMAGE_READY: 'Image done',
  READY: 'Ready',
  FAILED: 'Failed',
}

const statusColor: Record<EditableSlide['status'], string> = {
  PENDING: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  CONTENT_READY: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  IMAGE_READY: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  READY: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  FAILED: 'bg-red-500/15 text-red-600',
}

export default function SlideEditorCard({
  slide,
  template,
  presentationTone,
  presentationDepth,
  presentationImageStyle,
  onChange,
  onSave,
  onDelete,
  onDuplicate,
  onRegenContent,
  onRegenImage,
  onImageUpload,
}: SlideEditorCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRegenOpen, setIsRegenOpen] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slide.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleFieldChange = useCallback(
    (field: keyof EditableSlide, value: unknown) => {
      const updated = { ...slide, [field]: value } as EditableSlide
      onChange(updated)
      onSave(updated)
    },
    [slide, onChange, onSave],
  )

  const handleBulletChange = useCallback(
    (index: number, value: string) => {
      const newBullets = [...slide.bullets]
      newBullets[index] = value
      handleFieldChange('bullets', newBullets)
    },
    [slide.bullets, handleFieldChange],
  )

  const handleAddBullet = useCallback(() => {
    handleFieldChange('bullets', [...slide.bullets, ''])
  }, [slide.bullets, handleFieldChange])

  const handleDeleteBullet = useCallback(
    (index: number) => {
      handleFieldChange(
        'bullets',
        slide.bullets.filter((_, i) => i !== index),
      )
    },
    [slide.bullets, handleFieldChange],
  )

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingImage(true)
    try {
      await onImageUpload(slide.id, file)
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteConfirm = () => {
    const id = slide.id
    const title = slide.title
    onDelete(id)
    toast('Slide deleted', {
      description: `"${title}"`,
      action: {
        label: 'Undo',
        onClick: () => {
          toast.warning('Undo not available — use Version History to restore.')
        },
      },
    })
  }

  const isGenerating = slide.status === 'PENDING' || slide.status === 'CONTENT_READY' || slide.status === 'IMAGE_READY'

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-2xl border border-border/70 bg-background/80 transition-shadow',
        isDragging && 'shadow-xl ring-2 ring-ring/40',
      )}
    >
      {/* Card header */}
      <div className="flex items-start gap-2 p-4">
        {/* Drag handle */}
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Slide {slide.position + 1}
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                statusColor[slide.status],
              )}
            >
              {slideStatusLabel[slide.status]}
            </span>
          </div>

          {/* Inline title edit */}
          <EditableField
            value={slide.title}
            onChange={(v) => handleFieldChange('title', v)}
            placeholder="Slide title"
            tag="h2"
            className="text-base font-semibold"
          />
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground"
            title="Regenerate slide"
            disabled={isGenerating}
            onClick={() => setIsRegenOpen(true)}
          >
            <RefreshCw size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground"
            title="Replace image"
            disabled={isUploadingImage}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground"
            title="Duplicate slide"
            onClick={() => onDuplicate(slide.id)}
          >
            <Copy size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-red-500 hover:text-red-600"
            title="Delete slide"
            onClick={handleDeleteConfirm}
          >
            <Trash2 size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground"
            title={isExpanded ? 'Collapse editor' : 'Expand editor'}
            onClick={() => setIsExpanded((p) => !p)}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
        </div>
      </div>

      {/* Slide preview */}
      <div className="mx-4 mb-4">
        <SlideRenderer
          slide={{
            id: slide.id,
            title: slide.title,
            intent: slide.intent,
            bullets: slide.bullets,
            visualConcept: slide.visualConcept,
            speakerNotes: slide.speakerNotes,
            layoutHints: slide.layoutHints,
            imageUrl: slide.imageUrl,
          }}
          template={template}
        />
      </div>

      {/* Expanded inline editor */}
      {isExpanded && (
        <div className="border-t border-border/50 mx-4 mb-4 pt-4 space-y-4">
          {/* Intent */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Subtitle / intent
            </p>
            <EditableField
              value={slide.intent}
              onChange={(v) => handleFieldChange('intent', v)}
              placeholder="Slide subtitle or intent"
              className="text-sm"
            />
          </div>

          {/* Bullets */}
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bullet points
            </p>
            <ul className="space-y-1.5">
              {slide.bullets.map((bullet, i) => (
                <li key={`${slide.id}-bullet-${i}`} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                  <EditableField
                    value={bullet}
                    onChange={(v) => handleBulletChange(i, v)}
                    placeholder={`Bullet ${i + 1}`}
                    className="flex-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteBullet(i)}
                    className="mt-0.5 text-muted-foreground/40 hover:text-red-500"
                    title="Remove bullet"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleAddBullet}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground"
            >
              + Add bullet
            </button>
          </div>

          {/* Speaker notes */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Speaker notes
            </p>
            <EditableField
              value={slide.speakerNotes ?? ''}
              onChange={(v) => handleFieldChange('speakerNotes', v || null)}
              placeholder="Speaker notes (not shown in presentation)"
              multiline
              className="min-h-15 text-sm text-muted-foreground"
            />
          </div>

          {/* Visual concept */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Visual concept (image hint)
            </p>
            <EditableField
              value={slide.visualConcept}
              onChange={(v) => handleFieldChange('visualConcept', v)}
              placeholder="Describe the image for this slide"
              className="text-sm text-muted-foreground"
            />
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />

      {/* Regen dialog */}
      <SlideRegenerateDialog
        open={isRegenOpen}
        onClose={() => setIsRegenOpen(false)}
        onRegenContent={(overrides) => onRegenContent(slide.id, overrides)}
        onRegenImage={(overrides) => onRegenImage(slide.id, overrides)}
        currentTone={presentationTone}
        currentDepth={presentationDepth}
        currentImageStyle={presentationImageStyle}
      />
    </article>
  )
}
