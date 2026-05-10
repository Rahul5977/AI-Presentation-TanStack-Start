import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import ImageKit from '@imagekit/nodejs'

function getImageKit() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT
  if (!privateKey || !publicKey || !urlEndpoint) {
    throw new Error('ImageKit env vars not configured.')
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new ImageKit({ privateKey, publicKey, urlEndpoint } as any)
}

export const Route = createFileRoute(
  '/api/presentations/$id/slides/$slideId/image-upload',
)({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

        const slide = await prisma.slide.findFirst({
          where: {
            id: params.slideId,
            presentationId: params.id,
            presentation: { userId: session.user.id },
          },
          select: { id: true },
        })
        if (!slide) return json({ error: 'Slide not found' }, { status: 404 })

        const formData = await request.formData()
        const file = formData.get('file')
        if (!(file instanceof File)) {
          return json({ error: 'Missing file field' }, { status: 400 })
        }

        if (file.size > 10 * 1024 * 1024) {
          return json({ error: 'File exceeds 10 MB limit' }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')

        const ik = getImageKit()
        const result = await ik.files.upload({
          file: base64,
          fileName: `upload-${params.id}-${params.slideId}-${Date.now()}.${file.name.split('.').pop() ?? 'png'}`,
          folder: process.env.IMAGEKIT_FOLDER ?? '/codexaa/presentations',
          useUniqueFileName: true,
        })

        const asset = await prisma.asset.create({
          data: {
            presentationId: params.id,
            slideId: params.slideId,
            provider: 'imagekit',
            providerFileId: result.fileId as string,
            url: result.url as string,
            mimeType: file.type || undefined,
            width: (result.width ?? undefined) as number | undefined,
            height: (result.height ?? undefined) as number | undefined,
          },
          select: { id: true, url: true },
        })

        await prisma.slide.update({
          where: { id: params.slideId },
          data: { imageUrl: result.url, imageAssetId: asset.id },
        })

        return json({ imageUrl: result.url, assetId: asset.id })
      },
    },
  },
})
