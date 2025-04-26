import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { IMCPTool } from "../types/index.js";
import { SpreadsheetClient } from "../utils/spreadsheet-client.js";
import { extractSpreadsheetId } from "../utils/url-parser.js";

/**
 * スプレッドシートに新しいシートを追加するツール
 */
export class AddSheetTool implements IMCPTool {
  readonly name = "add_sheet";
  readonly description =
    "Add a new sheet to a Google Spreadsheet";

  readonly parameters = {
    spreadsheetUrl: z.string().describe("URL or ID of the Google Spreadsheet"),
    sheetTitle: z.string().describe("Title for the new sheet"),
    rowCount: z.number().positive().optional().describe("Number of rows for the new sheet (default: 1000)"),
    columnCount: z.number().positive().optional().describe("Number of columns for the new sheet (default: 26)"),
  };

  private spreadsheetClient: SpreadsheetClient;

  /**
   * ツールの初期化
   */
  constructor() {
    this.spreadsheetClient = new SpreadsheetClient();
  }

  /**
   * ツールの実行関数
   *
   * @param args パラメータ
   * @returns 実行結果
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
      // URLからスプレッドシートIDを抽出
      const spreadsheetId = extractSpreadsheetId(args.spreadsheetUrl);

      // シートのタイトルを検証
      if (!args.sheetTitle || args.sheetTitle.trim() === "") {
        throw new Error("Sheet title cannot be empty");
      }

      // オプションの行数と列数
      const options = {
        rowCount: args.rowCount,
        columnCount: args.columnCount
      };

      // 新しいシートを追加
      const newSheet = await this.spreadsheetClient.addSheet(
        spreadsheetId,
        args.sheetTitle,
        options
      );

      // 結果メッセージの作成
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

      // エラーメッセージを返す
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
