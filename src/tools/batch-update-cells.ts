import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { IMCPTool } from "../types/index.js";
import type { SpreadsheetClient } from "../utils/spreadsheet-client.js";
import { extractSpreadsheetId } from "../utils/url-parser.js";

/**
 * Tool for batch updating cells in a spreadsheet
 */
export class BatchUpdateCellsTool implements IMCPTool {
  readonly name = "batch_update_cells";
  readonly description =
    "Update values in multiple cell ranges of a Google Spreadsheet in a single operation";

  readonly parameters = {
    spreadsheetUrl: z.string().describe("URL or ID of the Google Spreadsheet"),
    updates: z
      .array(
        z.object({
          sheetName: z.string().describe("Name of the sheet to update"),
          range: z.string().describe("Cell range in A1 notation (e.g. A1:B2)"),
          values: z
            .array(z.array(z.any()))
            .describe(
              "2D array of values to write. Each inner array represents a row.",
            ),
        }),
      )
      .describe("An array of update operations to perform"),
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
  async execute(args: {
    spreadsheetUrl: string;
    updates: Array<{
      sheetName: string;
      range: string;
      values: any[][];
    }>;
  }): Promise<{
    content: TextContent[];
    isError?: boolean;
  }> {
    try {
      // Extract spreadsheet ID from URL
      const spreadsheetId = extractSpreadsheetId(args.spreadsheetUrl);

      // Validate input values
      if (!Array.isArray(args.updates) || args.updates.length === 0) {
        throw new Error("Updates must be a non-empty array");
      }

      for (const update of args.updates) {
        if (!Array.isArray(update.values) || update.values.length === 0) {
          throw new Error(
            `Values for range ${update.range} must be a non-empty 2D array`,
          );
        }

        for (const row of update.values) {
          if (!Array.isArray(row)) {
            throw new Error(
              `Each row for range ${update.range} must be an array`,
            );
          }
          if (row.length === 0) {
            throw new Error(
              `Each row for range ${update.range} must be a non-empty array`,
            );
          }
        }
      }

      // Batch update cell values
      const result = await this.spreadsheetClient.batchUpdateCellValues(
        spreadsheetId,
        args.updates,
      );

      // Create result message
      const updatesInfo = args.updates
        .map(
          (update) =>
            `- Sheet: "${update.sheetName}", Range: "${update.range}", Values: ${JSON.stringify(update.values)}`,
        )
        .join("\n");

      const message = `Successfully updated ${result.totalUpdatedCells} cells across ${result.totalUpdatedRows} rows.\n\nUpdates performed:\n${updatesInfo}`;

      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
      };
    } catch (error) {
      console.error("Error executing batch_update_cells tool:", error);

      // Return error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error occurred while batch updating cells";

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
