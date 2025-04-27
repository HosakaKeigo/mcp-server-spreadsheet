/**
 * Extract spreadsheet ID from a Google Spreadsheet URL
 *
 * @param url Google Spreadsheet URL
 * @returns Spreadsheet ID
 * @throws Error if URL is not a valid Google Spreadsheet
 */
export function extractSpreadsheetId(url: string): string {
  // Check if URL matches the regular expression
  const patterns = [
    // Normal URL format: https://docs.google.com/spreadsheets/d/{spreadsheetId}/edit
    /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)(?:\/|$|\?)/,
    // Shortened URL format: https://docs.google.com/spreadsheets/d/{spreadsheetId}
    /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    // If already just a spreadsheet ID
    /^([a-zA-Z0-9-_]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  throw new Error("Invalid Google Spreadsheet URL or ID");
}
