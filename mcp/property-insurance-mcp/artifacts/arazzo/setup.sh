arazzo-mcp-gen visualize -d . #validates the ararro spec
arazzo-mcp-gen mcp-server generate -d . -p 5000 -o ./artifacts #generates MCP server
docker run -p 5000:5000 property-insurance-mcp-workflows-mcp-server:latest #runs the MCP server
