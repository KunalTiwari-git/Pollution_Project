"use strict";

// ════════════════════════════════════════════
// WATER LOADER — fetches water API, builds markers
// ════════════════════════════════════════════

function getWaterColor(ph) {
  if (!ph) return "#607d8b";
  if (ph >= 6.5 && ph <= 8.5) return "#00bcd4";
  if (ph >= 6.0 && ph <= 9.0) return "#ff9800";
  return "#f44336";
}

function getWaterQualityLabel(ph) {
  if (!ph) return "No Data";
  if (ph >= 6.5 && ph <= 8.5) return "Good";
  if (ph >= 6.0 && ph <= 9.0) return "Moderate";
  return "Poor";
}

async function fetchWaterData() {
  const { map } = window.VAYU;
  const svg = document.getElementById("canvas-svg");
  const app = document.getElementById("app");

  try {
    const response = await fetch(window.VAYU_CONFIG.API_BASE + "/water/data");
    if (!response.ok) throw new Error("Water API returned " + response.status);

    const json = await response.json();
    const records = json.data || [];
    if (!records.length) throw new Error("No water records returned");

    // Group by station_id
    const byStation = {};
    records.forEach(r => {
      if (!byStation[r.station_id]) byStation[r.station_id] = [];
      byStation[r.station_id].push(r);
    });

    window.VAYU.waterMarkers = {};

    Object.entries(byStation).forEach(([sid, rows]) => {
      const info = rows[0];
      const ph   = rows.find(r => r.parameter === "pH")?.value;
      const color = getWaterColor(ph);
      const markerId = "water-marker-" + sid;

      // Store in VAYU for toggle
      window.VAYU.allWaterStations.push({
        id: markerId,
        station_id: sid,
        station_name: info.station_name,
        state: info.state,
        lat: info.latitude,
        lng: info.longitude,
        ph,
        color,
        rows
      });

      const customIcon = L.divIcon({
        className: "",
        html: `<div class="water-circle" style="
          background:${color};
          width:28px;height:28px;
          border-radius:50%;
          border:2px solid rgba(255,255,255,0.8);
          display:flex;align-items:center;justify-content:center;
          font-size:9px;font-weight:700;color:#fff;
          box-shadow:0 0 8px ${color}99;
          cursor:pointer;
        ">💧</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([info.latitude, info.longitude], {
        icon: customIcon,
        interactive: true
      }).addTo(map);

      // Hide by default — only show when Water mode active
      marker._icon && (marker._icon.style.display = "none");
      if (marker._icon) marker._icon.id = markerId;

      window.VAYU.waterMarkers[markerId] = marker;

      marker.on("click", (e) => {
        const newId   = "node-" + (window.VAYU.nodeCount++);
        const newNode = document.createElement("div");
        newNode.className = "node";
        newNode.id = newId;

        const point = map.latLngToContainerPoint(e.latlng);
        newNode.style.left = point.x + "px";
        newNode.style.top  = point.y + "px";
        newNode.dataset.lat = e.latlng.lat;
        newNode.dataset.lng = e.latlng.lng;
        newNode.dataset.stationId = sid;
        newNode.dataset.color = color;

        newNode.innerHTML =
          '<span class="close-btn">&times;</span>' +
          `<div class="header" style="background:${color};color:#fff;">` +
            `<div style="font-size:14px;font-weight:700;">💧 ${info.station_name}</div>` +
            `<div style="font-size:10px;opacity:.8;">${info.state} • Station ${sid}</div>` +
          "</div>" +
          '<div class="node-content">' +
            '<div class="ppf-grid">' +
              `<button class="ppf-btn ppf-present" data-type="water-detail">` +
                `<span class="ppf-icon" style="color:${color}">${ph ? ph.toFixed(1) : "—"}</span>` +
                `<span class="ppf-label">View Data</span>` +
              `</button>` +
            "</div>" +
          "</div>";

        app.appendChild(newNode);

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", "connector");
        svg.appendChild(path);
        window.VAYU.paths[markerId + "-" + newId] = path;
        window.VAYU.connections.push({ from: markerId, to: newId });

        setupNode(newNode);
        syncNodes();

        // Wire the View Data button
        newNode.querySelector('[data-type="water-detail"]').onclick = () => {
          spawnWaterDetailNode(newNode, rows, info, color, sid);
        };
      });
    });

  } catch (err) {
    console.error("Failed to load water data:", err);
  }
}

// ── Spawn the detail panel ─────────────────────────────────────────
function spawnWaterDetailNode(parentNode, rows, info, color, sid) {
  const { map } = window.VAYU;
  const svg = document.getElementById("canvas-svg");
  const app = document.getElementById("app");

  const newId   = "node-" + (window.VAYU.nodeCount++);
  const newNode = document.createElement("div");
  newNode.className = "node node-present";
  newNode.id = newId;

  const p   = map.latLngToContainerPoint([parentNode.dataset.lat, parentNode.dataset.lng]);
  newNode.style.left = (p.x + 290) + "px";
  newNode.style.top  = p.y + "px";
  newNode.dataset.lat = map.containerPointToLatLng([p.x + 290, p.y]).lat;
  newNode.dataset.lng = map.containerPointToLatLng([p.x + 290, p.y]).lng;

  // Build parameter rows
  const PARAMS = [
    { key: "pH",                        label: "pH",          unit: "",      safe: v => v >= 6.5 && v <= 8.5 },
    { key: "Oxygen, dissolved",         label: "DO",          unit: "mg/l",  safe: v => v >= 5 },
    { key: "Biochemical Oxygen Demand", label: "BOD",         unit: "mg/l",  safe: v => v <= 3 },
    { key: "Chemical Oxygen Demand",    label: "COD",         unit: "mg/l",  safe: v => v <= 10 },
    { key: "Water Temperature",         label: "Temp",        unit: "°C",    safe: () => true },
    { key: "Water Turbidity",           label: "Turbidity",   unit: "NTU",   safe: v => v <= 10 },
    { key: "Nitrate",                   label: "Nitrate",     unit: "mg/l",  safe: v => v <= 10 },
    { key: "Chloride",                  label: "Chloride",    unit: "mg/l",  safe: v => v <= 250 },
    { key: "Conductivity",              label: "Conductivity",unit: "mS/cm", safe: () => true },
    { key: "Total Organic Carbon",      label: "TOC",         unit: "mg/l",  safe: v => v <= 4 },
  ];

  let paramRowsHtml = "";
  PARAMS.forEach(p => {
    const row = rows.find(r => r.parameter === p.key);
    const val = row ? parseFloat(row.value) : null;
    const display = val !== null ? val.toFixed(2) : "—";
    const dot = val !== null
      ? (p.safe(val) ? "#4caf50" : "#f44336")
      : "#607d8b";

    paramRowsHtml +=
      `<div style="display:flex;justify-content:space-between;align-items:center;
        padding:6px 0;border-bottom:1px solid #1e293b;">` +
        `<span style="color:#94a3b8;font-size:11px;">${p.label}</span>` +
        `<span style="display:flex;align-items:center;gap:6px;">` +
          `<span style="color:#f1f5f9;font-size:12px;font-weight:600;">${display}</span>` +
          `<span style="font-size:10px;color:#64748b;">${p.unit}</span>` +
          `<span style="width:7px;height:7px;border-radius:50%;background:${dot};display:inline-block;"></span>` +
        `</span>` +
      `</div>`;
  });

  const ph  = rows.find(r => r.parameter === "pH")?.value;
  const label = getWaterQualityLabel(ph);
  const timestamp = rows[0]?.timestamp || "—";

  newNode.innerHTML =
    '<div class="np-header">' +
      '<span class="np-badge np-badge-present" style="background:#0e7490;">WATER</span>' +
      '<span class="close-btn">&times;</span>' +
    "</div>" +
    `<div class="np-subline">💧 ${info.station_name} • ${info.state}</div>` +
    `<div class="np-aqi-hero">` +
      `<div class="np-aqi-number" style="color:${color}">${ph ? parseFloat(ph).toFixed(1) : "—"}</div>` +
      `<div class="np-aqi-label" style="background:${color};color:#fff;">${label}</div>` +
      `<div class="np-prominent">pH Level • Updated: ${timestamp}</div>` +
    `</div>` +
    `<div class="np-section-title">WATER QUALITY PARAMETERS</div>` +
    `<div class="np-bars-wrap" style="padding:0 4px;">${paramRowsHtml}</div>` +
    `<div style="font-size:9px;color:#334155;padding:8px 4px 0;">` +
      `🟢 Within safe limits &nbsp; 🔴 Exceeds safe limits` +
    `</div>`;

  app.appendChild(newNode);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "connector");
  svg.appendChild(path);
  window.VAYU.paths[parentNode.id + "-" + newId] = path;
  window.VAYU.connections.push({ from: parentNode.id, to: newId });
  setupNode(newNode);
  syncNodes();
}