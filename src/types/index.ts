import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

/**
 * Utility type to extract type from Zod schema
 */
export type InferZodParams<T extends Record<string, z.ZodType>> = {
  [K in keyof T]: z.infer<T[K]>;
};

/**
 * MCP Tool interface definition
 */
export interface IMCPTool<
  TParams extends Record<string, z.ZodType> = Record<string, z.ZodType>,
> {
  /**
   * Tool name
   */
  readonly name: string;

  /**
   * Tool description
   */
  readonly description: string;

  /**
   * Parameter definitions
   */
  readonly parameters: TParams;

  /**
   * Execute the tool
   * @param args Parameters
   * @returns Execution result
   */
  execute(args: InferZodParams<TParams>): Promise<{
    content: TextContent[];
    isError?: boolean;
  }>;
}

/**
 * Spreadsheet information type definition
 */
export interface SheetInfo {
  title: string;
  sheetId: number;
  rowCount: number;
  columnCount: number;
}

/**
 * Overall spreadsheet information
 */
export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  sheets: SheetInfo[];
}
