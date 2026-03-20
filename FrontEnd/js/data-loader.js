"use strict";

// ════════════════════════════════════════════
// DATA LOADER — fetches pollution API, builds markers
// ════════════════════════════════════════════

async function fetchPollutionData() {
  const { map } = window.VAYU;
  const svg = document.getElementById("canvas-svg");
  const app = document.getElementById("app");

  const loadingBar = document.createElement("div");
  loadingBar.id = "loadingBar";
  document.body.appendChild(loadingBar);

  try {
    // ── Fetch via backend proxy (avoids browser CORS block on data.gov.in) ──
    const response = await fetch(window.VAYU_CONFIG.API_BASE + "/stations");

    if (!response.ok) {
      throw new Error("Backend returned " + response.status);
    }

    const data = await response.json();

    if (data.status !== "ok" || !data.records || data.records.length === 0) {
      throw new Error(data.message || "No station records returned");
    }

    // Group by station
    const stationData = {};
    data.records.forEach((r) => {
      if (!stationData[r.station])
        stationData[r.station] = { details: r, pollutants: [] };
      stationData[r.station].pollutants.push(r);
    });

    Object.values(stationData).forEach((group) => {
      const info     = group.details;
      const markerId = "marker-" + info.station.replace(/\s+/g, "-");

      // Build AQI + enriched row HTML via aqi-engine
      const { rowsHtml, stationAQI, prominentPollutant, pollutantValues } =
        buildPollutantRowsHtml(group.pollutants);

      const isOffline = stationAQI === 0;
      const color     = isOffline ? "#607d8b" : getAQIColor(stationAQI);
      const gv        = isOffline ? offlineGlow() : getGlowVars(stationAQI);

      window.VAYU.allStations.push({
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
        html:
          '<div class="aqi-circle" style="background-color:' + color + ";" + glowStyle(gv) + '">' +
          "<span>" + (isOffline ? "?" : stationAQI) + "</span></div>",
        iconSize:   null,
        iconAnchor: null,
      });

      const marker = L.marker(
        [parseFloat(info.latitude), parseFloat(info.longitude)],
        { icon: customIcon, interactive: true },
      ).addTo(map);

      if (marker._icon) marker._icon.id = markerId;

      marker.on("click", (e) => {
        const newId   = "node-" + (window.VAYU.nodeCount++);
        const newNode = document.createElement("div");
        newNode.className  = "node";
        newNode.id         = newId;

        const point = map.latLngToContainerPoint(e.latlng);
        newNode.style.left = point.x + "px";
        newNode.style.top  = point.y + "px";
        newNode.dataset.lat               = e.latlng.lat;
        newNode.dataset.lng               = e.latlng.lng;
        newNode.dataset.stationAqi        = stationAQI;
        newNode.dataset.prominentPollutant = prominentPollutant;
        newNode.dataset.color             = color;
        newNode.dataset.rowsHtml          = encodeURIComponent(rowsHtml);
        newNode.dataset.isOffline         = isOffline;
        newNode.dataset.cityName          = info.city;

        newNode.innerHTML =
          '<span class="close-btn">&times;</span>' +
          '<div class="header" style="background:' + color + ";color:" + (stationAQI > 200 ? "#fff" : "#000") + ';">' +
            '<div style="font-size:15px;font-weight:700;">' + info.city + "</div>" +
            '<div style="font-size:10px;opacity:.8;">' + info.station + "</div>" +
          "</div>" +
          '<div class="node-content">' +
            '<div class="ppf-grid">' +
              '<button class="ppf-btn" data-type="past"><span class="ppf-icon">\u23ee</span><span class="ppf-label">Past</span></button>' +
              '<button class="ppf-btn ppf-present" data-type="present"><span class="ppf-icon" style="color:' + color + '">' + (isOffline ? "??" : stationAQI) + '</span><span class="ppf-label">Present</span></button>' +
              '<button class="ppf-btn" data-type="future"><span class="ppf-icon">\uD83D\uDCC8</span><span class="ppf-label">Future</span></button>' +
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
      });
    });

    loadingBar.remove();
    buildSearch();

  } catch (err) {
    console.error("Failed to load pollution data:", err);
    loadingBar.style.background = "#e8453c";

    // Show visible error on map
    const errBanner = document.createElement("div");
    errBanner.id = "dataErrorBanner";
    errBanner.innerHTML =
      '<span style="font-size:14px;">⚠</span> ' +
      "Could not load station data — " + (err.message || "network error") +
      '. <a href="javascript:location.reload()" style="color:#4fc3f7;text-decoration:underline;">Retry</a>';
    document.body.appendChild(errBanner);

    setTimeout(() => loadingBar.remove(), 2000);
  }
}