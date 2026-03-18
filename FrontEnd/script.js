"use strict";

const API_BASE_URL = window.VAYU_API_BASE || "http://localhost:5000/api";

window.addEventListener("load", () => {
  const svg = document.getElementById("canvas-svg");
  const app = document.getElementById("app");

  let nodeCount = 1;
  let connections = [];
  let paths = {};
  let isDraggingNode = false;

  const nodeCharts = {};

  // All loaded station data for search
  let allStations = [];
  // Active metric for display
  let activeMetric = "AQI";

  // ════════════════════════════
  // 1. MAP INIT
  // ════════════════════════════
  const indiaFocus = L.latLngBounds(L.latLng(5.0, 65.0), L.latLng(38.0, 100.0));

  const map = L.map("map", {
    zoomControl: false,
    attributionControl: false,
    maxBounds: indiaFocus,
    maxBoundsViscosity: 0.8,
    minZoom: 5,
  }).setView([22.5937, 78.9629], 5);

  map.on("zoomend", function () {
    const z = map.getZoom();
    const mc = map.getContainer();

    // Hide numbers below zoom 7
    if (z <= 7) mc.classList.add("zoom-out-style");
    else mc.classList.remove("zoom-out-style");

    // Dynamic marker size
    let sz = z * 4 - 5;
    if (sz < 8) sz = 8;
    if (sz > 40) sz = 40;
    document.documentElement.style.setProperty("--marker-size", `${sz}px`);
  });

  map.fire("zoomend");

  // CartoDB dark tiles — work on localhost
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    noWrap: true,
    subdomains: "abcd",
    keepBuffer: 8,
    updateWhenIdle: false,
  }).addTo(map);

  // Zoom button wiring
  document.getElementById("zIn").onclick = () => map.zoomIn();
  document.getElementById("zOut").onclick = () => map.zoomOut();
  document.getElementById("zLoc").onclick = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => map.flyTo([p.coords.latitude, p.coords.longitude], 10),
      () => alert("Location access denied."),
    );
  };

  // ════════════════════════════
  // 2. AQI CALCULATION ENGINE
  // ════════════════════════════
  const breakpoints = {
    "PM2.5": [
      { lo: 0, hi: 30, aqiLo: 0, aqiHi: 50 },
      { lo: 31, hi: 60, aqiLo: 51, aqiHi: 100 },
      { lo: 61, hi: 90, aqiLo: 101, aqiHi: 200 },
      { lo: 91, hi: 120, aqiLo: 201, aqiHi: 300 },
      { lo: 121, hi: 250, aqiLo: 301, aqiHi: 400 },
      { lo: 251, hi: 500, aqiLo: 401, aqiHi: 500 },
    ],
    PM10: [
      { lo: 0, hi: 50, aqiLo: 0, aqiHi: 50 },
      { lo: 51, hi: 100, aqiLo: 51, aqiHi: 100 },
      { lo: 101, hi: 250, aqiLo: 101, aqiHi: 200 },
      { lo: 251, hi: 350, aqiLo: 201, aqiHi: 300 },
      { lo: 351, hi: 430, aqiLo: 301, aqiHi: 400 },
      { lo: 431, hi: 1000, aqiLo: 401, aqiHi: 500 },
    ],
    NO2: [
      { lo: 0, hi: 40, aqiLo: 0, aqiHi: 50 },
      { lo: 41, hi: 80, aqiLo: 51, aqiHi: 100 },
      { lo: 81, hi: 180, aqiLo: 101, aqiHi: 200 },
      { lo: 181, hi: 280, aqiLo: 201, aqiHi: 300 },
      { lo: 281, hi: 400, aqiLo: 301, aqiHi: 400 },
      { lo: 401, hi: 1000, aqiLo: 401, aqiHi: 500 },
    ],
    OZONE: [
      { lo: 0, hi: 50, aqiLo: 0, aqiHi: 50 },
      { lo: 51, hi: 100, aqiLo: 51, aqiHi: 100 },
      { lo: 101, hi: 168, aqiLo: 101, aqiHi: 200 },
      { lo: 169, hi: 208, aqiLo: 201, aqiHi: 300 },
      { lo: 209, hi: 748, aqiLo: 301, aqiHi: 400 },
      { lo: 749, hi: 1000, aqiLo: 401, aqiHi: 500 },
    ],
    CO: [
      { lo: 0, hi: 1, aqiLo: 0, aqiHi: 50 },
      { lo: 1.1, hi: 2, aqiLo: 51, aqiHi: 100 },
      { lo: 2.1, hi: 10, aqiLo: 101, aqiHi: 200 },
      { lo: 10.1, hi: 17, aqiLo: 201, aqiHi: 300 },
      { lo: 17.1, hi: 34, aqiLo: 301, aqiHi: 400 },
      { lo: 34.1, hi: 100, aqiLo: 401, aqiHi: 500 },
    ],
    NH3: [
      { lo: 0, hi: 200, aqiLo: 0, aqiHi: 50 },
      { lo: 201, hi: 400, aqiLo: 51, aqiHi: 100 },
      { lo: 401, hi: 800, aqiLo: 101, aqiHi: 200 },
      { lo: 801, hi: 1200, aqiLo: 201, aqiHi: 300 },
      { lo: 1201, hi: 1800, aqiLo: 301, aqiHi: 400 },
      { lo: 1801, hi: 2500, aqiLo: 401, aqiHi: 500 },
    ],
  };

  function calculateSubIndex(pollutant, concentration) {
    const table = breakpoints[pollutant.toUpperCase()];
    if (!table) return null;
    for (let r of table) {
      if (concentration >= r.lo && concentration <= r.hi) {
        return Math.round(
          ((r.aqiHi - r.aqiLo) / (r.hi - r.lo)) * (concentration - r.lo) +
          r.aqiLo,
        );
      }
    }
    return null;
  }

  // IQAir-style vibrant colours
  function getAQIColor(value) {
    if (value <= 50) return "#a8e063";
    if (value <= 100) return "#fdd835";
    if (value <= 200) return "#ff7c00";
    if (value <= 300) return "#f50057";
    if (value <= 400) return "#9c27b0";
    return "#6a0080";
  }

  // Single tight glow matching the dot colour
  function getGlowVars(value) {
    if (value <= 50) return "rgba(168,224,99,0.75)";
    if (value <= 100) return "rgba(253,216,53,0.75)";
    if (value <= 200) return "rgba(255,124,0,0.75)";
    if (value <= 300) return "rgba(245,0,87,0.75)";
    if (value <= 400) return "rgba(156,39,176,0.75)";
    return "rgba(106,0,128,0.75)";
  }

  function offlineGlow() {
    return "rgba(96,125,139,0.6)";
  }

  function glowStyle(gc1) {
    return `--gc1:${gc1}`;
  }

  // ════════════════════════════
  // 3. NODE SYSTEM
  // ════════════════════════════
  function removeNodeAndChildren(targetId) {
    const children = connections.filter((c) => c.from === targetId);
    children.forEach((child) => {
      removeNodeAndChildren(child.to);
      const childEl = document.getElementById(child.to);
      if (childEl) childEl.remove();
      const pKey = `${child.from}-${child.to}`;
      if (paths[pKey]) {
        paths[pKey].remove();
        delete paths[pKey];
      }
    });
    const incoming = connections.filter((c) => c.to === targetId);
    incoming.forEach((parentConn) => {
      const pKey = `${parentConn.from}-${parentConn.to}`;
      if (paths[pKey]) {
        paths[pKey].remove();
        delete paths[pKey];
      }
    });
    connections = connections.filter(
      (c) => c.from !== targetId && c.to !== targetId,
    );
  }

  function drawSimpleTrend(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const data = [70, 65, 80, 50, 45, 40, 30];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#4fc3f7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = (i / (data.length - 1)) * canvas.width;
      const y = canvas.height - (val / 100) * canvas.height;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function setupNode(node) {
    makeDraggable(node);

    // ResizeObserver — redraws Chart.js when user drags the node corner
    const ro = new ResizeObserver(() => {
      const chart = nodeCharts[node.id];
      if (chart) chart.resize();
      updateLines();
    });
    ro.observe(node);

    node.querySelector(".close-btn").onclick = (e) => {
      e.stopPropagation();
      // Destroy chart instance and stop observing before removal
      if (nodeCharts[node.id]) {
        nodeCharts[node.id].destroy();
        delete nodeCharts[node.id];
      }
      ro.disconnect();
      removeNodeAndChildren(node.id);
      node.remove();
    };

    // ── PPF buttons on ROOT nodes ──
    node.querySelectorAll(".ppf-btn").forEach((btn) => {
      btn.onclick = () => {
        const type = btn.dataset.type;
        const aqi = +node.dataset.stationAqi;
        const prominent = node.dataset.prominentPollutant;
        const color = node.dataset.color;
        const rowsHtml = decodeURIComponent(node.dataset.rowsHtml || "");
        const isOffline = node.dataset.isOffline === "true";
        const cityName = node.dataset.cityName || "";
        spawnChildNode(node, type, {
          aqi,
          prominent,
          color,
          rowsHtml,
          isOffline,
          cityName,
        });
      };
    });

    // ── "Add Child +" button on non-root child nodes ──
    const spawnBtn = node.querySelector(".spawn-btn");
    if (spawnBtn) {
      spawnBtn.onclick = () => {
        const newId = `node-${nodeCount++}`;
        const newNode = document.createElement("div");
        newNode.className = "node";
        newNode.id = newId;
        const p = map.latLngToContainerPoint([
          node.dataset.lat,
          node.dataset.lng,
        ]);
        const cLL = map.containerPointToLatLng([p.x + 350, p.y]);
        newNode.dataset.lat = cLL.lat;
        newNode.dataset.lng = cLL.lng;
        newNode.innerHTML = `
          <span class="close-btn">&times;</span>
          <div class="header" style="background:#1e2a3a;color:white;">
            <div style="font-weight:700;font-size:13px;">AQI Trend Analysis</div>
          </div>
          <div class="node-content">
            <canvas id="chart-${newId}" width="190" height="80" style="margin-top:8px;border-radius:6px;"></canvas>
            <button class="spawn-btn" style="margin-top:10px;">Add Child +</button>
          </div>`;
        app.appendChild(newNode);
        drawSimpleTrend(`chart-${newId}`);
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        path.setAttribute("class", "connector");
        svg.appendChild(path);
        paths[`${node.id}-${newId}`] = path;
        connections.push({ from: node.id, to: newId });
        setupNode(newNode);
        syncNodes();
      };
    }
  }

  // ════════════════════════════════════════════════════════
  // ── Spawn a child node based on PPF type ──
  // ════════════════════════════════════════════════════════
  async function spawnChildNode(parentNode, type, data) {
    const newId = `node-${nodeCount++}`;
    const newNode = document.createElement("div");
    newNode.className = "node";
    newNode.id = newId;

    const p = map.latLngToContainerPoint([
      parentNode.dataset.lat,
      parentNode.dataset.lng,
    ]);
    const cLL = map.containerPointToLatLng([p.x + 270, p.y]);
    newNode.dataset.lat = cLL.lat;
    newNode.dataset.lng = cLL.lng;

    const API_BASE = API_BASE_URL;
    const cityName = data.cityName || "";

    if (type === "present") {
      // ── PRESENT: unchanged ──
      newNode.innerHTML = `
        <span class="close-btn">&times;</span>
        <div class="header" style="background:${data.color};color:${data.aqi > 200 ? "#fff" : "#000"};">
          <div style="font-weight:700;font-size:13px;">Current AQI</div>
          <div style="font-size:10px;opacity:.8;">Live Reading</div>
        </div>
        <div class="node-content">
          <div class="score-container">
            <span class="aqi-number" style="color:${data.color};">${data.isOffline ? "??" : data.aqi}</span>
            <span class="prominent-label">Prominent: ${data.prominent}</span>
          </div>
          <table>
            <thead>
              <tr style="color:#666;font-size:10px;text-transform:uppercase;">
                <th align="left">Type</th><th align="right">Avg</th><th align="right">Idx</th>
              </tr>
            </thead>
            <tbody>${data.rowsHtml}</tbody>
          </table>
        </div>`;
      app.appendChild(newNode);
    } else if (type === "past") {
      // ── PAST: responsive line chart ──
      const chartId = `chart-${newId}`;
      newNode.innerHTML = `
        <span class="close-btn">&times;</span>
        <div class="header" style="background:#1a2a1a;color:white;">
          <div style="font-weight:700;font-size:13px;">PM2.5 History</div>
          <div style="font-size:10px;opacity:.8;">2010 – 2023 monthly</div>
        </div>
        <div class="node-content">
          <div id="past-status-${newId}" style="color:#666;font-size:11px;padding:8px 0;text-align:center;">
            Loading...
          </div>
          <canvas id="${chartId}"
            style="display:none;margin-top:4px;border-radius:6px;width:100%;"></canvas>
        </div>`;
      app.appendChild(newNode);

      try {
        const res = await fetch(
          `${API_BASE}/past/city/${encodeURIComponent(cityName)}`,
        );
        const json = await res.json();
        const statusEl = document.getElementById(`past-status-${newId}`);
        const canvas = document.getElementById(chartId);

        if (json.status === "ok" && json.data && json.data.length > 0) {
          statusEl.style.display = "none";
          canvas.style.display = "block";

          const labels = json.data.map(
            (r) => `${r.year}-${String(r.month).padStart(2, "0")}`,
          );
          const values = json.data.map((r) => r.pm25);

          nodeCharts[newId] = new Chart(canvas.getContext("2d"), {
            type: "line",
            data: {
              labels,
              datasets: [
                {
                  data: values,
                  borderColor: "#4fc3f7",
                  backgroundColor: "rgba(79,195,247,0.06)",
                  borderWidth: 1.5,
                  fill: true,
                  tension: 0.3,
                  pointRadius: 0,
                },
              ],
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
                  grid: { color: "rgba(255,255,255,0.04)" },
                },
              },
            },
          });
        } else {
          statusEl.textContent = "No history data for this city.";
        }
      } catch (_) {
        document.getElementById(`past-status-${newId}`).textContent =
          "Backend offline — run: node server.js";
      }
    } else if (type === "future") {
      // ── FUTURE: responsive bar chart ──
      const chartId = `chart-${newId}`;
      newNode.innerHTML = `
        <span class="close-btn">&times;</span>
        <div class="header" style="background:#1a1a2e;color:white;">
          <div style="font-weight:700;font-size:13px;">3-Month Forecast</div>
          <div style="font-size:10px;opacity:.8;">Random Forest · R²=0.594</div>
        </div>
        <div class="node-content">
          <div id="future-status-${newId}" style="color:#666;font-size:11px;padding:8px 0;text-align:center;">
            Running ML model...
          </div>
          <canvas id="${chartId}"
            style="display:none;margin-top:4px;border-radius:6px;width:100%;"></canvas>
          <div id="future-badge-${newId}"
            style="display:none;margin-top:6px;font-size:9px;
                   font-family:monospace;color:#5a5e80;text-align:center;">
          </div>
        </div>`;
      app.appendChild(newNode);

      try {
        const res = await fetch(
          `${API_BASE}/future/city/${encodeURIComponent(cityName)}`,
        );
        const json = await res.json();
        const statusEl = document.getElementById(`future-status-${newId}`);
        const canvas = document.getElementById(chartId);
        const badgeEl = document.getElementById(`future-badge-${newId}`);

        if (
          json.status === "ok" &&
          json.forecasts &&
          json.forecasts.length > 0
        ) {
          statusEl.style.display = "none";
          canvas.style.display = "block";

          const labels = json.forecasts.map((f) => f.month_label);
          const values = json.forecasts.map((f) => f.predicted_pm25);
          const colors = json.forecasts.map((f) => f.colour);
          const confLo = json.forecasts.map((f) => f.confidence_low);
          const confHi = json.forecasts.map((f) => f.confidence_high);

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
                x: {
                  ticks: { color: "#888", font: { size: 9 } },
                  grid: { display: false },
                },
                y: {
                  ticks: { color: "#666", font: { size: 9 } },
                  grid: { color: "rgba(255,255,255,0.04)" },
                  title: {
                    display: true,
                    text: "μg/m³",
                    color: "#555",
                    font: { size: 9 },
                  },
                },
              },
            },
          });

          if (json.model_badge) {
            badgeEl.style.display = "block";
            badgeEl.textContent = `MAE ±${json.model_badge.mae} μg/m³  ·  R²=${json.model_badge.r2}`;
          }
        } else {
          statusEl.textContent =
            json.message || "Forecast unavailable for this city.";
        }
      } catch (_) {
        document.getElementById(`future-status-${newId}`).textContent =
          "ML service offline — run: python ml_service.py";
      }
    }

    // Connect with a dashed SVG line
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "connector");
    svg.appendChild(path);
    paths[`${parentNode.id}-${newId}`] = path;
    connections.push({ from: parentNode.id, to: newId });
    setupNode(newNode);
    syncNodes();
  }

  function syncNodes() {
    if (isDraggingNode) return;
    const scaleFactor = map.getZoom() / 5;
    document.querySelectorAll(".node").forEach((node) => {
      const point = map.latLngToContainerPoint([
        node.dataset.lat,
        node.dataset.lng,
      ]);
      node.style.left = `${point.x}px`;
      node.style.top = `${point.y}px`;
      node.style.transform = `scale(${scaleFactor})`;
    });
    updateLines();
  }

  function updateLines() {
    const scaleFactor = map.getZoom() / 5;
    connections.forEach((conn) => {
      const f = document.getElementById(conn.from);
      const t = document.getElementById(conn.to);
      const p = paths[`${conn.from}-${conn.to}`];
      if (!f || !t || !p) return;
      let fX, fY;
      if (conn.from.startsWith("marker-")) {
        const r = f.getBoundingClientRect();
        const cr = app.getBoundingClientRect();
        fX = r.left - cr.left + r.width / 2;
        fY = r.top - cr.top + r.height / 2;
      } else {
        fX = f.offsetLeft + f.offsetWidth * scaleFactor;
        fY = f.offsetTop + (f.offsetHeight * scaleFactor) / 2;
      }
      const tX = t.offsetLeft;
      const tY = t.offsetTop + (t.offsetHeight * scaleFactor) / 2;
      p.setAttribute(
        "d",
        `M ${fX} ${fY} C ${fX + (tX - fX) / 2} ${fY} ${fX + (tX - fX) / 2} ${tY} ${tX} ${tY}`,
      );
    });
  }

  function makeDraggable(node) {
    node.querySelector(".header").addEventListener("mousedown", (e) => {
      isDraggingNode = true;
      const sX = e.clientX - node.offsetLeft;
      const sY = e.clientY - node.offsetTop;
      const move = (m) => {
        node.style.left = m.clientX - sX + "px";
        node.style.top = m.clientY - sY + "px";
        updateLines();
      };
      const up = () => {
        const ll = map.containerPointToLatLng([
          parseInt(node.style.left),
          parseInt(node.style.top),
        ]);
        node.dataset.lat = ll.lat;
        node.dataset.lng = ll.lng;
        isDraggingNode = false;
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    });
  }

  map.on("move zoom viewreset", syncNodes);

  // ════════════════════════════
  // 4. FETCH POLLUTION DATA
  // ════════════════════════════
  const loadingBar = document.createElement("div");
  loadingBar.id = "loadingBar";
  document.body.appendChild(loadingBar);

  async function fetchPollutionData() {
    const API_BASE = API_BASE_URL;
    const url =
      "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69" +
      "?api-key=579b464db66ec23bdd0000016e3b38c59991434d4ddf38a3b7f5e077" +
      "&format=json&limit=1300";

    try {
      const response = await fetch(url);
      const data = await response.json();
      const stationData = {};

      data.records.forEach((r) => {
        if (!stationData[r.station])
          stationData[r.station] = { details: r, pollutants: [] };
        stationData[r.station].pollutants.push(r);
      });

      Object.values(stationData).forEach((group) => {
        const info = group.details;
        const markerId = `marker-${info.station.replace(/\s+/g, "-")}`;

        let stationAQI = 0,
          prominentPollutant = "N/A",
          rowsHtml = "";
        const pollutantValues = {};

        group.pollutants.forEach((p) => {
          const conc = parseFloat(p.avg_value);
          const hasData = !isNaN(conc) && p.avg_value !== "NA";
          let subIndex = hasData
            ? calculateSubIndex(p.pollutant_id, conc)
            : null;
          pollutantValues[p.pollutant_id] = {
            conc: hasData ? conc : null,
            idx: subIndex,
          };
          if (subIndex !== null && subIndex > stationAQI) {
            stationAQI = subIndex;
            prominentPollutant = p.pollutant_id;
          }
          rowsHtml += `<tr>
            <td style="color:#888">${p.pollutant_id}</td>
            <td align="right">${hasData ? p.avg_value : "NA"}</td>
            <td align="right" style="color:#ffa500">${subIndex || "-"}</td>
          </tr>`;
        });

        const isOffline = stationAQI === 0;
        const color = isOffline ? "#607d8b" : getAQIColor(stationAQI);
        const gv = isOffline ? offlineGlow() : getGlowVars(stationAQI);

        allStations.push({
          id: markerId,
          city: info.city,
          station: info.station,
          lat: parseFloat(info.latitude),
          lng: parseFloat(info.longitude),
          aqi: stationAQI,
          color,
          gv,
          isOffline,
          prominentPollutant,
          rowsHtml,
          pollutantValues,
        });

        const customIcon = L.divIcon({
          className: "custom-aqi-marker",
          html: `<div class="aqi-circle" style="background-color:${color};${glowStyle(gv)}">
                   <span>${isOffline ? "?" : stationAQI}</span>
                 </div>`,
          iconSize: null,
          iconAnchor: null,
        });

        const marker = L.marker(
          [parseFloat(info.latitude), parseFloat(info.longitude)],
          { icon: customIcon, interactive: true },
        ).addTo(map);

        if (marker._icon) marker._icon.id = markerId;

        marker.on("click", (e) => {
          const newId = `node-${nodeCount++}`;
          const newNode = document.createElement("div");
          newNode.className = "node";
          newNode.id = newId;
          const point = map.latLngToContainerPoint(e.latlng);
          newNode.style.left = `${point.x}px`;
          newNode.style.top = `${point.y}px`;
          newNode.dataset.lat = e.latlng.lat;
          newNode.dataset.lng = e.latlng.lng;

          // Store data on node for child spawning
          newNode.dataset.stationAqi = stationAQI;
          newNode.dataset.prominentPollutant = prominentPollutant;
          newNode.dataset.color = color;
          newNode.dataset.rowsHtml = encodeURIComponent(rowsHtml);
          newNode.dataset.isOffline = isOffline;
          newNode.dataset.cityName = info.city;

          newNode.innerHTML = `
            <span class="close-btn">&times;</span>
            <div class="header" style="background:${color};color:${stationAQI > 200 ? "#fff" : "#000"};">
              <div style="font-size:15px;font-weight:700;">${info.city}</div>
              <div style="font-size:10px;opacity:.8;">${info.station}</div>
            </div>
            <div class="node-content">
              <div class="ppf-grid">
                <button class="ppf-btn" data-type="past">
                  <span class="ppf-icon">⏮</span>
                  <span class="ppf-label">Past</span>
                </button>
                <button class="ppf-btn ppf-present" data-type="present">
                  <span class="ppf-icon" style="color:${color}">${isOffline ? "??" : stationAQI}</span>
                  <span class="ppf-label">Present</span>
                </button>
                <button class="ppf-btn" data-type="future">
                  <span class="ppf-icon">📈</span>
                  <span class="ppf-label">Future</span>
                </button>
              </div>
            </div>`;

          app.appendChild(newNode);

          const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
          );
          path.setAttribute("class", "connector");
          svg.appendChild(path);
          paths[`${markerId}-${newId}`] = path;
          connections.push({ from: markerId, to: newId });
          setupNode(newNode);
          syncNodes();
        });
      });

      loadingBar.remove();
      buildSearch();
    } catch (err) {
      console.error("Failed to load pollution data:", err);
      loadingBar.style.background = "#e8453c";
      setTimeout(() => loadingBar.remove(), 2000);
    }
  }

  // ════════════════════════════
  // 5. SEARCH
  // ════════════════════════════
  const inp = document.getElementById("searchInput");
  const dd = document.getElementById("searchDrop");

  function buildSearch() {
    inp.addEventListener("input", () => {
      const q = inp.value.trim().toLowerCase();
      if (q.length < 2) {
        dd.style.display = "none";
        return;
      }
      const res = allStations
        .filter(
          (s) =>
            s.city.toLowerCase().includes(q) ||
            s.station.toLowerCase().includes(q),
        )
        .slice(0, 8);
      if (!res.length) {
        dd.style.display = "none";
        return;
      }
      dd.innerHTML = res
        .map(
          (s, i) => `
        <div class="si" data-i="${i}">
          <span>
            <span>${s.city}</span>
            <span class="sc">${s.station}</span>
          </span>
          <span style="font-weight:700;color:${s.color}">${s.isOffline ? "?" : s.aqi}</span>
        </div>`,
        )
        .join("");
      dd.style.display = "block";
      dd.querySelectorAll(".si").forEach((el, i) => {
        el.onclick = () => {
          const st = res[i];
          map.flyTo([st.lat, st.lng], 12, { duration: 1.2 });
          inp.value = st.city;
          dd.style.display = "none";
        };
      });
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#topbar")) dd.style.display = "none";
    });
  }

  // ════════════════════════════
  // 6. METRIC TOGGLE
  // ════════════════════════════
  const pill = document.getElementById("metricPill");
  const menu = document.getElementById("metricMenu");
  const mlbl = document.getElementById("metricLabel");

  pill.onclick = (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  };
  document.addEventListener("click", () => {
    menu.style.display = "none";
  });
  document.querySelectorAll(".mi").forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      document
        .querySelectorAll(".mi")
        .forEach((x) => x.classList.remove("active"));
      el.classList.add("active");
      activeMetric = el.dataset.m;
      mlbl.textContent = el.textContent;
      menu.style.display = "none";
      allStations.forEach((s) => {
        const markerEl = document.getElementById(s.id);
        if (!markerEl) return;
        const span = markerEl.querySelector("span");
        if (!span) return;
        const circle = markerEl.querySelector(".aqi-circle");
        if (activeMetric === "AQI") {
          span.textContent = s.isOffline ? "?" : s.aqi;
          circle.setAttribute(
            "style",
            `background-color:${s.color};${glowStyle(s.gv)}`,
          );
        } else {
          const pv = s.pollutantValues[activeMetric];
          const val = pv && pv.conc != null ? pv.conc : "—";
          span.textContent = val;
          const nc = pv && pv.idx != null ? getAQIColor(pv.idx) : "#607d8b";
          const ng = pv && pv.idx != null ? getGlowVars(pv.idx) : offlineGlow();
          circle.setAttribute(
            "style",
            `background-color:${nc};${glowStyle(ng)}`,
          );
        }
      });
    };
  });

  // ════════════════════════════
  // START
  // ════════════════════════════
  fetchPollutionData();
});