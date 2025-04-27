import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type {
  IMCPTool,
  InferZodParams,
  SpreadsheetInfo,
} from "../types/index.js";
import type { SpreadsheetClient } from "../utils/spreadsheet-client.js";
import { extractSpreadsheetId } from "../utils/url-parser.js";

/**
 * Tool for retrieving spreadsheet information
 */
export class GetSheetsTool implements IMCPTool {
  readonly name = "get_sheets";
  readonly description = "Get information about sheets in a Google Spreadsheet";

  readonly parameters = {
    spreadsheetUrl: z.string().describe("URL or ID of the Google Spreadsheet"),
  };

  /**
   * Initialize the tool with injected dependencies
   * @param spreadsheetClient SpreadsheetClient instance
   */
  constructor(private readonly spreadsheetClient: SpreadsheetClient) {}

  /**
   * Tool execution function
   *
   * @param args Parameters
   * @returns Execution results
   */
  async execute(args: InferZodParams<typeof this.parameters>): Promise<{
    content: TextContent[];
    isError?: boolean;
  }> {
    try {
      // Extract spreadsheet ID from URL
      const spreadsheetId = extractSpreadsheetId(args.spreadsheetUrl);

      // Retrieve spreadsheet information
      const spreadsheetInfo =
        await this.spreadsheetClient.getSpreadsheetInfo(spreadsheetId);

      // Format the results as text
      const resultText = this.formatSpreadsheetInfo(spreadsheetInfo);

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      console.error("Error executing get_sheets tool:", error);

      // Return error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error occurred while fetching spreadsheet information";

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

  /**
   * Format spreadsheet information for better readability
   *
   * @param info Spreadsheet information
   * @returns Formatted text
   */
  private formatSpreadsheetInfo(info: SpreadsheetInfo): string {
    let result = `Spreadsheet: ${info.title} (ID: ${info.spreadsheetId})\n\n`;
    result += `Total sheets: ${info.sheets.length}\n\n`;

    // Add information for each sheet
    info.sheets.forEach((sheet, index) => {
      result += `Sheet ${index + 1}: ${sheet.title}\n`;
      result += `  - Rows: ${sheet.rowCount}\n`;
      result += `  - Columns: ${sheet.columnCount}\n`;
      result += `  - Sheet ID: ${sheet.sheetId}\n`;

      // Add separator line for all but the last sheet
      if (index < info.sheets.length - 1) {
        result += "\n";
      }
    });

    return result;
  }
}
