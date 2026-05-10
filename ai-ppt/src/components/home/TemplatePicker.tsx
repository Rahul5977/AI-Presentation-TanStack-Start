import { cn } from '@/lib/utils'
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
                'rounded-2xl border bg-background/70 p-3 text-left transition',
                isActive
                  ? 'border-primary/60 ring-2 ring-primary/20'
                  : 'border-border/70 hover:border-primary/40',
              )}
            >
              <p className="text-sm font-semibold text-foreground">
                {template.metadata.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {template.metadata.description}
              </p>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
