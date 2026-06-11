const DEFAULT_TIMEOUT = 20000
const SLOW_THRESHOLD = 2000      // moving average above this → "slow" (Chrome Slow 3G RTT ≈ 2s)
const RECOVER_THRESHOLD = 1000   // moving average below this → "recovered"
const LATENCY_WINDOW = 10        // number of recent requests to average

// --- Connection quality tracking ---

const recentLatencies: number[] = []
let pendingCount = 0
let currentState: 'healthy' | 'slow' = 'healthy'

function recordLatency(ms: number) {
  recentLatencies.push(ms)
  if (recentLatencies.length > LATENCY_WINDOW) {
    recentLatencies.shift()
  }
}

function movingAverage(): number {
  if (recentLatencies.length === 0) return 0
  const sum = recentLatencies.reduce((a, b) => a + b, 0)
  return sum / recentLatencies.length
}

function evaluateConnectionQuality() {
  if (recentLatencies.length < 3) return // need enough data

  const avg = movingAverage()

  if (currentState === 'healthy' && avg > SLOW_THRESHOLD) {
    currentState = 'slow'
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connection-slow', { detail: { avgLatency: avg } }))
    }
  } else if (currentState === 'slow' && avg < RECOVER_THRESHOLD) {
    currentState = 'healthy'
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connection-recovered'))
    }
  }
}

function onRequestStart() {
  pendingCount++
}

function onRequestEnd(latencyMs: number, isNetworkError: boolean) {
  pendingCount = Math.max(0, pendingCount - 1)

  if (isNetworkError) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connection-error'))
    }
    return // don't record network errors as latency
  }

  recordLatency(latencyMs)
  evaluateConnectionQuality()
}

function resetConnectionState() {
  recentLatencies.length = 0
  pendingCount = 0
  currentState = 'healthy'
}

// Listen to browser online/offline to reset state
if (typeof window !== 'undefined') {
  window.addEventListener('offline', resetConnectionState)

  // Use Network Information API as an immediate signal on load
  // (Chrome, Edge, Opera — not Firefox/Safari)
  const conn = (navigator as any).connection
  if (conn) {
    const slowTypes = new Set(['slow-2g', '2g'])
    if (slowTypes.has(conn.effectiveType)) {
      // Immediately signal slow — latency tracking will refine later
      currentState = 'slow'
      window.dispatchEvent(new CustomEvent('connection-slow', {
        detail: { source: 'effectiveType', effectiveType: conn.effectiveType }
      }))
    }
    conn.addEventListener('change', () => {
      if (slowTypes.has(conn.effectiveType)) {
        if (currentState === 'healthy') {
          currentState = 'slow'
          window.dispatchEvent(new CustomEvent('connection-slow', {
            detail: { source: 'effectiveType', effectiveType: conn.effectiveType }
          }))
        }
      } else if (conn.effectiveType === '4g' && currentState === 'slow' && recentLatencies.length === 0) {
        // Only recover from effectiveType signal if we haven't measured real latency yet
        currentState = 'healthy'
        window.dispatchEvent(new CustomEvent('connection-recovered', {
          detail: { source: 'effectiveType' }
        }))
      }
    })
  }
}

// --- Public helpers ---

export function getConnectionState() {
  return {
    state: currentState,
    pendingCount,
    avgLatency: movingAverage(),
    recentCount: recentLatencies.length,
  }
}

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

  onRequestStart()
  const startTime = performance.now()

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
    const latency = performance.now() - startTime
    onRequestEnd(latency, false)
    return response
  } catch (err) {
    clearTimeout(timeoutId)
    const latency = performance.now() - startTime
    const networkErr = isNetworkError(err)
    onRequestEnd(latency, networkErr)

    if (networkErr) {
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
