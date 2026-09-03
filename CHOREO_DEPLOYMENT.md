# Deploying to Choreo

This repo has four independently deployable, Docker-based components. Each has a
`.choreo/component.yaml` at the root of its Docker build context, so Choreo can
pick up its endpoint config automatically when you create the component.

| Component | Build context (repo subpath) | Port | Language |
|---|---|---|---|
| `property-listing-service` | `services/property-listing-service` | 9091 | Node/Express |
| `property-insurance-service` | `services/property-insurance-service` | 9092 | Node/Express |
| `property-listing-mcp` | `mcp/property-listing-mcp/artifacts` | 5001 | Python (FastMCP) |
| `property-insurance-mcp` | `mcp/property-insurance-mcp/artifacts` | 5000 | Python (FastMCP) |

All four Dockerfiles now run as a non-root user (`USER 10001`), which Choreo
requires for a container build to pass its security scan.

## 1. Push this repo to GitHub (or GitLab/Bitbucket)

Choreo builds from a connected git repository. This directory has been
initialized as a git repo locally with an initial commit — create a remote
and push it, then connect that repo when creating the Choreo project/components.

## 2. Create the two backend services first

For each of `property-listing-service` and `property-insurance-service`:
- New Component → Service → Dockerfile build preset.
- Point it at the repo subpath in the table above.
- Choreo will pick up `.choreo/component.yaml` for the port/endpoint and
  `openapi.yaml` for the schema.
- Deploy it, then note its Choreo-assigned invoke URL (Project or
  Organization visibility is enough — the MCP servers only need to reach it
  from inside Choreo).

## 3. Create the two MCP server components

For each of `property-listing-mcp` and `property-insurance-mcp`:
- New Component → Service → Dockerfile build preset, pointed at its
  `mcp/*/artifacts` subpath.
- These are custom HTTP-transport MCP servers (FastMCP `streamable-http`), not
  stdio/npx ones, so they're deployed as a plain Docker Service component
  rather than through Choreo's "MCP Server" package-registry wizard.
- On deploy, the Console will prompt for the env vars declared in
  `component.yaml`:
  - `LISTING_SERVICE_BASE_URL` / `INSURANCE_SERVICE_BASE_URL` — set this to
    the matching backend service's invoke URL from step 2 (or wire it up as a
    proper Choreo Connection between the two components and bind the env var
    to the connection's `ServiceURL` instead of a literal).
  - `PROPERTY_BEARERAUTH_TOKEN` — any non-empty string. The mock backends only
    check that an `Authorization` header is present, they don't validate the
    token.

Without `*_SERVICE_BASE_URL` set, the MCP server falls back to the
docker-compose hostname baked into its bundled `openapi.yaml`
(`property-listing-service:9091` / `property-insurance-service:9092`), which
won't resolve on Choreo — every tool call will fail. This was verified locally:
running the MCP workflow against the live listing service with
`LISTING_SERVICE_BASE_URL` and `PROPERTY_BEARERAUTH_TOKEN` set completes
end-to-end; the override is applied in `mcp_server.py` right after the Arazzo
runner loads.

## 4. Smoke test

Once both MCP components are up, connect an MCP client (or Choreo's built-in
tester) to each component's invoke URL and run one workflow tool end to end,
e.g. `search-and-get-property-details` or `quote-to-policy-issuance` — see
[`services/README.md`](services/README.md) for the full tool list.

## Not covered here

Wiring these up to WSO2 API Manager / the AI Gateway as MCP Servers (per
[`services/README.md`](services/README.md)) is a separate, API-Manager-side
step and isn't part of this Choreo component deployment.
