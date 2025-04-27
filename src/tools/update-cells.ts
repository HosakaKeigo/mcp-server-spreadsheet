import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { IMCPTool } from "../types/index.js";
import { SpreadsheetClient } from "../utils/spreadsheet-client.js";
import { extractSpreadsheetId } from "../utils/url-parser.js";

/**
 * Tool for updating cells in a spreadsheet
 */
export class UpdateCellsTool implements IMCPTool {
  readonly name = "update_cells";
  readonly description =
    "Update values in specific cells of a Google Spreadsheet";

  readonly parameters = {
    spreadsheetUrl: z.string().describe("URL or ID of the Google Spreadsheet"),
    sheetName: z.string().describe("Name of the sheet to update"),
    range: z.string().describe("Cell range in A1 notation (e.g. A1:B2)"),
    values: z
      .array(z.array(z.any()))
      .describe(
        "2D array of values to write. Each inner array represents a row.",
      ),
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
    sheetName: string;
    range: string;
    values: any[][];
  }): Promise<{
    content: TextContent[];
    isError?: boolean;
  }> {
    try {
      // Extract spreadsheet ID from URL
      const spreadsheetId = extractSpreadsheetId(args.spreadsheetUrl);

      // Validate input values
      if (!Array.isArray(args.values) || args.values.length === 0) {
        throw new Error("Values must be a non-empty 2D array");
      }

      for (const row of args.values) {
        if (!Array.isArray(row)) {
          throw new Error("Each row must be an array");
        }
      }

      // Update cell values
      const result = await this.spreadsheetClient.updateCellValues(
        spreadsheetId,
        args.sheetName,
        args.range,
        args.values,
      );

      // Create result message
      const message = `Successfully updated ${result.updatedCells} cells across ${
        result.updatedRows
      } rows in sheet "${args.sheetName}" at range "${args.range}".\n\nValues updated: ${JSON.stringify(
        args.values,
        null,
        2,
      )}`;

      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
      };
    } catch (error) {
      console.error("Error executing update_cells tool:", error);

      // Return error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error occurred while updating cells";

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
