import { cn } from '@/lib/utils'
import { Check, LayoutTemplate } from 'lucide-react'
import type { TemplateConfig, TemplateKind } from '@/templates/schema'

type TemplatePickerProps = {
  value: TemplateKind
  templates: TemplateConfig[]
  onChange: (next: TemplateKind) => void
}

export default function TemplatePicker({
  value,
  templates,
  onChange,
}: TemplatePickerProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Template
      </legend>

      <div className="grid gap-2 sm:grid-cols-2">
        {templates.map((template) => {
          const isActive = template.metadata.id === value
          return (
            <button
              key={template.metadata.id}
              type="button"
              onClick={() => onChange(template.metadata.id)}
              className={cn(
                'relative rounded-2xl border bg-background/70 p-4 text-left shadow-sm transition-all duration-200',
                isActive
                  ? 'border-primary/60 bg-primary/8 ring-2 ring-primary/20'
                  : 'border-border/70 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
              )}
            >
              <div
                className={cn(
                  'mb-3 inline-flex size-9 items-center justify-center rounded-xl',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <LayoutTemplate className="size-4.5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {template.metadata.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {template.metadata.description}
              </p>
              {isActive ? (
                <span className="absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
