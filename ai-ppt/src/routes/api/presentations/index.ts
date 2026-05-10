import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { languageOptions, templateValues } from '@/lib/presentation-options'

const createPresentationSchema = z.object({
  prompt: z.string().min(8),
  audience: z.enum([
    'STUDENTS',
    'PROFESSIONALS',
    'INVESTORS',
    'GENERAL',
    'CUSTOM',
  ]),
  audienceCustom: z.string().optional(),
  tone: z.enum([
    'FORMAL',
    'CASUAL',
    'PERSUASIVE',
    'EDUCATIONAL',
    'INSPIRATIONAL',
  ]),
  lengthPreset: z.enum(['SHORT', 'MEDIUM', 'LONG', 'CUSTOM']),
  customSlideCount: z.number().int().min(1).max(60).optional(),
  language: z.enum(languageOptions),
  template: z.enum(templateValues),
  imageStyle: z.enum(['REALISTIC', 'ILLUSTRATION', 'MINIMAL', 'THREE_D', 'NONE']),
  depth: z.enum(['HIGH_LEVEL', 'BALANCED', 'DETAILED']),
})

export const Route = createFileRoute('/api/presentations/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })

        if (!session) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        const bodyUnknown = await request.json()
        const body =
          bodyUnknown &&
          typeof bodyUnknown === 'object' &&
          !Array.isArray(bodyUnknown)
            ? { ...(bodyUnknown as Record<string, unknown>) }
            : {}

        // Ignore stray fields when preset isn't Custom (client bug / stale state).
        if (body.lengthPreset !== 'CUSTOM') {
          delete body.customSlideCount
        }
        if (body.audience !== 'CUSTOM') {
          delete body.audienceCustom
        }

        const parsed = createPresentationSchema.safeParse(body)
        if (!parsed.success) {
          return json(
            { error: 'Invalid payload', issues: parsed.error.flatten() },
            { status: 400 },
          )
        }

        const input = parsed.data
        const title =
          input.prompt.split('\n')[0]?.trim().slice(0, 80) ||
          'Untitled presentation'

        try {
          const presentation = await prisma.presentation.create({
            data: {
              userId: session.user.id,
              title,
              prompt: input.prompt,
              audience: input.audience,
              audienceCustom: input.audienceCustom,
              tone: input.tone,
              lengthPreset: input.lengthPreset,
              customSlideCount: input.customSlideCount,
              language: input.language,
              template: input.template,
              imageStyle: input.imageStyle,
              depth: input.depth,
              status: 'DRAFT',
              lastEditedAt: new Date(),
            },
            select: {
              id: true,
              status: true,
            },
          })

          return json({
            presentationId: presentation.id,
            status: presentation.status,
          })
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Database error while saving draft.'
          return json({ error: message }, { status: 503 })
        }
      },
    },
  },
})
