# MCP Server for Google Spreadsheets

Google Spreadsheetsと連携するMCPサーバーです。指定されたスプレッドシートの情報を取得できます。

## 機能

- `get_sheets`: Googleスプレッドシートの全シート情報を取得

## セットアップ

1. 依存パッケージをインストール:
   ```
   pnpm install
   ```

2. 認証の設定:
   - Google CloudのApplication Default Credentialsを使用して認証を行います。

```
$gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/spreadsheets
```

3. プロジェクトをビルド:
   ```
   pnpm build
   ```

4. サーバーを実行:
   ```
   pnpm start
   ```

## Claude for Desktopでの使用方法

1. Claude for Desktopの設定ファイル(`claude_desktop_config.json`)にサーバーを追加:
   ```json
   {
     "mcpServers": {
       "spreadsheet": {
         "command": "node",
         "args": ["/absolute/path/to/mcp-server-spreadsheet/build/index.js"]
       }
     }
   }
   ```

2. Claude for Desktopを再起動してサーバーをロード

3. スプレッドシートのURLを指定して`get_sheets`ツールを使用可能