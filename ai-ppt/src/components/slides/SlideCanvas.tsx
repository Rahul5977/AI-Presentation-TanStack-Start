import { cn } from '@/lib/utils'
import type { TemplateConfig } from '@/templates/schema'
import type { CSSProperties, ReactNode } from 'react'

type SlideCanvasProps = {
  template: TemplateConfig
  children: ReactNode
  className?: string
  logoUrl?: string | null
}

export default function SlideCanvas({
  template,
  children,
  className,
  logoUrl,
}: SlideCanvasProps) {
  const style = {
    '--slide-background': template.colors.background,
    '--slide-foreground': template.colors.foreground,
    '--slide-accent': template.colors.accent,
    '--slide-accent-foreground': template.colors.accentForeground,
    '--slide-muted': template.colors.muted,
    '--slide-border': template.colors.border,
    '--slide-font-display': template.typography.fontFamilyDisplay,
    '--slide-font-body': template.typography.fontFamilyBody,
    '--slide-title-size': template.typography.titleSize,
    '--slide-body-size': template.typography.bodySize,
    '--slide-caption-size': template.typography.captionSize,
    '--slide-title-weight': String(template.typography.titleWeight),
    '--slide-body-weight': String(template.typography.bodyWeight),
  } as CSSProperties

  return (
    <div
      style={style}
      className={cn(
        'w-full overflow-hidden rounded-2xl border shadow-md',
        'border-[var(--slide-border)] bg-[var(--slide-background)] text-[var(--slide-foreground)]',
        className,
      )}
    >
      <div className="relative aspect-video w-full p-6 sm:p-8">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Brand logo"
            className="pointer-events-none absolute right-4 top-4 z-10 h-6 w-auto max-w-24 object-contain opacity-90 sm:right-6 sm:top-6 sm:h-7"
          />
        ) : null}
        {children}
      </div>
    </div>
  )
}
