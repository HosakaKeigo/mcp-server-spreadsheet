/**
 * GoogleスプレッドシートのURLからスプレッドシートIDを抽出する
 * 
 * @param url スプレッドシートのURL
 * @returns スプレッドシートID
 * @throws URLがGoogleスプレッドシートではない場合はエラー
 */
export function extractSpreadsheetId(url: string): string {
  // URLが正規表現にマッチするか確認
  const patterns = [
    // 通常のURLフォーマット: https://docs.google.com/spreadsheets/d/{spreadsheetId}/edit
    /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)(?:\/|$|\?)/,
    // 短縮URLフォーマット: https://docs.google.com/spreadsheets/d/{spreadsheetId}
    /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    // すでにスプレッドシートIDのみの場合
    /^([a-zA-Z0-9-_]+)$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  throw new Error('Invalid Google Spreadsheet URL or ID');
}