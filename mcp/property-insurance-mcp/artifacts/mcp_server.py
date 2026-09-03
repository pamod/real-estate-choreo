import os
import requests
from urllib.parse import urlparse
from fastmcp import FastMCP
from arazzo_runner import ArazzoRunner

# Initialize FastMCP server
mcp = FastMCP("Property Insurance MCP Workflows")

# Load the Arazzo file
_http = requests.Session()
_http.verify = False  # allow self-signed / internal certs
import urllib3; urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
runner = ArazzoRunner.from_arazzo_path("./arazzo/arazzo.yaml", http_client=_http)

# The bundled openapi.yaml points at a docker-compose hostname
# (http://property-insurance-service:9092) for local demos. On Choreo the
# backend service gets its own routable URL, so let INSURANCE_SERVICE_BASE_URL
# override it at runtime (e.g. the property-insurance-service component's
# Choreo-assigned URL, wired up via a Connection).
_backend_base_url = os.environ.get("INSURANCE_SERVICE_BASE_URL")
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

# ── Tool 1: quote-to-policy-issuance workflow
@mcp.tool(name="quote-to-policy-issuance")
async def quote_to_policy_issuance(constructionYear: int, coverageType: str, propertyId: str, propertyType: str, propertyValue: float) -> str:
    """Price a coverage quote and immediately bind the policy"""
    try:
        result = runner.execute_workflow("quote-to-policy-issuance", {"constructionYear": constructionYear, "coverageType": coverageType, "propertyId": propertyId, "propertyType": propertyType, "propertyValue": propertyValue})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"

# ── Tool 2: file-claim-for-property workflow
@mcp.tool(name="file-claim-for-property")
async def file_claim_for_property(claimedAmount: float, description: str, incidentDate: str, incidentType: str, propertyId: str) -> str:
    """Resolve a property's active policy and file a claim against it"""
    try:
        result = runner.execute_workflow("file-claim-for-property", {"claimedAmount": claimedAmount, "description": description, "incidentDate": incidentDate, "incidentType": incidentType, "propertyId": propertyId})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"

# ── Tool 3: coverage-summary-for-property workflow
@mcp.tool(name="coverage-summary-for-property")
async def coverage_summary_for_property(propertyId: str) -> str:
    """Return a property's active policy plus its full claim history"""
    try:
        result = runner.execute_workflow("coverage-summary-for-property", {"propertyId": propertyId})
        if result.outputs:
            return f"Workflow Success. Outputs: {result.outputs}"
        return f"Workflow Result: {result}"
    except Exception as e:
        return f"Workflow Error: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=5000, stateless_http=True)
