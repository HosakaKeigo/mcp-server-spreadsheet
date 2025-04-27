import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IMCPTool } from "../types/index.js";
import { AddSheetTool } from "./add-sheet.js";
import { BatchUpdateCellsTool } from "./batch-update-cells.js";
import { GetSheetValuesTool } from "./get-sheet-values.js";
import { GetSheetsTool } from "./get-sheets.js";
import { UpdateCellsTool } from "./update-cells.js";

/**
 * Tool registration function
 * Registers all tools to the server
 *
 * @param server MCP server instance
 */
export function registerTools(server: McpServer): void {
  const ALL_TOOLS: IMCPTool[] = [
    new GetSheetsTool(),
    new GetSheetValuesTool(),
    new UpdateCellsTool(),
    new BatchUpdateCellsTool(),
    new AddSheetTool(),
  ];

  // Register each tool to the server
  for (const tool of ALL_TOOLS) {
    server.tool(
      tool.name,
      tool.description,
      tool.parameters,
      tool.execute.bind(tool),
    );
  }

  console.error(`Registered ${ALL_TOOLS.length} tools`);
}
