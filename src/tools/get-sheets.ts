import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { IMCPTool, SpreadsheetInfo } from "../types/index.js";
import { SpreadsheetClient } from "../utils/spreadsheet-client.js";
import { extractSpreadsheetId } from "../utils/url-parser.js";

/**
 * スプレッドシート情報取得ツール
 */
export class GetSheetsTool implements IMCPTool {
  readonly name = "get_sheets";
  readonly description = "Get information about sheets in a Google Spreadsheet";

  readonly parameters = {
    spreadsheetUrl: z.string().describe("URL or ID of the Google Spreadsheet"),
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
  async execute(args: { spreadsheetUrl: string }): Promise<{
    content: TextContent[];
    isError?: boolean;
  }> {
    try {
      // URLからスプレッドシートIDを抽出
      const spreadsheetId = extractSpreadsheetId(args.spreadsheetUrl);

      // スプレッドシート情報を取得
      const spreadsheetInfo =
        await this.spreadsheetClient.getSpreadsheetInfo(spreadsheetId);

      // 結果をテキストに整形
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

      // エラーメッセージを返す
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
   * スプレッドシート情報を見やすくフォーマットする
   *
   * @param info スプレッドシート情報
   * @returns フォーマットされたテキスト
   */
  private formatSpreadsheetInfo(info: SpreadsheetInfo): string {
    let result = `Spreadsheet: ${info.title} (ID: ${info.spreadsheetId})\n\n`;
    result += `Total sheets: ${info.sheets.length}\n\n`;

    // 各シートの情報を追加
    info.sheets.forEach((sheet, index) => {
      result += `Sheet ${index + 1}: ${sheet.title}\n`;
      result += `  - Rows: ${sheet.rowCount}\n`;
      result += `  - Columns: ${sheet.columnCount}\n`;
      result += `  - Sheet ID: ${sheet.sheetId}\n`;

      // 最後のシート以外は区切り線を追加
      if (index < info.sheets.length - 1) {
        result += `\n`;
      }
    });

    return result;
  }
}
