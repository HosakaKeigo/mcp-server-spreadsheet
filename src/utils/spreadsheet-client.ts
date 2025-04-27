import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";
import { env } from "../env.js";
import type { SheetInfo, SpreadsheetInfo } from "../types/index.js";

/**
 * Client class for communicating with the Google Spreadsheet API
 */
export class SpreadsheetClient {
  private sheets: sheets_v4.Sheets;
  // Maximum response size (in characters)
  private static readonly MAX_RESPONSE_SIZE = Number.parseInt(
    env.MAX_RESPONSE_SIZE ?? "30000",
    10,
  );

  /**
   * Initialize client with default authentication credentials
   */
  constructor() {
    // Use default authentication credentials
    const auth = new google.auth.GoogleAuth({
      projectId: env.GOOGLE_PROJECT_ID,
      // Add read/write permissions
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    this.sheets = google.sheets({ version: "v4", auth });
  }

  /**
   * Get spreadsheet information
   *
   * @param spreadsheetId Spreadsheet ID
   * @returns Spreadsheet information
   * @throws Error if API call fails
   */
  async getSpreadsheetInfo(spreadsheetId: string): Promise<SpreadsheetInfo> {
    try {
      // Get spreadsheet properties
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        fields: "spreadsheetId,properties.title,sheets.properties",
      });

      const spreadsheet = response.data;
      const title = spreadsheet.properties?.title || "Untitled Spreadsheet";

      // Format sheet information
      const sheets: SheetInfo[] =
        spreadsheet.sheets?.map((sheet) => {
          const properties = sheet.properties || {};
          return {
            title: properties.title || "Untitled Sheet",
            sheetId: properties.sheetId || 0,
            rowCount: properties.gridProperties?.rowCount || 0,
            columnCount: properties.gridProperties?.columnCount || 0,
          };
        }) || [];

      return {
        spreadsheetId,
        title,
        sheets,
      };
    } catch (error) {
      console.error("Error fetching spreadsheet info:", error);
      throw error;
    }
  }

  /**
   * Get values from a spreadsheet
   *
   * @param spreadsheetId Spreadsheet ID
   * @param sheetName Sheet name
   * @param range Optional range specification (A1 notation)
   * @returns Sheet values
   * @throws Error if API call fails, sheet doesn't exist, or response size is too large
   */
  async getSheetValues(
    spreadsheetId: string,
    sheetName: string,
    range?: string,
  ): Promise<any[][]> {
    try {
      // Verify sheet exists and build range
      const fullRange = await this.prepareSheetRange(
        spreadsheetId,
        sheetName,
        range,
      );

      // Get values
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: fullRange,
      });

      const values = response.data.values || [];

      // Check response size
      const responseSize = JSON.stringify(values).length;
      if (responseSize > SpreadsheetClient.MAX_RESPONSE_SIZE) {
        throw new Error(
          `Response size (${responseSize} characters) exceeds the maximum allowed size. Please specify a smaller range.`,
        );
      }

