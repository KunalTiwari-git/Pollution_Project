import express from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fetch from "node-fetch";

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load all data files once at startup (fast in-memory reads) ──────────────
const cityData = JSON.parse(readFileSync(join(__dirname, "../data/city_data.json"), "utf8"));
const corrData = JSON.parse(readFileSync(join(__dirname, "../data/corr_data.json"), "utf8"));
const metaData = JSON.parse(readFileSync(join(__dirname, "../data/meta_data.json"), "utf8"));

// ML service URL — set ML_SERVICE_URL env var on Render to the internal URL of vayu-ml-service
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

// CPCB live API key
const CPCB_API_KEY = "579b464db66ec23bdd0000016e3b38c59991434d4ddf38a3b7f5e077";
const CPCB_URL = `https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key=${CPCB_API_KEY}&format=json&limit=1300`;

// Simple 30-minute cache for live API calls
const liveCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in ms

// ── AQI colour helper ─
function getAQIColor(aqi) {
  if (!aqi) return "#607d8b";
  if (aqi <= 50) return "#a8e063";
  if (aqi <= 100) return "#fdd835";
  if (aqi <= 200) return "#ff7c00";
  if (aqi <= 300) return "#f50057";
  if (aqi <= 400) return "#9c27b0";
  return "#6a0080";
}

// ════════════════════════════════════════════════════════════════════
// PAST — reads from city_data.json (loaded at startup, instant)
// GET /api/past/city/:cityName
// Returns: monthly PM2.5 trend + year-over-year change
// ════════════════════════════════════════════════════════════════════
router.get("/past/city/:cityName", (req, res) => {
  const city = req.params.cityName.replace(/-/g, " ").trim();

  // Case-insensitive lookup
  const key = Object.keys(cityData).find(
    (k) => k.toLowerCase() === city.toLowerCase()
  );

  if (!key) {
    return res.status(404).json({
      status: "error",
      message: `City '${city}' not found. Check /api/meta/cities for valid names.`,
    });
  }

  const rows = cityData[key];

  // Add colour to each row
  const enriched = rows.map((r) => ({
    ...r,
    colour: getAQIColor(r.aqi),
  }));

  // Year-over-year summary
  const byYear = {};
  rows.forEach((r) => {
    if (!byYear[r.year]) byYear[r.year] = [];
    if (r.pm25) byYear[r.year].push(r.pm25);
  });
  const yoy = Object.entries(byYear)
    .sort(([a], [b]) => a - b)
    .map(([year, vals], i, arr) => {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const prevAvg =
        i > 0
          ? arr[i - 1][1].reduce((a, b) => a + b, 0) / arr[i - 1][1].length
          : null;
      return {
        year: Number(year),
        avg_pm25: Math.round(avg * 10) / 10,
        pct_change:
          prevAvg !== null
            ? Math.round(((avg - prevAvg) / prevAvg) * 1000) / 10
            : null,
      };
    });

  res.json({
    status: "ok",
    city: key,
    data: enriched,
    year_over_year: yoy,
    who_limit: 15,
  });
});

