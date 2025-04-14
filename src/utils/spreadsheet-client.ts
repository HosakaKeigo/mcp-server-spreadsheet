import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';
import type { SpreadsheetInfo, SheetInfo } from '../types/index.js';

/**
 * GoogleスプレッドシートAPIと通信するクライアントクラス
 */
export class SpreadsheetClient {
  private sheets: sheets_v4.Sheets;
  // レスポンスサイズの上限（文字数）
  private static readonly MAX_RESPONSE_SIZE = 200000;

  /**
   * クライアントをデフォルト認証情報で初期化
   */
  constructor() {
    // デフォルト認証情報を使用して認証
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
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
        fields: 'spreadsheetId,properties.title,sheets.properties',
      });

      const spreadsheet = response.data;
      const title = spreadsheet.properties?.title || 'Untitled Spreadsheet';

      // シート情報を整形
      const sheets: SheetInfo[] = spreadsheet.sheets?.map(sheet => {
        const properties = sheet.properties!;
        return {
          title: properties.title || 'Untitled Sheet',
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
      console.error('Error fetching spreadsheet info:', error);
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
      // シートが存在するか確認
      const spreadsheetInfo = await this.getSpreadsheetInfo(spreadsheetId);
      const sheetExists = spreadsheetInfo.sheets.some(sheet => sheet.title === sheetName);

      if (!sheetExists) {
        throw new Error(`Sheet "${sheetName}" does not exist in this spreadsheet`);
      }

      // 範囲を構築
      let fullRange = sheetName;
      if (range) {
        // シート名が含まれている場合（例：Sheet1!A1:B10）
        if (range.includes('!')) {
          fullRange = range;
        } else {
          // シート名が含まれていない場合（例：A1:B10）
          fullRange = `${sheetName}!${range}`;
        }
      }

      // A1記法の基本的なバリデーション
      this.validateA1Notation(fullRange);

      // 値を取得
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: fullRange,
      });

      const values = response.data.values || [];

      // レスポンスのサイズをチェック
      const responseSize = JSON.stringify(values).length;
      if (responseSize > SpreadsheetClient.MAX_RESPONSE_SIZE) {
        throw new Error(`Response size (${responseSize} characters) exceeds the maximum allowed size. Please specify a smaller range.`);
      }

      return values;
    } catch (error) {
      console.error('Error fetching sheet values:', error);
      throw error;
    }
  }

  /**
   * A1記法のバリデーションを行う
   * 
   * @param a1Notation A1記法の文字列
   * @throws 無効なA1記法の場合はエラー
   */
  private validateA1Notation(a1Notation: string): void {
    // シート名と範囲の区切り「!」がある場合
    if (a1Notation.includes('!')) {
      // シート名と範囲に分割
      const [, range] = a1Notation.split('!');

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
    if (range.includes(':')) {
      return a1RangePattern.test(range);
    }

    return false;
  }
}