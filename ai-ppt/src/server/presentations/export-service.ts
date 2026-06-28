import PptxGenJS from 'pptxgenjs'
import { prisma } from '@/lib/db'
import { parseThemeOverrides, resolveTemplate } from '@/templates/theme'
import { parseSlideData } from '@/lib/slide-data'
import type { ResolvedTheme } from '@/templates/theme'
import type { SlideData } from '@/lib/slide-data'

type ExportSlide = {
  title: string
  intent: string | null
  bullets: string[]
  speakerNotes: string | null
  imageUrl: string | null
  slideData: SlideData | null
}

type ExportPresentation = {
  title: string
  theme: ResolvedTheme
  slides: ExportSlide[]
}

// pptxgenjs expects 6-digit hex without a leading '#'.
function toPptxColor(hex: string, fallback: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/u.exec(hex.trim())
  if (m) return m[1].toUpperCase()
  const short = /^#?([0-9a-fA-F]{3})$/u.exec(hex.trim())
  if (short) {
    return short[1].split('').map((c) => c + c).join('').toUpperCase()
  }
  return fallback
}

async function loadPresentationForExport(
  userId: string,
  presentationId: string,
): Promise<ExportPresentation | null> {
  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, userId },
    select: {
      title: true,
      template: true,
      themeOverrides: true,
      slides: {
        where: { status: 'READY' },
        orderBy: { position: 'asc' },
        select: {
          title: true,
          intent: true,
          bullets: true,
          speakerNotes: true,
          imageUrl: true,
          slideData: true,
        },
      },
    },
  })
  if (!presentation) return null
  const theme = resolveTemplate(
    presentation.template,
    parseThemeOverrides(presentation.themeOverrides),
  )
  return {
    title: presentation.title,
    theme,
    slides: presentation.slides.map((s) => ({
      title: s.title,
      intent: s.intent,
      bullets: Array.isArray(s.bullets) ? (s.bullets as string[]) : [],
      speakerNotes: s.speakerNotes,
      imageUrl: s.imageUrl,
      slideData: parseSlideData(s.slideData),
    })),
  }
}

export async function exportPptx(
  userId: string,
  presentationId: string,
): Promise<{ buffer: Buffer; filename: string } | null> {
  const data = await loadPresentationForExport(userId, presentationId)
  if (!data) return null

  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = data.title
  pptx.subject = data.title

  // Map the resolved theme to deck colors so exported files match the editor.
  const colors = data.theme.template.colors
  const bgColor = toPptxColor(colors.background, 'FFFFFF')
  const titleColor = toPptxColor(colors.foreground, '1A1A1A')
  const mutedColor = toPptxColor(colors.muted, '666666')
  const accentColor = toPptxColor(colors.accent, '333333')
  const logoUrl = data.theme.logoUrl

  for (const slide of data.slides) {
    const pSlide = pptx.addSlide()

    // Background
    pSlide.background = { color: bgColor }

    // Accent bar for visual identity
    pSlide.addShape('rect', {
      x: 0,
      y: 0,
      w: 0.18,
      h: 7.5,
      fill: { color: accentColor },
      line: { type: 'none' },
    })

    // Brand logo (top-right), if any
    if (logoUrl) {
      try {
        pSlide.addImage({
          path: logoUrl,
          x: 11.6,
          y: 0.3,
          w: 1.2,
          h: 0.5,
          sizing: { type: 'contain', w: 1.2, h: 0.5 },
        })
      } catch {
        // Skip logo if it cannot be fetched
      }
    }

    // Title
    pSlide.addText(slide.title, {
      x: 0.5,
      y: 0.3,
      w: slide.imageUrl ? 5.5 : 12.5,
      h: 1.0,
      fontSize: 28,
      bold: true,
      color: titleColor,
      fontFace: 'Arial',
      wrap: true,
    })

    // Intent / subtitle
    if (slide.intent) {
      pSlide.addText(slide.intent, {
        x: 0.5,
        y: 1.4,
        w: slide.imageUrl ? 5.5 : 12.5,
        h: 0.5,
        fontSize: 14,
        color: mutedColor,
        fontFace: 'Arial',
        italic: true,
        wrap: true,
      })
    }

    if (slide.slideData) {
      // Rich data slide: native chart / table, or laid-out timeline / metrics.
      renderSlideData(pSlide, slide.slideData, { titleColor, mutedColor, accentColor })
    } else {
      // Bullets
      if (slide.bullets.length > 0) {
        const bulletItems = slide.bullets.map((b) => ({
          text: b,
          options: { bullet: { code: '2022' }, fontSize: 13, color: titleColor, fontFace: 'Arial' },
        }))
        pSlide.addText(bulletItems, {
          x: 0.5,
          y: 2.0,
          w: slide.imageUrl ? 5.5 : 12.5,
          h: 4.5,
          fontSize: 13,
          color: titleColor,
          fontFace: 'Arial',
          wrap: true,
          valign: 'top',
        })
      }

      // Image (if URL is accessible)
      if (slide.imageUrl) {
        try {
          pSlide.addImage({
            path: slide.imageUrl,
            x: 6.5,
            y: 1.0,
            w: 6.0,
            h: 5.5,
            sizing: { type: 'contain', w: 6.0, h: 5.5 },
          })
        } catch {
          // Skip image if it cannot be fetched
        }
      }
    }

    // Speaker notes
    if (slide.speakerNotes) {
      pSlide.addNotes(slide.speakerNotes)
    }
  }

  const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
  const filename = `${data.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pptx`
  return { buffer, filename }
}

