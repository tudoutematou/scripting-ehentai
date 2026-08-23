import { Script } from "scripting"
import { runEhAction } from "./src/ehAction"
import type { GalleryCategoryKey, QuickFilterKey } from "./src/tourist"

type SearchToolParams = { query: string; category?: GalleryCategoryKey; language?: QuickFilterKey }

function toolMessage(result: Awaited<ReturnType<typeof runEhAction>>): string {
  return JSON.stringify(result)
}

export async function executeSearchTool(params: SearchToolParams): Promise<{ success: boolean; message: string }> {
  const result = await runEhAction({ type: "search", query: String(params?.query || ""), category: params?.category, language: params?.language })
  return { success: result.ok, message: toolMessage(result) }
}

if (Script.env === "assistant_tool") {
  AssistantTool.registerApprovalRequest<SearchToolParams>(async () => ({
    title: "搜索画廊",
    message: "Assistant 将使用当前 E-Hentai/ExHentai 账号会话执行一次画廊搜索；搜索结果只会返回短期画廊引用，不会暴露 Cookie 或画廊链接。",
    primaryButtonLabel: "允许搜索",
    secondaryButtonLabel: "取消",
  }))

  AssistantTool.registerExecuteToolWithApproval<SearchToolParams>(async (params, { primaryConfirmed }) => {
    if (!primaryConfirmed) return { success: false, message: "搜索已取消。" }
    AssistantTool.report("正在搜索画廊…", "ehentai-search")
    return executeSearchTool(params)
  })
}
