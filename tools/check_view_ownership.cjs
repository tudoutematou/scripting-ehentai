#!/usr/bin/env node
// Deterministic scheduling checks against the ACTUAL production components.
// Only hooks/native rendering and I/O are substituted. This is NOT iOS UI QA.
// Run: NODE_PATH=$(npm root -g) node tools/check_view_ownership.cjs [source-root]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const source = fs.readFileSync(path.join(root, 'src/GalleryFlow.tsx'), 'utf8');
const parsed = ts.createSourceFile('GalleryFlow.tsx', source, ts.ScriptTarget.Latest, true);
assert.equal(parsed.parseDiagnostics.length, 0, 'TSX must parse');
// Observe named hook values without changing their setters or scheduling.
const observeState = context => node => {
  const visit = value => {
    if (ts.isVariableDeclaration(value) && ts.isArrayBindingPattern(value.name) && value.initializer && ts.isCallExpression(value.initializer) && value.initializer.expression.getText() === 'useState') {
      const label = value.name.elements[0].name.getText();
      return ts.factory.updateVariableDeclaration(value, value.name, value.exclamationToken, value.type, ts.factory.createCallExpression(ts.factory.createIdentifier('observeState'), undefined, [ts.factory.createStringLiteral(label), value.initializer]));
    }
    return ts.visitEachChild(value, visit, context);
  };
  return ts.visitNode(node, visit);
};
const compiled = ts.transpileModule(source + '\nexport { PreviewGrid, ContinueReaderView };', {
  transformers: { before: [observeState] }, fileName: 'GalleryFlow.tsx', compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, jsxFactory: 'jsx', jsxFragmentFactory: 'Fragment' }
}).outputText;
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const page = (n, gallery = 'A') => ({ id: `${gallery}-${n}`, index: n, pageUrl: `https://example.invalid/${gallery}/page/${n}`, thumb: '' });
const summary = (name = 'A') => ({ id: name, gid: name, token: 'fixture', url: `https://example.invalid/gallery/${name}`, title: name, thumb: '', pages: 100, category: '', uploader: '' });
const detail = (name = 'A', pages = [page(1, name), page(2, name)]) => ({ ...summary(name), sourceUrl: summary(name).url, metadata: { Length: '100 pages' }, pageLinks: pages, loadedPreviewPages: [0], failedPreviewPages: [], previewPages: 5, tags: [], comments: [{ id: 1, text: '', author: '', posted: '' }], relations: [] });
const result = (pages, loaded = [0, 1], failed = []) => ({ pageLinks: pages, loadedPreviewPages: loaded, failedPreviewPages: failed, elapsedMs: 1 });
const pref = { layout: 'paged', fit: 'width', preload: 0, preferOriginal: false, direction: 'ltr', autoPageSeconds: 8 };
const noop = () => {};
let active;
function state(initial) {
  const h = active, i = h.cursor++;
  if (!h.slots[i]) h.slots[i] = { value: typeof initial === 'function' ? initial() : initial };
  return [h.slots[i].value, update => {
    if (!h.mounted) { h.lateWrites++; return; }
    const next = typeof update === 'function' ? update(h.slots[i].value) : update;
    if (!Object.is(next, h.slots[i].value)) { h.slots[i].value = next; h.dirty = true; }
  }];
}
function ref(value) { const h = active, i = h.cursor++; return h.slots[i] || (h.slots[i] = { current: value }); }
function effect(run, deps) {
  const h = active, i = h.cursor++, old = h.slots[i];
  if (!old || deps.length !== old.deps.length || deps.some((d, n) => !Object.is(d, old.deps[n]))) {
    h.slots[i] = { deps, cleanup: old?.cleanup };
    h.effects.push(() => { h.slots[i].cleanup?.(); h.slots[i].cleanup = run(); });
  }
}
class Harness {
  constructor(component, props) { Object.assign(this, { component, props, slots: [], named: {}, effects: [], cursor: 0, mounted: true, dirty: true, lateWrites: 0 }); this.render(); }
  render() { this.dirty = false; this.cursor = 0; active = this; this.tree = this.component(this.props); active = null; while (this.effects.length) this.effects.shift()(); }
  async flush() { for (let i = 0; i < 12; i++) { await Promise.resolve(); if (this.mounted && this.dirty) this.render(); } }
  unmount() { this.mounted = false; for (const slot of this.slots) slot?.cleanup?.(); }
  nodes() {
    const nodes = [], seen = new Set();
    const walk = value => {
      if (!value || typeof value !== 'object' || seen.has(value)) return;
      seen.add(value);
      if (value.type && value.props) {
        nodes.push(value);
        if (value.type === 'EnvironmentValuesReader') walk(value.props.children({ horizontalSizeClass: 'regular' }));
        if (value.type === 'GeometryReader') walk(value.props.children({ size: { width: 900, height: 900 } }));
      }
      for (const item of Object.values(value)) walk(item);
    };
    walk(this.tree); return nodes;
  }
  find(name, predicate = () => true) { const node = this.nodes().find(n => (typeof n.type === 'function' ? n.type.name : n.type) === name && predicate(n.props)); assert.ok(node, `missing ${name}`); return node.props; }
  button(title) { return this.find('Button', p => p.title === title); }
}
function setup(overrides = {}) {
  const io = { generation: 1, downloads: new Set(), favorites: new Set(), progress: [], rangeCalls: [], ...overrides };
  const chain = new Proxy(noop, { get: () => chain, apply: () => chain });
  const defaults = {
    loadHistory: async () => [], loadDownloads: async () => [], loadLocalBookmarks: async () => [],
    loadPreferences: async () => pref, savePreferences: async update => ({ ...pref, ...update }),
    loadGalleryDetailCore: async url => detail(url.split('/').pop()),
    loadFavoriteState: async () => ({ category: null, categories: [], note: '' }),
    loadPreviewPageBatch: async d => result(d.pageLinks),
    loadPreviewPageRange: async (d, first, last, signal) => { io.rangeCalls.push({ first, last, signal }); return result(d.pageLinks); },
    resolveImagePage: async url => ({ imageUrl: url + '/image', pageUrl: url, originalUrl: '' }),
    ...overrides
  };
  const deps = {
    ...defaults,
    getAccountSessionGeneration: () => io.generation, routeUrlForSite: url => url, getCookieHeader: () => '',
    getBaseUrl: () => 'https://example.invalid/', getAccountStatus: () => ({ loggedIn: false }),
    galleryPageCount: d => Number(String(d.metadata.Length).replace(/\D/g, '')),
    subscribeDownloads: fn => { io.downloads.add(fn); return () => io.downloads.delete(fn); },
    subscribeFavoriteCategoryChanges: fn => { io.favorites.add(fn); return () => io.favorites.delete(fn); },
    updateReadingProgress: async (_, index) => { io.progress.push(index); }, resumeIndex: h => h.lastPageIndex,
    ensureTagTranslations: async () => {}, translateTag: () => '', localizeCommonTag: () => '',
    localizeCategory: x => x, localizeMetadataKey: x => x, reportDiagnostic: async () => {},
    downloadWritesLibrary: () => true, GALLERY_CATEGORIES: [], QUICK_FILTERS: [],
    imageDiagnostics: new Proxy({}, { get: (_, name) => name === 'begin' ? () => chain : noop }),
  };
  const native = new Proxy({ useState: state, useRef: ref, useEffect: effect, AbortController, AbortSignal, Navigation: { useDismiss: () => noop }, Device: { screen: { width: 900, height: 900 } }, DragGesture: () => chain, Script: {} }, { get: (obj, name) => name in obj ? obj[name] : name });
  const mockModule = new Proxy(deps, { get: (obj, name) => name in obj ? obj[name] : name });
  const module = { exports: {} };
  const context = {
    observeState: (name, pair) => { active.named[name] = pair[0]; return pair; },
    module, exports: module.exports, require: name => name === 'scripting' ? native : mockModule,
    jsx: (type, props, ...children) => ({ type, props: { ...props, children: children.length === 1 ? children[0] : children } }), Fragment: 'Fragment',
    console, URL, Error, AbortController, AbortSignal, setTimeout, clearTimeout, setInterval, clearInterval,
    Transition: chain, Animation: chain, confirm: overrides.confirm || (async () => false), prompt: async () => null,
    FileManager: { temporaryDirectory: '/test', createDirectory: async () => {}, exists: async () => false, isFile: async () => true },
  };
  vm.runInNewContext(compiled, context, { filename: 'GalleryFlow.js', timeout: 5000 });
  return { io, exports: module.exports };
}
const tests = [];
const test = (name, run) => tests.push({ name, run });
const detailView = async overrides => { const env = setup(overrides), h = new Harness(env.exports.GalleryDetailView, { summary: summary() }); await h.flush(); return { ...env, h }; };
const previewProps = h => h.find('PreviewSummarySection');
const detailLoaders = async h => {
  // Range loading belongs to the detail host, and is passed to its reader.
  const summary = previewProps(h);
  // Baseline exposes the same callback on its thumbnail component.
  if (summary.onLoadRange) return summary;
  summary.onOpenPage(1); await h.flush();
  const reader = h.find('ReaderView');
  h.find('ScrollView', p => p.navigationDestination?.isPresented).navigationDestination.onChanged(false);
  await h.flush(); return reader;
};
const readerView = async overrides => { const env = setup(overrides), h = new Harness(env.exports.ReaderView, { summary: summary(), pages: [page(1), page(2)], startIndex: 0, totalPages: 100, onLoadRange: overrides?.onLoadRange || (async () => []) }); await h.flush(); return { ...env, h }; };
const openProgress = async h => { h.find('ReaderTapZones').onAction('progress'); await h.flush(); return h.find('ReaderProgressOverlay'); };

