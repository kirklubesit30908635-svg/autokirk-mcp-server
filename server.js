const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;
const LOG_LEVEL = process.env.LOG_LEVEL || "dev";

app.use(cors());
app.use(express.json());

// Root info endpoint
app.get("/", (req, res) => {
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

// Render health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

  res.json({
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

// AIS Blueprint API endpoint (v0.1) – web/app friendly
app.post("/api/ais-blueprint", (req, res) => {
  const { businessDescription, description } = req.body || {};
  const input = String(businessDescription || description || "").trim();

  if (!input) {
    return res
      .status(400)
      .json({
        error: "businessDescription (or description) is required",
      });
  }

  try {
    const aisArtifact = generateAISBlueprint(input);
    // For the /api variant we just return the artifact directly
    return res.status(200).json(aisArtifact);
  } catch (err) {
    console.error("AIS blueprint error (/api):", err);
    return res
      .status(500)
      .json({ error: "Failed to generate AIS blueprint" });
  }
});

// Core AIS generator
function generateAISBlueprint(description) {
  const trimmed = String(description || "").trim();
  const now = new Date().toISOString();

  let name = "Autokirk Business";
  const match = trimmed.match(/([A-Z][A-Za-z0-9& ]{2,40})/);
  if (match) {
    name = match[1].trim();
  }

  const aisArtifact = {
    artifact_type: "business_blueprint",
    ais_version: "1.0.0",
    timestamp: now,
    input: {
      description: trimmed,
    },
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

  return aisArtifact;
}

// MCP-style endpoint (for Claude / MCP clients)
app.post("/mcp/generate-ais-blueprint", (req, res) => {
  try {
    const { description } = req.body || {};
    const aisArtifact = generateAISBlueprint(description);
    return res.json({
      status: "ok",
      artifact_type: "business_blueprint",
      ais_version: "1.0.0",
      output: aisArtifact,
    });
  } catch (err) {
    console.error("Blueprint generation error:", err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Autokirk MCP Server listening on port ${PORT}`);
});
