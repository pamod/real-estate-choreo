const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 9091;

const PROPERTY_TYPES = ["APARTMENT", "HOUSE", "VILLA", "LAND", "COMMERCIAL"];
const LISTING_TYPES = ["SALE", "RENT"];
const STATUSES = ["DRAFT", "ACTIVE", "UNDER_OFFER", "SOLD", "RENTED", "DELISTED"];

/** @type {Map<string, any>} */
const properties = new Map();

function seed() {
  const now = new Date().toISOString();
  const samples = [
    // Kenya
    {
      title: "3-Bedroom Villa in Runda",
      description: "Spacious family villa with a private garden and staff quarters.",
      propertyType: "VILLA",
      listingType: "SALE",
      price: { amount: 450000, currency: "USD" },
      address: { line1: "12 Runda Grove", city: "Nairobi", country: "Kenya" },
      bedrooms: 3,
      bathrooms: 3,
      areaSqm: 320,
      agentId: "agent-100",
    },
    {
      title: "Modern 2-Bedroom Apartment, CBD",
      description: "High-rise apartment with city views, close to public transport.",
      propertyType: "APARTMENT",
      listingType: "RENT",
      price: { amount: 1200, currency: "USD" },
      address: { line1: "45 Kimathi Street", city: "Nairobi", country: "Kenya" },
      bedrooms: 2,
      bathrooms: 2,
      areaSqm: 95,
      agentId: "agent-101",
    },
    {
      title: "Beachfront 4-Bedroom House, Nyali",
      description: "Family home minutes from the beach with a large veranda and mature garden.",
      propertyType: "HOUSE",
      listingType: "SALE",
      price: { amount: 320000, currency: "USD" },
      address: { line1: "8 Links Road", city: "Mombasa", country: "Kenya" },
      bedrooms: 4,
      bathrooms: 3,
      areaSqm: 280,
      agentId: "agent-102",
    },
    {
      title: "Half-Acre Plot in Kiambu",
      description: "Serviced residential plot with road access and title deed ready, on the outskirts of Nairobi.",
      propertyType: "LAND",
      listingType: "SALE",
      price: { amount: 85000, currency: "USD" },
      address: { line1: "Off Kiambu Road", city: "Kiambu", country: "Kenya" },
      bedrooms: 0,
      bathrooms: 0,
      areaSqm: 2000,
      agentId: "agent-103",
    },
    // South Africa
    {
      title: "4-Bedroom House in Camps Bay",
      description: "Contemporary home with ocean views, a pool and a double garage.",
      propertyType: "HOUSE",
      listingType: "SALE",
      price: { amount: 780000, currency: "USD" },
      address: { line1: "21 Victoria Road", city: "Cape Town", country: "South Africa" },
      bedrooms: 4,
      bathrooms: 4,
      areaSqm: 310,
      agentId: "agent-200",
    },
    {
      title: "1-Bedroom Apartment in Sandton",
      description: "Secure apartment in the financial district, walking distance to Sandton City.",
      propertyType: "APARTMENT",
      listingType: "RENT",
      price: { amount: 950, currency: "USD" },
      address: { line1: "14 Maude Street", city: "Johannesburg", country: "South Africa" },
      bedrooms: 1,
      bathrooms: 1,
      areaSqm: 60,
      agentId: "agent-201",
    },
    {
      title: "3-Bedroom Townhouse in Umhlanga",
      description: "Modern townhouse in a gated estate close to the beach and shopping malls.",
      propertyType: "HOUSE",
      listingType: "SALE",
      price: { amount: 265000, currency: "USD" },
      address: { line1: "5 Lighthouse Drive", city: "Durban", country: "South Africa" },
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 210,
      agentId: "agent-202",
    },
    // Sri Lanka
    {
      title: "Spacious 3-Bed Apartment in Colombo 3",
      description: "Apartment with great views, modern amenities and close to landmarks.",
      propertyType: "APARTMENT",
      listingType: "SALE",
      price: { amount: 250000, currency: "USD" },
      address: { line1: "28 Kinross Avenue", city: "Colombo", country: "Sri Lanka" },
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 150,
      agentId: "agent-300",
    },
    {
      title: "2-Bedroom Apartment near Galle Face",
      description: "Compact seaview apartment, ideal for young professionals, near Galle Face Green.",
      propertyType: "APARTMENT",
      listingType: "RENT",
      price: { amount: 650, currency: "USD" },
      address: { line1: "9 Marine Drive", city: "Colombo", country: "Sri Lanka" },
      bedrooms: 2,
      bathrooms: 2,
      areaSqm: 85,
      agentId: "agent-301",
    },
    {
      title: "Hillside 4-Bedroom Villa in Kandy",
      description: "Villa with panoramic hill-country views, a private garden and staff quarters.",
      propertyType: "VILLA",
      listingType: "SALE",
      price: { amount: 310000, currency: "USD" },
      address: { line1: "17 Hantana Road", city: "Kandy", country: "Sri Lanka" },
      bedrooms: 4,
      bathrooms: 3,
      areaSqm: 300,
      agentId: "agent-302",
    },
    // Nigeria
    {
      title: "5-Bedroom Duplex in Lekki",
      description: "Newly built duplex in a gated estate with 24-hour power and security.",
      propertyType: "HOUSE",
      listingType: "SALE",
      price: { amount: 420000, currency: "USD" },
      address: { line1: "Chevron Drive", city: "Lagos", country: "Nigeria" },
      bedrooms: 5,
      bathrooms: 5,
      areaSqm: 400,
      agentId: "agent-400",
    },
    {
      title: "2-Bedroom Apartment in Ikoyi",
      description: "Serviced apartment with a gym and pool, close to the business district.",
      propertyType: "APARTMENT",
      listingType: "RENT",
      price: { amount: 1800, currency: "USD" },
      address: { line1: "12 Bourdillon Road", city: "Lagos", country: "Nigeria" },
      bedrooms: 2,
      bathrooms: 2,
      areaSqm: 110,
      agentId: "agent-401",
    },
    // Rwanda
    {
      title: "Commercial Office Space in Kigali",
      description: "Open-plan office floor in a modern business park, ready for fit-out.",
      propertyType: "COMMERCIAL",
      listingType: "RENT",
      price: { amount: 3000, currency: "USD" },
      address: { line1: "3 KG 7 Avenue", city: "Kigali", country: "Rwanda" },
      bedrooms: 0,
      bathrooms: 2,
      areaSqm: 500,
      agentId: "agent-500",
    },
  ];
  for (const s of samples) {
    const id = crypto.randomUUID();
    properties.set(id, { id, status: "ACTIVE", createdAt: now, updatedAt: now, ...s });
  }
}
seed();

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

