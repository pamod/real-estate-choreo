# Property Listing Service

Backend REST API for a real-estate site's listing catalog: search properties, get
property details, add/update/publish/remove listings.

## Files

- `openapi.yaml` — the API contract (import into WSO2 API Manager to create the REST API).
- `arazzo.yaml` — [Arazzo](https://spec.openapis.org/arazzo/latest.html) workflow document
  describing multi-step tool workflows for this API's MCP Server (see the top-level
  [services README](../README.md) for how these two files relate).
- `server.js` — a small in-memory mock backend implementing the contract, for demoing
  end to end without a real database.

## Run the mock backend

```bash
cd property-listing-service
npm install
npm start
# listening on http://localhost:9091
```

Every request requires an `Authorization: Bearer <any-token>` header (the mock only
checks it's present — real authentication/authorization is enforced by the WSO2
gateway when the API is exposed through API Manager).

## Try it

```bash
# search active listings
curl -H "Authorization: Bearer demo" "http://localhost:9091/properties?city=Nairobi"

# add a new (draft) listing
curl -X POST -H "Authorization: Bearer demo" -H "Content-Type: application/json" \
  -d '{
    "title": "Lakefront Cottage",
    "propertyType": "HOUSE",
    "listingType": "SALE",
    "price": {"amount": 180000, "currency": "USD"},
    "address": {"line1": "3 Lake Rd", "city": "Kisumu", "country": "Kenya"},
    "agentId": "agent-100"
  }' \
  http://localhost:9091/properties

# publish it (use the id returned above)
curl -X POST -H "Authorization: Bearer demo" http://localhost:9091/properties/<id>/publish
```

## Operations

| Operation              | Method & Path                       |
|------------------------|--------------------------------------|
| listProperties         | `GET /properties`                    |
| listAvailableProperties| `GET /properties/available`          |
| addProperty            | `POST /properties`                   |
| getPropertyById        | `GET /properties/{propertyId}`       |
| updateProperty         | `PUT /properties/{propertyId}`       |
| deleteProperty         | `DELETE /properties/{propertyId}`    |
| publishProperty        | `POST /properties/{propertyId}/publish` |

## MCP tools defined in `arazzo.yaml`

| Workflow ID                     | MCP tool name           | What it chains together                          |
|----------------------------------|-------------------------|---------------------------------------------------|
| `add-and-publish-listing`        | `add_property_listing`  | `addProperty` → `publishProperty`                  |
| `search-and-get-property-details` | `find_property`         | `listProperties` → `getPropertyById` (top result)  |
| `verify-and-delist-property`      | `delist_property`       | `getPropertyById` → `deleteProperty`               |
