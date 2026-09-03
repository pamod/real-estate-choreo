arazzo-mcp-gen visualize -d . #validates the ararro spec
#arazzo-mcp-gen mcp-server generate -d . -p 5000 -o ./artifacts
docker build -t property-insurance-mcp-workflows-mcp-server:latest ./artifacts #creates MCP server from arazzo spec
docker run -p 5000:5000 property-insurance-mcp-workflows-mcp-server:latest #runs the MCP server
