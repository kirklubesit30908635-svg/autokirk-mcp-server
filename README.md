# Autokirk MCP Server

Node/Express backend that exposes an AIS-style business blueprint generator for Autokirk.

## Endpoints

- `GET /` – health check
- `POST /mcp/generate-ais-blueprint` – generate an AIS business blueprint

Example request body:

```json
{
  "description": "I run a mobile auto detailing business in Florida and want to automate bookings and follow-ups."
}
```

## Local development

```bash
npm install
npm start
```

Server listens on port **10000** by default, or `PORT` env var if set.

## Deploying to Render

1. Push these files to a GitHub repo, e.g. `autokirk-mcp-server`.
2. In Render:
   - Create **New Web Service**
   - Select your GitHub repo
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Root Directory:** leave blank
3. After deploy, verify:
   - `GET /` returns JSON with `"status": "ok"`
   - `POST /mcp/generate-ais-blueprint` returns JSON
