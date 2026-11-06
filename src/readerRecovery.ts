/**
 * Reader "retry once" policies — three complementary layers:
 *
 * 1. Prefetch (`readerPrefetch.start`): when a job that failed in the *background*
 *    first becomes the foreground page, refresh once. Failures that already ran as
 *    foreground stay settled until the user taps 重试 (no pump / auto loop).
 * 2. UI auto-recovery (`decideReaderImageFailure`): for transport-class errors on
 *    the visible page, automatically request one refresh per page|preferOriginal key.
 * 3. Image-page reload URL (`ehentai.imagePageReloadUrls`): when resolving with
 *    refresh=true, prefer the site's previously parsed same-page official reload
 *    link (`nl=`) if present.
 *
 * Explicit user 重试 always forces refresh regardless of these once-policies.
 */

import { shouldRecoverReaderNetwork } from "./networkErrors"

export { shouldRecoverReaderNetwork } from "./networkErrors"

export const READER_RECOVERED_PAGE_CAP = 150

export function readerRecoveryKey(page: number, preferOriginal: boolean): string {
  return `${Math.trunc(page)}|${preferOriginal ? 1 : 0}`
}

export type ReaderImageFailureDecision =
  | { action: "auto-refresh" }
  | { action: "show-error" }

/** Record that this page|mode already used its one auto-recovery. Caps set size. */
export function markReaderPageRecovered(
  recovered: Set<string>,
  key: string,
  cap = READER_RECOVERED_PAGE_CAP,
): void {
  recovered.add(key)
  while (recovered.size > cap) {
    const oldest = recovered.values().next().value
    if (oldest === undefined) break
    recovered.delete(oldest)
  }
}

/**
 * Decide whether a visible-page image failure should auto-refresh once or surface
 * the error UI. Mutates `recovered` when choosing auto-refresh.
 */
export function decideReaderImageFailure(
  error: unknown,
  key: string,
  recovered: Set<string>,
): ReaderImageFailureDecision {
  if (shouldRecoverReaderNetwork(error) && !recovered.has(key)) {
    markReaderPageRecovered(recovered, key)
    return { action: "auto-refresh" }
  }
  return { action: "show-error" }
}
