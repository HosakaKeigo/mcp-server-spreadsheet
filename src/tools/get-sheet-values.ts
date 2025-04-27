import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { IMCPTool } from "../types/index.js";
import { SpreadsheetClient } from "../utils/spreadsheet-client.js";
import { extractSpreadsheetId } from "../utils/url-parser.js";

/**
 * Tool for retrieving values from a spreadsheet
 */
export class GetSheetValuesTool implements IMCPTool {
  readonly name = "get_sheet_values";
  readonly description =
    "Get values from a specific sheet in a Google Spreadsheet";

  readonly parameters = {
    spreadsheetUrl: z.string().describe("URL or ID of the Google Spreadsheet"),
    sheetName: z.string().describe("Name of the sheet to retrieve data from"),
    range: z
      .string()
      .optional()
      .describe("Optional cell range in A1 notation (e.g. A1:D5)"),
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
    range?: string;
  }): Promise<{
    content: TextContent[];
    isError?: boolean;
  }> {
    try {
      // Extract spreadsheet ID from URL
      const spreadsheetId = extractSpreadsheetId(args.spreadsheetUrl);

      // Get sheet values
      const values = await this.spreadsheetClient.getSheetValues(
        spreadsheetId,
        args.sheetName,
        args.range,
      );

      // Handle empty results
      if (values.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No data found in sheet "${args.sheetName}"${args.range ? ` range ${args.range}` : ""}.`,
            },
          ],
        };
      }

      // Format the results
      const formattedResult = this.formatSheetValues(
        values,
        args.sheetName,
        args.range,
      );

      return {
        content: [
          {
            type: "text",
            text: formattedResult,
          },
        ],
      };
    } catch (error) {
      console.error("Error executing get_sheet_values tool:", error);

      // Return error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error occurred while fetching sheet values";

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
   * Format sheet values for better readability
   *
   * @param values Sheet values
   * @param sheetName Sheet name
   * @param range Range (optional)
   * @returns Formatted text
   */
  private formatSheetValues(
    values: any[][],
    sheetName: string,
    range?: string,
  ): string {
    const rowCount = values.length;
    const colCount = values.reduce((max, row) => Math.max(max, row.length), 0);

    // Header information
    let result = `Data from sheet "${sheetName}"${range ? ` range ${range}` : ""}\n`;
    result += `Rows: ${rowCount}, Columns: ${colCount}\n\n`;

    // Format as a table
    // Calculate maximum width for each column
    const colWidths: number[] = [];
    for (let col = 0; col < colCount; col++) {
      const colValues = values.map((row) => String(row[col] ?? ""));
      colWidths[col] = Math.min(
        50, // Limit maximum column width
        Math.max(3, ...colValues.map((val) => val.length)),
      );
    }

    // Add header row (A, B, C, ...)
    result += "|";
    for (let col = 0; col < colCount; col++) {
      const colLetter = this.columnIndexToLetter(col);
      result += ` ${colLetter.padEnd(colWidths[col])} |`;
    }
    result += "\n";

    // Add separator line
    result += "|";
    for (let col = 0; col < colCount; col++) {
      result += `${"-".repeat(colWidths[col] + 2)}|`;
    }
    result += "\n";

    // Add data rows
    for (let row = 0; row < rowCount; row++) {
      result += "|";
      for (let col = 0; col < colCount; col++) {
        const cellValue =
          values[row][col] !== undefined ? String(values[row][col]) : "";
        // Abbreviate cell values that are too long
        const formattedValue =
          cellValue.length > colWidths[col]
            ? `${cellValue.substring(0, colWidths[col] - 3)}...`
            : cellValue;
        result += ` ${formattedValue.padEnd(colWidths[col])} |`;
      }
      result += "\n";
    }

    return result;
  }

  /**
   * Convert column index to A1 notation column letter (A, B, C, ...)
   *
   * @param index Zero-based index
   * @returns Column letter
   */
  private columnIndexToLetter(index: number): string {
    let temp = index;
    let letter = "";

    while (temp >= 0) {
      letter = String.fromCharCode(65 + (temp % 26)) + letter;
      temp = Math.floor(temp / 26) - 1;
    }

    return letter;
  }
}
