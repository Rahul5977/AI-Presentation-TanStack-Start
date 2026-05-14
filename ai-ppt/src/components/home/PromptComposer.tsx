import { Button } from '#/components/ui/button'
import OptionChips from '@/components/home/OptionChips'
import TemplatePicker from '@/components/home/TemplatePicker'
import {
  audienceOptions,
  depthOptions,
  imageStyleOptions,
  languageOptions,
  lengthOptions,
  toneOptions,
} from '@/lib/presentation-options'
import type {
  AudienceValue,
  DepthValue,
  ImageStyleValue,
  LanguageValue,
  LengthValue,
  TemplateValue,
  ToneValue,
} from '@/lib/presentation-options'
import { listTemplates } from '@/templates/registry'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Loader2,
  Type,
  Upload,
  WandSparkles,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

export type PresentationFormValues = {
  prompt: string
  audience: AudienceValue
  audienceCustom?: string
  tone: ToneValue
  lengthPreset: LengthValue
  customSlideCount?: number
  language: LanguageValue
  template: TemplateValue
  imageStyle: ImageStyleValue
  depth: DepthValue
}

export type SourceImportMode = 'text' | 'url' | 'pdf'

export type SourceImportValues = {
  sourceMode: SourceImportMode
  sourceText: string
  sourceUrl: string
  sourceFile: File | null
}

