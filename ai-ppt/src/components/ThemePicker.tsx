import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  THEMES,
  type ColorTheme,
  type Mode,
  useTheme,
} from '@/providers/theme-provider'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'

const MODE_OPTIONS: Array<{
  id: Mode
  label: string
  Icon: typeof Sun
}> = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'dark', label: 'Dark', Icon: Moon },
  { id: 'system', label: 'System', Icon: Monitor },
]

export default function ThemePicker() {
  const [open, setOpen] = useState(false)
  const { mode, setMode, colorTheme, setColorTheme } = useTheme()
  const current = THEMES.find((theme) => theme.id === colorTheme) ?? THEMES[0]

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl transition-all duration-200 hover:scale-105"
          aria-label="Open theme picker"
        >
          <span
            className="size-5 rounded-full ring-2 ring-border"
            style={{ backgroundColor: current.primaryHex }}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass w-[340px] max-h-[80vh] overflow-y-auto rounded-2xl p-4">
        <div className="space-y-4">
          <div>
            <DropdownMenuLabel className="px-0 text-xs font-semibold uppercase tracking-[0.14em]">
              Mode
            </DropdownMenuLabel>
            <div className="mt-2 grid grid-cols-3 gap-2 rounded-2xl border border-border/60 bg-muted/30 p-1">
              {MODE_OPTIONS.map(({ id, label, Icon }) => {
                const active = mode === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    className={cn(
                      'inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-all duration-150',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <DropdownMenuSeparator />

          <div>
            <DropdownMenuLabel className="px-0 text-xs font-semibold uppercase tracking-[0.14em]">
              Color Theme
            </DropdownMenuLabel>
            <div className="mt-3 grid grid-cols-4 gap-2.5">
              {THEMES.map((theme) => {
                const active = theme.id === colorTheme
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      setColorTheme(theme.id as ColorTheme)
                      setOpen(false)
                    }}
                    className={cn(
                      'relative flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 p-2 text-center transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30',
                      active && 'ring-2 ring-primary',
                    )}
                  >
                    <span
                      className="block size-8 rounded-lg p-[4px]"
                      style={{ backgroundColor: theme.bgHex }}
                    >
                      <span
                        className="block size-full rounded-full"
                        style={{ backgroundColor: theme.primaryHex }}
                      />
                    </span>
                    <span className="text-[11px] font-medium leading-none text-foreground">
                      {theme.name}
                    </span>
                    {active ? (
                      <span className="absolute right-1.5 top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-2.5" />
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          <DropdownMenuSeparator />

          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5">
            <span
              className="size-3.5 rounded-full"
              style={{ backgroundColor: current.primaryHex }}
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                {current.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {current.description}
              </p>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
