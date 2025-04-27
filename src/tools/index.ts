import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IMCPTool } from "../types/index.js";
import { SpreadsheetClient } from "../utils/spreadsheet-client.js";
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
  // Create a shared instance of SpreadsheetClient to be injected into all tools
  const spreadsheetClient = new SpreadsheetClient();

  const ALL_TOOLS: IMCPTool[] = [
    new GetSheetsTool(spreadsheetClient),
    new GetSheetValuesTool(spreadsheetClient),
    new UpdateCellsTool(spreadsheetClient),
    new BatchUpdateCellsTool(spreadsheetClient),
    new AddSheetTool(spreadsheetClient),
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
