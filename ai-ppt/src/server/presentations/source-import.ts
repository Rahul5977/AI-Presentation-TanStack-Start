import { safeFetchText, UnsafeUrlError } from '@/server/net/safe-fetch'

const MAX_SOURCE_CHARS = 24_000

function truncate(text: string, max = MAX_SOURCE_CHARS) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}\n\n[Truncated for processing length limits]`
}

function sanitizeWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function htmlToText(html: string) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  const noTags = withoutScripts.replace(/<[^>]+>/g, ' ')
  return sanitizeWhitespace(noTags)
}

export type ImportSourceInput =
  | { mode: 'text'; text: string }
  | { mode: 'url'; url: string }
  | { mode: 'pdf'; file: File }

export async function extractImportSource(input: ImportSourceInput): Promise<{
  sourceText: string
  sourceLabel: string
}> {
  if (input.mode === 'text') {
    const sourceText = sanitizeWhitespace(input.text)
    if (!sourceText) {
      throw new Error('Please provide source text to import.')
    }
    return {
      sourceText: truncate(sourceText),
      sourceLabel: 'Pasted long text',
    }
  }

  if (input.mode === 'url') {
    let html: string
    try {
      html = await safeFetchText(input.url)
    } catch (error) {
      if (error instanceof UnsafeUrlError) {
        // Surface a clear, safe message; never leak internal network details.
        throw new Error(error.message)
      }
      throw new Error('Could not fetch the source URL.')
    }
    const sourceText = truncate(htmlToText(html))
    if (!sourceText) {
      throw new Error('No readable text found at that URL.')
    }
    return {
      sourceText,
      sourceLabel: `URL: ${input.url}`,
    }
  }

  const buffer = Buffer.from(await input.file.arrayBuffer())
  const pdfModule = await import('pdf-parse')
  const parsePdf = (
    'default' in pdfModule && typeof pdfModule.default === 'function'
      ? pdfModule.default
      : (pdfModule as unknown as (buffer: Buffer) => Promise<{ text?: string }>)
  )
  const parsed = await parsePdf(buffer)
  const sourceText = truncate(sanitizeWhitespace(parsed.text ?? ''))
  if (!sourceText) {
    throw new Error('No readable text found in the uploaded PDF.')
  }
  return {
    sourceText,
    sourceLabel: `PDF: ${input.file.name}`,
  }
}

export function buildPromptFromSource(params: {
  basePrompt: string
  sourceText: string
  sourceLabel: string
}) {
  const basePrompt = params.basePrompt.trim()
  return `${basePrompt}

Use the following imported source material as primary context.
Source: ${params.sourceLabel}

${params.sourceText}`
}
