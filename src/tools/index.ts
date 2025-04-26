import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IMCPTool } from "../types/index.js";
import { GetSheetValuesTool } from "./get-sheet-values.js";
import { GetSheetsTool } from "./get-sheets.js";
import { UpdateCellsTool } from "./update-cells.js";
import { BatchUpdateCellsTool } from "./batch-update-cells.js";

/**
 * ツール登録関数
 * すべてのツールをサーバーに登録
 *
 * @param server MCPサーバーインスタンス
 */
export function registerTools(server: McpServer): void {
  const ALL_TOOLS: IMCPTool[] = [
    new GetSheetsTool(),
    new GetSheetValuesTool(),
    new UpdateCellsTool(),
    new BatchUpdateCellsTool()
  ];

  // 各ツールをサーバーに登録
  for (const tool of ALL_TOOLS) {
    server.tool(
      tool.name,
      tool.description,
      tool.parameters,
      tool.execute.bind(tool)
    );
  }

  console.error(`Registered ${ALL_TOOLS.length} tools`);
}
