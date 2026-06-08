const CDN_PATTERNS = ["img.kasirku.biz.id", ".r2.dev", ".r2.cloudflarestorage.com"]

function isCdnUrl(url: string): boolean {
  return CDN_PATTERNS.some((p) => url.includes(p))
}

function proxyUrl(url: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const fetchUrl = isCdnUrl(url) ? proxyUrl(url) : url
    const res = await fetch(fetchUrl)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
