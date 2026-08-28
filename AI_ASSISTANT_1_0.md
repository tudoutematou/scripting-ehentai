# AI_ASSISTANT_1_0 — In-app first, Agent compatible

## Product goal
Add useful AI to the existing E-Hentai client without turning the project into a separate AI app.

Architecture:
- **Primary UX:** AI entry points inside the E-Hentai script.
- **Secondary compatibility:** Scripting Agent / Assistant Tool can call the same typed browser core.
- **Model/provider:** reuse the provider/model already configured in Scripting. Do not add API-key/model configuration to this project.
- **Execution:** AI interprets intent; existing E-Hentai search/account/library/detail code performs network/data actions.
- Do not simulate screen taps when a typed action already exists.

## Platform contracts
Use current official Scripting APIs, not guessed wrappers.

### Structured AI search
Use `Assistant.requestStructuredData()` for natural-language -> structured search intent.
- omit `provider` / `modelId` unless the user explicitly chose an override in an existing Scripting-native selector;
- default therefore follows Scripting's configured provider/model;
- strict JSON schema only;
- model output is untrusted input and must pass existing local normalizers/validators before becoming a `GallerySearchState`.

### Managed chat
Use `Assistant.startConversation()` + `Assistant.present()` for the in-app `AI 助手` entry.
- **Do not pass `systemPrompt`**. Scripting docs state that providing a custom system prompt disables Assistant Tools.
- initial `message` may explain the user is opening the E-Hentai browser assistant and suggest example requests;
- omit provider/model to use current Scripting configuration;
- handle an already-active conversation gracefully: present the existing conversation instead of creating duplicate sessions when possible.

### Agent compatibility
Keep `assistant_tool.json` / `assistant_tool.tsx` as the Scripting Agent bridge.
- reuse `runEhAction()`;
- never expose Cookie, gallery URL, gid/token, page token, apikey/apiuid, private filesystem path or raw HTML;
- keep opaque short-lived `galleryRef` for follow-up detail actions.

---

# 1. In-app entry points

## Discover / Search Composer
Add two compact actions without cluttering ordinary search:
- `✨ AI 搜索`
- `💬 AI 助手`

Use the same responsive/liquid-glass action language as the rest of the app.

### AI Search UX
1. user opens `AI 搜索`;
2. native text input asks for a natural-language request;
3. examples may include:
   - `找中文女性性转，30 到 80 页，排除 AI 生成`
   - `只要同人志，评分至少 4 星，最近想看短一点的`
4. send text to `requestStructuredData`;
5. locally convert/validate result into existing `GallerySearchState`;
6. show a compact preview of interpreted conditions before/with execution where practical;
7. execute through the existing normal Results view;
8. resulting search can be saved with the existing full-state Search Bookmark feature.

Do not create a second results renderer.

## Gallery Detail
Add one secondary `✨ 问 AI` action only if it stays visually clean.
- default opens managed Assistant conversation;
- initial user message may contain **safe metadata only**: title, translated/raw tag labels, category, uploader, rating/page count and optionally a short sanitized comment sample;
- never include private gallery/page URLs or credentials.

Useful prompts:
- `找和这个类似的，但排除 AI generated`
- `这个画廊主要有哪些标签？`
- `总结一下评论在说什么`
- `找这个作者其他中文作品`

Do not add manga-page image OCR/translation in AI 1.0.

---

# 2. Natural-language search schema

AI output should describe intent, not E-Hentai URL parameters.

Recommended structured result concept:
- `plainText`: remaining free-text title/uploader keywords;
- `includeTags[]`: user concepts/tags to include;
- `excludeTags[]`: user concepts/tags to exclude;
- `excludedCategories[]`: zero or more category keys;
- `language`: existing `QuickFilterKey` or null;
- `minimumRating`: `2 | 3 | 4 | 5 | null`;
- `pageFrom`, `pageTo`: positive integers or null;
- supported booleans corresponding only to existing `AdvancedSearchOptions` fields when clearly requested.

### Tag resolution
The model must **not** be trusted to invent final E-Hentai tag syntax.

For each include/exclude tag concept:
1. use the existing full EhTagTranslation/local tag index to find candidates;
2. resolve Chinese aliases such as `性转`, `女性性转`, `汉语`, etc. into real namespace/tag pairs;
3. if one Chinese phrase maps to multiple legitimate tags (for example male/female variants), preserve multiple candidates or present a small chooser rather than silently picking the wrong one;
4. only create selected exact tags using existing `createGallerySearchTag` / composer helpers;
5. exclusions should use valid E-Hentai negative exact-tag query syntax only after local resolution and should be composed by a dedicated pure helper, not raw model text concatenation.

