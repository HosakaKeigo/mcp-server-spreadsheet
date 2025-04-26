import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";
import type { SheetInfo, SpreadsheetInfo } from "../types/index.js";
import { env } from "../env.js";

/**
 * GoogleスプレッドシートAPIと通信するクライアントクラス
 */
export class SpreadsheetClient {
  private sheets: sheets_v4.Sheets;
  // レスポンスサイズの上限（文字数）
  private static readonly MAX_RESPONSE_SIZE = Number.parseInt(env.MAX_RESPONSE_SIZE ?? '30000', 10);

  /**
   * クライアントをデフォルト認証情報で初期化
   */
  constructor() {
    // デフォルト認証情報を使用して認証
    const auth = new google.auth.GoogleAuth({
      projectId: env.GOOGLE_PROJECT_ID,
      // 読み取り/書き込み権限を追加
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    this.sheets = google.sheets({ version: "v4", auth });
  }

  /**
   * スプレッドシートの情報を取得
   *
   * @param spreadsheetId スプレッドシートID
   * @returns スプレッドシートの情報
   * @throws API呼び出しに失敗した場合はエラー
   */
  async getSpreadsheetInfo(spreadsheetId: string): Promise<SpreadsheetInfo> {
    try {
      // スプレッドシートのプロパティを取得
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        fields: "spreadsheetId,properties.title,sheets.properties",
      });

      const spreadsheet = response.data;
      const title = spreadsheet.properties?.title || "Untitled Spreadsheet";

      // シート情報を整形
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
   * スプレッドシートの値を取得
   *
   * @param spreadsheetId スプレッドシートID
   * @param sheetName シート名
   * @param range オプションの範囲指定（A1記法）
   * @returns シートの値
   * @throws API呼び出しエラー、シートが存在しない場合、レスポンスサイズが大きすぎる場合
   */
  async getSheetValues(
    spreadsheetId: string,
    sheetName: string,
    range?: string
  ): Promise<any[][]> {
    try {
      // シート存在確認と範囲構築
      const fullRange = await this.prepareSheetRange(spreadsheetId, sheetName, range);

      // 値を取得
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: fullRange,
      });

      const values = response.data.values || [];

      // レスポンスのサイズをチェック
      const responseSize = JSON.stringify(values).length;
      if (responseSize > SpreadsheetClient.MAX_RESPONSE_SIZE) {
        throw new Error(
          `Response size (${responseSize} characters) exceeds the maximum allowed size. Please specify a smaller range.`
        );
      }

      return values;
    } catch (error) {
      console.error("Error fetching sheet values:", error);
      throw error;
    }
  }