test('detail rejects late range results and aborts the consumer on unmount', async () => {
  const request = deferred(); let signal;
  const { h } = await detailView({ loadPreviewPageRange: (_, _first, _last, s) => { signal = s; return request.promise; } });
  const pending = (await detailLoaders(h)).onLoadRange(21, 21); pending.catch(noop);
  h.unmount(); request.resolve(result([page(21)]));
  await assert.rejects(pending); await h.flush(); assert.equal(signal.aborted, true); assert.equal(h.lateWrites, 0);
});
test('old gallery response cannot overwrite a newly selected gallery', async () => {
  const request = deferred();
  const { h } = await detailView({ loadPreviewPageRange: () => request.promise });
  const pending = (await detailLoaders(h)).onLoadRange(21, 21); pending.catch(noop);
  h.props = { summary: summary('B') }; h.render(); await h.flush();
  request.resolve(result([page(21)])); await assert.rejects(pending); await h.flush();
  assert.ok(previewProps(h).detail.pageLinks.every(p => p.id.startsWith('B-'))); h.unmount();
});
test('concurrent preview success preserves metadata and outranks stale failure', async () => {
  const range = deferred(), batch = deferred();
  const { h } = await detailView({ loadPreviewPageRange: () => range.promise, loadPreviewPageBatch: () => batch.promise });
  const pp = await detailLoaders(h), p1 = pp.onLoadRange(21, 21), p2 = pp.onNeedMore();
  h.button('\u67e5\u770b\u4e0e\u4e92\u52a8').action(); await h.flush();
  h.find('CommentsScene').onChanged([{ id: 9, text: 'updated', author: '', posted: '' }]);
  range.resolve(result([page(21)])); await p1; batch.resolve(result([page(1)], [0], [1])); await p2; await h.flush();
  const next = previewProps(h).detail;
  assert.ok(next.pageLinks.some(p => p.index === 21)); assert.equal(next.comments[0].id, 9);
  assert.equal(next.failedPreviewPages.length, 0); h.unmount();
});
test('initial download read cannot replace a newer subscription snapshot', async () => {
  const initial = deferred(); const { h, io } = await detailView({ loadDownloads: () => initial.promise });
  const latest = { id: 'download-current', scope: 'all', summary: summary(), status: 'completed', done: [1], libraryDone: [1], totalPages: 1 };
  for (const listener of io.downloads) listener([latest]);
  initial.resolve([]); await h.flush();
  assert.equal(h.named.fullDownload, latest); h.unmount();
});
test('favorite refresh results are applied in request order, not completion order', async () => {
  const first = deferred(), second = deferred(); let reads = 0;
  const { h, io } = await detailView({ loadFavoriteState: () => (++reads === 1 ? first : second).promise });
  for (const listener of io.favorites) listener();
  const latest = { category: 2, categories: [{ index: 2, name: 'latest' }], note: '' };
  second.resolve(latest); await h.flush(); first.resolve({ category: 1, categories: [], note: '' }); await h.flush();
  assert.equal(h.named.favoriteState, latest); assert.equal(h.named.favoriteLoading, false); h.unmount();
});
test('a confirmation resolved after exit cannot start a favorite mutation', async () => {
  const confirmation = deferred(); let mutations = 0;
  const { h } = await detailView({ confirm: () => confirmation.promise, loadFavoriteState: async () => ({ category: 1, categories: [{ index: 1, name: 'one' }], note: '' }), changeFavorite: async () => { mutations++; return { category: null, categories: [], note: '' }; } });
  const pending = h.button('\u79fb\u9664\u6536\u85cf').action(); h.unmount(); confirmation.resolve(true); await pending; await h.flush();
  assert.equal(mutations, 0); assert.equal(h.lateWrites, 0);
});
test('account changes invalidate a pending detail range even before a rerender', async () => {
  const request = deferred(); const { h, io } = await detailView({ loadPreviewPageRange: () => request.promise });
  const pending = (await detailLoaders(h)).onLoadRange(21, 21); pending.catch(noop);
  const previous = h.named.detail; io.generation++; request.resolve(result([page(21)]));
  await assert.rejects(pending); await h.flush(); assert.equal(h.named.detail, previous); h.unmount();
});
test('Done cancels pending range selection without resurrecting selection', async () => {
  const request = deferred(), env = setup();
  const h = new Harness(env.exports.AllPreviewsScene, { detail: detail(), summary: summary(), resume: null, onNeedMore: noop, onLoadRange: () => request.promise });
  await h.flush(); h.button('\u9009\u62e9').action(); await h.flush();
  h.find('TextField', p => p.title === '\u8d77\u59cb\u9875').onChanged('40');
  h.find('TextField', p => p.title === '\u7ed3\u675f\u9875').onChanged('41'); await h.flush();
  h.button('\u9009\u62e9\u8303\u56f4').action(); await h.flush(); h.button('\u5b8c\u6210').action(); await h.flush();
  request.resolve([page(40), page(41)]); await h.flush();
  assert.equal(h.find('PreviewGrid').selected, undefined); // normal browsing, not selection mode
  assert.equal(h.named.selected.size, 0);
  h.unmount(); assert.equal(h.lateWrites, 0);
});
test('download preparation owns its busy flag and cannot erase a newer selection', async () => {
  const creation = deferred(); const env = setup({ createSelectedDownload: () => creation.promise, runDownload: async () => {} });
  const h = new Harness(env.exports.AllPreviewsScene, { detail: detail(), summary: summary(), resume: null, onNeedMore: noop, onLoadRange: async () => [] });
  await h.flush(); h.button('\u9009\u62e9').action(); await h.flush(); h.find('PreviewGrid').onToggle(page(1)); await h.flush();
  h.button('\u4fdd\u5b58\u5230\u79bb\u7ebf\u4e66\u5e93').action(); await h.flush(); assert.equal(h.named.preparing, true);
  h.button('\u5b8c\u6210').action(); await h.flush(); assert.equal(h.named.preparing, true, 'Done must not clear a download-owned busy flag');
  h.button('\u9009\u62e9').action(); await h.flush(); h.find('PreviewGrid').onToggle(page(2)); await h.flush();
  creation.resolve({ id: 'fixture-download', pages: [page(1)], done: [], failed: [], status: 'queued', totalPages: 100 }); await h.flush();
  assert.equal(h.named.selected.size, 1); assert.equal(h.named.selected.has(2), true); assert.equal(h.named.selecting, true); assert.equal(h.named.preparing, false); assert.equal(h.named.error, ''); h.unmount();
});
test('drag loading fills the first missing page, with no duplicate need-more request', async () => {
  const request = deferred(), calls = []; let duplicate = 0; const env = setup();
  const h = new Harness(env.exports.AllPreviewsScene, { detail: detail('A', [page(1), page(80)]), summary: summary(), resume: null, onNeedMore: () => duplicate++, onLoadRange: (first, last) => { calls.push([first, last]); return request.promise; } });
  await h.flush(); h.button('\u9009\u62e9').action(); await h.flush();
  h.find('PreviewGrid').onSelectionLongPress(1);
  assert.equal(calls[0][0], 2); assert.equal(duplicate, 0); h.unmount();
  request.resolve([page(2)]); await h.flush(); assert.equal(h.lateWrites, 0);
});
test('host owns preview reader pushes; rapid taps and old dismissals cannot replace a route', async () => {
  const env = setup(); const h = new Harness(env.exports.AllPreviewsScene, { detail: detail(), summary: summary(), resume: null, onNeedMore: noop, onLoadRange: async () => [] });
  await h.flush(); const gridProps = h.find('PreviewGrid');
  const grid = new Harness(env.exports.PreviewGrid, gridProps);
  assert.equal(grid.nodes().some(n => n.props.navigationDestination), false, 'responsive grid must not own a native destination');
  gridProps.onOpenPage(1); gridProps.onOpenPage(2); await h.flush();
  const first = h.find('ScrollView', p => p.navigationDestination?.isPresented).navigationDestination;
  assert.equal(first.content.props.startPage, 1);
  first.onChanged(false); await h.flush(); h.find('PreviewGrid').onOpenPage(2); await h.flush();
  first.onChanged(false); await h.flush();
  assert.equal(h.find('ScrollView', p => p.navigationDestination?.isPresented).navigationDestination.content.props.startPage, 2);
  grid.unmount(); h.unmount();
});
test('cached page jump supersedes a slow jump and owns the loading flag', async () => {
  const request = deferred(); const { h } = await readerView({ onLoadRange: () => request.promise });
  let progress = await openProgress(h); progress.onJump(90); await h.flush();
  h.find('ReaderProgressOverlay').onJump(2); await h.flush();
  assert.equal(h.find('ReaderProgressOverlay').pageNumber, 2);
  assert.equal(h.named.pageLoading, false);
  assert.equal(h.nodes().some(n => n.type === 'ProgressView' && n.props.title === '\u6b63\u5728\u5b9a\u4f4d\u9875\u7801\u2026'), false);
  request.resolve([page(90)]); await h.flush(); assert.equal(h.find('ReaderProgressOverlay').pageNumber, 2);
  h.unmount(); assert.equal(h.lateWrites, 0);
});
test('jump merges inventory after await, preserving concurrent parent updates', async () => {
  const request = deferred(); const { h } = await readerView({ onLoadRange: () => request.promise });
  (await openProgress(h)).onJump(90); await h.flush();
  h.props = { ...h.props, pages: [page(1), page(2), page(3)] }; h.render(); await h.flush();
  request.resolve([page(90)]); await h.flush();
  assert.ok(h.named.pages.some(p => p.index === 90) && h.named.pages.some(p => p.index === 3));
  h.unmount();
});
test('jump failure remains visible over a resolved image; retry targets the failed page', async () => {
  let calls = []; const { h } = await readerView({ onLoadRange: async (first, last) => { calls.push([first, last]); throw new Error('fixture range failed'); } });
  (await openProgress(h)).onJump(90); await h.flush();
  assert.ok(h.find('CachedReaderImage').url); assert.equal(h.find('ErrorText').message, 'fixture range failed');
  h.button('\u91cd\u8bd5\u8df3\u8f6c\u7b2c 90 \u9875').action(); await h.flush(); assert.deepEqual(calls, [[90,90],[90,90]]); h.unmount();
});
test('late jump completion after reader exit performs no state writes', async () => {
  const request = deferred(); const { h } = await readerView({ onLoadRange: () => request.promise });
  (await openProgress(h)).onJump(90); await h.flush(); h.unmount(); request.resolve([page(90)]); await h.flush(); assert.equal(h.lateWrites, 0);
});
test('continuous preloading records only the currently visible loaded page', async () => {
  const { h, io } = await readerView({ loadPreferences: async () => ({ ...pref, layout: 'continuous' }) });
  h.find('ContinuousReaderImage', p => p.page.index === 2).onLoaded(); assert.deepEqual(io.progress, []);
  h.find('ContinuousReaderImage', p => p.page.index === 1).onLoaded(); assert.deepEqual(io.progress, [0]);
  h.find('ScrollView').scrollPosition.onChanged(page(2).id); await h.flush(); assert.deepEqual(io.progress, [0,1]);
  h.unmount();
});
test('continue-reader exit during history lookup does not start a range request', async () => {
  const history = deferred(); let loads = 0; const env = setup({ loadHistory: () => history.promise });
  const h = new Harness(env.exports.ContinueReaderView, { pages: [page(1)], summary: summary(), totalPages: 100, resume: 89, onNeedMore: noop, onLoadRange: async () => { loads++; return [page(90)]; } });
  h.unmount(); history.resolve([]); await h.flush(); assert.equal(loads, 0); assert.equal(h.lateWrites, 0);
});
test('request abort bridge supports native-style signals and removes its listener', async () => {
  const source = ts.createSourceFile('ehentai.ts', fs.readFileSync(path.join(root, 'src/ehentai.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
  const fn = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'requestSignal');
  const code = ts.transpileModule(fn.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { AbortController, setTimeout, clearTimeout, HTML_REQUEST_TIMEOUT_MS: 20000 };
  vm.createContext(context); vm.runInContext(code, context);
  let listener;
  const signal = { aborted: false, addEventListener: (_, fn) => { listener = fn; }, removeEventListener: (_, fn) => { assert.equal(listener, fn); listener = undefined; } };
  const request = context.requestSignal(signal); listener(); assert.equal(request.signal.aborted, true); request.dispose(); assert.equal(listener, undefined);
  const alreadyAborted = new AbortController(); alreadyAborted.abort();
  const immediate = context.requestSignal(alreadyAborted.signal); assert.equal(immediate.signal.aborted, true); immediate.dispose();
});
(async () => {
  let failed = 0;
  for (const {name, run} of tests) { try { await run(); console.log('PASS', name); } catch (error) { failed++; console.error('FAIL', name, '\n ', error.stack); } }
  console.log(`${tests.length - failed}/${tests.length} ownership checks passed (simulated hooks/I/O, not device QA)`);
  process.exitCode = failed ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
