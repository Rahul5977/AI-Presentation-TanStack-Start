import { lookup } from 'node:dns/promises'
import net from 'node:net'

/**
 * SSRF protection for server-side fetches of user-supplied URLs.
 *
 * Threats handled:
 *  - non-http(s) schemes (file:, gopher:, etc.)
 *  - hosts that resolve to private / loopback / link-local / cloud-metadata IPs
 *    (incl. 169.254.169.254), checked against the *resolved* address (DNS rebinding)
 *  - redirects that hop to an internal target (each hop is re-validated)
 *  - slow / oversized responses (timeout + byte cap)
 */

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeUrlError'
  }
}

function ipv4IsPrivate(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true // malformed → treat as unsafe
  }
  const [a, b] = parts
  if (a === 0) return true // 0.0.0.0/8 "this host"
  if (a === 10) return true // 10.0.0.0/8 private
  if (a === 127) return true // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local + metadata
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 CGNAT
  if (a === 192 && b === 0 && parts[2] === 0) return true // 192.0.0.0/24
  if (a === 198 && (b === 18 || b === 19)) return true // 198.18.0.0/15 benchmarking
  if (a >= 224) return true // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + broadcast
  return false
}

/** Parse an IPv6 literal into 8 16-bit hextets, expanding "::" and any dotted
 *  IPv4 tail. Returns null if it can't be parsed. */
function parseIpv6(ip: string): number[] | null {
  let addr = ip.toLowerCase()
  if (addr.startsWith('[') && addr.endsWith(']')) addr = addr.slice(1, -1)

  // Expand a trailing dotted-quad (e.g. ::ffff:127.0.0.1) into two hextets.
  const v4Tail = addr.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4Tail) {
    const o = v4Tail.slice(1).map(Number)
    if (o.some((n) => n > 255)) return null
    const hi = ((o[0] << 8) | o[1]).toString(16)
    const lo = ((o[2] << 8) | o[3]).toString(16)
    addr = addr.slice(0, v4Tail.index) + `${hi}:${lo}`
  }

  const halves = addr.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : null

  let groups: string[]
  if (tail === null) {
    groups = head
  } else {
    const missing = 8 - head.length - tail.length
    if (missing < 0) return null
    groups = [...head, ...Array(missing).fill('0'), ...tail]
  }
  if (groups.length !== 8) return null

  const hextets = groups.map((g) => parseInt(g || '0', 16))
  if (hextets.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null
  return hextets
}

function ipv6IsPrivate(ip: string): boolean {
  const h = parseIpv6(ip)
  if (!h) return true // unparseable → unsafe

  // IPv4-mapped ::ffff:a.b.c.d → validate the embedded IPv4
  if (h[0] === 0 && h[1] === 0 && h[2] === 0 && h[3] === 0 && h[4] === 0 && h[5] === 0xffff) {
    const v4 = `${h[6] >> 8}.${h[6] & 0xff}.${h[7] >> 8}.${h[7] & 0xff}`
    return ipv4IsPrivate(v4)
  }

  const allZeroExceptLast = h.slice(0, 7).every((n) => n === 0)
  if (allZeroExceptLast && (h[7] === 0 || h[7] === 1)) return true // :: and ::1
  if ((h[0] & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((h[0] & 0xfe00) === 0xfc00) return true // fc00::/7 unique-local
  if ((h[0] & 0xff00) === 0xff00) return true // ff00::/8 multicast
  return false
}

function isPrivateIp(ip: string): boolean {
  const family = net.isIP(ip)
  if (family === 4) return ipv4IsPrivate(ip)
  if (family === 6) return ipv6IsPrivate(ip)
  return true // not a valid IP literal → unsafe
}

/**
 * Validate that a URL is safe to fetch server-side. Throws UnsafeUrlError otherwise.
 * Returns the parsed URL on success.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new UnsafeUrlError('The URL is not valid.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http and https URLs can be imported.')
  }

  // Disallow embedded credentials (user:pass@host)
  if (url.username || url.password) {
    throw new UnsafeUrlError('URLs with embedded credentials are not allowed.')
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '') // strip IPv6 brackets

  // If the host is an IP literal, check it directly.
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new UnsafeUrlError('That address is not allowed.')
    }
    return url
  }

  // Otherwise resolve via DNS and check *every* returned address.
  let resolved: Array<{ address: string }>
  try {
    resolved = await lookup(hostname, { all: true })
  } catch {
    throw new UnsafeUrlError('Could not resolve that host.')
  }
  if (resolved.length === 0) {
    throw new UnsafeUrlError('Could not resolve that host.')
  }
  for (const { address } of resolved) {
    if (isPrivateIp(address)) {
      throw new UnsafeUrlError('That host resolves to a private address and is not allowed.')
    }
  }

  return url
}

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_REDIRECTS = 4

/**
 * Fetch text from a user-supplied URL with SSRF protection, redirect re-validation,
 * a timeout, and a response-size cap. Returns the decoded body text.
 */
export async function safeFetchText(
  rawUrl: string,
  opts: { timeoutMs?: number; maxBytes?: number; userAgent?: string } = {},
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES

  let currentUrl = await assertPublicUrl(rawUrl)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let response: Response
    try {
      response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': opts.userAgent ?? 'Mozilla/5.0 (compatible; KodexaAIImporter/1.0)',
          accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        },
      })
    } finally {
      clearTimeout(timer)
    }

    // Handle redirects manually so each hop's target is re-validated.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        throw new UnsafeUrlError('The source URL redirected without a destination.')
      }
      currentUrl = await assertPublicUrl(new URL(location, currentUrl).toString())
      continue
    }

    if (!response.ok) {
      throw new Error('Could not fetch the source URL.')
    }

    // Read with a hard byte cap to avoid memory exhaustion.
    const reader = response.body?.getReader()
    if (!reader) {
      const text = await response.text()
      if (text.length > maxBytes) return text.slice(0, maxBytes)
      return text
    }
    const chunks: Uint8Array[] = []
    let received = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        received += value.byteLength
        if (received > maxBytes) {
          await reader.cancel()
          break
        }
        chunks.push(value)
      }
    }
    const merged = new Uint8Array(received > maxBytes ? maxBytes : received)
    let offset = 0
    for (const chunk of chunks) {
      if (offset + chunk.byteLength > merged.length) {
        merged.set(chunk.subarray(0, merged.length - offset), offset)
        break
      }
      merged.set(chunk, offset)
      offset += chunk.byteLength
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(merged)
  }

  throw new UnsafeUrlError('Too many redirects while fetching the source URL.')
}
