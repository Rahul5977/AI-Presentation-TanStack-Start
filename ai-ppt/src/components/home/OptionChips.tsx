import { cn } from '@/lib/utils'

type OptionChip<T extends string> = {
  value: T
  label: string
  hint?: string
}

type OptionChipsProps<T extends string> = {
  title: string
  value: T
  options: readonly OptionChip<T>[]
  onChange: (value: T) => void
}

export default function OptionChips<T extends string>({
  title,
  value,
  options,
  onChange,
}: OptionChipsProps<T>) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </legend>
      <div className="flex flex-wrap gap-2.5">
        {options.map((option) => {
          const isActive = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              className={cn(
                'rounded-2xl border px-3.5 py-2 text-sm font-medium transition shadow-sm',
                isActive
                  ? 'border-primary/60 bg-primary text-primary-foreground shadow-primary/20'
                  : 'border-border/70 bg-background/70 text-muted-foreground hover:border-primary/40 hover:bg-background hover:text-foreground',
              )}
              aria-pressed={isActive}
              onClick={() => onChange(option.value)}
            >
              {option.label}
              {option.hint ? (
                <span
                  className={cn(
                    'ml-1.5 text-[11px] font-normal',
                    isActive
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground',
                  )}
                >
                  {option.hint}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
