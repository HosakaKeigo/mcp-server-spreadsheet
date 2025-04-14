import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { IMCPTool } from "../types/index.js";
import { SpreadsheetClient } from "../utils/spreadsheet-client.js";
import { extractSpreadsheetId } from "../utils/url-parser.js";

/**
 * スプレッドシートの値取得ツール
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
    sheetName: string;
    range?: string;
  }): Promise<{
    content: TextContent[];
    isError?: boolean;
  }> {
    try {
      // URLからスプレッドシートIDを抽出
      const spreadsheetId = extractSpreadsheetId(args.spreadsheetUrl);

      // シートの値を取得
      const values = await this.spreadsheetClient.getSheetValues(
        spreadsheetId,
        args.sheetName,
        args.range
      );

      // 結果が空の場合
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

      // 結果を整形
      const formattedResult = this.formatSheetValues(
        values,
        args.sheetName,
        args.range
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

      // エラーメッセージを返す
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
   * シートの値を見やすくフォーマットする
   *
   * @param values シートの値
   * @param sheetName シート名
   * @param range 範囲（オプション）
   * @returns フォーマットされたテキスト
   */
  private formatSheetValues(
    values: any[][],
    sheetName: string,
    range?: string
  ): string {
    const rowCount = values.length;
    const colCount = values.reduce((max, row) => Math.max(max, row.length), 0);

    // ヘッダー情報
    let result = `Data from sheet "${sheetName}"${range ? ` range ${range}` : ""}\n`;
    result += `Rows: ${rowCount}, Columns: ${colCount}\n\n`;

    // テーブル形式に整形
    // 各列の最大幅を計算
    const colWidths: number[] = [];
    for (let col = 0; col < colCount; col++) {
      const colValues = values.map((row) => String(row[col] ?? ""));
      colWidths[col] = Math.min(
        50, // 最大列幅を制限
        Math.max(3, ...colValues.map((val) => val.length))
      );
    }

    // ヘッダー行（A, B, C, ...）を追加
    result += "|";
    for (let col = 0; col < colCount; col++) {
      const colLetter = this.columnIndexToLetter(col);
      result += ` ${colLetter.padEnd(colWidths[col])} |`;
    }
    result += "\n";

    // 区切り線
    result += "|";
    for (let col = 0; col < colCount; col++) {
      result += "-".repeat(colWidths[col] + 2) + "|";
    }
    result += "\n";

    // データ行
    for (let row = 0; row < rowCount; row++) {
      result += "|";
      for (let col = 0; col < colCount; col++) {
        const cellValue =
          values[row][col] !== undefined ? String(values[row][col]) : "";
        // セル値が長い場合は省略
        const formattedValue =
          cellValue.length > colWidths[col]
            ? cellValue.substring(0, colWidths[col] - 3) + "..."
            : cellValue;
        result += ` ${formattedValue.padEnd(colWidths[col])} |`;
      }
      result += "\n";
    }

    return result;
  }

  /**
   * 列インデックスをA1記法の列文字（A, B, C, ...）に変換
   *
   * @param index 0からのインデックス
   * @returns 列文字
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
