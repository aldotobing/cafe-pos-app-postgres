const DEFAULT_TIMEOUT = 30000
// End-to-end latency includes server processing time (cold starts, DB queries).
// A 2-4s response is normal for serverless apps and does NOT mean the connection
// is slow. We use two lines of defense:
// 1. Network Information API gate: on Chromium 4G with low RTT, skip entirely
// 2. High latency threshold: only flag when average crosses 5s (not 2s)
const SLOW_THRESHOLD = 5000      // moving average above this → possibly slow (5s)
const RECOVER_THRESHOLD = 2500   // moving average below this → recovered (2.5s)
const LATENCY_WINDOW = 20        // number of recent requests to average (more stable)
const MIN_SAMPLES = 5            // need at least this many before evaluating
const COOLDOWN_MS = 120_000      // after recovering, don't re-trigger for 2 minutes

// --- Connection quality tracking ---

const recentLatencies: number[] = []
let pendingCount = 0
let currentState: 'healthy' | 'slow' = 'healthy'
let lastRecoveryTime = 0

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

// Check if the browser's own connection info says the network is fast.
// If so, high end-to-end latency is almost certainly server-side
// (cold starts, DB queries) — NOT a slow user connection.
function isBrowserConnectionFast(): boolean {
  if (typeof navigator === 'undefined') return false
  const conn = (navigator as any).connection
  if (!conn) return false // Firefox/Safari — can't tell, assume not fast
  // 4G with reasonable RTT → the pipe is fine, server is the bottleneck
  return conn.effectiveType === '4g' && conn.rtt < 350
}

function evaluateConnectionQuality() {
  if (recentLatencies.length < MIN_SAMPLES) return // need enough data

  // Cooldown: after recovering, wait before triggering again
  if (currentState === 'healthy' && lastRecoveryTime > 0) {
    if (Date.now() - lastRecoveryTime < COOLDOWN_MS) return
    lastRecoveryTime = 0 // reset cooldown after it expires
  }

  // If the browser says the connection is fast (4G + low RTT),
  // don't flag as "slow connection" based on end-to-end latency.
  // The latency is coming from the server, not the user's network.
  if (isBrowserConnectionFast()) return

  const avg = movingAverage()

  if (currentState === 'healthy' && avg > SLOW_THRESHOLD) {
    currentState = 'slow'
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connection-slow', { detail: { avgLatency: avg } }))
    }
  } else if (currentState === 'slow' && avg < RECOVER_THRESHOLD) {
    currentState = 'healthy'
    lastRecoveryTime = Date.now()
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
  // AbortError (DOMException) is the browser's native abort signal — treat as network
  if (err instanceof DOMException && err.name === 'AbortError') return true
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase()
    return msg.includes('failed to fetch') ||
           msg.includes('networkerror') ||
           msg.includes('network request failed')
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
