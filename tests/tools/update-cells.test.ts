import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdateCellsTool } from "../../src/tools/update-cells";
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

describe("UpdateCellsTool", () => {
  let tool: UpdateCellsTool;
  let mockClient: SpreadsheetClient;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock spreadsheet client
    mockClient = {
      updateCellValues: vi.fn(),
    } as unknown as SpreadsheetClient;

    // Create instance for testing with injected mock client
    tool = new UpdateCellsTool(mockClient);
  });

  it("should initialize with correct properties", () => {
    expect(tool.name).toBe("update_cells");
    expect(tool.description).toBeDefined();
    expect(tool.parameters).toBeDefined();
    expect(tool.parameters.spreadsheetUrl).toBeDefined();
    expect(tool.parameters.sheetName).toBeDefined();
    expect(tool.parameters.range).toBeDefined();
    expect(tool.parameters.values).toBeDefined();
  });

  it("should successfully update cells", async () => {
    // Prepare mocks
    const mockSpreadsheetId = "1abc123456";
    const mockSheetName = "Sheet1";
    const mockRange = "A1:B2";
    const mockValues = [
      ["Value1", "Value2"],
      ["Value3", "Value4"],
    ];
    const mockUpdateResult = {
      updatedCells: 4,
      updatedRows: 2,
    };

    // Configure mock behavior
    vi.mocked(extractSpreadsheetId).mockReturnValue(mockSpreadsheetId);
    vi.mocked(mockClient.updateCellValues).mockResolvedValue(mockUpdateResult);

    // Execute test
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      sheetName: mockSheetName,
      range: mockRange,
      values: mockValues,
    });

    // Verify
    expect(extractSpreadsheetId).toHaveBeenCalledWith(
      "https://docs.google.com/spreadsheets/d/1abc123456/edit",
    );
    expect(mockClient.updateCellValues).toHaveBeenCalledWith(
      mockSpreadsheetId,
      mockSheetName,
      mockRange,
      mockValues,
    );
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Successfully updated 4 cells");
    expect(result.content[0].text).toContain("across 2 rows");
  });

  it("should handle empty array in values parameter", async () => {
    // Prepare mocks for the specified case
    const mockSpreadsheetId = "1Ni68iZrkFO0jL_3BmcPQ22_pJo3pPnqc6Ac9VbdF7oo";
    const mockSheetName = "月次売上データ";
    const mockRange = "A25:A25";
    const mockValues = [[""]]; // Empty string instead of empty array

    const mockUpdateResult = {
      updatedCells: 1,
      updatedRows: 1,
    };

    // Configure mock behavior
    vi.mocked(extractSpreadsheetId).mockReturnValue(mockSpreadsheetId);
    vi.mocked(mockClient.updateCellValues).mockResolvedValue(mockUpdateResult);

    // Execute test
    const result = await tool.execute({
      spreadsheetUrl:
        "https://docs.google.com/spreadsheets/d/1Ni68iZrkFO0jL_3BmcPQ22_pJo3pPnqc6Ac9VbdF7oo",
      sheetName: mockSheetName,
      range: mockRange,
      values: mockValues,
    });

    // Verify
    expect(extractSpreadsheetId).toHaveBeenCalledWith(
      "https://docs.google.com/spreadsheets/d/1Ni68iZrkFO0jL_3BmcPQ22_pJo3pPnqc6Ac9VbdF7oo",
    );
    expect(mockClient.updateCellValues).toHaveBeenCalledWith(
      mockSpreadsheetId,
      mockSheetName,
      mockRange,
      mockValues,
    );
    expect(result.isError).toBeUndefined();
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Successfully updated 1 cells");
    expect(result.content[0].text).toContain(`in sheet "${mockSheetName}"`);
  });

  it("should reject empty arrays within values", async () => {
    // Execute test with empty inner array
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      sheetName: "Sheet1",
      range: "A1:B2",
      values: [[]],
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error:");
  });

  it("should handle non-array values error", async () => {
    // Execute test with invalid values (not a 2D array)
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      sheetName: "Sheet1",
      range: "A1:B2",
      values: "not an array" as any,
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      "Error: Values must be a non-empty 2D array",
    );
  });

  it("should handle empty values array error", async () => {
    // Execute test with empty values array
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      sheetName: "Sheet1",
      range: "A1:B2",
      values: [],
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      "Error: Values must be a non-empty 2D array",
    );
  });

  it("should handle row not being an array error", async () => {
    // Execute test with invalid row (not an array)
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      sheetName: "Sheet1",
      range: "A1:B2",
      values: [["Value1"], "not an array" as any],
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      "Error: Each row in values must be a non-empty array",
    );
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
      sheetName: "Sheet1",
      range: "A1:B2",
      values: [["Value1"]],
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: Invalid spreadsheet URL");
  });

  it("should handle API errors when updating cells", async () => {
    // Prepare mocks
    const mockSpreadsheetId = "1abc123456";
    const mockError = new Error("API error occurred");

    vi.mocked(extractSpreadsheetId).mockReturnValue(mockSpreadsheetId);
    vi.mocked(mockClient.updateCellValues).mockRejectedValue(mockError);

    // Execute test
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      sheetName: "Sheet1",
      range: "A1:B2",
      values: [["Value1"]],
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: API error occurred");
  });
});
