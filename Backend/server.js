import express from "express";
import cors from "cors";
import analysisRoutes from "./routes/analysis.js";
import "dotenv/config";
import waterRoutes from "./routes/water.js";
const app = express();
const PORT = process.env.PORT || 5000;

// Allow frontend — add your Render frontend URL here after deploying
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://127.0.0.1:5500", "http://localhost:5500"]
  : true; // allow all in dev

app.use(cors({ origin: allowedOrigins }));

app.use(express.json());

// ── Routes ──
app.use("/api", analysisRoutes);
app.use("/api/water", waterRoutes);
// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Vayu backend is running" });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Past data:    http://localhost:${PORT}/api/past/city/Delhi`);
  console.log(`Live AQI:     http://localhost:${PORT}/api/present/city/Delhi`);
  console.log(`ML Forecast:  http://localhost:${PORT}/api/future/city/Delhi`);
});