      return values;
    } catch (error) {
      console.error("Error fetching sheet values:", error);
      throw error;
    }
  }

  /**
   * Update cell values in a spreadsheet
   *
   * @param spreadsheetId Spreadsheet ID
   * @param sheetName Sheet name
   * @param range Range to update (A1 notation)
   * @param values Values to update
   * @returns Number of updated rows and cells
   * @throws Error if API call fails or sheet doesn't exist
   */
  async updateCellValues(
    spreadsheetId: string,
    sheetName: string,
    range: string,
    values: any[][],
  ): Promise<{ updatedRows: number; updatedCells: number }> {
    try {
      // Verify sheet exists and build range
      const fullRange = await this.prepareSheetRange(
        spreadsheetId,
        sheetName,
        range,
      );

      // Update values
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: fullRange,
        valueInputOption: "USER_ENTERED", // Parse as if entered by user (processes formulas)
        requestBody: {
          values: values,
        },
      });

      return {
        updatedRows: response.data.updatedRows || 0,
        updatedCells: response.data.updatedCells || 0,
      };
    } catch (error) {
      console.error("Error updating cell values:", error);
      throw error;
    }
  }

  /**
   * Batch update cell values in multiple ranges of a spreadsheet
   *
   * @param spreadsheetId Spreadsheet ID
   * @param updates Array of update information (sheet name, range, values set)
   * @returns Number of updated rows, cells, and columns
   * @throws Error if API call fails or sheet doesn't exist
   */
  async batchUpdateCellValues(
    spreadsheetId: string,
    updates: Array<{
      sheetName: string;
      range: string;
      values: any[][];
    }>,
  ): Promise<{
    totalUpdatedCells: number;
    totalUpdatedColumns: number;
    totalUpdatedRows: number;
  }> {
    try {
      // Collect all sheet names to update
      const sheetNames = [
        ...new Set(updates.map((update) => update.sheetName)),
      ];

      // Get spreadsheet info only once (for caching)
      const spreadsheetInfo = await this.getSpreadsheetInfo(spreadsheetId);

      // Verify all sheets exist
      for (const sheetName of sheetNames) {
        await this.validateSheetExists(spreadsheetInfo, sheetName);
      }

      // Prepare batch update data
      const data = updates.map((update) => {
        // Build range
        let fullRange = update.sheetName;
        if (update.range) {
          if (update.range.includes("!")) {
            fullRange = update.range;
          } else {
            fullRange = `${update.sheetName}!${update.range}`;
          }
        }

        // Basic validation of A1 notation
        this.validateA1Notation(fullRange);

        return {
          range: fullRange,
          values: update.values,
        };
      });

      // Batch update request
      const response = await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: data,
        },
      });

      return {
        totalUpdatedCells: response.data.totalUpdatedCells || 0,
        totalUpdatedColumns: response.data.totalUpdatedColumns || 0,
        totalUpdatedRows: response.data.totalUpdatedRows || 0,
      };
    } catch (error) {
      console.error("Error batch updating cell values:", error);
      throw error;
    }
  }

  /**
   * Add a new sheet to a spreadsheet
   *
   * @param spreadsheetId Spreadsheet ID
   * @param sheetTitle Title for the new sheet
   * @param options Optional settings (row count, column count)
   * @returns Created sheet information
   * @throws Error if API call fails or a sheet with the same name already exists
   */
  async addSheet(
    spreadsheetId: string,
    sheetTitle: string,
    options?: {
      rowCount?: number;
      columnCount?: number;
    },
  ): Promise<SheetInfo> {
    try {
      // Set default values
      const rowCount = options?.rowCount || 1000; // Default row count
      const columnCount = options?.columnCount || 26; // Default column count

      // Get spreadsheet info and check if sheet with same name exists
      const spreadsheetInfo = await this.getSpreadsheetInfo(spreadsheetId);
      const sheetExists = spreadsheetInfo.sheets.some(
        (sheet) => sheet.title === sheetTitle,
      );

      if (sheetExists) {
        throw new Error(
          `Sheet with title "${sheetTitle}" already exists in this spreadsheet`,
        );
      }

      // Request to add new sheet
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                  gridProperties: {
                    rowCount: rowCount,
                    columnCount: columnCount,
                  },
                },
              },
            },
          ],
        },
      });

      // Get properties of created sheet
      const createdSheet = response.data.replies?.[0].addSheet?.properties;
      if (!createdSheet) {
        throw new Error("Failed to retrieve created sheet properties");
      }

      // Format and return new sheet info
      return {
        title: createdSheet.title || sheetTitle,
        sheetId: createdSheet.sheetId || 0,
        rowCount: createdSheet.gridProperties?.rowCount || rowCount,
        columnCount: createdSheet.gridProperties?.columnCount || columnCount,
      };
    } catch (error) {
      console.error("Error adding new sheet:", error);
      throw error;
    }
  }

  /**
   * Verify sheet exists
   *
   * @param spreadsheetInfo Spreadsheet information (or directly spreadsheet ID)
   * @param sheetName Sheet name to verify
   * @throws Error if sheet doesn't exist
   */
  private async validateSheetExists(
    spreadsheetInfoOrId: SpreadsheetInfo | string,
    sheetName: string,
  ): Promise<void> {
    // Get spreadsheet info (if not already obtained)
    const spreadsheetInfo =
      typeof spreadsheetInfoOrId === "string"
        ? await this.getSpreadsheetInfo(spreadsheetInfoOrId)
        : spreadsheetInfoOrId;

    // Check if sheet exists
    const sheetExists = spreadsheetInfo.sheets.some(
      (sheet) => sheet.title === sheetName,
    );

    if (!sheetExists) {
      throw new Error(
        `Sheet "${sheetName}" does not exist in this spreadsheet`,
      );
    }
  }

  /**
   * Common process to verify sheet existence and build range
   *
   * @param spreadsheetId Spreadsheet ID
   * @param sheetName Sheet name
   * @param range Range specification (optional, A1 notation)
   * @returns Complete range specification (sheetName!range)
   * @throws Error if sheet doesn't exist
   */
  private async prepareSheetRange(
    spreadsheetId: string,
    sheetName: string,
    range?: string,
  ): Promise<string> {
    // Get spreadsheet information
    const spreadsheetInfo = await this.getSpreadsheetInfo(spreadsheetId);

    // Verify sheet exists
    await this.validateSheetExists(spreadsheetInfo, sheetName);

    // Build range
    let fullRange = sheetName;
    if (range) {
      // If sheet name is included (e.g., Sheet1!A1:B10)
      if (range.includes("!")) {
        fullRange = range;
      } else {
        // If sheet name is not included (e.g., A1:B10)
        fullRange = `${sheetName}!${range}`;
      }
    }

    // Basic validation of A1 notation
    this.validateA1Notation(fullRange);

    return fullRange;
  }

  /**
   * Validate A1 notation
   *
   * @param a1Notation A1 notation string
   * @throws Error if A1 notation is invalid
   */
  private validateA1Notation(a1Notation: string): void {
    // If there's a sheet name and range separator "!"
    if (a1Notation.includes("!")) {
      // Split into sheet name and range
      const [, range] = a1Notation.split("!");

      // Validate range
      if (range && !this.isValidRange(range)) {
        throw new Error(`Invalid A1 notation range: ${range}`);
      }
    } else {
      // If only sheet name is specified, it means entire range, so no validation needed
    }
  }

  /**
   * Check if range specification is valid
   *
   * @param range A1 notation range part
   * @returns true if range is valid
   */
  private isValidRange(range: string): boolean {
    // Basic A1 notation validation (A1 or A1:B2, etc.)
    const a1Pattern = /^[A-Z]+[0-9]+$/;
    const a1RangePattern = /^[A-Z]+[0-9]+:[A-Z]+[0-9]+$/;

    // For single cell specification
    if (a1Pattern.test(range)) {
      return true;
    }

    // For range specification
    if (range.includes(":")) {
      return a1RangePattern.test(range);
    }

    return false;
  }
}
