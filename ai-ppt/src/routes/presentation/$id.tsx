import { Button } from '#/components/ui/button'
import SlideRenderer from '@/components/slides/SlideRenderer'
import SlideEditorCard, {
  type EditableSlide,
} from '@/components/editor/SlideEditorCard'
import SlideAssistantPanel from '@/components/editor/SlideAssistantPanel'
import ShareDialog from '@/components/editor/ShareDialog'
import ExportDialog from '@/components/editor/ExportDialog'
import VersionHistoryDialog from '@/components/editor/VersionHistoryDialog'
import ThemeCustomizer from '@/components/editor/ThemeCustomizer'
import { AUTH_LOGIN_PATH } from '@/lib/auth-path'
import { getSession } from '@/lib/auth-function'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { listTemplates } from '@/templates/registry'
import { resolveTemplate } from '@/templates/theme'
import type { ThemeOverrides } from '@/templates/theme'
import type { TemplateKind } from '@/templates/schema'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import {
  Download,
  Link,
  History,
  Palette,
  Plus,
  Presentation,
  Save,
} from 'lucide-react'

// ─── types ─────────────────────────────────────────────────────────────────

type SlideProgress = EditableSlide

type PresentationState = {
  presentationId: string
  title: string
  status: 'DRAFT' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED'
  template: TemplateKind
  themeOverrides: ThemeOverrides | null
  tone: string
  depth: string
  imageStyle: string
  isPublic: boolean
  shareToken: string | null
  slides: SlideProgress[]
}

const slideStatusLabel: Record<SlideProgress['status'], string> = {
  PENDING: 'Queued',
  CONTENT_READY: 'Writing content done',
  IMAGE_READY: 'Image done',
  READY: 'Ready',
  FAILED: 'Failed',
}

// ─── route ──────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/presentation/$id')({
  beforeLoad: async ({ location }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({
        to: AUTH_LOGIN_PATH,
        search: { redirect: location.href },
      })
    }
  },
  component: PresentationProgressPage,
})

// ─── component ──────────────────────────────────────────────────────────────

function PresentationProgressPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const [presentation, setPresentation] = useState<PresentationState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle')
  const [showShare, setShowShare] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showTheme, setShowTheme] = useState(false)
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null)
  const lastStatusRef = useRef<PresentationState['status'] | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const templates = useMemo(() => listTemplates(), [])
  const sensors = useSensors(useSensor(PointerSensor))

  // ── load initial data ──────────────────────────────────────────────────

  const loadPresentation = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/presentations/${id}/`)
      const payload = (await res.json()) as PresentationState | { error: string }
      if (!res.ok || 'error' in payload) {
        throw new Error('error' in payload ? payload.error : 'Failed to load.')
      }
      setPresentation(payload)
      setSelectedSlideId((current) => current ?? payload.slides[0]?.id ?? null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load presentation.')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadPresentation()
  }, [loadPresentation])

  // ── SSE for live progress ──────────────────────────────────────────────

  useEffect(() => {
    const source = new EventSource(`/api/presentations/${id}/events`)

    source.addEventListener('snapshot', (e) => {
      if (!(e instanceof MessageEvent)) return
      const payload = JSON.parse(e.data) as PresentationState
      setPresentation(payload)
      setSelectedSlideId((current) => current ?? payload.slides[0]?.id ?? null)
      lastStatusRef.current = payload.status
    })

    source.addEventListener('progress', (e) => {
      if (!(e instanceof MessageEvent)) return
      const payload = JSON.parse(e.data) as
        | { type: 'presentation.finalized' | 'presentation.progress'; status: PresentationState['status'] }
        | { type: 'slide.content.ready' | 'slide.image.generated' | 'slide.image.uploaded'; slideId: string; status: SlideProgress['status']; imageUrl?: string }

      setPresentation((cur) => {
        if (!cur) return cur
        if (payload.type === 'presentation.finalized' || payload.type === 'presentation.progress') {
          return { ...cur, status: payload.status }
        }
        if ('slideId' in payload) {
          return {
            ...cur,
            slides: cur.slides.map((s) =>
              s.id === payload.slideId
                ? { ...s, status: payload.status, imageUrl: payload.imageUrl ?? s.imageUrl }
                : s,
            ),
          }
        }
        return cur
      })
      setSelectedSlideId((current) => current)
    })

    source.onerror = () => source.close()
    return () => source.close()
  }, [id])

  // ── toast on finalize ──────────────────────────────────────────────────

  useEffect(() => {
    if (!presentation) return
    if (lastStatusRef.current === presentation.status) return
    if (presentation.status === 'READY') toast.success('Presentation ready!')
    if (presentation.status === 'FAILED') toast.error('Generation failed.')
    lastStatusRef.current = presentation.status
  }, [presentation])

  // ── template ───────────────────────────────────────────────────────────

  const applyTemplate = async (nextTemplate: TemplateKind) => {
    if (!presentation || nextTemplate === presentation.template) return
    setIsApplyingTemplate(true)
    try {
      const res = await fetch(`/api/presentations/${id}/template`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ template: nextTemplate }),
      })
      const payload = (await res.json()) as { template: TemplateKind } | { error: string }
      if (!res.ok || 'error' in payload) throw new Error('Could not apply template.')
      setPresentation((cur) => cur ? { ...cur, template: payload.template } : cur)
      toast.success('Template applied.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not apply template.')
    } finally {
      setIsApplyingTemplate(false)
    }
  }

  // ── autosave helper ────────────────────────────────────────────────────

  const scheduleSave = useCallback(
    (slideId: string, data: Partial<EditableSlide>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setSaveStatus('saving')
      saveTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/presentations/${id}/slides/${slideId}/`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(data),
          })
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2500)
        } catch {
          setSaveStatus('idle')
          toast.error('Autosave failed.')
        }
      }, 1200)
    },
    [id],
  )

  // ── slide change handlers ──────────────────────────────────────────────

  const handleSlideChange = useCallback(
    (updated: EditableSlide) => {
      setPresentation((cur) =>
        cur
          ? { ...cur, slides: cur.slides.map((s) => (s.id === updated.id ? updated : s)) }
          : cur,
      )
    },
    [],
  )

  const handleSlideSave = useCallback(
    (updated: EditableSlide) => {
      scheduleSave(updated.id, {
        title: updated.title,
        intent: updated.intent,
        bullets: updated.bullets,
        speakerNotes: updated.speakerNotes ?? undefined,
        visualConcept: updated.visualConcept,
        layoutHints: updated.layoutHints,
      })
    },
    [scheduleSave],
  )

  const applyAssistantSlide = useCallback((updated: EditableSlide) => {
    setPresentation((cur) =>
      cur
        ? { ...cur, slides: cur.slides.map((slide) => (slide.id === updated.id ? updated : slide)) }
        : cur,
    )
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2500)
  }, [])

  const handleSlideDelete = useCallback(
    async (slideId: string) => {
      const res = await fetch(`/api/presentations/${id}/slides/${slideId}/`, {
        method: 'DELETE',
      })
      if (!res.ok) { toast.error('Could not delete slide.'); return }
      const data = (await res.json()) as { slides: EditableSlide[] }
      setPresentation((cur) => cur ? { ...cur, slides: data.slides } : cur)
    },
    [id],
  )

  const handleSlideDuplicate = useCallback(
    async (slideId: string) => {
      const res = await fetch(`/api/presentations/${id}/slides/${slideId}/duplicate`, {
        method: 'POST',
      })
      if (!res.ok) { toast.error('Could not duplicate slide.'); return }
      const data = (await res.json()) as { slides: EditableSlide[] }
      setPresentation((cur) => cur ? { ...cur, slides: data.slides } : cur)
      toast.success('Slide duplicated.')
    },
    [id],
  )

  const handleAddSlide = useCallback(async () => {
    const res = await fetch(`/api/presentations/${id}/slides/`, { method: 'POST' })
    if (!res.ok) { toast.error('Could not add slide.'); return }
    const data = (await res.json()) as { slides: EditableSlide[] }
    setPresentation((cur) => cur ? { ...cur, slides: data.slides } : cur)
    toast.success('Blank slide added.')
  }, [id])

  const handleRegenContent = useCallback(
    async (
      slideId: string,
      overrides: { prompt?: string; tone?: string; depth?: string },
    ) => {
      const res = await fetch(`/api/presentations/${id}/slides/${slideId}/regenerate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(overrides),
      })
      if (!res.ok) { toast.error('Could not queue regeneration.'); return }
      setPresentation((cur) =>
        cur
          ? {
              ...cur,
              slides: cur.slides.map((s) =>
                s.id === slideId ? { ...s, status: 'PENDING' } : s,
              ),
            }
          : cur,
      )
      toast.success('Slide content queued for regeneration.')
    },
    [id],
  )

  const handleRegenImage = useCallback(
    async (slideId: string, overrides: { imageStyle?: string }) => {
      const res = await fetch(
        `/api/presentations/${id}/slides/${slideId}/image-regenerate`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(overrides),
        },
      )
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string
          upgradeRequired?: boolean
        }
        if (res.status === 403 && body.upgradeRequired) {
          toast.error(body.error ?? 'AI image regeneration is a Pro feature.', {
            action: { label: 'Upgrade', onClick: () => void navigate({ to: '/pricing' as never }) },
          })
          return
        }
        toast.error('Could not queue image regeneration.')
        return
      }
      setPresentation((cur) =>
        cur
          ? {
              ...cur,
              slides: cur.slides.map((s) =>
                s.id === slideId ? { ...s, status: 'CONTENT_READY', imageUrl: null } : s,
              ),
            }
          : cur,
      )
      toast.success('Image queued for regeneration.')
    },
    [id],
  )

  const handleVisualize = useCallback(
    async (slideId: string, kind: 'auto' | 'chart' | 'table' | 'timeline' | 'metrics') => {
      const res = await fetch(
        `/api/presentations/${id}/slides/${slideId}/visualize`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind }),
        },
      )
      const data = (await res.json()) as {
        slideData?: unknown
        error?: string
        upgradeRequired?: boolean
      }
      if (!res.ok) {
        if (res.status === 403 && data.upgradeRequired) {
          toast.error(data.error ?? 'Visualize is a Pro feature.', {
            action: { label: 'Upgrade', onClick: () => void navigate({ to: '/pricing' as never }) },
          })
          return
        }
        toast.error(data.error ?? 'Could not generate visual.')
        return
      }
      setPresentation((cur) =>
        cur
          ? {
              ...cur,
              slides: cur.slides.map((s) =>
                s.id === slideId ? { ...s, slideData: data.slideData ?? null } : s,
              ),
            }
          : cur,
      )
      toast.success('Slide visual generated.')
    },
    [id],
  )

  const handleRemoveData = useCallback(
    async (slideId: string) => {
      const res = await fetch(
        `/api/presentations/${id}/slides/${slideId}/visualize`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        toast.error('Could not remove data.')
        return
      }
      setPresentation((cur) =>
        cur
          ? {
              ...cur,
              slides: cur.slides.map((s) =>
                s.id === slideId ? { ...s, slideData: null } : s,
              ),
            }
          : cur,
      )
    },
    [id],
  )

  const handleTextAction = useCallback(
    async (slideId: string, action: 'MAKE_SHORTER' | 'MORE_FORMAL' | 'ADD_STATISTIC') => {
      const res = await fetch(`/api/presentations/${id}/text-actions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slideId, action }),
      })
      const data = (await res.json()) as { bullets?: string[]; error?: string }
      if (!res.ok || !data.bullets) {
        toast.error(data.error ?? 'Text action failed.')
        return
      }
      setPresentation((cur) =>
        cur
          ? {
              ...cur,
              slides: cur.slides.map((s) =>
                s.id === slideId ? { ...s, bullets: data.bullets! } : s,
              ),
            }
          : cur,
      )
      toast.success('Bullets updated.')
    },
    [id],
  )

  const handleImageUpload = useCallback(
    async (slideId: string, file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(
        `/api/presentations/${id}/slides/${slideId}/image-upload`,
        { method: 'POST', body: formData },
      )
      if (!res.ok) { toast.error('Image upload failed.'); return }
      const data = (await res.json()) as { imageUrl: string }
      setPresentation((cur) =>
        cur
          ? {
              ...cur,
              slides: cur.slides.map((s) =>
                s.id === slideId ? { ...s, imageUrl: data.imageUrl } : s,
              ),
            }
          : cur,
      )
      toast.success('Image replaced.')
    },
    [id],
  )

  // ── drag-and-drop reorder ──────────────────────────────────────────────

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id || !presentation) return

      const oldIndex = presentation.slides.findIndex((s) => s.id === active.id)
      const newIndex = presentation.slides.findIndex((s) => s.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(presentation.slides, oldIndex, newIndex).map(
        (s, i) => ({ ...s, position: i }),
      )
      setPresentation((cur) => cur ? { ...cur, slides: reordered } : cur)

      const res = await fetch(`/api/presentations/${id}/slides/reorder`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slideIds: reordered.map((s) => s.id) }),
      })
      if (!res.ok) {
        toast.error('Could not save slide order.')
        void loadPresentation()
      }
    },
    [id, presentation, loadPresentation],
  )

  // ── derived ────────────────────────────────────────────────────────────

  const completionSummary = useMemo(() => {
    if (!presentation) return ''
    const readyCount = presentation.slides.filter((s) => s.status === 'READY').length
    return `${readyCount}/${presentation.slides.length} slides ready`
  }, [presentation])

  const resolvedTheme = useMemo(
    () =>
      resolveTemplate(
        presentation?.template ?? 'MINIMAL_MONO',
        presentation?.themeOverrides ?? null,
      ),
    [presentation?.template, presentation?.themeOverrides],
  )
  const currentTemplate = resolvedTheme.template
  const brandLogoUrl = resolvedTheme.logoUrl

  const isEditorMode = presentation?.status === 'READY' || presentation?.status === 'FAILED'
  const isGenerating = presentation?.status === 'GENERATING' || presentation?.status === 'QUEUED'

  // ─── render ─────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Loading presentation…</p>
      </main>
    )
  }

  if (!presentation) {
    return (
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Could not load this presentation.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="rounded-3xl border border-border/70 bg-card/90 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{presentation.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isGenerating ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  Generating · {completionSummary}
                </span>
              ) : (
                <>
                  <span className="font-medium">{presentation.status}</span> · {completionSummary}
                  {saveStatus === 'saving' && (
                    <span className="ml-2 text-muted-foreground/60">
                      <Save size={11} className="mr-1 inline" />
                      Saving…
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                      <Save size={11} className="mr-1 inline" />
                      Saved
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          {/* Template + Editor actions */}
          <div className="flex flex-wrap gap-2">
            {/* Template switcher */}
            {templates.map((t) => (
              <Button
                key={t.metadata.id}
                type="button"
                size="sm"
                variant={presentation.template === t.metadata.id ? 'default' : 'outline'}
                disabled={isApplyingTemplate}
                onClick={() => void applyTemplate(t.metadata.id)}
              >
                {t.metadata.name}
              </Button>
            ))}

            {/* Editor-only actions */}
            {isEditorMode && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void navigate({ to: '/present/$id' as never, params: { id } as never })}
                >
                  <Presentation size={14} className="mr-1.5" />
                  Present
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowExport(true)}>
                  <Download size={14} className="mr-1.5" />
                  Export
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowShare(true)}>
                  <Link size={14} className="mr-1.5" />
                  Share
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowVersions(true)}>
                  <History size={14} className="mr-1.5" />
                  History
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowTheme(true)}>
                  <Palette size={14} className="mr-1.5" />
                  Brand kit
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Progress view (while generating) ──────────────────────────── */}
      {isGenerating && (
        <section className="space-y-3">
          {presentation.slides.map((slide) => (
            <article
              key={slide.id}
              className="rounded-2xl border border-border/70 bg-background/70 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Slide {slide.position + 1}
                  </p>
                  <h2 className="text-base font-semibold">{slide.title}</h2>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                  {slideStatusLabel[slide.status]}
                </span>
              </div>
              <div className="mt-4">
                <SlideRenderer
                  slide={{
                    id: slide.id,
                    title: slide.title,
                    intent: slide.intent,
                    bullets: slide.bullets,
                    visualConcept: slide.visualConcept,
                    speakerNotes: slide.speakerNotes,
                    layoutHints: slide.layoutHints,
                    slideData: slide.slideData,
                    imageUrl: slide.imageUrl,
                  }}
                  template={currentTemplate}
                  logoUrl={brandLogoUrl}
                />
              </div>
            </article>
          ))}
        </section>
      )}

      {/* ── Editor view (when READY or FAILED) ────────────────────────── */}
      {isEditorMode && (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={presentation.slides.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <section className="space-y-3">
                {presentation.slides.map((slide) => (
                  <SlideEditorCard
                    key={slide.id}
                    slide={slide}
                    template={currentTemplate}
                    logoUrl={brandLogoUrl}
                    presentationTone={presentation.tone}
                    presentationDepth={presentation.depth}
                    presentationImageStyle={presentation.imageStyle}
                    onChange={handleSlideChange}
                    onSave={handleSlideSave}
                    onDelete={handleSlideDelete}
                    onDuplicate={handleSlideDuplicate}
                    onRegenContent={handleRegenContent}
                    onRegenImage={handleRegenImage}
                    onImageUpload={handleImageUpload}
                    onVisualize={handleVisualize}
                    onRemoveData={handleRemoveData}
                    onTextAction={handleTextAction}
                  />
                ))}
              </section>
            </SortableContext>
          </DndContext>

          {/* Add slide button */}
          <button
            type="button"
            onClick={() => void handleAddSlide()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 py-4 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <Plus size={16} />
            Add slide
          </button>
        </>
      )}
        </div>

        {isEditorMode ? (
          <SlideAssistantPanel
            presentationId={id}
            slides={presentation.slides}
            selectedSlideId={selectedSlideId ?? presentation.slides[0]?.id ?? null}
            onSelectSlide={setSelectedSlideId}
            onSlideApplied={applyAssistantSlide}
          />
        ) : null}
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────── */}
      <ShareDialog
        open={showShare}
        onClose={() => setShowShare(false)}
        presentationId={id}
        initialIsPublic={presentation.isPublic}
        initialToken={presentation.shareToken}
      />
      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        presentationId={id}
      />
      <VersionHistoryDialog
        open={showVersions}
        onClose={() => setShowVersions(false)}
        presentationId={id}
        onRestored={loadPresentation}
      />
      <ThemeCustomizer
        open={showTheme}
        onClose={() => setShowTheme(false)}
        presentationId={id}
        baseTemplate={presentation.template}
        initialOverrides={presentation.themeOverrides}
        onApplied={(overrides) =>
          setPresentation((cur) => (cur ? { ...cur, themeOverrides: overrides } : cur))
        }
      />
    </main>
  )
}