type PromptComposerProps = {
  values: PresentationFormValues
  onChange: (nextValues: PresentationFormValues) => void
  sourceValues: SourceImportValues
  onSourceChange: (nextValues: SourceImportValues) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export default function PromptComposer({
  values,
  onChange,
  sourceValues,
  onSourceChange,
  onSubmit,
  isSubmitting,
}: PromptComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const templates = listTemplates()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const trimmedPromptLength = values.prompt.trim().length

  const update = useCallback(
    <TKey extends keyof PresentationFormValues>(
      key: TKey,
      value: PresentationFormValues[TKey],
    ) => {
      if (key === 'lengthPreset' && value !== 'CUSTOM') {
        onChange({
          ...values,
          lengthPreset: value,
          customSlideCount: undefined,
        })
        return
      }
      if (key === 'audience' && value !== 'CUSTOM') {
        onChange({
          ...values,
          audience: value,
          audienceCustom: undefined,
        })
        return
      }
      onChange({ ...values, [key]: value })
    },
    [onChange, values],
  )

  const autosizePrompt = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 280)}px`
  }, [])

  const updateSource = useCallback(
    <TKey extends keyof SourceImportValues>(
      key: TKey,
      value: SourceImportValues[TKey],
    ) => {
      onSourceChange({
        ...sourceValues,
        [key]: value,
      })
    },
    [onSourceChange, sourceValues],
  )

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-2xl shadow-black/20 backdrop-blur-xl"
    >
      <div className="border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <WandSparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Create a new presentation
            </h2>
            <p className="text-sm text-muted-foreground">
              Shape your outline, style, and source context in one flow.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-7 p-5 sm:p-7">
        <div className="space-y-3">
          <label
            htmlFor="presentation-prompt"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Presentation brief
          </label>
          <div className="relative">
            <textarea
              id="presentation-prompt"
              ref={textareaRef}
              value={values.prompt}
              onChange={(e) => {
                update('prompt', e.target.value)
                autosizePrompt()
              }}
              onInput={autosizePrompt}
              rows={5}
              placeholder="Example: Build a persuasive 10-slide pitch deck for an AI study assistant for college students, with clear market sizing and demo flow."
              className="w-full resize-none rounded-2xl border border-border/60 bg-background/70 px-5 py-4 text-base leading-7 text-foreground shadow-inner outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-4 focus:ring-primary/12"
            />
            {trimmedPromptLength > 0 ? (
              <span className="absolute bottom-3 right-4 text-[11px] font-medium text-muted-foreground">
                {trimmedPromptLength} chars
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/15 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Import source
            </p>
            <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Optional
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {([
              ['text', 'Long text', Type],
              ['url', 'URL', Globe],
              ['pdf', 'PDF', FileText],
            ] as const).map(([mode, label, Icon]) => {
              const active = sourceValues.sourceMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateSource('sourceMode', mode)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-150 ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            {sourceValues.sourceMode === 'text' ? (
              <motion.div
                key="source-text"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <textarea
                  value={sourceValues.sourceText}
                  onChange={(e) => updateSource('sourceText', e.target.value)}
                  rows={4}
                  placeholder="Paste long source text. The AI will extract key points into slides."
                  className="w-full resize-y rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-4 focus:ring-primary/12"
                />
              </motion.div>
            ) : null}

            {sourceValues.sourceMode === 'url' ? (
              <motion.div
                key="source-url"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <input
                  value={sourceValues.sourceUrl}
                  onChange={(e) => updateSource('sourceUrl', e.target.value)}
                  type="url"
                  placeholder="https://example.com/article"
                  className="h-11 w-full rounded-2xl border border-border/60 bg-background/70 px-4 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/12"
                />
              </motion.div>
            ) : null}

            {sourceValues.sourceMode === 'pdf' ? (
              <motion.div
                key="source-pdf"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="space-y-2"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-6 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-muted/50"
                >
                  <Upload className="size-5 text-primary" />
                  <span className="font-medium text-foreground">Click to select PDF</span>
                  <span className="text-xs text-muted-foreground">or drag and drop</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => updateSource('sourceFile', e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                {sourceValues.sourceFile ? (
                  <p className="text-xs text-muted-foreground">
                    Selected: {sourceValues.sourceFile.name}
                  </p>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="grid gap-6">
          <OptionChips
            title="Audience"
            value={values.audience}
            options={audienceOptions}
            onChange={(v) => update('audience', v)}
          />
          <AnimatePresence>
            {values.audience === 'CUSTOM' ? (
              <motion.input
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                value={values.audienceCustom ?? ''}
                onChange={(e) => update('audienceCustom', e.target.value)}
                placeholder="Custom audience"
                className="h-11 rounded-2xl border border-border/60 bg-background/70 px-4 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/12"
              />
            ) : null}
          </AnimatePresence>

          <OptionChips
            title="Tone"
            value={values.tone}
            options={toneOptions}
            onChange={(v) => update('tone', v)}
          />

          <OptionChips
            title="Length"
            value={values.lengthPreset}
            options={lengthOptions}
            onChange={(v) => update('lengthPreset', v)}
          />
          <AnimatePresence>
            {values.lengthPreset === 'CUSTOM' ? (
              <motion.input
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                value={values.customSlideCount ?? ''}
                onChange={(e) =>
                  update(
                    'customSlideCount',
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                type="number"
                min={1}
                max={60}
                placeholder="Enter slide count"
                className="h-11 rounded-2xl border border-border/60 bg-background/70 px-4 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/12"
              />
            ) : null}
          </AnimatePresence>

          <TemplatePicker
            value={values.template}
            templates={templates}
            onChange={(v) => update('template', v)}
          />

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setAdvancedOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/20 px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted/30"
            >
              Advanced options
              {advancedOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
            <AnimatePresence>
              {advancedOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="grid gap-6"
                >
                  <OptionChips
                    title="Image style"
                    value={values.imageStyle}
                    options={imageStyleOptions}
                    onChange={(v) => update('imageStyle', v)}
                  />
                  <OptionChips
                    title="Depth of content"
                    value={values.depth}
                    options={depthOptions}
                    onChange={(v) => update('depth', v)}
                  />
                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Language
                    </label>
                    <div className="relative">
                      <select
                        value={values.language}
                        onChange={(e) => update('language', e.target.value as LanguageValue)}
                        className="h-11 w-full appearance-none rounded-2xl border border-border/60 bg-background/70 px-4 pr-10 text-sm outline-none transition-all duration-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/12"
                      >
                        {languageOptions.map((language) => (
                          <option key={language} value={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Your draft will be saved to presentation history.
          </p>
          <Button
            size="lg"
            onClick={onSubmit}
            disabled={isSubmitting || trimmedPromptLength < 8}
            className="h-12 px-7 shadow-xl shadow-primary/25 transition-all duration-150 hover:scale-[1.02]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating draft…
              </>
            ) : (
              <>
                Generate
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.section>
  )
}
