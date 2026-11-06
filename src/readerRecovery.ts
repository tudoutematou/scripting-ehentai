import { classifyNetworkError } from "./networkErrors"

export const READER_RECOVERY_PAGE_LIMIT = 150
export function shouldRecoverReaderNetwork(error: unknown) {
  return classifyNetworkError(error).retryable
}

type RecoveryEvent =
  | { kind: "background-promotion"; failed: boolean; wasForeground: boolean }
  | { kind: "image-failure"; error: unknown; alreadyRecovered: boolean }

/** One automatic refresh per event scope; explicit user retry is never budgeted here.
 * Promotion scope is the settled background job; image scope is page + quality.
 * These are deliberately not one global counter: a failed promotion may still need
 * the existing current-image recovery. No networking or timers belong here.
 */
export function shouldRefreshReader(event: RecoveryEvent): boolean {
  if (event.kind === "background-promotion") return event.failed && !event.wasForeground
  return !event.alreadyRecovered && shouldRecoverReaderNetwork(event.error)
}

/** Owned by one mounted Reader; bounded insertion order matches the existing window. */
export function createReaderRecovery() {
  const recovered = new Set<string>()
  return {
    recoverImage(page: number, original: boolean, error: unknown): boolean {
      const key = `${page}|${original ? 1 : 0}`
      if (!shouldRefreshReader({ kind: "image-failure", error, alreadyRecovered: recovered.has(key) })) return false
      // Claim synchronously before the caller starts asynchronous refresh work.
      recovered.add(key)
      if (recovered.size > READER_RECOVERY_PAGE_LIMIT) recovered.delete(recovered.values().next().value!)
      return true
    },
  }
}
