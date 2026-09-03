# Real-Estate Demo Services

Two independent backend services for a real-estate web site, each with an OpenAPI
contract, a runnable mock backend, and an Arazzo document describing the MCP tools
its MCP Server exposes.

- [`property-listing-service/`](property-listing-service/) — search, view, add, update,
  publish and remove property listings.
- [`property-insurance-service/`](property-insurance-service/) — coverage plans, quotes,
  policies and claims for insured properties.

## How an MCP Server is described via Arazzo

WSO2 API Manager can turn any REST API into an **MCP Server**, where each API operation
becomes an individual MCP **tool** (see `wso2_mcp_server_management_guidelines.yaml` under
`bin/wso2am-4.7.0/repository/resources/governance/default-rulesets/` — the governance
ruleset that validates an MCP Server's name, context, and per-operation `feature: TOOL`
tagging). That one-tool-per-operation mapping is fine for simple lookups, but most
real agent tasks ("add this property and publish it", "insure this property and hand
me a policy number") need several REST calls chained together with data flowing from
one response into the next request.

That's what the `arazzo.yaml` file in each service directory is for. The
[Arazzo Specification](https://spec.openapis.org/arazzo/latest.html) (from the OpenAPI
Initiative — the same tooling shipped in the API Manager Publisher UI, backed by the
`@stoplight/spectral-rulesets` `arazzo1_0` format) describes a `workflow` as an ordered
list of `steps`, where each step:

- references an `operationId` from the API's `sourceDescriptions` (here, the service's
  own `openapi.yaml`),
- can pass `parameters` / `requestBody` values built from `$inputs.*` (the workflow's own
  inputs) or `$steps.<stepId>.outputs.*` (a prior step's captured output),
- declares `successCriteria` (e.g. `$statusCode == 201`) so the runtime knows whether to
  continue, and
- captures `outputs` via JSON-pointer runtime expressions into the response body.

When such an Arazzo document is attached to an API's MCP Server in API Manager, each
`workflowId` is published as one composite MCP tool — the agent calls it once, and the
gateway/runtime executes the whole step sequence server-side. For example:

| Service    | Arazzo workflow                  | MCP tool               | Steps chained |
|------------|-----------------------------------|-------------------------|---------------|
| Listing    | `add-and-publish-listing`         | `add_property_listing`  | create (DRAFT) → publish (ACTIVE) |
| Listing    | `search-and-get-property-details` | `find_property`         | search → get full details of top match |
| Insurance  | `quote-to-policy-issuance`        | `get_property_insured`  | quote premium → bind policy |
| Insurance  | `file-claim-for-property`         | `file_property_claim`   | resolve active policy → submit claim |

Full workflow lists are in each service's own README.

The MCP-specific gateway policies bundled in this project's AI Gateway
(`project/RealEstate/wso2apip-ai-gateway-1.1.0/build.yaml`: `mcp-auth`, `mcp-authz`,
`mcp-acl-list`, `mcp-rewrite`) are what enforce authN/authZ and tool-name rewriting once
these MCP Servers are deployed — the mock backends here only check that an
`Authorization` header is present, since real enforcement happens at the gateway.

## Demoing the raw backends first

Before wiring these APIs up to API Manager, it's worth demoing them standalone: each
service directory has a ready-made Postman collection (`postman_collection.json`) with
mock data and auto-chained IDs so you can add a property, quote and issue a policy on
it, and file a claim, without touching a gateway. See
[`POSTMAN_DEMO.md`](POSTMAN_DEMO.md) for the walkthrough.

## Demo flow (suggested)

1. Start both mock backends (`npm install && npm start` in each service directory).
2. Import each `openapi.yaml` into WSO2 API Manager as a REST API (or via `apictl`).
3. Create an MCP Server from each API in the Publisher.
4. Attach the matching `arazzo.yaml` to layer the composite workflow tools on top of the
   per-operation tools.
5. Connect an MCP client (or the Publisher's built-in tester) and invoke a workflow tool
   end to end, e.g. `add_property_listing` or `get_property_insured`.
