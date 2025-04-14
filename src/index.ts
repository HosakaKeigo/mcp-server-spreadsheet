import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "dotenv";
import { registerTools } from "./tools/index.js";
import { env } from "./env.js";

// 環境変数をロード
config();

/**
 * メイン関数
 */
async function main() {
  try {
    // MCPサーバーのインスタンスを作成
    const server = new McpServer({
      name: "spreadsheet-server",
      version: "0.0.1",
      capabilities: {
        tools: {}, // ツール機能を有効化
      },
    });

    // ツールを登録
    registerTools(server);

    // サーバー起動（標準入出力で通信）
    const transport = new StdioServerTransport();
    console.error("Starting MCP Spreadsheet Server...");
    await server.connect(transport);
    console.error("MCP Spreadsheet Server connected");
    console.error("GCP Project ID:", env.GOOGLE_PROJECT_ID);
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

// メイン関数を実行
main().catch(console.error);
