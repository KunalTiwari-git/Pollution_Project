"use strict";
// ════════════════════════════════════════════
// METRIC TOGGLE — AQI / PM2.5 / PM10 / NO2 pill
// ════════════════════════════════════════════
function initMetricToggle() {
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
      window.VAYU.activeMetric = el.dataset.m;
      mlbl.textContent = el.textContent;
      menu.style.display = "none";

      const isWater = el.dataset.m === "WATER";

      // ── Show/hide water markers ──
      Object.values(window.VAYU.waterMarkers || {}).forEach((marker) => {
        if (marker._icon) marker._icon.style.display = isWater ? "" : "none";
      });

      // ── Show/hide AQI markers ──
      window.VAYU.allStations.forEach((s) => {
        const markerEl = document.getElementById(s.id);
        if (!markerEl) return;
        markerEl.style.display = isWater ? "none" : "";

        if (!isWater) {
          const span = markerEl.querySelector("span");
          const circle = markerEl.querySelector(".aqi-circle");
          if (!span || !circle) return;
          if (window.VAYU.activeMetric === "AQI") {
            span.textContent = s.isOffline ? "?" : s.aqi;
            circle.setAttribute(
              "style",
              "background-color:" + s.color + ";" + glowStyle(s.gv),
            );
          } else {
            const pv = s.pollutantValues[window.VAYU.activeMetric];
            const val = pv && pv.conc != null ? pv.conc : "\u2014";
            span.textContent = val;
            const nc = pv && pv.idx != null ? getAQIColor(pv.idx) : "#607d8b";
            const ng =
              pv && pv.idx != null ? getGlowVars(pv.idx) : offlineGlow();
            circle.setAttribute(
              "style",
              "background-color:" + nc + ";" + glowStyle(ng),
            );
          }
        }
      });
    };
  });
}