If a concept cannot be resolved confidently:
- keep it as plain text only when that matches the user's wording;
- or ask the user/select candidate in the AI-search UI;
- never fabricate a namespace/tag.

### Category/filter normalization
- category exclusions must map through `GALLERY_CATEGORIES` and `normalizeExcludedCategoryMask`;
- language must map through `QUICK_FILTERS`;
- advanced values must pass `normalizeAdvancedSearch`;
- unsupported fields are dropped.

### Search-state reuse
Build one final normal `GallerySearchState` and route it through existing:
- `buildGallerySearchUrl`;
- Results UI;
- Search Bookmark storage.

No parallel AI-only query model after normalization.

---

# 3. Agent / AssistantTool actions

Current typed boundary already supports:
- `account.status`;
- `search`;
- `gallery.detail`;
- `favorites.list`;
- `history.list`.

Upgrade Agent compatibility so one registered E-Hentai browser tool can safely dispatch these read operations.

Preferred parameter contract:
- explicit `action` enum;
- action-specific optional parameters;
- validation in `runEhAction`, not just AssistantTool code.

### Read actions in AI 1.0
Agent should be able to:
- check whether E/Ex session is usable;
- search galleries;
- inspect one returned `galleryRef`;
- search/list Cloud Favorites;
- inspect recent local history.

### Optional write actions after read path is solid
Only if existing core actions can be reused cleanly and user approval is explicit:
- save a search bookmark;
- add/change Cloud Favorite;
- add/remove local bookmark;
- enqueue offline download.

Write operations require an explicit confirmation/approval step and must never be auto-approved.
If adding these would substantially expand scope, stop AI 1.0 at read-only Agent actions; the in-app normal UI already provides writes.

---

# 4. AI text utilities

Allowed optional one-shot features after AI Search + Chat + Agent read tools work:
- translate title into Chinese;
- summarize safe metadata/tags;
- translate/summarize comments.

Display generated text as clearly AI-generated secondary information.
Do not silently replace server titles/tags/comments.

Explicitly out of AI 1.0:
- manga-page OCR;
- image understanding/recommendation based on page pixels;
- redraw/retypeset speech bubbles;
- real-time manga translation overlays.

Reason: these produce significant layout/typography quality problems and are not necessary for the browser's strongest AI use cases.

---

# 5. Privacy and safety boundaries

Never send to Assistant APIs or AssistantTool result payloads:
- Cookie values;
- `ipb_member_id`, `ipb_pass_hash`, `igneous` values;
- gid/token/full gallery URL;
- page URL/token;
- rating `apiuid/apikey`;
- raw HTML;
- cloud favorite private popup HTML;
- local paths.

Search text and user-entered AI prompts necessarily go to the configured model when AI is invoked; make this clear in the AI input UI if a short privacy caption fits.

Opaque gallery refs remain session-bound and short-lived.

---

# 6. Failure behavior

- No configured/available Assistant provider: show a concise message directing the user to Scripting's Assistant/provider settings; do not ask them to paste an API key into this script.
- Structured output invalid: reject safely and let the user retry/edit; do not execute malformed query state.
- Tag resolution ambiguous: offer candidates rather than inventing one.
- E/Ex session unavailable: AI search follows the same account/site error semantics as normal search.
- Conversation already active: present/reuse it when possible rather than throwing an opaque error.

---

# 7. Focused checks

Add small deterministic checks for:
- AI structured intent -> normalized `GallerySearchState`;
- invalid category/language/rating/page bounds are rejected/defaulted;
- multi-tag Chinese resolution;
- ambiguous tag resolution stays ambiguous rather than picking randomly;
- exclude-tag composition escapes/normalizes correctly;
- AI Search state can round-trip through existing Search Bookmark serialization;
- AssistantTool dispatcher rejects invalid action/params;
- privacy serialization contains no forbidden keys/URLs/tokens.

Do not spend time running a huge AI evaluation suite. Real usefulness is user-tested.

---

# 8. User QA

Ask user to test only:
1. `AI 搜索` using `中文女性性转，30-80页，排除AI生成` and verify interpreted filters/results;
2. save that AI-generated search as a Search Bookmark and reopen it;
3. `AI 助手` opens the Scripting-managed chat using the user's configured model, without new API settings;
4. from Scripting Agent, ask the E-Hentai tool to search, then inspect one returned gallery;
5. Favorite/history read queries work from Agent without exposing URLs/credentials;
6. optional `问 AI` from Gallery Detail only sends safe metadata.
