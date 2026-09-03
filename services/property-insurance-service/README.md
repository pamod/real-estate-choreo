# Property Insurance Coverage Service

Backend REST API representing insurance coverage for real-estate properties: browsing
coverage plans, quoting and issuing policies, looking up a property's active coverage,
and filing/tracking claims.

## Files

- `openapi.yaml` — the API contract (import into WSO2 API Manager to create the REST API).
- `arazzo.yaml` — [Arazzo](https://spec.openapis.org/arazzo/latest.html) workflow document
  describing multi-step tool workflows for this API's MCP Server (see the top-level
  [services README](../README.md) for how these two files relate).
- `server.js` — a small in-memory mock backend implementing the contract, for demoing
  end to end without a real database.

## Run the mock backend

```bash
cd property-insurance-service
npm install
npm start
# listening on http://localhost:9092
```

Every request requires an `Authorization: Bearer <any-token>` header (the mock only
checks it's present — real authentication/authorization is enforced by the WSO2
gateway when the API is exposed through API Manager).

## Try it

```bash
# list coverage plans
curl -H "Authorization: Bearer demo" http://localhost:9092/coverage-plans

# quote coverage for a property
curl -X POST -H "Authorization: Bearer demo" -H "Content-Type: application/json" \
  -d '{"propertyId":"prop-1","propertyValue":250000,"propertyType":"HOUSE","coverageType":"ALL_RISK"}' \
  http://localhost:9092/quotes

# bind the policy (use the quote id returned above)
curl -X POST -H "Authorization: Bearer demo" -H "Content-Type: application/json" \
  -d '{"quoteId":"<quoteId>"}' \
  http://localhost:9092/policies

# file a claim against that policy
curl -X POST -H "Authorization: Bearer demo" -H "Content-Type: application/json" \
  -d '{"policyId":"<policyId>","incidentDate":"2026-08-01","incidentType":"FIRE","claimedAmount":5000}' \
  http://localhost:9092/claims
```

## Operations

| Operation            | Method & Path                              |
|-----------------------|----------------------------------------------|
| listCoveragePlans     | `GET /coverage-plans`                        |
| createQuote           | `POST /quotes`                               |
| getQuoteById          | `GET /quotes/{quoteId}`                      |
| createPolicy          | `POST /policies`                             |
| getPolicyById         | `GET /policies/{policyId}`                   |
| getPolicyByProperty   | `GET /properties/{propertyId}/policy`        |
| listClaimsForPolicy   | `GET /policies/{policyId}/claims`            |
| fileClaim             | `POST /claims`                               |
| getClaimById          | `GET /claims/{claimId}`                      |
| updateClaimStatus     | `PUT /claims/{claimId}`                      |

## MCP tools defined in `arazzo.yaml`

| Workflow ID                     | MCP tool name           | What it chains together                              |
|-----------------------------------|--------------------------|--------------------------------------------------------|
| `quote-to-policy-issuance`         | `get_property_insured`   | `createQuote` → `createPolicy`                          |
| `file-claim-for-property`          | `file_property_claim`    | `getPolicyByProperty` → `fileClaim`                     |
| `coverage-summary-for-property`    | `get_coverage_summary`   | `getPolicyByProperty` → `listClaimsForPolicy`           |
