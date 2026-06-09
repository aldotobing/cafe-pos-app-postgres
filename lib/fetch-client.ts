const DEFAULT_TIMEOUT = 20000

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase()
    return msg.includes('failed to fetch') ||
           msg.includes('networkerror') ||
           msg.includes('network request failed') ||
           msg.includes('abort')
  }
  return false
}

function getUserMessage(err: unknown): string {
  if (isNetworkError(err)) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'Tidak ada koneksi internet. Periksa jaringan Anda.'
    }
    return 'Gagal terhubung ke server. Periksa koneksi atau coba lagi nanti.'
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'Terjadi kesalahan yang tidak diketahui.'
}

export class FetchError extends Error {
  isNetworkError: boolean
  status?: number

  constructor(message: string, isNetwork: boolean, status?: number) {
    super(message)
    this.name = 'FetchError'
    this.isNetworkError = isNetwork
    this.status = status
  }
}

export async function fetchClient(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: fetchOptions.signal
        ? (() => {
            const combined = new AbortController()
            fetchOptions.signal!.addEventListener('abort', () => combined.abort())
            controller.signal.addEventListener('abort', () => combined.abort())
            return combined.signal
          })()
        : controller.signal,
    })

    clearTimeout(timeoutId)
    return response
  } catch (err) {
    clearTimeout(timeoutId)

    if (isNetworkError(err)) {
      throw new FetchError(getUserMessage(err), true)
    }

    throw err instanceof FetchError ? err : new FetchError(
      err instanceof Error ? err.message : 'Unknown error',
      false
    )
  }
}

export async function fetchWithError<T = any>(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<{ data: T; response: Response }> {
  const response = await fetchClient(url, options)

  if (!response.ok) {
    let errorBody: any = {}
    try {
      errorBody = await response.json()
    } catch {}

    throw new FetchError(
      errorBody.error || errorBody.message || `Gagal memproses (${response.status})`,
      false,
      response.status
    )
  }

  const contentType = response.headers.get('content-type') || ''

  if (response.status === 204 || !contentType.includes('application/json')) {
    return { data: {} as T, response }
  }

  const data = await response.json()
  return { data, response }
}

export { isNetworkError, getUserMessage }
