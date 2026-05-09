import ImageKit from '@imagekit/nodejs'

let imageKitClient: ImageKit | null = null

function getImageKitClient() {
  if (imageKitClient) return imageKitClient

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT

  if (!privateKey || !publicKey || !urlEndpoint) {
    throw new Error('IMAGEKIT_PRIVATE_KEY / IMAGEKIT_PUBLIC_KEY / IMAGEKIT_URL_ENDPOINT are required.')
  }

  imageKitClient = new ImageKit({
    privateKey,
    publicKey,
    urlEndpoint,
  })

  return imageKitClient
}

export async function uploadGeneratedImage(input: {
  presentationId: string
  slideId: string
  base64: string
}) {
  const client = getImageKitClient()
  return await client.files.upload({
    file: input.base64,
    fileName: `presentation-${input.presentationId}-slide-${input.slideId}.png`,
    folder: process.env.IMAGEKIT_FOLDER ?? '/codexaa/presentations',
    useUniqueFileName: true,
  })
}
