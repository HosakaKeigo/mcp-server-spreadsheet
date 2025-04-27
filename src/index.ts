import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "dotenv";
import { env } from "./env.js";
import { registerTools } from "./tools/index.js";

// Load environment variables
config();

/**
 * Main function
 */
async function main() {
  try {
    // Create MCP server instance
    const server = new McpServer({
      name: "spreadsheet-server",
      version: "0.0.1",
      capabilities: {
        tools: {},
      },
    });

    // Register tools
    registerTools(server);

    // Start server (communicate via standard I/O)
    const transport = new StdioServerTransport();
    console.error("Starting MCP Spreadsheet Server...");
    await server.connect(transport);
    console.error("MCP Spreadsheet Server connected");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

// Execute main function
main().catch(console.error);