// ════════════════════════════════════════════════════════════════════
// PRESENT — calls CPCB live API, caches 30 min
// GET /api/present/city/:cityName
// Returns: live PM2.5, AQI, colour, "worse than usual?" flag
// ════════════════════════════════════════════════════════════════════
router.get("/present/city/:cityName", async (req, res) => {
  const city = req.params.cityName.replace(/-/g, " ").trim();

  // Check cache
  const cacheKey = city.toLowerCase();
  const cached = liveCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true });
  }

  try {
    const response = await fetch(CPCB_URL, { timeout: 8000 });
    const json = await response.json();
    const records = json.records || [];

    // Filter records matching this city
    const matched = records.filter(
      (r) => r.city && r.city.toLowerCase().trim() === city.toLowerCase().trim()
    );

    if (!matched.length) {
      return res.status(404).json({
        status: "error",
        message: `No live data found for city '${city}'.`,
      });
    }

    // Average pollutant values across all stations in this city
    const pollutants = {};
    matched.forEach((r) => {
      const pid = (r.pollutant_id || "").toUpperCase();
      const val = parseFloat(r.avg_value);
      if (!isNaN(val)) {
        if (!pollutants[pid]) pollutants[pid] = [];
        pollutants[pid].push(val);
      }
    });

    const avg = (key) => {
      const vals = pollutants[key];
      return vals ? Math.round((vals.reduce((a, b) => a + b) / vals.length) * 10) / 10 : null;
    };

    const pm25 = avg("PM2.5");
    const aqi = avg("AQI") || pm25;

    // Historical average for this city
    const key = Object.keys(cityData).find(
      (k) => k.toLowerCase() === city.toLowerCase()
    );
    let historicalAvg = null;
    if (key) {
      const vals = cityData[key].map((r) => r.pm25).filter(Boolean);
      historicalAvg =
        vals.length ? Math.round((vals.reduce((a, b) => a + b) / vals.length) * 10) / 10 : null;
    }

    const result = {
      status: "ok",
      city,
      pm25,
      pm10: avg("PM10"),
      no2: avg("NO2"),
      ozone: avg("OZONE"),
      co: avg("CO"),
      nh3: avg("NH3"),
      aqi_computed: aqi,
      colour: getAQIColor(aqi),
      historical_avg_pm25: historicalAvg,
      is_worse_than_usual: historicalAvg && pm25 ? pm25 > historicalAvg * 1.1 : null,
      stations_found: new Set(matched.map((r) => r.station)).size,
      source: "cpcb_realtime",
      cached: false,
    };

    liveCache.set(cacheKey, { data: result, timestamp: Date.now() });
    res.json(result);
  } catch (err) {
    res.status(503).json({
      status: "error",
      message: "Live API unreachable. Try again in a moment.",
      detail: err.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════
// FUTURE — calls the Python ml_service on port 5001
// GET /api/future/city/:cityName
// Returns: 3-month PM2.5 forecast from Random Forest model
// ════════════════════════════════════════════════════════════════════

router.get("/future/city/:cityName", async (req, res) => {
  const city = req.params.cityName.replace(/-/g, " ").trim();

  try {
    // AbortController gives a real timeout )

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 50000);
    const response = await fetch(
      `${ML_SERVICE_URL}/predict?city=${encodeURIComponent(city)}`,
      { signal: controller.signal }
    ).finally(() => clearTimeout(timer));

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({
        status: "error",
        message: err.error || "ML service returned an error.",
      });
    }

    const data = await response.json();
    res.json({ status: "ok", ...data });
  } catch (err) {
    res.status(503).json({
      status: "error",
      message:
        err.name === "AbortError"
          ? "ML service is waking up (Render cold start). Please try again in ~30 seconds."
          : "ML service is not running. Start it with: cd ml_model && python ml_service.py",
      detail: err.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════════
// DISEASE — correlation data (loaded from JSON, instant)
// GET /api/disease/correlations
// GET /api/disease/:causeName
// ════════════════════════════════════════════════════════════════════
router.get("/disease/correlations", (req, res) => {
  const sigOnly = req.query.significant_only === "true";
  let data = corrData;
  if (sigOnly) data = data.filter((r) => r.significant_05 === true || r.significant_05 === "True");

  const enriched = data
    .sort((a, b) => b.pearson_r - a.pearson_r)
    .map((r) => ({
      ...r,
      direction: r.pearson_r >= 0 ? "positive" : "negative",
      bar_width_pct: Math.round(Math.abs(r.pearson_r) * 100),
      sig_stars:
        r.p_value < 0.001 ? "***" : r.p_value < 0.01 ? "**" : r.p_value < 0.05 ? "*" : "ns",
    }));

  res.json({ status: "ok", data: enriched, count: enriched.length });
});

router.get("/disease/:causeName", (req, res) => {
  const name = req.params.causeName.replace(/-/g, " ").trim();
  const row = corrData.find(
    (r) => r.cause_name.toLowerCase() === name.toLowerCase()
  );
  if (!row) {
    return res.status(404).json({
      status: "error",
      message: `Disease '${name}' not found.`,
    });
  }
  res.json({ status: "ok", data: row });
});

// ════════════════════════════════════════════════════════════════════
// META — city/state lists for search dropdowns
// GET /api/meta/cities
// GET /api/meta/states
// ════════════════════════════════════════════════════════════════════
router.get("/meta/cities", (req, res) => {
  res.json({ status: "ok", cities: metaData.cities, count: metaData.cities.length });
});

router.get("/meta/states", (req, res) => {
  res.json({ status: "ok", states: metaData.states, count: metaData.states.length });
});

export default router;
