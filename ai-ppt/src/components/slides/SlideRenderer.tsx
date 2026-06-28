import SlideCanvas from '@/components/slides/SlideCanvas'
import SlideDataView from '@/components/slides/SlideData'
import { resolveSlideVariant } from '@/components/slides/layout-map'
import { cn } from '@/lib/utils'
import { parseSlideData } from '@/lib/slide-data'
import type { TemplateConfig } from '@/templates/schema'

export type RenderableSlide = {
  id: string
  title: string
  intent?: string | null
  bullets?: unknown
  visualConcept?: string | null
  speakerNotes?: string | null
  layoutHints?: unknown
  imageUrl?: string | null
  slideData?: unknown
}

type SlideRendererProps = {
  slide: RenderableSlide
  template: TemplateConfig
  logoUrl?: string | null
}

function normalizeBullets(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input.filter((item): item is string => typeof item === 'string').slice(0, 8)
}

export default function SlideRenderer({ slide, template, logoUrl }: SlideRendererProps) {
  const bullets = normalizeBullets(slide.bullets)
  const slideData = parseSlideData(slide.slideData)
  const variantKey = resolveSlideVariant(slide.layoutHints, bullets.length)
  const variant = template.layouts[variantKey]
  const topImageLayout = variant.key === 'imageTop' || variant.key === 'title' || variant.key === 'sectionDivider' || variant.key === 'closing'
  const mediaFrameClass = topImageLayout
    ? 'h-full min-h-36 max-h-72 rounded-2xl'
    : 'h-full min-h-44 rounded-xl'

  // Rich data slides (chart / table / timeline / metrics) use a focused
  // header + full-bleed data layout rather than the bullets/media grid.
  if (slideData) {
    return (
      <SlideCanvas template={template} logoUrl={logoUrl}>
        <div className="flex h-full flex-col gap-3">
          <header className="space-y-1">
            <h3
              className="leading-tight"
              style={{
                fontFamily: 'var(--slide-font-display)',
                fontSize: 'var(--slide-title-size)',
                fontWeight: 'var(--slide-title-weight)',
              }}
            >
              {slide.title}
            </h3>
            {slide.intent ? (
              <p
                className="text-(--slide-muted)"
                style={{
                  fontFamily: 'var(--slide-font-body)',
                  fontSize: 'var(--slide-body-size)',
                }}
              >
                {slide.intent}
              </p>
            ) : null}
          </header>
          <div className="min-h-0 flex-1">
            <SlideDataView data={slideData} />
          </div>
        </div>
      </SlideCanvas>
    )
  }

  return (
    <SlideCanvas template={template} logoUrl={logoUrl}>
      <article
        className={cn('grid h-full gap-4', variant.containerClasses)}
        style={{
          gridTemplateColumns: variant.gridTemplateColumns,
          gridTemplateRows: variant.gridTemplateRows,
          gridTemplateAreas: variant.templateAreas,
        }}
      >
        <header className={cn('space-y-2', variant.titleClasses)} style={{ gridArea: 'title' }}>
          <h3
            className="leading-tight"
            style={{
              fontFamily: 'var(--slide-font-display)',
              fontSize: 'var(--slide-title-size)',
              fontWeight: 'var(--slide-title-weight)',
            }}
          >
            {slide.title}
          </h3>
          {slide.intent ? (
            <p
              className="text-(--slide-muted)"
              style={{
                fontFamily: 'var(--slide-font-body)',
                fontSize: 'var(--slide-body-size)',
                fontWeight: 'var(--slide-body-weight)',
              }}
            >
              {slide.intent}
            </p>
          ) : null}
        </header>

        <section className={cn('space-y-2', variant.bodyClasses)} style={{ gridArea: 'body' }}>
          {bullets.length > 0 ? (
            <ul className="space-y-1.5">
              {bullets.map((bullet, index) => (
                <li
                  key={`${slide.id}-bullet-${index}`}
                  className="list-inside list-disc"
                  style={{
                    fontFamily: 'var(--slide-font-body)',
                    fontSize: 'var(--slide-body-size)',
                    fontWeight: 'var(--slide-body-weight)',
                  }}
                >
                  {bullet}
                </li>
              ))}
            </ul>
          ) : (
            <p
              style={{
                fontFamily: 'var(--slide-font-body)',
                fontSize: 'var(--slide-body-size)',
                fontWeight: 'var(--slide-body-weight)',
              }}
            >
              {slide.speakerNotes ?? 'Slide content is being generated.'}
            </p>
          )}
        </section>

        <aside className={cn('min-h-0 overflow-hidden', variant.mediaClasses)} style={{ gridArea: 'media' }}>
          {slide.imageUrl ? (
            <img
              src={slide.imageUrl}
              alt={slide.visualConcept ?? 'Slide visual'}
              className={cn(
                'w-full border border-(--slide-border) object-cover',
                mediaFrameClass,
              )}
            />
          ) : (
            <div
              className={cn(
                'flex h-full items-center justify-center border border-dashed border-(--slide-border) px-3 text-center',
                mediaFrameClass,
              )}
            >
              <p
                style={{
                  fontFamily: 'var(--slide-font-body)',
                  fontSize: 'var(--slide-caption-size)',
                  color: 'var(--slide-muted)',
                }}
              >
                {slide.visualConcept ?? 'Visual placeholder'}
              </p>
            </div>
          )}
        </aside>

        <footer className={cn('self-end', variant.footerClasses)} style={{ gridArea: 'footer' }}>
          <span
            className="inline-flex rounded-full px-2.5 py-1"
            style={{
              background: 'var(--slide-accent)',
              color: 'var(--slide-accent-foreground)',
              fontFamily: 'var(--slide-font-body)',
              fontSize: 'var(--slide-caption-size)',
            }}
          >
            {template.metadata.name}
          </span>
        </footer>
      </article>
    </SlideCanvas>
  )
}