type SlidePalette = { titleColor: string; mutedColor: string; accentColor: string }

// Render a rich-data slide into a pptx slide. Charts and tables use pptxgenjs
// native objects (so they stay editable in PowerPoint); timeline and metrics
// are laid out with positioned text boxes.
function renderSlideData(
  pSlide: PptxGenJS.Slide,
  data: SlideData,
  palette: SlidePalette,
) {
  const region = { x: 0.5, y: 2.0, w: 12.3, h: 4.8 }

  if (data.kind === 'chart') {
    const labels = data.categories
    const chartData = data.series.map((s) => ({
      name: s.name,
      labels,
      values: s.values,
    }))
    const chartType =
      data.chartType === 'line'
        ? 'line'
        : data.chartType === 'pie'
          ? 'pie'
          : 'bar'
    pSlide.addChart(chartType, chartData, {
      ...region,
      showLegend: data.series.length > 1,
      legendPos: 'b',
      showTitle: false,
      chartColors: [palette.accentColor, palette.titleColor, palette.mutedColor],
    })
    return
  }

  if (data.kind === 'table') {
    const headerRow = data.columns.map((c) => ({
      text: c,
      options: { bold: true, color: 'FFFFFF', fill: { color: palette.accentColor } },
    }))
    const bodyRows = data.rows.map((row) =>
      data.columns.map((_, i) => ({
        text: row[i] ?? '',
        options: { color: palette.titleColor },
      })),
    )
    pSlide.addTable([headerRow, ...bodyRows], {
      ...region,
      fontSize: 12,
      fontFace: 'Arial',
      border: { type: 'solid', pt: 1, color: palette.mutedColor },
      valign: 'middle',
    })
    return
  }

  if (data.kind === 'timeline') {
    const count = data.events.length
    const colW = region.w / count
    data.events.forEach((event, i) => {
      const x = region.x + colW * i
      pSlide.addText(
        [
          { text: `${event.label}\n`, options: { bold: true, color: palette.accentColor, fontSize: 13 } },
          { text: `${event.title}\n`, options: { color: palette.titleColor, fontSize: 12, bold: true } },
          { text: event.description ?? '', options: { color: palette.mutedColor, fontSize: 10 } },
        ],
        { x, y: region.y, w: colW - 0.15, h: region.h, valign: 'top', fontFace: 'Arial' },
      )
    })
    return
  }

  // metrics
  const count = data.items.length
  const cols = count <= 2 ? 2 : 3
  const colW = region.w / cols
  data.items.forEach((item, i) => {
    const x = region.x + colW * (i % cols)
    const y = region.y + Math.floor(i / cols) * 1.8
    pSlide.addText(
      [
        { text: `${item.value}\n`, options: { bold: true, color: palette.accentColor, fontSize: 40 } },
        { text: `${item.label}\n`, options: { color: palette.titleColor, fontSize: 14, bold: true } },
        { text: item.caption ?? '', options: { color: palette.mutedColor, fontSize: 11 } },
      ],
      { x, y, w: colW - 0.2, h: 1.7, valign: 'top', fontFace: 'Arial' },
    )
  })
}
