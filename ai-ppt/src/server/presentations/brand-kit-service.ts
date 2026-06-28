import { prisma } from '@/lib/db'
import { parseThemeOverrides, themeOverridesSchema } from '@/templates/theme'
import { TEMPLATE_KINDS } from '@/templates/schema'
import type { ThemeOverrides } from '@/templates/theme'
import type { TemplateKind } from '@/templates/schema'

export type BrandKitSummary = {
  id: string
  name: string
  baseTemplate: TemplateKind
  overrides: ThemeOverrides | null
  logoUrl: string | null
  createdAt: string
}

export async function listBrandKits(userId: string): Promise<BrandKitSummary[]> {
  const kits = await prisma.brandKit.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      name: true,
      baseTemplate: true,
      overrides: true,
      logoUrl: true,
      createdAt: true,
    },
  })

  return kits.map((kit) => ({
    id: kit.id,
    name: kit.name,
    baseTemplate: kit.baseTemplate,
    overrides: parseThemeOverrides(kit.overrides),
    logoUrl: kit.logoUrl,
    createdAt: kit.createdAt.toISOString(),
  }))
}

export type CreateBrandKitInput = {
  name: string
  baseTemplate: TemplateKind
  overrides: ThemeOverrides
}

export async function createBrandKit(
  userId: string,
  input: CreateBrandKitInput,
): Promise<BrandKitSummary> {
  const overrides = themeOverridesSchema.parse(input.overrides)
  const baseTemplate = TEMPLATE_KINDS.includes(input.baseTemplate)
    ? input.baseTemplate
    : 'MINIMAL_MONO'

  const kit = await prisma.brandKit.create({
    data: {
      userId,
      name: input.name.trim().slice(0, 80) || 'Untitled brand kit',
      baseTemplate,
      overrides,
      logoUrl: overrides.logoUrl ?? null,
    },
    select: {
      id: true,
      name: true,
      baseTemplate: true,
      overrides: true,
      logoUrl: true,
      createdAt: true,
    },
  })

  return {
    id: kit.id,
    name: kit.name,
    baseTemplate: kit.baseTemplate,
    overrides: parseThemeOverrides(kit.overrides),
    logoUrl: kit.logoUrl,
    createdAt: kit.createdAt.toISOString(),
  }
}

export async function deleteBrandKit(userId: string, kitId: string): Promise<boolean> {
  const result = await prisma.brandKit.deleteMany({
    where: { id: kitId, userId },
  })
  return result.count > 0
}
