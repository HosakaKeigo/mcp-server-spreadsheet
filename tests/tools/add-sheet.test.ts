import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddSheetTool } from "../../src/tools/add-sheet";
import { extractSpreadsheetId } from "../../src/utils/url-parser";
import type { SpreadsheetClient } from "../../src/utils/spreadsheet-client";

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

describe("AddSheetTool", () => {
  let tool: AddSheetTool;
  let mockClient: SpreadsheetClient;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock spreadsheet client
    mockClient = {
      addSheet: vi.fn(),
    } as unknown as SpreadsheetClient;

    // Create instance for testing with injected mock client
    tool = new AddSheetTool(mockClient);
  });

  it("should initialize with correct properties", () => {
    expect(tool.name).toBe("add_sheet");
    expect(tool.description).toBeDefined();
    expect(tool.parameters).toBeDefined();
    expect(tool.parameters.spreadsheetUrl).toBeDefined();
    expect(tool.parameters.sheetTitle).toBeDefined();
    expect(tool.parameters.rowCount).toBeDefined();
    expect(tool.parameters.columnCount).toBeDefined();
  });

  it("should successfully add a sheet with default options", async () => {
    // Prepare mocks
    const mockSpreadsheetId = "1abc123456";
    const mockSheetTitle = "New Test Sheet";
    const mockNewSheet = {
      title: mockSheetTitle,
      sheetId: 987654,
      rowCount: 1000,
      columnCount: 26,
    };

    // Configure mock behavior
    vi.mocked(extractSpreadsheetId).mockReturnValue(mockSpreadsheetId);
    vi.mocked(mockClient.addSheet).mockResolvedValue(mockNewSheet);

    // Execute test
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      sheetTitle: mockSheetTitle,
    });

    // Verify
    expect(extractSpreadsheetId).toHaveBeenCalledWith(
      "https://docs.google.com/spreadsheets/d/1abc123456/edit",
    );
    expect(mockClient.addSheet).toHaveBeenCalledWith(
      mockSpreadsheetId,
      mockSheetTitle,
      { rowCount: undefined, columnCount: undefined },
    );
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");

    // Verify result message
    const expectedText = `Successfully added new sheet "New Test Sheet" to the spreadsheet.

Sheet details:
- Sheet ID: 987654
- Rows: 1000
- Columns: 26`;

    expect(result.content[0].text).toBe(expectedText);
  });

  it("should successfully add a sheet with custom row and column counts", async () => {
    // Prepare mocks
    const mockSpreadsheetId = "1abc123456";
    const mockSheetTitle = "Custom Size Sheet";
    const mockNewSheet = {
      title: mockSheetTitle,
      sheetId: 123789,
      rowCount: 500,
      columnCount: 15,
    };

    // Configure mock behavior
    vi.mocked(extractSpreadsheetId).mockReturnValue(mockSpreadsheetId);
    vi.mocked(mockClient.addSheet).mockResolvedValue(mockNewSheet);

    // Execute test
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      sheetTitle: mockSheetTitle,
      rowCount: 500,
      columnCount: 15,
    });

    // Verify
    expect(mockClient.addSheet).toHaveBeenCalledWith(
      mockSpreadsheetId,
      mockSheetTitle,
      { rowCount: 500, columnCount: 15 },
    );
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Rows: 500");
    expect(result.content[0].text).toContain("Columns: 15");
  });

  it("should handle empty sheet title error", async () => {
    // Execute test
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      sheetTitle: "",
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe("Error: Sheet title cannot be empty");
  });

  it("should handle spreadsheet ID extraction error", async () => {
    // Prepare mocks
    const mockError = new Error("Invalid spreadsheet URL");
    vi.mocked(extractSpreadsheetId).mockImplementation(() => {
      throw mockError;
    });

    // Execute test
    const result = await tool.execute({
      spreadsheetUrl: "invalid-url",
      sheetTitle: "Test Sheet",
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: Invalid spreadsheet URL");
  });

  it("should handle API errors when adding a sheet", async () => {
    // Prepare mocks
    const mockSpreadsheetId = "1abc123456";
    const mockError = new Error("Sheet with this name already exists");
    vi.mocked(extractSpreadsheetId).mockReturnValue(mockSpreadsheetId);
    vi.mocked(mockClient.addSheet).mockRejectedValue(mockError);

    // Execute test
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      sheetTitle: "Existing Sheet",
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      "Error: Sheet with this name already exists",
    );
  });
});
