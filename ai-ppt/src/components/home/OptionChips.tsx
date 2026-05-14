import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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
            <motion.button
              key={option.value}
              type="button"
              whileTap={{ scale: 0.96 }}
              className={cn(
                'rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-150 shadow-sm',
                isActive
                  ? 'border-primary/50 bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'border-border/60 bg-background/70 text-muted-foreground hover:border-primary/40 hover:bg-background hover:text-foreground',
              )}
              aria-pressed={isActive}
              onClick={() => onChange(option.value)}
            >
              {option.label}
              {option.hint ? (
                <span
                  className={cn(
                    'ml-1.5 text-[11px] font-normal',
                    isActive ? 'text-primary-foreground/75' : 'text-muted-foreground/80',
                  )}
                >
                  {option.hint}
                </span>
              ) : null}
            </motion.button>
          )
        })}
      </div>
    </fieldset>
  )
}
