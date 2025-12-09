const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;
const LOG_LEVEL = process.env.LOG_LEVEL || "dev";

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Autokirk MCP Server",
    message: "Deployment successful. MCP online. AIS blueprint endpoint available at /mcp/generate-ais-blueprint.",
    env: {
      node: process.version,
      port: String(PORT),
      logLevel: LOG_LEVEL
    }
 // AIS Blueprint API endpoint (v0.1 – Mobile Welding)
app.post("/api/ais-blueprint", (req, res) => {
  const { businessDescription } = req.body || {};

  if (!businessDescription) {
    return res
      .status(400)
      .json({ error: "businessDescription is required" });
  }

  // Static Mobile Welding AIS Blueprint (v0.1)
  const blueprint = {
    business: {
      id: "mobile-welding",
      name: "Mobile Welding",
      description:
        "On-site welding services for residential, commercial, and industrial clients.",
      industry: "Field Services",
      version: "ais-blueprint-v0.1"
    },
    divisions: [
      {
        id: "ops",
        label: "Operations",
        engines: ["dispatch", "scheduling", "job-docs", "equipment-tracking"]
      },
      {
        id: "growth",
        label: "Growth",
        engines: ["lead-intake", "quotes", "reputation"]
      },
      {
        id: "finance",
        label: "Finance",
        engines: ["invoicing", "payments", "profit-tracking"]
      }
    ],
    engines: [],
    modules: [],
    agents: []
  };

  return res.status(200).json(blueprint);
});

  
  });
});

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
      description: trimmed
    },
    output: {
      meta: {
        generated_by: "Autokirk MCP Server",
        log_level: LOG_LEVEL
      },
      founder: {
        role: "Founder / Operator",
        focus: "Clarity, direction, momentum"
      },
      business: {
        name,
        summary: trimmed || "No description provided."
      },
      structure: {
        divisions: [
          { id: "ops", label: "Operations", engines: [] },
          { id: "growth", label: "Growth", engines: [] },
          { id: "finance", label: "Finance", engines: [] }
        ],
        engines: [],
        modules: [],
        agents: []
      }
    }
  };

  return aisArtifact;
}

app.post("/mcp/generate-ais-blueprint", (req, res) => {
  try {
    const { description } = req.body || {};
    const aisArtifact = generateAISBlueprint(description);

    return res.json({
      status: "ok",
      artifact_type: "business_blueprint",
      ais_version: "1.0.0",
      output: aisArtifact
    });
  } catch (err) {
    console.error("Blueprint generation error:", err);
    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Autokirk MCP Server listening on port ${PORT}`);
});
