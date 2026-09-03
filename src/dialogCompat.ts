declare const Dialog: {
  confirm(options: any): Promise<boolean>
  prompt(options: any): Promise<string | null>
}

// Scripting exposes Dialog as a host global; it is not a named export from the "scripting" module.
;(globalThis as any).confirm = (options: any) => Dialog.confirm(options)
;(globalThis as any).prompt = (options: any) => Dialog.prompt(options)