  /**
   * スプレッドシートのセル値を更新
   *
   * @param spreadsheetId スプレッドシートID
   * @param sheetName シート名
   * @param range 更新する範囲（A1記法）
   * @param values 更新する値
   * @returns 更新された行数とセル数
   * @throws API呼び出しエラー、シートが存在しない場合
   */
  async updateCellValues(
    spreadsheetId: string,
    sheetName: string,
    range: string,
    values: any[][]
  ): Promise<{ updatedRows: number; updatedCells: number }> {
    try {
      // シート存在確認と範囲構築
      const fullRange = await this.prepareSheetRange(spreadsheetId, sheetName, range);

      // 値を更新
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: fullRange,
        valueInputOption: 'USER_ENTERED', // ユーザーが入力したように解析（数式も処理）
        requestBody: {
          values: values
        }
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
   * スプレッドシートの複数範囲のセル値を一括更新
   *
   * @param spreadsheetId スプレッドシートID
   * @param updates 更新情報の配列（シート名、範囲、値のセット）
   * @returns 更新された行数とセル数
   * @throws API呼び出しエラー、シートが存在しない場合
   */
  async batchUpdateCellValues(
    spreadsheetId: string,
    updates: Array<{
      sheetName: string;
      range: string;
      values: any[][];
    }>
  ): Promise<{ totalUpdatedCells: number; totalUpdatedColumns: number; totalUpdatedRows: number }> {
    try {
      // 更新対象のシート名を全て収集
      const sheetNames = [...new Set(updates.map(update => update.sheetName))];

      // スプレッドシート情報を1回だけ取得（キャッシュ用）
      const spreadsheetInfo = await this.getSpreadsheetInfo(spreadsheetId);

      // すべてのシートの存在確認
      for (const sheetName of sheetNames) {
        await this.validateSheetExists(spreadsheetInfo, sheetName);
      }

      // バッチ更新のデータを準備
      const data = updates.map(update => {
        // 範囲を構築
        let fullRange = update.sheetName;
        if (update.range) {
          if (update.range.includes("!")) {
            fullRange = update.range;
          } else {
            fullRange = `${update.sheetName}!${update.range}`;
          }
        }

        // A1記法の基本的なバリデーション
        this.validateA1Notation(fullRange);

        return {
          range: fullRange,
          values: update.values
        };
      });

      // バッチ更新リクエスト
      const response = await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: data
        }
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
   * 新しいシートをスプレッドシートに追加
   *
   * @param spreadsheetId スプレッドシートID
   * @param sheetTitle 新しいシートのタイトル
   * @param options オプション設定（行数、列数）
   * @returns 作成されたシート情報
   * @throws API呼び出しエラー、同名シートが存在する場合
   */
  async addSheet(
    spreadsheetId: string,
    sheetTitle: string,
    options?: {
      rowCount?: number;
      columnCount?: number;
    }
  ): Promise<SheetInfo> {
    try {
      // デフォルト値の設定
      const rowCount = options?.rowCount || 1000; // デフォルトの行数
      const columnCount = options?.columnCount || 26; // デフォルトの列数

      // スプレッドシート情報を取得して同名シートの存在確認
      const spreadsheetInfo = await this.getSpreadsheetInfo(spreadsheetId);
      const sheetExists = spreadsheetInfo.sheets.some(
        (sheet) => sheet.title === sheetTitle
      );

      if (sheetExists) {
        throw new Error(`Sheet with title "${sheetTitle}" already exists in this spreadsheet`);
      }

      // 新しいシートを追加するリクエスト
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
                    columnCount: columnCount
                  }
                }
              }
            }
          ]
        }
      });

      // 作成されたシートのプロパティを取得
      const createdSheet = response.data.replies?.[0].addSheet?.properties;
      if (!createdSheet) {
        throw new Error("Failed to retrieve created sheet properties");
      }

      // 新しいシート情報を整形して返す
      return {
        title: createdSheet.title || sheetTitle,
        sheetId: createdSheet.sheetId || 0,
        rowCount: createdSheet.gridProperties?.rowCount || rowCount,
        columnCount: createdSheet.gridProperties?.columnCount || columnCount
      };

    } catch (error) {
      console.error("Error adding new sheet:", error);
      throw error;
    }
  }

  /**
   * シートの存在を確認する
   *
   * @param spreadsheetInfo スプレッドシート情報（または直接スプレッドシートID）
   * @param sheetName 確認するシート名
   * @throws シートが存在しない場合はエラー
   */
  private async validateSheetExists(
    spreadsheetInfoOrId: SpreadsheetInfo | string,
    sheetName: string
  ): Promise<void> {
    // スプレッドシート情報を取得（まだ取得されていない場合）
    const spreadsheetInfo =
      typeof spreadsheetInfoOrId === 'string'
        ? await this.getSpreadsheetInfo(spreadsheetInfoOrId)
        : spreadsheetInfoOrId;

    // シートが存在するか確認
    const sheetExists = spreadsheetInfo.sheets.some(
      (sheet) => sheet.title === sheetName
    );

    if (!sheetExists) {
      throw new Error(
        `Sheet "${sheetName}" does not exist in this spreadsheet`
      );
    }
  }

  /**
   * シートの存在確認と範囲の構築を行う共通処理
   *
   * @param spreadsheetId スプレッドシートID
   * @param sheetName シート名
   * @param range 範囲指定（オプション、A1記法）
   * @returns 完全な範囲指定（シート名!範囲）
   * @throws シートが存在しない場合はエラー
   */
  private async prepareSheetRange(
    spreadsheetId: string,
    sheetName: string,
    range?: string
  ): Promise<string> {
    // スプレッドシート情報を取得
    const spreadsheetInfo = await this.getSpreadsheetInfo(spreadsheetId);

    // シートの存在確認
    await this.validateSheetExists(spreadsheetInfo, sheetName);

    // 範囲を構築
    let fullRange = sheetName;
    if (range) {
      // シート名が含まれている場合（例：Sheet1!A1:B10）
      if (range.includes("!")) {
        fullRange = range;
      } else {
        // シート名が含まれていない場合（例：A1:B10）
        fullRange = `${sheetName}!${range}`;
      }
    }

    // A1記法の基本的なバリデーション
    this.validateA1Notation(fullRange);

    return fullRange;
  }

  /**
   * A1記法のバリデーションを行う
   *
   * @param a1Notation A1記法の文字列
   * @throws 無効なA1記法の場合はエラー
   */
  private validateA1Notation(a1Notation: string): void {
    // シート名と範囲の区切り「!」がある場合
    if (a1Notation.includes("!")) {
      // シート名と範囲に分割
      const [, range] = a1Notation.split("!");

      // 範囲のバリデーション
      if (range && !this.isValidRange(range)) {
        throw new Error(`Invalid A1 notation range: ${range}`);
      }
    } else {
      // シート名のみの場合は、全範囲を指定したとみなすのでバリデーション不要
    }
  }

  /**
   * 範囲指定が有効かどうかをチェック
   *
   * @param range A1記法の範囲部分
   * @returns 有効な範囲の場合はtrue
   */
  private isValidRange(range: string): boolean {
    // 基本的なA1記法のバリデーション（A1やA1:B2など）
    const a1Pattern = /^[A-Z]+[0-9]+$/;
    const a1RangePattern = /^[A-Z]+[0-9]+:[A-Z]+[0-9]+$/;

    // 単一セル指定の場合
    if (a1Pattern.test(range)) {
      return true;
    }

    // 範囲指定の場合
    if (range.includes(":")) {
      return a1RangePattern.test(range);
    }

    return false;
  }
}
