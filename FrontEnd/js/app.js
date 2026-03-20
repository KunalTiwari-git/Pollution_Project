"use strict";

// ════════════════════════════════════════════
// APP.JS — entry point
// Initialises shared state, map, then boots
// all feature modules in the correct order.
// ════════════════════════════════════════════

window.addEventListener("load", () => {

  // ── Shared state (read/written by all modules via window.VAYU) ──
  window.VAYU = {
    nodeCount:      1,
    connections:    [],
    paths:          {},
    isDraggingNode: false,
    nodeCharts:     {},
    allStations:    [],
    activeMetric:   "AQI",
    map:            null,
  };

  // ── Config ──
  window.VAYU_CONFIG = {
    API_BASE: window.VAYU_API_BASE || "http://localhost:5000/api",
  };

  // ── Map init ──
  const indiaFocus = L.latLngBounds(
    L.latLng(5.0, 65.0),
    L.latLng(38.0, 100.0),
  );

  window.VAYU.map = L.map("map", {
    zoomControl:        false,
    attributionControl: false,
    maxBounds:          indiaFocus,
    maxBoundsViscosity: 0.8,
    minZoom:            5,
  }).setView([22.5937, 78.9629], 5);

  const map = window.VAYU.map;

  map.on("zoomend", () => {
    const z  = map.getZoom();
    const mc = map.getContainer();
    if (z <= 7) mc.classList.add("zoom-out-style");
    else        mc.classList.remove("zoom-out-style");

    let sz = z * 4 - 5;
    if (sz < 8)  sz = 8;
    if (sz > 40) sz = 40;
    document.documentElement.style.setProperty("--marker-size", sz + "px");
  });

  map.fire("zoomend");

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    noWrap:          true,
    subdomains:      "abcd",
    keepBuffer:      8,
    updateWhenIdle:  false,
  }).addTo(map);

  // ── Zoom button wiring ──
  document.getElementById("zIn").onclick  = () => map.zoomIn();
  document.getElementById("zOut").onclick = () => map.zoomOut();
  document.getElementById("zLoc").onclick = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => map.flyTo([p.coords.latitude, p.coords.longitude], 10),
      ()  => alert("Location access denied."),
    );
  };

  // ── Keep node cards pinned to map on pan/zoom ──
  map.on("move zoom viewreset", syncNodes);

  // ── Boot features ──
  initMetricToggle();
  fetchPollutionData();   // also calls buildSearch() after data loads
});
