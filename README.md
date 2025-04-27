# MCP Server for Google Spreadsheets

A Model Context Protocol (MCP) server implementation that integrates with Google Spreadsheets, allowing AI assistants to retrieve and modify spreadsheet data. This server enables Claude to interact with your Google Sheets data directly.

## Features

This server provides the following tools for working with Google Spreadsheets:

- **`get_sheets`**: Retrieve all sheet information from a Google Spreadsheet, including names, dimensions, and IDs
- **`get_sheet_values`**: Retrieve values from a specific sheet with optional range specification
- **`update_cells`**: Update values in a specific range of cells within a sheet
- **`batch_update_cells`**: Update multiple ranges across different sheets in a single operation
- **`add_sheet`**: Add a new sheet to an existing spreadsheet with customizable dimensions

## Prerequisites

- Node.js (v18 or higher)
- Google Cloud project with the Google Sheets API enabled
- Google Cloud authentication credentials
- Claude Desktop (for integration with Claude)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/mcp-server-spreadsheet.git
   cd mcp-server-spreadsheet
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

## Authentication Setup

This server uses Google Cloud's Application Default Credentials for authentication to access Google Sheets. You have two options for setting up authentication:

1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) if you haven't already
2. Log in and authorize access to Google Sheets:
   ```bash
   gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/spreadsheets
   ```

>[!Tip]
>- Ensure your Google Project's Sheet API is enabled.
>- Don't forget `--scopes` option for `gcloud auth application-default login`

## Building and Running

1. Build the project:
   ```bash
   pnpm build
   ```

2. Run the server:
   ```bash
   pnpm start
   ```

The server will start and listen for MCP commands via standard input/output.

## Integration with Claude for Desktop

To use this server with Claude for Desktop:

1. Make sure Claude for Desktop is installed and running

2. Add the server to Claude for Desktop's configuration file (`claude_desktop_config.json`):

   ```json
   {
     "mcpServers": {
       "spreadsheet": {
         "command": "node",
         "args": ["/absolute/path/to/mcp-server-spreadsheet/build/index.js"],
         "env": {
           "GOOGLE_APPLICATION_CREDENTIALS": "/absolute/path/to/your/credentials.json"
         }
       }
     }
   }
   ```

3. Restart Claude for Desktop to load the server

## Usage Examples

Once integrated with Claude, you can use natural language to work with your spreadsheets. Here are some example prompts:

### Retrieving Spreadsheet Information
```
Could you tell me what sheets are in this spreadsheet? https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
```

### Getting Data from a Sheet
```
Please show me the data from the "Sales" sheet in this spreadsheet: https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
```

### Updating Data
```
Update cells A1:B2 in the "Q1 Budget" sheet with these values: 
- Row 1: 1000, 2000
- Row 2: 3000, 4000
The spreadsheet URL is: https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
```

### Adding a New Sheet
```
Please add a new sheet called "Q2 Planning" to this spreadsheet: https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
```

## Available Tools

### get_sheets

Retrieves information about all sheets in a spreadsheet.

Parameters:
- `spreadsheetUrl`: URL or ID of the Google Spreadsheet

### get_sheet_values

Retrieves values from a specific sheet in a spreadsheet.

Parameters:
- `spreadsheetUrl`: URL or ID of the Google Spreadsheet
- `sheetName`: Name of the sheet to retrieve data from
- `range` (optional): Cell range in A1 notation (e.g., "A1:D5")

### update_cells

Updates values in a specific range of cells.

Parameters:
- `spreadsheetUrl`: URL or ID of the Google Spreadsheet
- `sheetName`: Name of the sheet to update
- `range`: Cell range in A1 notation (e.g., "A1:B2")
- `values`: 2D array of values to write (each inner array represents a row)

### batch_update_cells

Updates values in multiple ranges across different sheets in a single operation.

Parameters:
- `spreadsheetUrl`: URL or ID of the Google Spreadsheet
- `updates`: Array of update operations, each with:
  - `sheetName`: Name of the sheet to update
  - `range`: Cell range in A1 notation
  - `values`: 2D array of values to write

### add_sheet

Adds a new sheet to an existing spreadsheet.

Parameters:
- `spreadsheetUrl`: URL or ID of the Google Spreadsheet
- `sheetTitle`: Title for the new sheet
- `rowCount` (optional): Number of rows (default: 1000)
- `columnCount` (optional): Number of columns (default: 26)

## Development

### Project Structure

- `src/index.ts`: Main entry point
- `src/tools/`: Individual MCP tool implementations
- `src/utils/`: Utility functions and services
- `src/types/`: TypeScript type definitions

### Running Tests

```bash
pnpm test
```

### Environment Variables

You can create a `.env` file in the project root with the following variables:

```
# Optional: Override Google API credentials path
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Optional: Debug mode
DEBUG=true
```

## Troubleshooting

- **Authentication Errors**: Make sure you've set up the correct credentials and the Google Sheets API is enabled in your Google Cloud project.
- **Permission Errors**: Ensure your Google account or service account has access to the spreadsheets you're trying to access.
- **Server Connectivity**: Check that Claude for Desktop is correctly configured to start the MCP server.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
