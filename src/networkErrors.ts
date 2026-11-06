/**
 * Transport / connectivity error classification for one-shot recovery.
 * Prefer typed error.name and numeric status; message regex is a fallback only
 * for environments that only surface a string Error.
 */

type ErrorLike = { name?: string; message?: string; status?: number }

function errorStatus(error: unknown): number | undefined {
  const value = error as ErrorLike | null
  const direct = Number(value?.status)
  if (Number.isFinite(direct) && direct > 0) return direct
  const fromMessage = String(value?.message || "").match(/\bHTTP\s+(\d{3})\b/i)
  if (fromMessage) return Number(fromMessage[1])
  return undefined
}

function isRetryableHttpStatus(status: number | undefined): boolean {
  return status === 408 || status === 429 || (typeof status === "number" && status >= 500 && status <= 599)
}

/** True when a visible-page failure may succeed after one refresh (not cancel / parse). */
export function shouldRecoverReaderNetwork(error: unknown): boolean {
  const value = error as ErrorLike | null
  const name = String(value?.name || "")
  if (name === "AbortError" || name === "ImageSessionCancelled") return false
  if (name === "TypeError" || name === "ImageTimeout" || name === "TimeoutError") return true
  if (isRetryableHttpStatus(errorStatus(error))) return true
  // Locale / platform phrasing fallback when name/status are absent.
  const message = String(value?.message || "")
  return /TLS|network|网络|连接|超时/i.test(message)
}
