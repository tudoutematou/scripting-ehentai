import { AbortController, AbortSignal, useEffect, useRef, useState } from "scripting"
import { getAccountSessionGeneration } from "./account"

export type ViewScope = { signal: AbortSignal; isCurrent: () => boolean }
export function useViewScope(key: string): ViewScope {
  const generation = getAccountSessionGeneration()
  const current = useRef<{key: string; generation: number; controller: AbortController} | null>(null)
  if (!current.current || current.current.key !== key || current.current.generation !== generation) {
    current.current?.controller.abort()
    current.current = {key, generation, controller: new AbortController()}
  }
  const owner = current.current
  useEffect(() => () => owner.controller.abort(), [owner])
  return {signal: owner.controller.signal, isCurrent: () => current.current === owner && !owner.controller.signal.aborted && generation === getAccountSessionGeneration()}
}
// A native push owns one destination until its own dismissal. Rapid taps and old
// dismissal callbacks must not replace/clear another destination mid-transition.
export function usePushDestination<T>(scope: ViewScope) {
  type Entry = {value: T; sequence: number}
  const [entry, setEntry] = useState<Entry | null>(null), owner = useRef<Entry | null>(null), sequence = useRef(0)
  useEffect(() => { owner.current = null; setEntry(null) }, [scope.signal])
  const select = (value: T | null) => {
    if (!scope.isCurrent()) return
    if (value === null) {
      if (owner.current !== entry) return
      owner.current = null; setEntry(null)
    } else if (!owner.current) {
      const next = {value, sequence: ++sequence.current}
      owner.current = next; setEntry(next)
    }
  }
  const navigationTicket = () => { const version = sequence.current; return () => scope.isCurrent() && !owner.current && sequence.current === version }
  return [entry?.value ?? null, select, entry?.sequence ?? 0, navigationTicket] as const
}
