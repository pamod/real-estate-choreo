const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 9092;

const COVERAGE_PLANS = [
  { coverageType: "FIRE", name: "Fire Protection", description: "Covers damage caused by fire and smoke.", basePremiumRate: 0.004 },
  { coverageType: "FLOOD", name: "Flood Protection", description: "Covers damage caused by flooding and water ingress.", basePremiumRate: 0.006 },
  { coverageType: "ALL_RISK", name: "All-Risk Cover", description: "Broad coverage against most accidental physical loss or damage.", basePremiumRate: 0.012 },
  { coverageType: "LIABILITY", name: "Public Liability", description: "Covers legal liability for injury or damage occurring on the property.", basePremiumRate: 0.003 },
  { coverageType: "THEFT", name: "Theft Protection", description: "Covers loss from burglary and theft.", basePremiumRate: 0.005 },
];
const COVERAGE_TYPES = COVERAGE_PLANS.map((p) => p.coverageType);
const CLAIM_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "PAID"];

/** @type {Map<string, any>} */
const quotes = new Map();
/** @type {Map<string, any>} */
const policies = new Map();
/** @type {Map<string, any>} */
const claims = new Map();

function error(res, status, code, message, details) {
  return res.status(status).json({ code, message, ...(details ? { details } : {}) });
}

function requireAuth(req, res, next) {
  if (!req.headers.authorization) {
    return error(res, 401, "UNAUTHORIZED", "Missing bearer token.");
  }
  next();
}
app.use(requireAuth);

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// GET /coverage-plans
app.get("/coverage-plans", (_req, res) => {
  res.status(200).json(COVERAGE_PLANS);
});

// POST /quotes
app.post("/quotes", (req, res) => {
  const body = req.body || {};
  const errors = [];
  if (!body.propertyId) errors.push("Missing required field: propertyId");
  if (typeof body.propertyValue !== "number" || body.propertyValue <= 0) errors.push("propertyValue must be a positive number");
  if (!body.propertyType) errors.push("Missing required field: propertyType");
  if (!body.coverageType || !COVERAGE_TYPES.includes(body.coverageType)) {
    errors.push(`coverageType must be one of ${COVERAGE_TYPES.join(", ")}`);
  }
  if (errors.length) return error(res, 422, "VALIDATION_ERROR", "Quote payload failed validation.", errors);

  const plan = COVERAGE_PLANS.find((p) => p.coverageType === body.coverageType);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const quote = {
    id,
    propertyId: body.propertyId,
    propertyValue: body.propertyValue,
    propertyType: body.propertyType,
    coverageType: body.coverageType,
    constructionYear: body.constructionYear,
    premium: { amount: Math.round(body.propertyValue * plan.basePremiumRate * 100) / 100, currency: "USD" },
    validUntil: addDays(now, 30),
    createdAt: now,
  };
  quotes.set(id, quote);
  res.status(201).json(quote);
});

// GET /quotes/:quoteId
app.get("/quotes/:quoteId", (req, res) => {
  const quote = quotes.get(req.params.quoteId);
  if (!quote) return error(res, 404, "NOT_FOUND", "No quote found for the supplied identifier.");
  res.status(200).json(quote);
});

// POST /policies
app.post("/policies", (req, res) => {
  const { quoteId } = req.body || {};
  if (!quoteId) return error(res, 400, "BAD_REQUEST", "quoteId is required.");
  const quote = quotes.get(quoteId);
  if (!quote) return error(res, 404, "NOT_FOUND", "No quote found for the supplied identifier.");
  if (new Date(quote.validUntil).getTime() < Date.now()) {
    return error(res, 409, "QUOTE_EXPIRED", "The quote has expired and can no longer be bound.");
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const policy = {
    id,
    policyNumber: `POL-${now.slice(0, 4)}-${id.slice(0, 8).toUpperCase()}`,
    propertyId: quote.propertyId,
    quoteId: quote.id,
    coverageType: quote.coverageType,
    insuredValue: { amount: quote.propertyValue, currency: "USD" },
    premium: quote.premium,
    status: "ACTIVE",
    startDate: now,
    endDate: addDays(now, 365),
  };
  policies.set(id, policy);
  res.status(201).json(policy);
});

// GET /policies/:policyId
app.get("/policies/:policyId", (req, res) => {
  const policy = policies.get(req.params.policyId);
  if (!policy) return error(res, 404, "NOT_FOUND", "No policy found for the supplied identifier.");
  res.status(200).json(policy);
});

// GET /policies/:policyId/claims
app.get("/policies/:policyId/claims", (req, res) => {
  const policy = policies.get(req.params.policyId);
  if (!policy) return error(res, 404, "NOT_FOUND", "No policy found for the supplied identifier.");
  const results = Array.from(claims.values()).filter((c) => c.policyId === req.params.policyId);
  res.status(200).json(results);
});

// GET /properties/:propertyId/policy
app.get("/properties/:propertyId/policy", (req, res) => {
  const candidates = Array.from(policies.values())
    .filter((p) => p.propertyId === req.params.propertyId && p.status === "ACTIVE")
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  if (!candidates.length) return error(res, 404, "NOT_FOUND", "No active policy found for this property.");
  res.status(200).json(candidates[0]);
});

// POST /claims
app.post("/claims", (req, res) => {
  const body = req.body || {};
  const errors = [];
  if (!body.policyId) errors.push("Missing required field: policyId");
  if (!body.incidentDate) errors.push("Missing required field: incidentDate");
  if (!body.incidentType) errors.push("Missing required field: incidentType");
  if (typeof body.claimedAmount !== "number" || body.claimedAmount <= 0) errors.push("claimedAmount must be a positive number");
  if (errors.length) return error(res, 422, "VALIDATION_ERROR", "Claim payload failed validation.", errors);

  if (!policies.has(body.policyId)) {
    return error(res, 404, "NOT_FOUND", "No policy found for the supplied identifier.");
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const claim = {
    id,
    policyId: body.policyId,
    incidentDate: body.incidentDate,
    incidentType: body.incidentType,
    description: body.description,
    claimedAmount: body.claimedAmount,
    status: "SUBMITTED",
    createdAt: now,
    updatedAt: now,
  };
  claims.set(id, claim);
  res.status(201).json(claim);
});

// GET /claims/:claimId
app.get("/claims/:claimId", (req, res) => {
  const claim = claims.get(req.params.claimId);
  if (!claim) return error(res, 404, "NOT_FOUND", "No claim found for the supplied identifier.");
  res.status(200).json(claim);
});

// PUT /claims/:claimId
app.put("/claims/:claimId", (req, res) => {
  const claim = claims.get(req.params.claimId);
  if (!claim) return error(res, 404, "NOT_FOUND", "No claim found for the supplied identifier.");

  const { status, adjusterNotes, approvedAmount } = req.body || {};
  if (!status || !CLAIM_STATUSES.includes(status)) {
    return error(res, 422, "VALIDATION_ERROR", "Claim payload failed validation.", [`status must be one of ${CLAIM_STATUSES.join(", ")}`]);
  }

  claim.status = status;
  if (adjusterNotes !== undefined) claim.adjusterNotes = adjusterNotes;
  if (approvedAmount !== undefined) claim.approvedAmount = approvedAmount;
  claim.updatedAt = new Date().toISOString();
  res.status(200).json(claim);
});

app.listen(PORT, () => {
  console.log(`Property Insurance Service listening on http://localhost:${PORT}`);
});
