import { prisma } from '@/lib/db'
import type { PresentationMemberRole } from '@/generated/prisma/client'

type AccessLevel = 'view' | 'edit'

const roleAllows: Record<PresentationMemberRole, AccessLevel[]> = {
  EDITOR: ['view', 'edit'],
  VIEWER: ['view'],
}

export async function canAccessPresentation(
  userId: string,
  presentationId: string,
  level: AccessLevel = 'view',
) {
  const presentation = await prisma.presentation.findUnique({
    where: { id: presentationId },
    select: {
      userId: true,
      members: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  })

  if (!presentation) return false
  if (presentation.userId === userId) return true

  const memberRole = presentation.members[0]?.role
  if (!memberRole) return false
  return roleAllows[memberRole].includes(level)
}