function validatePropertyInput(body, { partial = false } = {}) {
  const errors = [];
  const required = ["title", "propertyType", "listingType", "price", "address", "agentId"];
  if (!partial) {
    for (const field of required) {
      if (body[field] === undefined) errors.push(`Missing required field: ${field}`);
    }
  }
  if (body.propertyType !== undefined && !PROPERTY_TYPES.includes(body.propertyType)) {
    errors.push(`propertyType must be one of ${PROPERTY_TYPES.join(", ")}`);
  }
  if (body.listingType !== undefined && !LISTING_TYPES.includes(body.listingType)) {
    errors.push(`listingType must be one of ${LISTING_TYPES.join(", ")}`);
  }
  if (body.price !== undefined && (typeof body.price.amount !== "number" || !body.price.currency)) {
    errors.push("price must include a numeric amount and a currency");
  }
  if (body.address !== undefined && (!body.address.line1 || !body.address.city || !body.address.country)) {
    errors.push("address must include line1, city and country");
  }
  return errors;
}

function filterProperties(status, { city, propertyType, listingType, minPrice, maxPrice, bedrooms }) {
  let items = Array.from(properties.values()).filter((p) => p.status === status);
  if (city) items = items.filter((p) => p.address.city.toLowerCase().includes(String(city).toLowerCase()));
  if (propertyType) items = items.filter((p) => p.propertyType === propertyType);
  if (listingType) items = items.filter((p) => p.listingType === listingType);
  if (minPrice) items = items.filter((p) => p.price.amount >= Number(minPrice));
  if (maxPrice) items = items.filter((p) => p.price.amount <= Number(maxPrice));
  if (bedrooms) items = items.filter((p) => p.bedrooms === Number(bedrooms));
  return items;
}

function paginate(items, req) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const total = items.length;
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total, page, limit };
}

// GET /properties
app.get("/properties", (req, res) => {
  const status = req.query.status || "ACTIVE";
  const items = filterProperties(status, req.query);
  res.status(200).json(paginate(items, req));
});

// GET /properties/available
app.get("/properties/available", (req, res) => {
  const items = filterProperties("ACTIVE", req.query);
  res.status(200).json(paginate(items, req));
});

// POST /properties
app.post("/properties", (req, res) => {
  const errors = validatePropertyInput(req.body || {});
  if (errors.length) return error(res, 422, "VALIDATION_ERROR", "Property payload failed validation.", errors);

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const property = {
    id,
    status: req.body.status && STATUSES.includes(req.body.status) ? req.body.status : "DRAFT",
    createdAt: now,
    updatedAt: now,
    title: req.body.title,
    description: req.body.description,
    propertyType: req.body.propertyType,
    listingType: req.body.listingType,
    price: req.body.price,
    address: req.body.address,
    bedrooms: req.body.bedrooms,
    bathrooms: req.body.bathrooms,
    areaSqm: req.body.areaSqm,
    agentId: req.body.agentId,
  };
  properties.set(id, property);
  res.status(201).json(property);
});

// GET /properties/:id
app.get("/properties/:propertyId", (req, res) => {
  const property = properties.get(req.params.propertyId);
  if (!property) return error(res, 404, "NOT_FOUND", "No property found for the supplied identifier.");
  res.status(200).json(property);
});

// PUT /properties/:id
app.put("/properties/:propertyId", (req, res) => {
  const property = properties.get(req.params.propertyId);
  if (!property) return error(res, 404, "NOT_FOUND", "No property found for the supplied identifier.");

  const errors = validatePropertyInput(req.body || {});
  if (errors.length) return error(res, 422, "VALIDATION_ERROR", "Property payload failed validation.", errors);

  const updated = {
    ...property,
    ...req.body,
    id: property.id,
    createdAt: property.createdAt,
    updatedAt: new Date().toISOString(),
  };
  properties.set(property.id, updated);
  res.status(200).json(updated);
});

// DELETE /properties/:id
app.delete("/properties/:propertyId", (req, res) => {
  const property = properties.get(req.params.propertyId);
  if (!property) return error(res, 404, "NOT_FOUND", "No property found for the supplied identifier.");
  properties.delete(req.params.propertyId);
  res.status(204).send();
});

// POST /properties/:id/publish
app.post("/properties/:propertyId/publish", (req, res) => {
  const property = properties.get(req.params.propertyId);
  if (!property) return error(res, 404, "NOT_FOUND", "No property found for the supplied identifier.");
  if (property.status !== "DRAFT") {
    return error(res, 409, "INVALID_STATE", `Property is in ${property.status} status and cannot be published.`);
  }
  property.status = "ACTIVE";
  property.updatedAt = new Date().toISOString();
  res.status(200).json(property);
});

app.listen(PORT, () => {
  console.log(`Property Listing Service listening on http://localhost:${PORT}`);
});
