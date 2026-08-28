import { Dialog } from "scripting"

// Native Scripting app code does not provide browser DOM globals such as confirm()/prompt().
;(globalThis as any).confirm = (options: any) => Dialog.confirm(options)
;(globalThis as any).prompt = (options: any) => Dialog.prompt(options)
