import { AbortSignal, Script } from "scripting"
import {
  createReaderPrefetchSession,
  readerPrefetchWindow,
  type ReaderPrefetchImage,
  type ReaderPrefetchLink,
} from "./readerPrefetch"

// Small, in-memory contract tests. No GalleryFlow/account/cache/download imports.
// Importing this file does not run tests. Call runReaderPrefetchTests() explicitly.
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
function equal(actual: unknown, expected: unknown, message: string) {
  assert(JSON.stringify(actual) === JSON.stringify(expected),
    `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  let settled = false
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  // A rejected gate can be intentionally left without a consumer during cleanup.
  void promise.catch(() => {})
  return {
    promise,
    resolve(value: T) { if (!settled) { settled = true; resolve(value) } },
    reject(error: Error) { if (!settled) { settled = true; reject(error) } },
    get settled() { return settled },
  }
}
// Deterministic microtask turns, not elapsed-time sleeps. All loops have a ceiling.
async function turns(count = 64) { for (let i = 0; i < count; i++) await Promise.resolve() }
type Stage = "load" | "resolve" | "cache"
type Resolution = { imageUrl: string; originalUrl: string; pageUrl: string }
type Config = { missing?: number[]; blockLoad?: boolean; blockResolve?: boolean; blockCache?: boolean; limit?: number }
function fixture(config: Config = {}) {
  const links = new Map<number, ReaderPrefetchLink>()
  for (let page = 1; page <= 1000; page++) {
    if (!config.missing?.includes(page)) links.set(page, { index: page - 1, pageUrl: `virtual:page/${page}` })
  }
  const loads: { page: number; signal: AbortSignal; gate: ReturnType<typeof deferred<ReaderPrefetchLink>> }[] = []
  const resolves: { page: number; signal: AbortSignal; refresh: boolean; gate: ReturnType<typeof deferred<Resolution>> }[] = []
  const caches: { page: number; image: ReaderPrefetchImage; signal: AbortSignal; background: boolean; refresh: boolean; gate: ReturnType<typeof deferred<string>> }[] = []
  const promotions: ReaderPrefetchImage[] = []
  const aborts: Stage[] = []
  let current = true, calls = 0, overflow = false, maxBackground = 0
  const budget = () => {
    calls++
    if (calls > (config.limit ?? 256)) { overflow = true; throw new Error("virtual dependency call budget exceeded") }
  }
  function watch<T>(stage: Stage, signal: AbortSignal, gate: ReturnType<typeof deferred<T>>) {
    const abort = () => { aborts.push(stage); gate.reject(new Error("virtual abort")) }
    signal.addEventListener("abort", abort)
    if (signal.aborted) abort()
    void gate.promise.then(
      () => signal.removeEventListener("abort", abort),
      () => signal.removeEventListener("abort", abort),
    )
  }
  const resolution = (page: number): Resolution => ({
    imageUrl: `virtual:normal/${page}`, originalUrl: `virtual:original/${page}`, pageUrl: `virtual:page/${page}`,
  })
  const path = (image: ReaderPrefetchImage) => `memory:${image.url}`
  const session = createReaderPrefetchSession({
    totalPages: 1000,
    isCurrent: () => current,
    getPage: (page: number) => links.get(page),
    loadPage: (page: number, signal: AbortSignal) => {
      budget()
      const gate = deferred<ReaderPrefetchLink>()
      loads.push({ page, signal, gate }); watch("load", signal, gate)
      if (!config.blockLoad) gate.resolve({ index: page - 1, pageUrl: `virtual:page/${page}` })
      return gate.promise.then(link => { links.set(page, link); return link })
    },
    resolve: (link: ReaderPrefetchLink, signal: AbortSignal, refresh: boolean) => {
      budget()
      const page = link.index + 1, gate = deferred<Resolution>()
      resolves.push({ page, signal, refresh, gate }); watch("resolve", signal, gate)
      if (!config.blockResolve) gate.resolve(resolution(page))
      return gate.promise
    },
    cache: (image: ReaderPrefetchImage, signal: AbortSignal, background: boolean, refresh: boolean) => {
      budget()
      const page = Number(image.url.split("/").pop()), gate = deferred<string>()
      caches.push({ page, image, signal, background, refresh, gate }); watch("cache", signal, gate)
      if (!config.blockCache) gate.resolve(path(image))
      return gate.promise
    },
    promote: (image: ReaderPrefetchImage) => { promotions.push(image) },
  })
  function sample() {
    const active = session.snapshot().backgroundActive
    maxBackground = Math.max(maxBackground, active)
    assert(active >= 0 && active <= 2, `backgroundActive must be 0..2, got ${active}`)
    assert(!overflow, `call budget exceeded (${calls}); possible infinite rescheduling`)
  }
  async function tick() { await turns(); sample() }
  async function drain() {
    for (let i = 0; i < 32; i++) {
      await tick()
      for (const call of loads) call.gate.resolve({ index: call.page - 1, pageUrl: `virtual:page/${call.page}` })
      for (const call of resolves) call.gate.resolve(resolution(call.page))
      for (const call of caches) call.gate.resolve(path(call.image))
      await tick()
      if ([...session.prefetchInFlight.values()].every(job => job.state !== "active")) return
    }
    throw new Error("drain exceeded 32 rounds; tasks did not quiesce")
  }
  function job(page: number, original = false) {
    const value = session.prefetchInFlight.get(`${page}|${original ? 1 : 0}`)
    assert(value, `missing job ${page}|${original ? 1 : 0}`)
    return value
  }
  return {
    session, links, loads, resolves, caches, promotions, aborts, resolution, path,
    tick, drain, sample, job,
    invalidate() { current = false },
    get calls() { return calls }, get maxBackground() { return maxBackground },
    async cleanup() {
      session.dispose()
      for (const call of [...loads, ...resolves, ...caches]) call.gate.reject(new Error("test cleanup"))
      await turns()
    },
  }
}
type Fixture = ReturnType<typeof fixture>
async function using(config: Config, test: (f: Fixture) => Promise<void>) {
  const f = fixture(config)
  try { await test(f) } finally { await f.cleanup() }
}
async function rejects(promise: Promise<unknown>, message: string) {
  let rejected = false
  try { await promise } catch { rejected = true }
  assert(rejected, message)
}
const tests: { name: string; run: () => Promise<void> }[] = [
  {
    name: "window.preload6-and-boundaries",
    run: async () => {
      equal(readerPrefetchWindow(10, 100, 6), [11, 12, 13, 14, 15, 16, 9], "forward six plus previous")
      equal(readerPrefetchWindow(1, 100, 6), [2, 3, 4, 5, 6, 7], "first page")
      equal(readerPrefetchWindow(99, 100, 6), [100, 98], "end clamp")
    },
  },
  {
    name: "preload6.rapid-N-to-N+1-preserves-overlap-and-only-adds-N+7",
    run: () => using({ blockResolve: true, blockCache: true }, async f => {
      // Warm current N=1, so the previous-page policy does not add an unrelated job.
      const current = f.session.foreground(1, false)
      await f.drain(); await current.image
      f.session.update(1, 6, false); await f.tick()
      const overlap = f.job(3), first = f.job(2)
      equal(f.resolves.map(call => call.page), [1, 2, 3], "only two backgrounds start")
      f.session.update(2, 6, false); await f.tick()
      assert(f.job(2) === first && f.job(3) === overlap, "overlapping active jobs replaced")
      equal(f.aborts, [], "quick turn must not abort")
      await f.drain()
      equal(f.resolves.map(call => call.page).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8], "N+2..6 once; only new forward edge N+7")
      equal(f.caches.map(call => call.page).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8], "each image cached once")
      equal(f.aborts, [], "no abort during completion")
    }),
  },
  {
    name: "inventory.missing-PageLink-awaits-loadPage",
    run: () => using({ missing: [2], blockLoad: true, blockResolve: true }, async f => {
      f.session.update(1, 1, false); await f.tick()
      equal(f.loads.map(call => call.page), [2], "missing link calls loadPage")
      equal(f.resolves.length, 0, "resolve cannot run before loadPage")
      f.loads[0].gate.resolve({ index: 1, pageUrl: "virtual:page/2" }); await f.tick()
      equal(f.resolves.map(call => call.page), [2], "loaded page reaches resolver")
      assert(f.loads[0].signal === f.resolves[0].signal, "load/resolve must share lifetime signal")
      await f.drain()
      equal(await f.job(2).image, "memory:virtual:normal/2", "loaded page result")
    }),
  },
  {
    name: "background.two-slots-cover-resolve-and-cache",
    run: () => using({ blockResolve: true, blockCache: true }, async f => {
      f.session.update(1, 6, false); await f.tick()
      equal(f.resolves.length, 2, "two resolver slots")
      for (const call of f.resolves) call.gate.resolve(f.resolution(call.page))
      await f.tick()
      equal(f.caches.length, 2, "two blocked image jobs")
      equal(f.resolves.length, 2, "cache wait must not release resolver slot")
      equal(f.session.snapshot().backgroundActive, 2, "both slots held")
      f.caches[0].gate.resolve(f.path(f.caches[0].image)); await f.tick()
      equal(f.resolves.length, 3, "one completion admits exactly one job")
      await f.drain()
      equal(f.maxBackground, 2, "observed background peak")
    }),
  },
  {
    name: "foreground.reuses-job-and-both-promises-before-resolve",
    run: () => using({ blockResolve: true, blockCache: true }, async f => {
      f.session.update(1, 6, false); await f.tick()
      const background = f.job(2), resolved = background.resolved, image = background.image
      const foreground = f.session.foreground(2, false)
      assert(foreground === background && foreground.resolved === resolved && foreground.image === image, "foreground must reuse exact identities")
      assert(foreground.foreground, "foreground flag not promoted")
      await f.drain()
      equal(f.resolves.filter(call => call.page === 2).length, 1, "resolver dedup")
      const calls = f.caches.filter(call => call.page === 2)
      equal(calls.length, 1, "cache dedup")
      assert(!calls[0].background, "promotion before resolve must enter foreground cache queue")
      equal(await foreground.image, "memory:virtual:normal/2", "shared result")
    }),
  },
  {
    name: "foreground.new-visible-page-starts-with-old-image-blocked",
    run: () => using({ blockCache: true }, async f => {
      const old=f.session.foreground(1,false);await f.tick();
      const next=f.session.foreground(50,false);await f.tick();
      assert(f.caches.some(call=>call.page===50),"new current page blocked by old page image");
      assert(!f.aborts.length,"old foreground aborted on page change");
      await f.drain();await old.image;await next.image;
    }),
  },
  {
    name: "foreground.pending-cache-promote-and-completed-job-reuse",
    run: () => using({ blockCache: true }, async f => {
      f.session.update(1, 6, false); await f.tick()
      const background = f.job(2), call = f.caches.find(item => item.page === 2)
      assert(call?.background, "setup must block a background cache job")
      const foreground = f.session.foreground(2, false)
      assert(foreground === background && foreground.resolved === background.resolved && foreground.image === background.image, "pending image identity lost")
      assert(f.promotions.length === 1 && f.promotions[0] === call.image, "promote must receive same resolved image object")
      await f.drain()
      const completed = f.session.foreground(2, false)
      assert(completed === foreground && completed.state === "done", "completed foreground job not reused")
      equal(f.caches.filter(item => item.page === 2).length, 1, "promotion must not create second image request")
    }),
  },
  {
    name: "cache.all-immediate-hits-quiesce-without-infinite-requeue",
    run: () => using({}, async f => {
      f.session.update(1, 6, false); await f.tick()
      equal(f.resolves.length, 6, "six resolves")
      equal(f.caches.length, 6, "six immediate cache hits")
      const calls = f.calls
      for (let i = 0; i < 100; i++) { f.session.update(1, 6, false); await f.tick() }
      equal(f.calls, calls, "settled window must not restart on pump/update")
      equal(f.session.snapshot().backgroundActive, 0, "all tasks settled")
      assert([...f.session.prefetchInFlight.values()].every(job => job.state === "done"), "done jobs missing")
    }),
  },
  {
    name: "failure.resolve-and-cache-do-not-auto-retry",
    run: () => using({ blockResolve: true, blockCache: true }, async f => {
      f.session.update(1, 6, false); await f.tick()
      const failedResolve = f.job(2), failedCache = f.job(3)
      f.resolves.find(call => call.page === 2)!.gate.reject(new Error("virtual resolve failure"))
      f.resolves.find(call => call.page === 3)!.gate.resolve(f.resolution(3)); await f.tick()
      f.caches.find(call => call.page === 3)!.gate.reject(new Error("virtual cache failure"))
      await f.drain()
      await rejects(failedResolve.resolved, "resolve must reject")
      await rejects(failedResolve.image, "dependent image must reject")
      await rejects(failedCache.image, "cache must reject")
      equal([failedResolve.state, failedCache.state], ["failed", "failed"], "failed state retained")
      const calls = f.calls
      for (let i = 0; i < 100; i++) { f.session.update(1, 6, false); await f.tick() }
      equal(f.calls, calls, "failure must not create retry loop")
      assert(f.session.foreground(2, false) === failedResolve, "default foreground must not silently retry failed job")
      const retry = f.session.foreground(2, false, true)
      assert(retry !== failedResolve, "explicit refresh must create new job")
      await f.drain()
      equal(await retry.image, "memory:virtual:normal/2", "explicit retry works")
      assert(f.resolves.filter(call => call.page === 2).at(-1)!.refresh, "refresh reaches resolver")
      assert(f.caches.filter(call => call.page === 2).at(-1)!.refresh, "refresh reaches cache")
    }),
  },
  ...(["load", "resolve", "cache"] as const).map(stage => ({
    name: `exit.abort-during-${stage}-starts-no-new-work`,
    run: () => using({ missing: stage === "load" ? [2, 3] : [], blockLoad: true, blockResolve: stage === "resolve", blockCache: true }, async f => {
      f.session.update(1, 6, false); await f.tick()
      const jobs = [...f.session.prefetchInFlight.values()], calls = f.calls
      const pending = stage === "load" ? f.loads : stage === "resolve" ? f.resolves : f.caches
      equal(pending.length, 2, `setup blocked in ${stage}`)
      f.session.dispose(); f.session.dispose(); await f.tick()
      assert(pending.every(call => call.signal.aborted), "exit must abort every pending signal")
      equal(f.aborts.length, 2, "two pending dependencies notified")
      for (const job of jobs) await rejects(job.image, "exit must reject pending image")
      f.session.update(100, 6, true); await f.tick()
      let threw = false
      try { f.session.foreground(100, true) } catch { threw = true }
      assert(threw, "disposed foreground must reject synchronously")
      equal(f.calls, calls, "disposed session must not schedule new work")
      equal(f.session.snapshot(), { backgroundActive: 0, tracked: 0, disposed: true }, "disposed state")
    }),
  })),
  {
    name: "exit.invalid-isCurrent-aborts-session",
    run: () => using({ blockResolve: true }, async f => {
      f.session.update(1, 6, false); await f.tick()
      const calls = f.calls
      f.invalidate(); f.session.update(2, 6, false); await f.tick()
      assert(f.session.snapshot().disposed, "invalid reader lifetime must dispose")
      equal(f.aborts.length, 2, "invalid lifetime aborts active jobs")
      equal(f.calls, calls, "invalid lifetime cannot schedule")
    }),
  },
  {
    name: "original.switch-keeps-mode-specific-jobs-promises-and-results",
    run: () => using({ blockResolve: true, blockCache: true }, async f => {
      f.session.update(1, 6, false); await f.tick()
      const normal = f.job(2)
      f.session.update(1, 6, true)
      const original = f.session.foreground(2, true); await f.tick()
      assert(normal !== original && normal.resolved !== original.resolved && normal.image !== original.image, "mode switch reused wrong promises")
      assert(f.session.foreground(2, false) === normal && f.session.foreground(2, true) === original, "mode lookup mixed jobs")
      // Resolve newer mode first, then late old-mode work: completion order must not mix results.
      const pageCalls = f.resolves.filter(call => call.page === 2)
      equal(pageCalls.length, 2, "one resolver per mode")
      pageCalls[1].gate.resolve(f.resolution(2)); await f.tick()
      pageCalls[0].gate.resolve(f.resolution(2)); await f.tick()
      equal((await original.resolved).url, "virtual:original/2", "original result")
      equal((await normal.resolved).url, "virtual:normal/2", "late normal result")
      assert(normal.value !== original.value, "resolved objects shared across modes")
      await f.drain()
      equal(await original.image, "memory:virtual:original/2", "original image result")
      equal(await normal.image, "memory:virtual:normal/2", "normal image result")
      const calls = f.calls
      equal(await f.session.foreground(2, true).image, "memory:virtual:original/2", "old completion cannot replace original")
      equal(f.calls, calls, "original foreground already cached")
    }),
  },
  {
    name: "foreground.obsolete-queued-page-is-dropped-on-existing-hit",
    run: () => using({blockCache:true},async f=>{
      const a=f.session.foreground(1,false),b=f.session.foreground(2,false);await f.tick();
      const obsolete=f.session.foreground(50,false);await f.tick();
      assert(f.session.foreground(1,false)===a,"existing foreground not reused");
      f.caches.find(call=>call.page===1)!.gate.resolve("memory:virtual:normal/1");await f.tick();
      assert(!f.resolves.some(call=>call.page===50),"obsolete queued foreground started after existing hit");
      await rejects(obsolete.image,"obsolete unstarted Promise must settle");await f.drain();await b.image;
    }),
  },
  {
    name: "foreground.obsolete-queued-page-is-dropped-on-window-update",
    run: () => using({blockCache:true},async f=>{
      f.session.foreground(1,false);f.session.foreground(2,false);await f.tick();
      const obsolete=f.session.foreground(50,false);f.session.update(100,6,true);await f.tick();
      f.caches.find(call=>call.page===1)!.gate.resolve("memory:virtual:normal/1");await f.tick();
      assert(!f.resolves.some(call=>call.page===50),"stale queued page survived window/mode change");
      await rejects(obsolete.image,"obsolete queued promise unsettled");await f.drain();
    }),
  },
  {
    name: "stress100.rapid-pages-with-blocked-work-remain-bounded",
    run: () => using({ blockResolve: true, blockCache: true }, async f => {
      f.session.update(1, 6, false); await f.tick()
      const retained = [...f.session.prefetchInFlight.values()]
      for (let page = 2; page <= 101; page++) {
        f.session.update(page, 6, false); await f.tick()
        equal(f.session.snapshot().tracked, 2, "100 quick turns cannot accumulate queued jobs")
      }
      equal(f.resolves.length, 2, "blocked work not duplicated or restarted")
      equal(f.aborts, [], "quick turns preserve active jobs")
      assert(retained.every(job => [...f.session.prefetchInFlight.values()].includes(job)), "active job dropped")
      await f.drain()
      equal(f.resolves.map(call => call.page), [2, 3, 102, 103, 104, 105, 106, 107, 100], "only initial active pair and final window execute")
      equal(f.caches.length, 9, "100 rapid turns bounded to nine image jobs")
      assert(f.session.snapshot().tracked <= 7 && f.maxBackground <= 2, "final tracking/concurrency bound")
    }),
  },
  {
    name: "stress100.foreground-rapid-turns-with-blocked-images-stay-bounded",
    run: () => using({ blockCache: true, limit: 1600 }, async f => {
      for (let page = 1; page <= 100; page++) {
        f.session.update(page, 6, false)
        f.session.foreground(page, false)
        await f.tick()
      }
      const active = [...f.session.prefetchInFlight.values()].filter(job => job.state === "active")
      console.log(`[readerPrefetch] stress100 foreground blocked: active=${active.length}, tracked=${f.session.snapshot().tracked}, cache=${f.caches.length}, background=${f.session.snapshot().backgroundActive}`)
      // Latest visible page + six forward + previous + two old background slots.
      // A hundred abandoned foreground images must not remain concurrently active.
      assert(active.length <= 10 && f.caches.length <= 110,
        `100 rapid foreground turns accumulated ${active.length} active jobs (${f.caches.length} blocked image requests); expected <=10 active`)
    }),
  },
  {
    name: "stress100.immediate-hits-no-runaway-requeue",
    run: () => using({ limit: 1600 }, async f => {
      for (let page = 1; page <= 100; page++) {
        f.session.update(page, 6, false); await f.tick()
        assert(f.session.snapshot().tracked <= 8, "settled tracking must stay within current/window")
      }
      // Each of 100 windows has <=7 candidates; no candidate may loop inside a settled window.
      assert(f.resolves.length <= 700 && f.caches.length <= 700, "100 settled turns must stay within 700 jobs")
      const calls = f.calls
      await f.tick(); await f.tick()
      equal(f.calls, calls, "final settled window is quiescent")
      console.log(`[readerPrefetch] stress100 immediate: resolves=${f.resolves.length}, cache=${f.caches.length}, tracked=${f.session.snapshot().tracked}`)
    }),
  },
]

/** Runs every case, logs individual results, and rejects if any contract fails. */
export async function runReaderPrefetchTests(): Promise<void> {
  const failures: string[] = []
  for (const test of tests) {
    try { await test.run(); console.log(`[readerPrefetch] PASS ${test.name}`) }
    catch (error) {
      const message = `${test.name}: ${error instanceof Error ? error.message : String(error)}`
      failures.push(message); console.error(`[readerPrefetch] FAIL ${message}`)
    }
  }
  console.log(`[readerPrefetch] ${tests.length - failures.length}/${tests.length} passed; virtual dependencies only`)
  if (failures.length) throw new Error(`Reader prefetch tests failed (${failures.length}):\n${failures.join("\n")}`)
}

// Opt-in standalone runner; ordinary imports remain side-effect free.
// scripting-ts run <this-file> --queryparameters '{"runReaderPrefetchTests":true}'
if (Script.queryParameters?.runReaderPrefetchTests === true) {
  void runReaderPrefetchTests().then(
    () => Script.exit({ ok: true }),
    error => { console.error(error); Script.exit({ ok: false, error: String(error) }) },
  )
}
