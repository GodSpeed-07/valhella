export interface PreparedImage {
  data: string
  mediaType: 'image/jpeg'
  width: number
  height: number
}

const MAX_EDGE = 1400

export async function prepareImage(source: Blob | string): Promise<PreparedImage> {
  const blob = typeof source === 'string' ? await (await fetch(source)).blob() : source
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
  const comma = dataUrl.indexOf(',')
  return { data: dataUrl.slice(comma + 1), mediaType: 'image/jpeg', width, height }
}

export function imageBlobsFromClipboard(items: DataTransferItemList): Blob[] {
  const blobs: Blob[] = []
  for (const item of Array.from(items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) blobs.push(file)
    }
  }
  return blobs
}
