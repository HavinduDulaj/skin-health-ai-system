/**
 * DermaSafe AI — ingredient recommendation knowledge-base (Node.js + Express + JSON).
 *
 *   cd services/ingredients && npm install && npm start
 *
 * Serves JSON lookups keyed by condition and risk level for the mobile app.
 */

const cors = require("cors");
const express = require("express");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.INGREDIENTS_PORT || 3001);
const DATA_PATH = path.join(__dirname, "data", "ingredients.json");

const app = express();
app.use(cors());
app.use(express.json());

const kb = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));

function normalizeCondition(value) {
  const key = String(value || "rash").trim().toLowerCase();
  return kb[key] ? key : "rash";
}

function normalizeRisk(value) {
  const key = String(value || "Low").trim();
  const allowed = ["Low", "Medium", "High"];
  return allowed.includes(key) ? key : "Low";
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "dermasafe-ingredients", format: "json" });
});

app.get("/api/ingredients", (req, res) => {
  const condition = normalizeCondition(req.query.condition);
  const riskLevel = normalizeRisk(req.query.risk_level);
  const ingredients = (kb[condition] && kb[condition][riskLevel]) || [];

  res.json({
    condition,
    risk_level: riskLevel,
    ingredients,
    note:
      "Educational ingredient awareness only. Not medical advice, not a diagnosis, and not a treatment plan.",
  });
});

app.listen(PORT, () => {
  console.log(`DermaSafe ingredient API listening on http://127.0.0.1:${PORT}`);
});
