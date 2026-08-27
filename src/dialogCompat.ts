import { Dialog } from "scripting"

// Native Scripting does not provide browser DOM globals such as confirm()/prompt().
;(globalThis as any).confirm = (options: Parameters<typeof Dialog.confirm>[0]) => Dialog.confirm(options)
;(globalThis as any).prompt = (options: Parameters<typeof Dialog.prompt>[0]) => Dialog.prompt(options)
