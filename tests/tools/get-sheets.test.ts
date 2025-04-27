import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSheetsTool } from '../../src/tools/get-sheets';
import { SpreadsheetClient } from '../../src/utils/spreadsheet-client';
import { extractSpreadsheetId } from '../../src/utils/url-parser';

// url-parserのモック
vi.mock('../../src/utils/url-parser', () => ({
  extractSpreadsheetId: vi.fn()
}));

// SpreadsheetClientのモック
vi.mock('../../src/utils/spreadsheet-client', () => {
  return {
    SpreadsheetClient: vi.fn().mockImplementation(() => ({
      getSpreadsheetInfo: vi.fn()
    }))
  };
});

describe('GetSheetsTool', () => {
  let tool: GetSheetsTool;
  let mockClient: { getSpreadsheetInfo: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks();

    // テスト用のインスタンスを作成
    tool = new GetSheetsTool();
    mockClient = (tool as any).spreadsheetClient;
  });

  it('should initialize with correct properties', () => {
    expect(tool.name).toBe('get_sheets');
    expect(tool.description).toBeDefined();
    expect(tool.parameters).toBeDefined();
    expect(tool.parameters.spreadsheetUrl).toBeDefined();
  });

  it('should successfully retrieve and format spreadsheet info', async () => {
    // モックの準備
    const mockSpreadsheetId = '1abc123456';
    const mockSpreadsheetInfo = {
      spreadsheetId: mockSpreadsheetId,
      title: 'テストスプレッドシート',
      sheets: [
        { title: 'シート1', sheetId: 0, rowCount: 1000, columnCount: 26 },
        { title: 'シート2', sheetId: 123456, rowCount: 500, columnCount: 15 }
      ]
    };

    // モックの動作を設定
    (extractSpreadsheetId as any).mockReturnValue(mockSpreadsheetId);
    mockClient.getSpreadsheetInfo.mockResolvedValue(mockSpreadsheetInfo);

    // テスト実行
    const result = await tool.execute({ spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1abc123456/edit' });

    // 検証
    expect(extractSpreadsheetId).toHaveBeenCalledWith('https://docs.google.com/spreadsheets/d/1abc123456/edit');
    expect(mockClient.getSpreadsheetInfo).toHaveBeenCalledWith(mockSpreadsheetId);
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    // フォーマット結果を検証
    const expectedText = `Spreadsheet: テストスプレッドシート (ID: 1abc123456)

Total sheets: 2

Sheet 1: シート1
  - Rows: 1000
  - Columns: 26
  - Sheet ID: 0

Sheet 2: シート2
  - Rows: 500
  - Columns: 15
  - Sheet ID: 123456
`;

    expect(result.content[0].text).toBe(expectedText);
  });

  it('should handle errors during spreadsheet retrieval', async () => {
    // モックの準備
    const mockError = new Error('API error');
    (extractSpreadsheetId as any).mockImplementation(() => {
      throw mockError;
    });

    // テスト実行
    const result = await tool.execute({ spreadsheetUrl: 'invalid-url' });

    // エラーハンドリング検証
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('Error: API error');
  });
});