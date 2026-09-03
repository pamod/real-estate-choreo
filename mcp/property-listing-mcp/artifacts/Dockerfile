FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
RUN pip install --no-cache-dir fastmcp arazzo-runner

# Copy the Arazzo spec files and OpenAPI spec files
COPY arazzo/ ./arazzo/

# Copy the generated MCP server
COPY mcp_server.py .

EXPOSE 5001

USER 10001

CMD ["python", "mcp_server.py"]
