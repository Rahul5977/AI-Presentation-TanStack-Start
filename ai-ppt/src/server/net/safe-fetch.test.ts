import { describe, expect, it } from 'vitest'

import { assertPublicUrl, UnsafeUrlError } from './safe-fetch'

describe('assertPublicUrl', () => {
  it('rejects non-http(s) schemes', async () => {
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicUrl('ftp://example.com')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicUrl('gopher://example.com')).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('rejects malformed URLs', async () => {
    await expect(assertPublicUrl('not a url')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicUrl('')).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('rejects embedded credentials', async () => {
    await expect(assertPublicUrl('http://user:pass@1.1.1.1')).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('blocks the cloud-metadata address', async () => {
    await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data/')).rejects.toBeInstanceOf(
      UnsafeUrlError,
    )
  })

  it('blocks loopback addresses', async () => {
    await expect(assertPublicUrl('http://127.0.0.1')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicUrl('http://127.1.2.3:8080/x')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicUrl('http://[::1]/')).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('blocks private RFC-1918 ranges', async () => {
    await expect(assertPublicUrl('http://10.0.0.5')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicUrl('http://172.16.0.1')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicUrl('http://172.31.255.255')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicUrl('http://192.168.1.1')).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('blocks 0.0.0.0/8, CGNAT and link-local', async () => {
    await expect(assertPublicUrl('http://0.0.0.0')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicUrl('http://100.64.0.1')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicUrl('http://169.254.10.10')).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('blocks IPv4-mapped IPv6 that points at a private v4', async () => {
    await expect(assertPublicUrl('http://[::ffff:127.0.0.1]')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicUrl('http://[::ffff:10.0.0.1]')).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('blocks IPv6 unique-local and link-local', async () => {
    await expect(assertPublicUrl('http://[fc00::1]')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicUrl('http://[fd12:3456::1]')).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicUrl('http://[fe80::1]')).rejects.toBeInstanceOf(UnsafeUrlError)
  })

  it('allows a public IP literal', async () => {
    const url = await assertPublicUrl('http://1.1.1.1/path')
    expect(url.hostname).toBe('1.1.1.1')
    const url2 = await assertPublicUrl('https://8.8.8.8')
    expect(url2.protocol).toBe('https:')
  })
})
