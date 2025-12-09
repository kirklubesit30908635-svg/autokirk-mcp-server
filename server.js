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
