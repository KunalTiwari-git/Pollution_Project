"use strict";

// ════════════════════════════════════════════
// POPUPS — spawnChildNode
// ════════════════════════════════════════════

async function spawnChildNode(parentNode, type, data) {
  const { map, nodeCharts } = window.VAYU;
  const svg = document.getElementById("canvas-svg");
  const app = document.getElementById("app");

  const newId   = "node-" + (window.VAYU.nodeCount++);
  const newNode = document.createElement("div");
  newNode.className = "node";
  newNode.id = newId;

  const p   = map.latLngToContainerPoint([parentNode.dataset.lat, parentNode.dataset.lng]);
  const cLL = map.containerPointToLatLng([p.x + 290, p.y]);
  newNode.dataset.lat = cLL.lat;
  newNode.dataset.lng = cLL.lng;
  // Set pixel position immediately so it appears in the right place
  newNode.style.left = (p.x + 290) + "px";
  newNode.style.top  = p.y + "px";

  const API_BASE = window.VAYU_CONFIG.API_BASE;
  const cityName = data.cityName || "";

  // ── PRESENT ──────────────────────────────────────────────────────
  if (type === "present") {
    newNode.classList.add("node-present");

    const aqi       = data.isOffline ? null : data.aqi;
    const label     = data.isOffline ? "Offline" : getAQILabel(aqi);
    const color     = data.color;
    const textColor = aqi > 200 ? "#fff" : "#000";

    newNode.innerHTML =
      '<div class="np-header">' +
        '<span class="np-badge np-badge-present">PRESENT</span>' +
        '<span class="close-btn">&times;</span>' +
      "</div>" +
      '<div class="np-subline">' + cityName + " \u2022 Real-time Monitoring</div>" +
      '<div class="np-aqi-hero">' +
        '<div class="np-aqi-number" style="color:' + color + '">' + (aqi ?? "\u2014") + "</div>" +
        '<div class="np-aqi-label" style="background:' + color + ';color:' + textColor + '">' + label + "</div>" +
        '<div class="np-prominent">Prominent Pollutant: <strong>' + data.prominent + "</strong></div>" +
      "</div>" +
      '<div class="np-section-title">POLLUTANTS BREAKDOWN VS WHO LIMITS</div>' +
      '<div class="np-bars-wrap">' + data.rowsHtml + "</div>";

    app.appendChild(newNode);

  // ── PAST ─────────────────────────────────────────────────────────
  } else if (type === "past") {
    const chartId = "chart-" + newId;
    newNode.classList.add("node-past");

    newNode.innerHTML =
      '<div class="np-header">' +
        '<span class="np-badge np-badge-past">PAST</span>' +
        '<span class="close-btn">&times;</span>' +
      "</div>" +
      '<div class="np-subline" id="past-subline-' + newId + '">' + cityName + " \u2022 Loading...</div>" +
      '<div id="past-highlights-' + newId + '" class="np-highlights" style="display:none;"></div>' +
      '<div class="np-section-title">PM2.5 TREND <span style="color:#555;font-weight:400;">(Monthly average)</span></div>' +
      '<div class="np-chart-wrap">' +
        '<div id="past-status-' + newId + '" class="np-loading">Loading...</div>' +
        '<canvas id="' + chartId + '" style="display:none;"></canvas>' +
      "</div>" +
      '<div class="np-section-title" style="margin-top:14px;">YEAR-BY-YEAR SUMMARY</div>' +
      '<div id="past-stats-' + newId + '" style="display:none;"></div>';

    app.appendChild(newNode);

    try {
      const res  = await fetch(API_BASE + "/past/city/" + encodeURIComponent(cityName));
      const json = await res.json();
      const statusEl    = document.getElementById("past-status-"     + newId);
      const canvas      = document.getElementById(chartId);
      const statsEl     = document.getElementById("past-stats-"      + newId);
      const sublineEl   = document.getElementById("past-subline-"    + newId);
      const highlightEl = document.getElementById("past-highlights-" + newId);

      if (json.status === "ok" && json.data && json.data.length > 0) {
        const yr0 = json.data[0].year;
        const yr1 = json.data[json.data.length - 1].year;
        sublineEl.textContent = cityName + " \u2022 " + yr0 + "\u2013" + yr1 + " Data";

        const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const sorted = [...json.data].filter(r => r.pm25).sort((a, b) => a.pm25 - b.pm25);
        const best   = sorted[0];
        const worst  = sorted[sorted.length - 1];

        if (best && worst) {
          highlightEl.innerHTML =
            '<div class="np-highlight-box">' +
              '<div class="np-hl-label">BEST MONTH</div>' +
              '<div class="np-hl-month" style="color:#4dffc3">' + MONTHS[best.month] + " " + best.year + "</div>" +
              '<div class="np-hl-val" style="color:#4dffc3">' + best.pm25.toFixed(1) + " \u03bcg/m\u00b3</div>" +
            "</div>" +
            '<div class="np-highlight-box">' +
              '<div class="np-hl-label">WORST MONTH</div>' +
              '<div class="np-hl-month" style="color:#ff4d6d">' + MONTHS[worst.month] + " " + worst.year + "</div>" +
              '<div class="np-hl-val" style="color:#ff4d6d">' + worst.pm25.toFixed(1) + " \u03bcg/m\u00b3</div>" +
            "</div>";
          highlightEl.style.display = "flex";
        }

        statusEl.style.display = "none";
        canvas.style.display   = "block";

        const labels = json.data.map(r => r.year + "-" + String(r.month).padStart(2, "0"));
        const values = json.data.map(r => r.pm25);

        setTimeout(() => {
          nodeCharts[newId] = new Chart(canvas.getContext("2d"), {
            type: "line",
            data: {
              labels,
              datasets: [
                {
                  data: values,
                  borderColor: "#ff6b35",
                  backgroundColor: "rgba(255,107,53,0.1)",
                  borderWidth: 2,
                  fill: true,
                  tension: 0.35,
                  pointRadius: 0,
                },
                {
                  data: labels.map(() => 15),
                  borderColor: "rgba(77,255,195,0.6)",
                  borderWidth: 1.5,
                  borderDash: [5, 4],
                  pointRadius: 0,
                  fill: false,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: ctx => ctx.datasetIndex === 1
                      ? "WHO Limit: 15 \u03bcg/m\u00b3"
                      : "PM2.5: " + ctx.parsed.y.toFixed(1) + " \u03bcg/m\u00b3",
                  },
                },
              },
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

        const byYear = {};
        json.data.forEach(r => {
          if (!byYear[r.year]) byYear[r.year] = [];
          if (r.pm25) byYear[r.year].push(r.pm25);
        });

        let rows = "";
        Object.entries(byYear).sort(([a],[b]) => a-b).forEach(([yr, vals]) => {
          const mn  = Math.min(...vals).toFixed(1);
          const mx  = Math.max(...vals).toFixed(1);
          const avg = (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1);
          const c   = getAQIColor(calculateSubIndex("PM2.5", parseFloat(avg)) || 0);
          rows +=
            "<tr>" +
            '<td class="np-td-yr">' + yr + "</td>" +
            '<td class="np-td-num">' + mn + "</td>" +
            '<td class="np-td-num np-td-avg" style="color:' + c + '">' + avg + "</td>" +
            '<td class="np-td-num">' + mx + "</td>" +
            "</tr>";
        });

        statsEl.innerHTML =
          '<table class="np-table">' +
            "<thead><tr><th>Year</th><th>Min</th><th>Avg</th><th>Max</th></tr></thead>" +
            "<tbody>" + rows + "</tbody>" +
          "</table>";
        statsEl.style.display = "block";

      } else {
        statusEl.textContent = "No history data for this city.";
      }
    } catch (_) {
      const el = document.getElementById("past-status-" + newId);
      if (el) el.textContent = "Backend offline — run: node server.js";
    }

  // ── FUTURE ───────────────────────────────────────────────────────
  } else if (type === "future") {
    const chartId = "chart-" + newId;
    newNode.classList.add("node-future");

    newNode.innerHTML =
      '<div class="np-header">' +
        '<span class="np-badge np-badge-future">FUTURE</span>' +
        '<span class="close-btn">&times;</span>' +
      "</div>" +
      '<div class="np-subline">' + cityName + " \u2022 Next 3 Months Prediction</div>" +
      '<div class="np-model-badges">' +
        '<span class="np-model-pill">R\u00b2 Score: 0.594</span>' +
        '<span class="np-model-pill">MAE: \u00b116.04</span>' +
      "</div>" +
      '<div class="np-section-title">FORECAST TREND (PM2.5)</div>' +
      '<div class="np-chart-wrap">' +
        '<div id="future-status-' + newId + '" class="np-loading">Running ML model...</div>' +
        '<canvas id="' + chartId + '" style="display:none;"></canvas>' +
      "</div>" +
      '<div id="future-month-labels-' + newId + '" class="np-month-labels"></div>' +
      '<div id="future-alert-' + newId + '" class="np-alert" style="display:none;"></div>';

    app.appendChild(newNode);

    try {
      const res  = await fetch(API_BASE + "/future/city/" + encodeURIComponent(cityName));
      const json = await res.json();
      const statusEl = document.getElementById("future-status-"       + newId);
      const canvas   = document.getElementById(chartId);
      const monthsEl = document.getElementById("future-month-labels-" + newId);
      const alertEl  = document.getElementById("future-alert-"        + newId);

      if (json.status === "ok" && json.forecasts && json.forecasts.length > 0) {
        statusEl.style.display = "none";
        canvas.style.display   = "block";

        const labels = json.forecasts.map(f => {
          const parts = f.month_label.split("-");
          return parts[1] || f.month_label;
        });
        const values = json.forecasts.map(f => f.predicted_pm25);
        const colors = json.forecasts.map(f => f.colour);
        const cats   = json.forecasts.map(f =>
          f.aqi_category || getAQILabel(calculateSubIndex("PM2.5", f.predicted_pm25) || 0)
        );

        setTimeout(() => {
          nodeCharts[newId] = new Chart(canvas.getContext("2d"), {
            type: "bar",
            data: {
              labels,
              datasets: [{
                data: values,
                backgroundColor: colors.map(c => c + "cc"),
                borderColor: colors,
                borderWidth: 0,
                borderRadius: 8,
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: "#aaa", font: { size: 12, weight: "600" } }, grid: { display: false } },
                y: { ticks: { color: "#555", font: { size: 9 } }, grid: { color: "rgba(255,255,255,0.04)" } },
              },
            },
          });
        }, 0);

        monthsEl.innerHTML = json.forecasts.map((f, i) =>
          '<div class="np-month-chip">' +
            '<div class="np-month-pm" style="color:' + colors[i] + '">' + values[i].toFixed(0) + "</div>" +
            '<div class="np-month-name">' + labels[i] + "</div>" +
            '<div class="np-month-cat" style="color:' + colors[i] + '">' + cats[i] + "</div>" +
          "</div>"
        ).join("");

        const lastAqi    = data.aqi;
        const worstVal   = Math.max(...values);
        const worstIdx   = values.indexOf(worstVal);
        const pctChange  = lastAqi ? Math.round(((worstVal - lastAqi) / lastAqi) * 100) : null;

        if (pctChange !== null && pctChange > 20) {
          alertEl.innerHTML =
            '<span class="np-alert-icon">\u26a0</span>' +
            "<div><strong>High Risk Alert:</strong> Pollution expected to worsen " +
            "by up to " + pctChange + "% by " + labels[worstIdx] +
            ", significantly increasing the risk of respiratory diseases.</div>";
          alertEl.style.display = "flex";
        }

      } else {
        statusEl.textContent = json.message || "Forecast unavailable for this city.";
      }
    } catch (_) {
      const el = document.getElementById("future-status-" + newId);
      if (el) el.textContent = "ML service offline — run: python ml_service.py";
    }
  }

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "connector");
  svg.appendChild(path);
  window.VAYU.paths[parentNode.id + "-" + newId] = path;
  window.VAYU.connections.push({ from: parentNode.id, to: newId });
  setupNode(newNode);
  syncNodes();
}