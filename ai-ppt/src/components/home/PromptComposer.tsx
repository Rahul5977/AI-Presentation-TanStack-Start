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
import { ArrowRight, WandSparkles } from 'lucide-react'
import { useCallback, useRef } from 'react'

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

type PromptComposerProps = {
  values: PresentationFormValues
  onChange: (nextValues: PresentationFormValues) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export default function PromptComposer({
  values,
  onChange,
  onSubmit,
  isSubmitting,
}: PromptComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const templates = listTemplates()

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

  return (
    <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/90 shadow-2xl shadow-black/5 ring-1 ring-white/10 backdrop-blur dark:shadow-black/30">
      <div className="border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <WandSparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Create a new presentation
            </h2>
            <p className="text-sm text-muted-foreground">
              Give the AI enough context to shape a structured deck.
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
            className="w-full resize-none rounded-3xl border border-border/70 bg-background/80 px-5 py-4 text-base leading-7 text-foreground shadow-inner outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div className="grid gap-6">
          <OptionChips
            title="Audience"
            value={values.audience}
            options={audienceOptions}
            onChange={(v) => update('audience', v)}
          />
          {values.audience === 'CUSTOM' ? (
            <input
              value={values.audienceCustom ?? ''}
              onChange={(e) => update('audienceCustom', e.target.value)}
              placeholder="Custom audience"
              className="h-11 rounded-2xl border border-border/70 bg-background/80 px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/15"
            />
          ) : null}

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
          {values.lengthPreset === 'CUSTOM' ? (
            <input
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
              className="h-11 rounded-2xl border border-border/70 bg-background/80 px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/15"
            />
          ) : null}

          <TemplatePicker
            value={values.template}
            templates={templates}
            onChange={(v) => update('template', v)}
          />
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
            <select
              value={values.language}
              onChange={(e) =>
                update('language', e.target.value as LanguageValue)
              }
              className="h-11 w-full rounded-2xl border border-border/70 bg-background/80 px-4 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/15"
            >
              {languageOptions.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            The first draft is saved to your presentation history.
          </p>
          <Button
            size="lg"
            onClick={onSubmit}
            disabled={isSubmitting || values.prompt.trim().length < 8}
            className="h-12 px-6 text-base shadow-lg shadow-primary/20"
          >
            {isSubmitting ? 'Creating draft...' : 'Generate'}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
