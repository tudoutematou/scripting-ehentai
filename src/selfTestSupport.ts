export type SelfTestResult = { name: string; ok: boolean; durationMs: number; detail?: string }
export type Check = { name: string; run: () => void | Promise<void> }
export type SelfTestOptions = { network?: boolean }
export const BASE = "https://e-hentai.org/"
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export function safeSelfTestFailureDetail(stage: string, error: unknown): string {
  const value = error as { name?: unknown; code?: unknown }
  const rawName = String(value?.name || "Error")
  const errorName = /abort|timeout/i.test(rawName) ? "TimeoutError" : rawName === "TypeError" ? "TypeError" : rawName === "Error" ? "Error" : "UnknownError"
  const rawCode = String(value?.code || "")
  const code = /^(?:[A-Z_]+|\d{3})$/.test(rawCode) ? rawCode : "CHECK_FAILED"
  return `stage=${stage}; errorName=${errorName}; code=${code}; description=check-failed`
}

