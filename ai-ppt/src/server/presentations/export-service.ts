import PptxGenJS from 'pptxgenjs'
import { prisma } from '@/lib/db'

type ExportSlide = {
  title: string
  intent: string | null
  bullets: string[]
  speakerNotes: string | null
  imageUrl: string | null
}

type ExportPresentation = {
  title: string
  slides: ExportSlide[]
}

async function loadPresentationForExport(
  userId: string,
  presentationId: string,
): Promise<ExportPresentation | null> {
  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, userId },
    select: {
      title: true,
      slides: {
        where: { status: 'READY' },
        orderBy: { position: 'asc' },
        select: {
          title: true,
          intent: true,
          bullets: true,
          speakerNotes: true,
          imageUrl: true,
        },
      },
    },
  })
  if (!presentation) return null
  return {
    title: presentation.title,
    slides: presentation.slides.map((s) => ({
      title: s.title,
      intent: s.intent,
      bullets: Array.isArray(s.bullets) ? (s.bullets as string[]) : [],
      speakerNotes: s.speakerNotes,
      imageUrl: s.imageUrl,
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

  for (const slide of data.slides) {
    const pSlide = pptx.addSlide()

    // Background
    pSlide.background = { color: 'FFFFFF' }

    // Title
    pSlide.addText(slide.title, {
      x: 0.5,
      y: 0.3,
      w: slide.imageUrl ? 5.5 : 12.5,
      h: 1.0,
      fontSize: 28,
      bold: true,
      color: '1a1a1a',
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
        color: '666666',
        fontFace: 'Arial',
        italic: true,
        wrap: true,
      })
    }

    // Bullets
    if (slide.bullets.length > 0) {
      const bulletItems = slide.bullets.map((b) => ({
        text: b,
        options: { bullet: true, fontSize: 13, color: '333333', fontFace: 'Arial' },
      }))
      pSlide.addText(bulletItems, {
        x: 0.5,
        y: 2.0,
        w: slide.imageUrl ? 5.5 : 12.5,
        h: 4.5,
        fontSize: 13,
        color: '333333',
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

    // Speaker notes
    if (slide.speakerNotes) {
      pSlide.addNotes(slide.speakerNotes)
    }
  }

  const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
  const filename = `${data.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pptx`
  return { buffer, filename }
}
