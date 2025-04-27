import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { IMCPTool } from "../types/index.js";
import { SpreadsheetClient } from "../utils/spreadsheet-client.js";
import { extractSpreadsheetId } from "../utils/url-parser.js";

/**
 * Tool to add a new sheet to a spreadsheet
 */
export class AddSheetTool implements IMCPTool {
  readonly name = "add_sheet";
  readonly description = "Add a new sheet to a Google Spreadsheet";

  readonly parameters = {
    spreadsheetUrl: z.string().describe("URL or ID of the Google Spreadsheet"),
    sheetTitle: z.string().describe("Title for the new sheet"),
    rowCount: z
      .number()
      .positive()
      .optional()
      .describe("Number of rows for the new sheet (default: 1000)"),
    columnCount: z
      .number()
      .positive()
      .optional()
      .describe("Number of columns for the new sheet (default: 26)"),
  };

  private spreadsheetClient: SpreadsheetClient;

  /**
   * Initialize the tool
   */
  constructor() {
    this.spreadsheetClient = new SpreadsheetClient();
  }

  /**
   * Tool execution function
   *
   * @param args Parameters
   * @returns Execution results
   */
  async execute(args: {
    spreadsheetUrl: string;
    sheetTitle: string;
    rowCount?: number;
    columnCount?: number;
  }): Promise<{
    content: TextContent[];
    isError?: boolean;
  }> {
    try {
      // Extract spreadsheet ID from URL
      const spreadsheetId = extractSpreadsheetId(args.spreadsheetUrl);

      // Validate sheet title
      if (!args.sheetTitle || args.sheetTitle.trim() === "") {
        throw new Error("Sheet title cannot be empty");
      }

      // Optional row and column counts
      const options = {
        rowCount: args.rowCount,
        columnCount: args.columnCount,
      };

      // Add new sheet
      const newSheet = await this.spreadsheetClient.addSheet(
        spreadsheetId,
        args.sheetTitle,
        options,
      );

      // Create result message
      const message = `Successfully added new sheet "${newSheet.title}" to the spreadsheet.\n\nSheet details:\n- Sheet ID: ${newSheet.sheetId}\n- Rows: ${newSheet.rowCount}\n- Columns: ${newSheet.columnCount}`;

      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
      };
    } catch (error) {
      console.error("Error executing add_sheet tool:", error);

      // Return error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error occurred while adding a new sheet";

      return {
        content: [
          {
            type: "text",
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
}
