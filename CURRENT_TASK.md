# CURRENT_TASK — 1.1.x User QA Fix Pass 3

Branch: `feat/1.1-gallery-interaction`

## Confirmed by user

- Preview thumbnail duplication is fixed on the real device. Do not reopen preview/parser/cache work.
- Scripting Safari extension is enabled.
- The installed browser-script list shows `E-Hentai Cookie 助手` enabled and previously executed, so do not keep treating Safari extension enablement as the primary blocker.

## Current runtime blocker

On the Account/Login screen, tapping **在 Safari 登录** does not open Safari. The UI shows:

`Can't find variable: confirm`

This happens before `openSafariLogin()` / `Safari.openURL()`.

Root cause: native Scripting app code used browser DOM globals `confirm()` / `prompt()`. TypeScript accepted them, but the native Scripting runtime does not provide those browser globals. Official Scripting APIs are `Dialog.confirm()` and `Dialog.prompt()`.

## Fix already applied on branch

A small `dialogCompat.ts` bridge now maps the existing app-level `confirm()` / `prompt()` calls to native `Dialog.confirm()` / `Dialog.prompt()`, and `index.tsx` initializes the bridge before the app is assembled.

This intentionally fixes the shared root cause for all existing native app actions that use those calls, including login confirmation, comments, favorites, bookmark/delete confirmations, and other prompts.

Do not add another local workaround inside the Safari login handler.

## Still needs user test

1. Sync the latest DEV branch, open Account/Login, tap **在 Safari 登录**. Expected: native confirmation dialog appears and confirming opens Safari.
2. In Safari, confirm the Cookie helper appears / extension menu action works, then acquire Cookie and use **导入并验证登录状态**.
3. Re-test navigation from Home → Account/Login → Back. Expected: directly Home, not Library.

## Development rules

- No new feature families.
- No full regression campaign.
- If test 1 still fails, inspect the exact new runtime error before changing Safari/extension code.
- If Safari opens but Cookie helper still fails, then trace the browser-script execution path from the new runtime evidence.
- User real-device evidence is authoritative.

Stop after the above fixes and wait for user feedback.
