arazzo-mcp-gen visualize -d . #validates the ararro spec
#arazzo-mcp-gen mcp-server generate -d . -p 5001 -o ./artifacts
docker build -t property-listing-mcp-workflows-mcp-server:latest ./artifacts #creates MCP server from arazzo spec
docker run -p 5001:5001 property-listing-mcp-workflows-mcp-server:latest #runs the MCP server
