import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetSheetsTool } from "../../src/tools/get-sheets";
import type { SpreadsheetClient } from "../../src/utils/spreadsheet-client";
import { extractSpreadsheetId } from "../../src/utils/url-parser";

// Mock for url-parser
vi.mock("../../src/utils/url-parser", () => ({
  extractSpreadsheetId: vi.fn(),
}));

// Mock for SpreadsheetClient
vi.mock("../../src/utils/spreadsheet-client", () => {
  return {
    SpreadsheetClient: vi.fn(),
  };
});

describe("GetSheetsTool", () => {
  let tool: GetSheetsTool;
  let mockClient: SpreadsheetClient;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock spreadsheet client
    mockClient = {
      getSpreadsheetInfo: vi.fn(),
    } as unknown as SpreadsheetClient;

    // Create instance for testing with injected mock client
    tool = new GetSheetsTool(mockClient);
  });

  it("should initialize with correct properties", () => {
    expect(tool.name).toBe("get_sheets");
    expect(tool.description).toBeDefined();
    expect(tool.parameters).toBeDefined();
    expect(tool.parameters.spreadsheetUrl).toBeDefined();
  });

  it("should successfully retrieve and format spreadsheet info", async () => {
    // Prepare mocks
    const mockSpreadsheetId = "1abc123456";
    const mockSpreadsheetInfo = {
      spreadsheetId: mockSpreadsheetId,
      title: "Test Spreadsheet",
      sheets: [
        { title: "Sheet1", sheetId: 0, rowCount: 1000, columnCount: 26 },
        { title: "Sheet2", sheetId: 123456, rowCount: 500, columnCount: 15 },
      ],
    };

    // Configure mock behavior
    vi.mocked(extractSpreadsheetId).mockReturnValue(mockSpreadsheetId);
    vi.mocked(mockClient.getSpreadsheetInfo).mockResolvedValue(
      mockSpreadsheetInfo,
    );

    // Execute test
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
    });

    // Verify
    expect(extractSpreadsheetId).toHaveBeenCalledWith(
      "https://docs.google.com/spreadsheets/d/1abc123456/edit",
    );
    expect(mockClient.getSpreadsheetInfo).toHaveBeenCalledWith(
      mockSpreadsheetId,
    );
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");

    // Verify formatted result
    const expectedText = `Spreadsheet: Test Spreadsheet (ID: 1abc123456)

Total sheets: 2

Sheet 1: Sheet1
  - Rows: 1000
  - Columns: 26
  - Sheet ID: 0

Sheet 2: Sheet2
  - Rows: 500
  - Columns: 15
  - Sheet ID: 123456
`;

    expect(result.content[0].text).toBe(expectedText);
  });

  it("should handle errors during spreadsheet retrieval", async () => {
    // Prepare mocks
    const mockError = new Error("API error");
    vi.mocked(extractSpreadsheetId).mockImplementation(() => {
      throw mockError;
    });

    // Execute test
    const result = await tool.execute({ spreadsheetUrl: "invalid-url" });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe("Error: API error");
  });
});
