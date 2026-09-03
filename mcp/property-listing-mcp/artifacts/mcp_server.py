import os
import requests
from typing import Literal, Optional
from urllib.parse import urlparse
from fastmcp import FastMCP
from pydantic import BaseModel, Field
from arazzo_runner import ArazzoRunner

# Initialize FastMCP server
mcp = FastMCP("Property Listing MCP Workflows")


class Money(BaseModel):
    amount: float = Field(description="Numeric price amount, e.g. 250000")
    currency: str = Field(description="ISO 4217 currency code, e.g. USD")


class Address(BaseModel):
    line1: str = Field(description="Street address, e.g. building/house number and street name")
    city: str = Field(description="City or town")
    country: str = Field(description="Country name")
    line2: Optional[str] = Field(default=None, description="Additional address line, e.g. unit or suite")
    region: Optional[str] = Field(default=None, description="State/province/region")
    postalCode: Optional[str] = Field(default=None, description="Postal or ZIP code")

# Load the Arazzo file
_http = requests.Session()
_http.verify = False  # allow self-signed / internal certs
import urllib3; urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
runner = ArazzoRunner.from_arazzo_path("./arazzo/arazzo.yaml", http_client=_http)

# The bundled openapi.yaml points at a docker-compose hostname
# (http://property-listing-service:9091) for local demos. On Choreo the
# backend service gets its own routable URL, so let LISTING_SERVICE_BASE_URL
# override it at runtime (e.g. the property-listing-service component's
# Choreo-assigned URL, wired up via a Connection).
_backend_base_url = os.environ.get("LISTING_SERVICE_BASE_URL")
if _backend_base_url:
    for _spec in runner.source_descriptions.values():
        if _spec.get("servers"):
            _spec["servers"][0]["url"] = _backend_base_url

# ── Fix arazzo-runner GOTO off-by-one bug ──
_original_execute_next_step = ArazzoRunner.execute_next_step

def _fixed_execute_next_step(self, execution_id):
    result = _original_execute_next_step(self, execution_id)
    status = result.get("status")
    if hasattr(status, "value"):
        status = status.value
    if status == "goto_step":
        target_step_id = result.get("step_id")
        state = self.execution_states[execution_id]
        workflow = None
        for wf in (self.arazzo_doc or {}).get("workflows", []):
            if wf.get("workflowId") == state.workflow_id:
                workflow = wf
                break
        if workflow:
            steps = workflow.get("steps", [])
            for idx, step in enumerate(steps):
                if step.get("stepId") == target_step_id:
                    if idx == 0:
                        state.current_step_id = None
                    else:
                        state.current_step_id = steps[idx - 1].get("stepId")
                    break
    return result

ArazzoRunner.execute_next_step = _fixed_execute_next_step

# ── Tool 1: add-and-publish-listing workflow
@mcp.tool(name="add-and-publish-listing")
async def add_and_publish_listing(
    address: Address,
    agentId: str,
    areaSqm: float,
    bathrooms: int,
    bedrooms: int,
    description: str,
    listingType: Literal["SALE", "RENT"],
    price: Money,
    propertyType: Literal["APARTMENT", "HOUSE", "VILLA", "LAND", "COMMERCIAL"],
    title: str,
) -> str:
    """Add a property and publish it in one call"""
    try:
        result = runner.execute_workflow("add-and-publish-listing", {"address": address.model_dump(exclude_none=True), "agentId": agentId, "areaSqm": areaSqm, "bathrooms": bathrooms, "bedrooms": bedrooms, "description": description, "listingType": listingType, "price": price.model_dump(), "propertyType": propertyType, "title": title})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"

# ── Tool 2: search-and-get-property-details workflow
@mcp.tool(name="search-and-get-property-details")
async def search_and_get_property_details(
    city: Optional[str] = Field(default=None, description="City or town to search in, e.g. Nairobi"),
    propertyType: Optional[Literal["APARTMENT", "HOUSE", "VILLA", "LAND", "COMMERCIAL"]] = Field(default=None, description="Filter by property type"),
    listingType: Optional[Literal["SALE", "RENT"]] = Field(default=None, description="Filter by whether the property is for sale or for rent"),
    minPrice: Optional[float] = Field(default=None, description="Minimum price"),
    maxPrice: Optional[float] = Field(default=None, description="Maximum price"),
    bedrooms: Optional[int] = Field(default=None, description="Exact number of bedrooms"),
) -> str:
    """Search listings and return full details of the top match. All filters are optional —
    omit any filter the caller didn't specify rather than guessing a value."""
    try:
        inputs = {"city": city, "propertyType": propertyType, "listingType": listingType, "minPrice": minPrice, "maxPrice": maxPrice, "bedrooms": bedrooms}
        inputs = {k: v for k, v in inputs.items() if v is not None}
        result = runner.execute_workflow("search-and-get-property-details", inputs)
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"

# ── Tool 3: verify-and-delist-property workflow
@mcp.tool(name="verify-and-delist-property")
async def verify_and_delist_property(propertyId: str) -> str:
    """Confirm a listing exists, then remove it"""
    try:
        result = runner.execute_workflow("verify-and-delist-property", {"propertyId": propertyId})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=5001, stateless_http=True)
