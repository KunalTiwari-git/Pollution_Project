import express from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import https from "https";

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "../data/water_quality.json");

// ── Simple 1-hour cache ──────────────────────────────────────────
let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ── Fetch from CPCB (Node.js native https, no verify) ────────────
function fetchFromCPCB() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "rtwqmsdb1.cpcb.gov.in",
      path: "/data/internet/layers/10/index.json",
      method: "GET",
      rejectUnauthorized: false, // bypass SSL (same as verify=False)
      timeout: 60000
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", chunk => raw += chunk);
      res.on("end", () => {
        try {
          if (!raw.trim()) return reject(new Error("Empty response"));
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(new Error("JSON parse failed"));
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
    req.end();
  });
}

// ── Get data (cache → file fallback → live fetch) ─────────────────
async function getData() {
  // 1. Return from memory cache if fresh
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return { data: cache.data, source: "cache" };
  }

  // 2. Try live fetch
  try {
    const raw = await fetchFromCPCB();
    const data = processRecords(raw);
    cache = { data, timestamp: Date.now() };
    // Save to file as backup
    writeFileSync(DATA_FILE, JSON.stringify(raw, null, 2));
    return { data, source: "live" };
  } catch (err) {
    console.warn("CPCB water fetch failed:", err.message);
  }

  // 3. Fallback to saved JSON file
  if (existsSync(DATA_FILE)) {
    const raw = JSON.parse(readFileSync(DATA_FILE, "utf8"));
    const data = processRecords(raw);
    cache = { data, timestamp: Date.now() - (CACHE_TTL - 5 * 60 * 1000) };
    return { data, source: "static" };
  }

  throw new Error("No water quality data available");
}

// ── Process raw records ───────────────────────────────────────────
function processRecords(raw) {
  return raw.map(r => ({
    station_id:    r.station_id,
    station_no:    r.station_no,
    station_name:  r.station_name.replace(/^[A-Z]{2}\d+_/, "").trim(),
    state:         r.territory_name,
    latitude:      parseFloat(r.station_latitude),
    longitude:     parseFloat(r.station_longitude),
    timestamp:     r.timestamp,
    parameter:     r.stationparameter_longname,
    value:         r.ts_value,
    unit:          r.ts_unitsymbol === "---" ? "" : r.ts_unitsymbol
  }));
}

// ════════════════════════════════════════════════════════════════
// GET /api/water/stations
// Returns all unique stations
// ════════════════════════════════════════════════════════════════
router.get("/stations", async (req, res) => {
  try {
    const { data, source } = await getData();
    const seen = new Set();
    const stations = data
      .filter(r => {
        if (seen.has(r.station_id)) return false;
        seen.add(r.station_id);
        return true;
      })
      .map(r => ({
        station_id: r.station_id,
        station_no: r.station_no,
        station_name: r.station_name,
        state: r.state,
        latitude: r.latitude,
        longitude: r.longitude
      }));

    res.json({ status: "ok", total: stations.length, source, stations });
  } catch (err) {
    res.status(503).json({ status: "error", message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/water/data
// Optional filters: ?state=Bihar  ?parameter=pH  ?station_id=11799
// ════════════════════════════════════════════════════════════════
router.get("/data", async (req, res) => {
  try {
    const { data, source } = await getData();
    let result = data;

    if (req.query.state)
      result = result.filter(r =>
        r.state.toLowerCase() === req.query.state.toLowerCase());

    if (req.query.parameter)
      result = result.filter(r =>
        r.parameter.toLowerCase().includes(req.query.parameter.toLowerCase()));

    if (req.query.station_id)
      result = result.filter(r =>
        String(r.station_id) === String(req.query.station_id));

    if (!result.length)
      return res.status(404).json({ status: "error", message: "No records match filters" });

    res.json({
      status: "ok",
      total: result.length,
      source,
      filters: req.query,
      data: result
    });
  } catch (err) {
    res.status(503).json({ status: "error", message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/water/summary
// Min / max / avg per parameter across all stations
// ════════════════════════════════════════════════════════════════
router.get("/summary", async (req, res) => {
  try {
    const { data, source } = await getData();
    const byParam = {};

    data.forEach(r => {
      if (!byParam[r.parameter]) byParam[r.parameter] = [];
      if (r.value !== null && !isNaN(r.value)) byParam[r.parameter].push(r.value);
    });

    const summary = Object.entries(byParam).map(([param, vals]) => {
      const sorted = [...vals].sort((a, b) => a - b);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return {
        parameter: param,
        min: +sorted[0].toFixed(2),
        max: +sorted[sorted.length - 1].toFixed(2),
        avg: +avg.toFixed(2),
        stations_reporting: vals.length
      };
    });

    res.json({ status: "ok", source, parameters: summary });
  } catch (err) {
    res.status(503).json({ status: "error", message: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// GET /api/water/station/:id
// All parameters for one specific station
// ════════════════════════════════════════════════════════════════
router.get("/station/:id", async (req, res) => {
  try {
    const { data, source } = await getData();
    const rows = data.filter(r => String(r.station_id) === String(req.params.id));

    if (!rows.length)
      return res.status(404).json({ status: "error", message: "Station not found" });

    const info = rows[0];
    const parameters = {};
    rows.forEach(r => {
      parameters[r.parameter] = { value: r.value, unit: r.unit };
    });

    res.json({
      status: "ok",
      source,
      station: {
        station_id:   info.station_id,
        station_no:   info.station_no,
        station_name: info.station_name,
        state:        info.state,
        latitude:     info.latitude,
        longitude:    info.longitude,
        timestamp:    info.timestamp,
        parameters
      }
    });
  } catch (err) {
    res.status(503).json({ status: "error", message: err.message });
  }
});

export default router;