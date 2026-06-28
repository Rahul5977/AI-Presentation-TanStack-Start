import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { createBrandKit, listBrandKits } from '@/server/presentations/brand-kit-service'
import { themeOverridesSchema } from '@/templates/theme'
import { TEMPLATE_KINDS } from '@/templates/schema'

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  baseTemplate: z.enum(TEMPLATE_KINDS),
  overrides: themeOverridesSchema,
})

export const Route = createFileRoute('/api/brand-kits/')({
  server: {
    handlers: {
      GET: async () => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const kits = await listBrandKits(session.user.id)
        return json({ brandKits: kits })
      },
      POST: async ({ request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const parsed = createSchema.safeParse(await request.json())
        if (!parsed.success) {
          return json({ error: 'Invalid brand kit payload' }, { status: 400 })
        }

        const kit = await createBrandKit(session.user.id, parsed.data)
        return json({ brandKit: kit }, { status: 201 })
      },
    },
  },
})
