import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'
import { themeOverridesSchema } from '@/templates/theme'
import type { ThemeOverrides } from '@/templates/theme'

export type ApplyThemeResult =
  | { ok: true; themeOverrides: ThemeOverrides | null }
  | { ok: false; error: string }

/**
 * Persist theme overrides on a presentation and mirror them onto its draft so
 * the deck looks identical whether rendered from the live presentation or a
 * regenerated draft. Passing `null` clears customization back to the base
 * template. Also keeps the legacy flat brand columns in sync for compatibility.
 */
export async function applyPresentationTheme(
  presentationId: string,
  rawOverrides: unknown,
): Promise<ApplyThemeResult> {
  let overrides: ThemeOverrides | null = null

  if (rawOverrides !== null && rawOverrides !== undefined) {
    const parsed = themeOverridesSchema.safeParse(rawOverrides)
    if (!parsed.success) {
      return { ok: false, error: 'Invalid theme overrides' }
    }
    overrides = parsed.data
  }

  const themeJson: Prisma.InputJsonValue | typeof Prisma.JsonNull =
    overrides === null ? Prisma.JsonNull : overrides

  await prisma.$transaction(async (tx) => {
    await tx.presentation.update({
      where: { id: presentationId },
      data: {
        themeOverrides: themeJson,
        brandLogoUrl: overrides?.logoUrl ?? null,
        brandPrimaryColor: overrides?.colors?.accent ?? null,
        brandAccentColor: overrides?.colors?.accentForeground ?? null,
        lastEditedAt: new Date(),
      },
    })

    await tx.draft.updateMany({
      where: { presentationId },
      data: { themeOverrides: themeJson },
    })
  })

  return { ok: true, themeOverrides: overrides }
}
