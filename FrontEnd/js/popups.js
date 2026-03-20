"use strict";

// ════════════════════════════════════════════
// POPUPS — spawnChildNode
// Handles present / past / future child nodes
// ════════════════════════════════════════════

async function spawnChildNode(parentNode, type, data) {
  const { map, nodeCharts } = window.VAYU;
  const svg = document.getElementById("canvas-svg");
  const app = document.getElementById("app");

  const newId  = "node-" + (window.VAYU.nodeCount++);
  const newNode = document.createElement("div");
  newNode.className = "node";
  newNode.id = newId;

  // Position offset from parent
  const p   = map.latLngToContainerPoint([parentNode.dataset.lat, parentNode.dataset.lng]);
  const cLL = map.containerPointToLatLng([p.x + 270, p.y]);
  newNode.dataset.lat = cLL.lat;
  newNode.dataset.lng = cLL.lng;

  const API_BASE = window.VAYU_CONFIG.API_BASE;
  const cityName = data.cityName || "";

  // ── PRESENT ──────────────────────────────
  if (type === "present") {
    newNode.style.width = "300px";
    newNode.innerHTML =
      '<span class="close-btn">&times;</span>' +
      '<div class="header" style="background:' + data.color + ';color:' + (data.aqi > 200 ? "#fff" : "#000") + ';">' +
        '<div style="font-weight:700;font-size:13px;">Current AQI</div>' +
        '<div style="font-size:10px;opacity:.8;">Live Reading</div>' +
      "</div>" +
      '<div class="node-content">' +
        '<div class="score-container">' +
          '<span class="aqi-number" style="color:' + data.color + ';">' + (data.isOffline ? "??" : data.aqi) + "</span>" +
          "<div>" +
            '<div style="font-size:13px;font-weight:700;color:' + data.color + ';">' + (data.isOffline ? "Offline" : getAQILabel(data.aqi)) + "</div>" +
            '<div class="prominent-label">Prominent: ' + data.prominent + "</div>" +
          "</div>" +
        "</div>" +
        '<table class="info-table">' +
          "<thead><tr><th>Pollutant</th><th>Concentration</th><th>vs WHO</th><th>Health Risk</th></tr></thead>" +
          "<tbody>" + data.rowsHtml + "</tbody>" +
        "</table>" +
        '<div style="margin-top:8px;font-size:9px;color:#444;text-align:right;">WHO 24-hr guideline values</div>' +
      "</div>";

    app.appendChild(newNode);

  // ── PAST ─────────────────────────────────
  } else if (type === "past") {
    const chartId = "chart-" + newId;
    newNode.style.width = "310px";
    newNode.innerHTML =
      '<span class="close-btn">&times;</span>' +
      '<div class="header" style="background:#1a2a1a;color:white;">' +
        '<div style="font-weight:700;font-size:13px;">PM2.5 History</div>' +
        '<div style="font-size:10px;opacity:.8;">2010 – 2023 monthly</div>' +
      "</div>" +
      '<div class="node-content">' +
        '<div id="past-status-' + newId + '" style="color:#666;font-size:11px;padding:8px 0;text-align:center;">Loading...</div>' +
        '<canvas id="' + chartId + '" style="display:none;margin-top:4px;border-radius:6px;width:100%;height:130px;"></canvas>' +
        '<div id="past-stats-' + newId + '" style="display:none;"></div>' +
      "</div>";

    app.appendChild(newNode);

    try {
      const res  = await fetch(API_BASE + "/past/city/" + encodeURIComponent(cityName));
      const json = await res.json();
      const statusEl = document.getElementById("past-status-" + newId);
      const canvas   = document.getElementById(chartId);
      const statsEl  = document.getElementById("past-stats-"  + newId);

      if (json.status === "ok" && json.data && json.data.length > 0) {
        statusEl.style.display = "none";
        canvas.style.display   = "block";

        const labels = json.data.map((r) => r.year + "-" + String(r.month).padStart(2, "0"));
        const values = json.data.map((r) => r.pm25);

        // Year-by-year summary
        const byYear = {};
        json.data.forEach((r) => {
          if (!byYear[r.year]) byYear[r.year] = [];
          byYear[r.year].push(r.pm25);
        });

        let yearRows = "";
        Object.entries(byYear).forEach(([yr, vals]) => {
          const mn  = Math.min(...vals).toFixed(1);
          const mx  = Math.max(...vals).toFixed(1);
          const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
          const c   = getAQIColor(calculateSubIndex("PM2.5", parseFloat(avg)) || 0);
          yearRows +=
            "<tr>" +
            '<td style="color:#999;">' + yr + "</td>" +
            "<td>" + mn + "</td>" +
            '<td style="font-weight:600;color:' + c + ';">' + avg + "</td>" +
            "<td>" + mx + "</td>" +
            "</tr>";
        });

        statsEl.innerHTML =
          '<div class="stats-section">' +
            '<div class="stats-title">Year-by-Year Summary (μg/m³)</div>' +
            '<table class="info-table">' +
              "<thead><tr><th>Year</th><th>Min</th><th>Avg</th><th>Max</th></tr></thead>" +
              "<tbody>" + yearRows + "</tbody>" +
            "</table>" +
          "</div>";
        statsEl.style.display = "block";

        setTimeout(() => {
          nodeCharts[newId] = new Chart(canvas.getContext("2d"), {
            type: "line",
            data: {
              labels,
              datasets: [{
                data: values,
                borderColor: "#4fc3f7",
                backgroundColor: "rgba(79,195,247,0.06)",
                borderWidth: 1.5,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { display: false },
                y: {
                  ticks: { color: "#666", font: { size: 9 } },
                  grid:  { color: "rgba(255,255,255,0.04)" },
                },
              },
            },
          });
        }, 0);

      } else {
        statusEl.textContent = "No history data for this city.";
      }
    } catch (_) {
      const el = document.getElementById("past-status-" + newId);
      if (el) el.textContent = "Backend offline — run: node server.js";
    }

  // ── FUTURE ───────────────────────────────
  } else if (type === "future") {
    const chartId = "chart-" + newId;
    newNode.style.width = "290px";
    newNode.innerHTML =
      '<span class="close-btn">&times;</span>' +
      '<div class="header" style="background:#1a1a2e;color:white;">' +
        '<div style="font-weight:700;font-size:13px;">3-Month Forecast</div>' +
        '<div style="font-size:10px;opacity:.8;">Random Forest · R²=0.594</div>' +
      "</div>" +
      '<div class="node-content">' +
        '<div id="future-status-' + newId + '" style="color:#666;font-size:11px;padding:8px 0;text-align:center;">Running ML model...</div>' +
        '<canvas id="' + chartId + '" style="display:none;margin-top:4px;border-radius:6px;width:100%;height:130px;"></canvas>' +
        '<div id="future-table-' + newId + '" style="display:none;"></div>' +
        '<div id="future-badge-' + newId + '" style="display:none;margin-top:6px;font-size:9px;font-family:monospace;color:#5a5e80;text-align:center;"></div>' +
      "</div>";

    app.appendChild(newNode);

    try {
      const res  = await fetch(API_BASE + "/future/city/" + encodeURIComponent(cityName));
      const json = await res.json();
      const statusEl = document.getElementById("future-status-" + newId);
      const canvas   = document.getElementById(chartId);
      const tableEl  = document.getElementById("future-table-" + newId);
      const badgeEl  = document.getElementById("future-badge-" + newId);

      if (json.status === "ok" && json.forecasts && json.forecasts.length > 0) {
        statusEl.style.display = "none";
        canvas.style.display   = "block";

        const labels = json.forecasts.map((f) => f.month_label);
        const values = json.forecasts.map((f) => f.predicted_pm25);
        const colors = json.forecasts.map((f) => f.colour);
        const confLo = json.forecasts.map((f) => f.confidence_low);
        const confHi = json.forecasts.map((f) => f.confidence_high);

        // Forecast detail table
        let forecastRows = "";
        json.forecasts.forEach((f) => {
          const aqiEst = calculateSubIndex("PM2.5", f.predicted_pm25) || 0;
          const cat    = getAQILabel(aqiEst);
          const c      = f.colour || getAQIColor(aqiEst);
          forecastRows +=
            "<tr>" +
            '<td style="color:#bbb;">' + f.month_label + "</td>" +
            '<td style="font-weight:600;">' + f.predicted_pm25.toFixed(1) + ' <span style="color:#555;font-size:9px;">μg/m³</span></td>' +
            '<td class="conf-range">' + f.confidence_low.toFixed(1) + "–" + f.confidence_high.toFixed(1) + "</td>" +
            '<td><span class="health-badge" style="background:' + c + ';">' + cat + "</span></td>" +
            "</tr>";
        });

        tableEl.innerHTML =
          '<div class="stats-section">' +
            '<table class="forecast-table">' +
              "<thead><tr><th>Month</th><th>PM2.5</th><th>Range</th><th>Category</th></tr></thead>" +
              "<tbody>" + forecastRows + "</tbody>" +
            "</table>" +
          "</div>";
        tableEl.style.display = "block";

        setTimeout(() => {
          nodeCharts[newId] = new Chart(canvas.getContext("2d"), {
            type: "bar",
            data: {
              labels,
              datasets: [
                {
                  label: "Predicted PM2.5",
                  data: values,
                  backgroundColor: colors.map((c) => c + "bb"),
                  borderColor: colors,
                  borderWidth: 1.5,
                  borderRadius: 4,
                },
                {
                  label: "Confidence band",
                  data: confHi.map((hi, i) => hi - confLo[i]),
                  backgroundColor: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.1)",
                  borderWidth: 1,
                  borderRadius: 2,
                  type: "bar",
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: "#888", font: { size: 9 } }, grid: { display: false } },
                y: {
                  ticks: { color: "#666", font: { size: 9 } },
                  grid:  { color: "rgba(255,255,255,0.04)" },
                  title: { display: true, text: "μg/m³", color: "#555", font: { size: 9 } },
                },
              },
            },
          });
        }, 0);

        if (json.model_badge) {
          badgeEl.style.display = "block";
          badgeEl.textContent   = "MAE \u00b1" + json.model_badge.mae + " \u03bcg/m\u00b3  \u00b7  R\u00b2=" + json.model_badge.r2;
        }

      } else {
        statusEl.textContent = json.message || "Forecast unavailable for this city.";
      }
    } catch (_) {
      const el = document.getElementById("future-status-" + newId);
      if (el) el.textContent = "ML service offline — run: python ml_service.py";
    }
  }

  // Connect with a dashed SVG line
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "connector");
  svg.appendChild(path);
  window.VAYU.paths[parentNode.id + "-" + newId] = path;
  window.VAYU.connections.push({ from: parentNode.id, to: newId });
  setupNode(newNode);
  syncNodes();
}
