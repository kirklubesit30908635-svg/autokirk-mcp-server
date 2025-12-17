"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const LOG_LEVEL = process.env.LOG_LEVEL || "dev";

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Serve static site from /public
app.use(express.static(path.join(__dirname, "public")));

/**
 * LANDING PAGE
 * - Put your landing page at: public/index.html
 * - This makes autokirk.com show the landing page at /
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * OPTIONAL: Alternate landing route if you want it
 */
app.get("/landing", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * STATUS (JSON)
 * Keeps your old “root info” functionality but moved to /status
 */
app.get("/status", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Autokirk MCP Server",
    message:
      "Deployment successful. MCP online. AIS blueprint endpoints at /mcp/generate-ais-blueprint and /api/ais-blueprint.",
    env: {
      node: process.version,
      port: String(PORT),
      logLevel: LOG_LEVEL,
    },
  });
});

/**
 * HEALTH (Render health check)
 * IMPORTANT: Render health check path should be set to /health
 */
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * AIS Blueprint API endpoint (web/app friendly)
 * POST /api/ais-blueprint
 * body: { businessDescription: "..."} OR { description: "..." }
 */
app.post("/api/ais-blueprint", (req, res) => {
  const { businessDescription, description } = req.body || {};
  const input = String(businessDescription || description || "").trim();

  if (!input) {
    return res.status(400).json({
      error: "businessDescription (or description) is required",
    });
  }

  try {
    const aisArtifact = generateAISBlueprint(input);
    return res.status(200).json(aisArtifact);
  } catch (err) {
    console.error("AIS blueprint error (/api):", err);
    return res.status(500).json({ error: "Failed to generate AIS blueprint" });
  }
});

/**
 * MCP-style endpoint (for MCP clients)
 * POST /mcp/generate-ais-blueprint
 * body: { description: "..." }
 */
app.post("/mcp/generate-ais-blueprint", (req, res) => {
  const { description, businessDescription } = req.body || {};
  const input = String(description || businessDescription || "").trim();

  if (!input) {
    return res.status(400).json({
      status: "error",
      error: "description (or businessDescription) is required",
    });
  }

  try {
    const artifact = generateAISBlueprint(input);
    return res.status(200).json({
      status: "ok",
      artifact,
    });
  } catch (err) {
    console.error("Blueprint generation error (/mcp):", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to generate AIS blueprint",
    });
  }
});

/**
 * Core AIS generator
 */
function generateAISBlueprint(description) {
  const trimmed = String(description || "").trim();
  const now = new Date().toISOString();

  let name = "Autokirk Business";
  const match = trimmed.match(/([A-Z][A-Za-z0-9& ]{2,40})/);
  if (match) name = match[1].trim();

  return {
    artifact_type: "business_blueprint",
    ais_version: "1.0.0",
    timestamp: now,
    input: { description: trimmed },
    output: {
      meta: {
        generated_by: "Autokirk MCP Server",
        log_level: LOG_LEVEL,
      },
      founder: {
        role: "Founder / Operator",
        focus: "Clarity, direction, momentum",
      },
      business: {
        name,
        summary: trimmed || "No description provided.",
      },
      structure: {
        divisions: [
          { id: "ops", label: "Operations", engines: [] },
          { id: "growth", label: "Growth", engines: [] },
          { id: "finance", label: "Finance", engines: [] },
        ],
        engines: [],
        modules: [],
        agents: [],
      },
    },
  };
}

/**
 * 404 for unknown API routes (static files will already be handled above)
 */
app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Autokirk MCP Server listening on port ${PORT}`);
});
