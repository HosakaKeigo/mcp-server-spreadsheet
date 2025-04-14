import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpreadsheetClient } from '../../src/utils/spreadsheet-client.js';

// モック関数をhoistして定義
const mockSpreadsheetsGet = vi.hoisted(() => vi.fn());
const mockSpreadsheetsValuesGet = vi.hoisted(() => vi.fn());
const mockGoogleAuth = vi.hoisted(() => vi.fn());

// googleapisモジュールのモック
vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        GoogleAuth: mockGoogleAuth
      },
      sheets: vi.fn(() => ({
        spreadsheets: {
          get: mockSpreadsheetsGet,
          values: {
            get: mockSpreadsheetsValuesGet
          }
        }
      }))
    }
  };
});

describe('SpreadsheetClient', () => {
  let client: SpreadsheetClient;
  const mockSpreadsheetId = '1234567890abcdefg';

  // モックAPIレスポンスを設定するヘルパー関数
  // biome-ignore lint/suspicious/noExplicitAny: <test>
  const setupMockResponse = (mockFn: any, responseData: any) => {
    mockFn.mockResolvedValueOnce({
      data: responseData
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new SpreadsheetClient();
  });

  describe('getSpreadsheetInfo', () => {
    it('returns formatted spreadsheet info', async () => {
      // モックレスポンスを設定
      setupMockResponse(mockSpreadsheetsGet, {
        spreadsheetId: mockSpreadsheetId,
        properties: { title: 'Test Spreadsheet' },
        sheets: [
          {
            properties: {
              title: 'Sheet1',
              sheetId: 0,
              gridProperties: { rowCount: 100, columnCount: 20 }
            }
          },
          {
            properties: {
              title: 'Sheet2',
              sheetId: 1,
              gridProperties: { rowCount: 50, columnCount: 10 }
            }
          }
        ]
      });

      const info = await client.getSpreadsheetInfo(mockSpreadsheetId);

      // APIが正しいパラメータで呼ばれたことを確認
      expect(mockSpreadsheetsGet).toHaveBeenCalledWith({
        spreadsheetId: mockSpreadsheetId,
        fields: 'spreadsheetId,properties.title,sheets.properties'
      });

      // 返値が正しいことを確認
      expect(info).toEqual({
        spreadsheetId: mockSpreadsheetId,
        title: 'Test Spreadsheet',
        sheets: [
          {
            title: 'Sheet1',
            sheetId: 0,
            rowCount: 100,
            columnCount: 20
          },
          {
            title: 'Sheet2',
            sheetId: 1,
            rowCount: 50,
            columnCount: 10
          }
        ]
      });
    });

    it('handles API errors', async () => {
      // APIエラーをシミュレート
      mockSpreadsheetsGet.mockRejectedValueOnce(new Error('API Error'));

      await expect(client.getSpreadsheetInfo(mockSpreadsheetId))
        .rejects.toThrow('API Error');
    });
  });

  describe('getSheetValues', () => {
    beforeEach(() => {
      // getSpreadsheetInfoのモック
      vi.spyOn(client, 'getSpreadsheetInfo').mockImplementation(async () => ({
        spreadsheetId: mockSpreadsheetId,
        title: 'Test Spreadsheet',
        sheets: [
          { title: 'Sheet1', sheetId: 0, rowCount: 100, columnCount: 20 },
          { title: 'Sheet2', sheetId: 1, rowCount: 50, columnCount: 10 }
        ]
      }));
    });

    it('returns sheet values without range specified', async () => {
      setupMockResponse(mockSpreadsheetsValuesGet, {
        values: [
          ['Header1', 'Header2', 'Header3'],
          [1, 2, 3],
          [4, 5, 6]
        ]
      });

      const values = await client.getSheetValues(mockSpreadsheetId, 'Sheet1');

      expect(mockSpreadsheetsValuesGet).toHaveBeenCalledWith({
        spreadsheetId: mockSpreadsheetId,
        range: 'Sheet1'
      });

      expect(values).toEqual([
        ['Header1', 'Header2', 'Header3'],
        [1, 2, 3],
        [4, 5, 6]
      ]);
    });

    it('returns sheet values with range specified', async () => {
      setupMockResponse(mockSpreadsheetsValuesGet, {
        values: [
          ['A1', 'B1'],
          ['A2', 'B2']
        ]
      });

      const values = await client.getSheetValues(mockSpreadsheetId, 'Sheet1', 'A1:B2');

      expect(mockSpreadsheetsValuesGet).toHaveBeenCalledWith({
        spreadsheetId: mockSpreadsheetId,
        range: 'Sheet1!A1:B2'
      });

      expect(values).toEqual([
        ['A1', 'B1'],
        ['A2', 'B2']
      ]);
    });

    it('throws error for non-existent sheet', async () => {
      await expect(client.getSheetValues(mockSpreadsheetId, 'NonExistentSheet'))
        .rejects.toThrow('Sheet "NonExistentSheet" does not exist in this spreadsheet');
    });

    it('throws error for invalid A1 notation', async () => {
      await expect(client.getSheetValues(mockSpreadsheetId, 'Sheet1', 'Invalid:Range'))
        .rejects.toThrow('Invalid A1 notation range');
    });

    it('handles empty result', async () => {
      setupMockResponse(mockSpreadsheetsValuesGet, {
        values: []
      });

      const values = await client.getSheetValues(mockSpreadsheetId, 'Sheet1');
      expect(values).toEqual([]);
    });

    it('throws error when response size exceeds limit', async () => {
      // 大きなデータを生成
      const largeData = Array(500).fill("").map(() => Array(50).fill('X'.repeat(100)));
      setupMockResponse(mockSpreadsheetsValuesGet, {
        values: largeData
      });

      // MAX_RESPONSE_SIZEをモック
      const originalDescriptor = Object.getOwnPropertyDescriptor(
        SpreadsheetClient, 'MAX_RESPONSE_SIZE'
      );

      Object.defineProperty(SpreadsheetClient, 'MAX_RESPONSE_SIZE', {
        value: 100,
        configurable: true
      });

      try {
        await expect(client.getSheetValues(mockSpreadsheetId, 'Sheet1'))
          .rejects.toThrow('Response size');
      } finally {
        // 元の値に戻す
        if (originalDescriptor) {
          Object.defineProperty(SpreadsheetClient, 'MAX_RESPONSE_SIZE', originalDescriptor);
        }
      }
    });
  });
});
