import { reportDiagnostic } from "./githubBridge"

export async function reportSafe(input:Parameters<typeof reportDiagnostic>[0]){try{await reportDiagnostic(input)}catch{}}

