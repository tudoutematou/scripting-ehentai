/** Error classification only: no UI, requests, account state, or retry loops. */
export type NetworkFailureKind = "cancelled" | "timeout" | "http" | "transport" | "other"
export type NetworkFailure = { kind: NetworkFailureKind; retryable: boolean; status?: number }

export function httpStatusError(status: number, message = `HTTP ${status}`): Error & { status: number } {
  return Object.assign(new Error(message), { name: "HttpError", status })
}

/** Keep machine-readable fields when adding a safe stage description. */
export function preserveNetworkErrorMetadata(target: Error, source: unknown): Error {
  const value = source as { status?: unknown; code?: unknown } | null
  if (typeof value?.status === "number") Object.assign(target, { status: value.status })
  if (typeof value?.code === "string" || typeof value?.code === "number") Object.assign(target, { code: value.code })
  return target
}

export function classifyNetworkError(error: unknown): NetworkFailure {
  const value = error as { name?: unknown; message?: unknown; status?: unknown; code?: unknown } | null
  const name = String(value?.name || ""), message = String(value?.message || ""), code = String(value?.code || "")
  if (name === "AbortError" || name === "ImageSessionCancelled" || code === "ABORT_ERR")
    return { kind: "cancelled", retryable: false }
  // An explicit HTTP response outranks ambiguous names and localized text.
  const status = typeof value?.status === "number" ? value.status : 0
  if (Number.isInteger(status) && status >= 100 && status <= 599)
    return { kind: "http", status, retryable: status === 408 || status === 429 || status >= 500 }
  if (name === "ImageTimeout" || name === "TimeoutError" || code === "ETIMEDOUT")
    return { kind: "timeout", retryable: true }
  if (name === "NetworkError" || /^(?:ECONNRESET|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|ENOTFOUND|EAI_AGAIN|ERR_NETWORK|ERR_TLS_CERT_ALTNAME_INVALID)$/.test(code))
    return { kind: "transport", retryable: true }
  // Compatibility with native fetch errors and older message-only HTTP producers.
  const legacyStatus = message.match(/\bHTTP\s+(\d{3})\b/i)
  if (legacyStatus) {
    const status = Number(legacyStatus[1])
    return { kind: "http", status, retryable: status === 408 || status === 429 || status >= 500 && status <= 599 }
  }
  if (/TLS|network|网络|连接|超时|failed to fetch|fetch failed|load failed/i.test(message))
    return { kind: "transport", retryable: true }
  // TypeError alone also includes programming errors; never retry it blindly.
  return { kind: "other", retryable: false }
}
