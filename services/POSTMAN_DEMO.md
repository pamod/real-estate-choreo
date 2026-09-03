# Demoing the downstream services with Postman

Each mock backend (`property-listing-service`, `property-insurance-service`) ships a
ready-to-run Postman collection (`postman_collection.json`) generated from its
`openapi.yaml`. Use these to demo or smoke-test the raw REST APIs directly — no WSO2
API Manager, MCP Server, or gateway required. That layer is a separate, later demo step
(see the [services README](README.md)); this one is just "does the backend work".

## What's in each collection

| | `property-listing-service` | `property-insurance-service` |
|---|---|---|
| Base URL variable | `baseUrl` → `http://localhost:9091` | `baseUrl` → `http://localhost:9092` |
| Folders | `properties` | `coverage`, `quotes`, `policies`, `claims` |
| Requests | 7 | 10 |

Every request carries collection-level **Bearer auth** using a `{{bearerToken}}`
variable. The mock backends only check that an `Authorization` header is present —
they don't validate the token — so any non-empty value works. Both collections default
it to `demo-token-12345`.

Requests that create something (`Add a new property`, `Request a coverage quote`,
`Issue a policy`, `File a claim`) have a **test script** that reads the `id` out of the
`201` response and saves it into a collection variable (`propertyId`, `quoteId`,
`policyId`, `claimId`). Every later request in that collection already references
`{{propertyId}}` / `{{quoteId}}` / etc. in its path or body — so running requests
top-to-bottom chains real data through automatically, no manual copy-pasting of IDs.

## 1. Start the backends

```bash
cd property-listing-service && npm install && npm start &   # http://localhost:9091
cd property-insurance-service && npm install && npm start &  # http://localhost:9092
```

## 2. Import into Postman

Postman → **Import** → select both files:

- `property-listing-service/postman_collection.json`
- `property-insurance-service/postman_collection.json`

No environment file is needed — each collection carries its own variables (visible/
editable under the collection's **Variables** tab).

## 3. Demo script

### Property Listing Service — run the `properties` folder top to bottom

| # | Request | What it shows |
|---|---------|----------------|
| 1 | Search property listings | Filtered search (city, type, price range, bedrooms) over `ACTIVE` listings |
| 2 | List all available property listings | Same filters as search, always scoped to `ACTIVE` listings via `/properties/available` |
| 3 | Add a new property to the listing catalog | Creates a `DRAFT` listing; test script captures `propertyId` |
| 4 | Get property details | Fetches the just-created property by `{{propertyId}}` |
| 5 | Update a property listing | Edits price/description on the same property |
| 6 | Publish a draft listing | Flips `DRAFT` → `ACTIVE` so it would now appear in search |
| 7 | Remove a property listing | Delists it (`204 No Content`) — run this last, it's terminal |

### Property Insurance Coverage Service — run folder by folder

| # | Request | What it shows |
|---|---------|----------------|
| 1 | List available coverage plans | Static catalog (`FIRE`, `FLOOD`, `ALL_RISK`, `LIABILITY`, `THEFT`) |
| 2 | Request a coverage quote for a property | Prices a premium; test script captures `quoteId` |
| 3 | Get quote details | Fetches that quote by `{{quoteId}}` |
| 4 | Issue a policy from an accepted quote | Binds the quote into an active policy; captures `policyId` |
| 5 | Get policy/coverage details | Fetches the policy by `{{policyId}}` |
| 6 | Get the active coverage for a property | Resolves coverage by `{{propertyId}}` instead of policy id |
| 7 | List claims filed against a policy | Empty at this point — run before filing a claim to show the baseline |
| 8 | File a claim against a policy | Files a fire-damage claim; captures `claimId` |
| 9 | Get claim status and details | Fetches the claim by `{{claimId}}` — status `SUBMITTED` |
| 10 | Update a claim's status (adjuster action) | Moves it to `APPROVED` with an adjuster note and payout amount |

### Tying the two services together

The insurance collection's `propertyId` defaults to a standalone mock value
(`prop-demo-001`) so it works on its own. To demo them as one story (list a property,
then insure it):

1. Run the listing collection's **Add a new property** request and note the
   `propertyId` it captures (visible in the Postman console / the collection variable).
2. Paste that value into the insurance collection's `propertyId` variable.
3. Run the insurance collection from **Request a coverage quote** onward — it now
   quotes/insures the exact property just created in the other service.

## 4. Running headlessly (CLI / CI)

Each collection is a self-contained runner, no environment file needed:

```bash
npx newman run property-listing-service/postman_collection.json
npx newman run property-insurance-service/postman_collection.json
```

Useful for a quick pre-demo smoke test, or wiring into CI to catch a broken mock
backend before someone hits it live.

## Troubleshooting

- **`ECONNREFUSED`** — the mock backend for that collection isn't running (step 1).
- **`404` on a "Get"/"Update" request** — the create step before it either didn't run
  in this session or failed, so the id variable is still empty/stale. Re-run the
  create request first.
- **Restarting a backend clears its in-memory data** — ids captured before a restart
  no longer resolve; re-run the relevant create request to get fresh ones.
