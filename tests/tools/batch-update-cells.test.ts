import { describe, it, expect, vi, beforeEach } from "vitest";
import { BatchUpdateCellsTool } from "../../src/tools/batch-update-cells";
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

describe("BatchUpdateCellsTool", () => {
  let tool: BatchUpdateCellsTool;
  let mockClient: SpreadsheetClient;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock spreadsheet client
    mockClient = {
      batchUpdateCellValues: vi.fn(),
    } as unknown as SpreadsheetClient;

    // Create instance for testing with injected mock client
    tool = new BatchUpdateCellsTool(mockClient);
  });

  it("should initialize with correct properties", () => {
    expect(tool.name).toBe("batch_update_cells");
    expect(tool.description).toBeDefined();
    expect(tool.parameters).toBeDefined();
    expect(tool.parameters.spreadsheetUrl).toBeDefined();
    expect(tool.parameters.updates).toBeDefined();
  });

  it("should successfully batch update cells", async () => {
    // Prepare mocks
    const mockSpreadsheetId = "1abc123456";
    const mockUpdates = [
      {
        sheetName: "Sheet1",
        range: "A1:B2",
        values: [
          ["Value1", "Value2"],
          ["Value3", "Value4"],
        ],
      },
      {
        sheetName: "Sheet2",
        range: "C3:D4",
        values: [
          ["Value5", "Value6"],
          ["Value7", "Value8"],
        ],
      },
    ];
    const mockUpdateResult = {
      totalUpdatedCells: 8,
      totalUpdatedRows: 4,
      totalUpdatedColumns: 4, // Add missing property
    };

    // Configure mock behavior
    vi.mocked(extractSpreadsheetId).mockReturnValue(mockSpreadsheetId);
    vi.mocked(mockClient.batchUpdateCellValues).mockResolvedValue(
      mockUpdateResult,
    );

    // Execute test
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      updates: mockUpdates,
    });

    // Verify
    expect(extractSpreadsheetId).toHaveBeenCalledWith(
      "https://docs.google.com/spreadsheets/d/1abc123456/edit",
    );
    expect(mockClient.batchUpdateCellValues).toHaveBeenCalledWith(
      mockSpreadsheetId,
      mockUpdates,
    );
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Successfully updated 8 cells");
    expect(result.content[0].text).toContain("across 4 rows");
  });

  it("should successfully process updates with empty strings", async () => {
    // Prepare mocks
    const mockSpreadsheetId = "1Ni68iZrkFO0jL_3BmcPQ22_pJo3pPnqc6Ac9VbdF7oo";
    const mockUpdates = [
      {
        sheetName: "月次売上データ",
        range: "A25:A25",
        values: [[""]], // Empty string value
      },
      {
        sheetName: "集計シート",
        range: "B10:C10",
        values: [["", "0"]], // Another with empty string
      },
    ];
    const mockUpdateResult = {
      totalUpdatedCells: 3,
      totalUpdatedRows: 2,
      totalUpdatedColumns: 2,
    };

    // Configure mock behavior
    vi.mocked(extractSpreadsheetId).mockReturnValue(mockSpreadsheetId);
    vi.mocked(mockClient.batchUpdateCellValues).mockResolvedValue(
      mockUpdateResult,
    );

    // Execute test
    const result = await tool.execute({
      spreadsheetUrl:
        "https://docs.google.com/spreadsheets/d/1Ni68iZrkFO0jL_3BmcPQ22_pJo3pPnqc6Ac9VbdF7oo",
      updates: mockUpdates,
    });

    // Verify
    expect(mockClient.batchUpdateCellValues).toHaveBeenCalledWith(
      mockSpreadsheetId,
      mockUpdates,
    );
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Successfully updated 3 cells");
  });

  it("should handle empty updates array error", async () => {
    // Execute test with empty updates array
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      updates: [],
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      "Error: Updates must be a non-empty array",
    );
  });

  it("should reject empty arrays within values", async () => {
    // Execute test with empty inner array
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      updates: [
        {
          sheetName: "Sheet1",
          range: "A1:B2",
          values: [[]], // Empty row array
        },
      ],
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      "Error: Each row for range A1:B2 must be a non-empty array",
    );
  });

  it("should handle non-array values error", async () => {
    // Execute test with invalid values (not a 2D array)
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      updates: [
        {
          sheetName: "Sheet1",
          range: "A1:B2",
          values: "not an array" as any,
        },
      ],
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      "Values for range A1:B2 must be a non-empty 2D array",
    );
  });

  it("should handle row not being an array error", async () => {
    // Execute test with invalid row (not an array)
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      updates: [
        {
          sheetName: "Sheet1",
          range: "A1:B2",
          values: [["Value1"], "not an array" as any],
        },
      ],
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(
      "Each row for range A1:B2 must be an array",
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
      updates: [
        {
          sheetName: "Sheet1",
          range: "A1:B2",
          values: [["Value1"]],
        },
      ],
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: Invalid spreadsheet URL");
  });

  it("should handle API errors when batch updating cells", async () => {
    // Prepare mocks
    const mockSpreadsheetId = "1abc123456";
    const mockError = new Error("API error occurred");

    vi.mocked(extractSpreadsheetId).mockReturnValue(mockSpreadsheetId);
    vi.mocked(mockClient.batchUpdateCellValues).mockRejectedValue(mockError);

    // Execute test
    const result = await tool.execute({
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1abc123456/edit",
      updates: [
        {
          sheetName: "Sheet1",
          range: "A1:B2",
          values: [["Value1"]],
        },
      ],
    });

    // Verify error handling
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error: API error occurred");
  });
});
