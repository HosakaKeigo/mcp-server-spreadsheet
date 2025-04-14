import { describe, it, expect } from 'vitest';
import { extractSpreadsheetId } from '../../src/utils/url-parser.js';

describe('extractSpreadsheetId', () => {
  it('extracts ID from standard spreadsheet URL', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1234567890abcdefghijklmnopqrstuvwxyz/edit';
    const id = extractSpreadsheetId(url);
    expect(id).toBe('1234567890abcdefghijklmnopqrstuvwxyz');
  });

  it('extracts ID from URL with query parameters', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1234567890abcdefg/edit?usp=sharing';
    const id = extractSpreadsheetId(url);
    expect(id).toBe('1234567890abcdefg');
  });

  it('extracts ID from short URL without edit path', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1234567890abcdefg';
    const id = extractSpreadsheetId(url);
    expect(id).toBe('1234567890abcdefg');
  });

  it('accepts already extracted ID', () => {
    const id = '1234567890abcdefg';
    const extractedId = extractSpreadsheetId(id);
    expect(extractedId).toBe(id);
  });

  it('throws error for invalid URL', () => {
    const url = 'https://example.com/invalid-url';
    expect(() => extractSpreadsheetId(url)).toThrow('Invalid Google Spreadsheet URL or ID');
  });
});
