# DEV_PROGRESS

Head before checkpoint: `06dbf7c7bd6029f24ac6284896081b34ba28d04f`

## Completed target
- 0.7 targets 1–4: Popular + read-only My Home; local bookmarks; Detail uploader/relationship/Safari navigation; verified advanced search options.
- 0.7 target 5 attempted once: native `Photos.pick` exists, but the public E-Hentai image-search form could not be retrieved/verified and this runtime has no documented multipart upload contract. No picker/upload UI or dead scaffolding added.
- 0.7 target 6: safe white-listed Safari shortcuts for News, Forums, Wiki, and Torrents; URLs are fixed HTTPS destinations and checked by deterministic test.
- Self-test and action smoke passed. Isolated DEV launch held its expected UI session without startup exception before CLI timeout.

## Current PLATFORM_GAP
- Reverse image search: E-Hentai upload form fields/action and Scripting multipart upload behavior remain unverified after the one allowed probe; avoid unsafe guessed upload requests.
- Rating submission: no exact verified authenticated E-Hentai API/form path; no `apiuid`/`apikey` storage.
- Comment post/edit: no exact verified action, CSRF field set, or edit-ownership signal.

## Next step
- 0.7 target 7: final EhViewer parity triage; implement any remaining HIGH_VALUE_FEASIBLE, then run full harness and final DEV checkpoint.
