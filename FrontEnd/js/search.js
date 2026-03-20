"use strict";

// ════════════════════════════════════════════
// SEARCH — city/station dropdown
// ════════════════════════════════════════════

function buildSearch() {
  const inp = document.getElementById("searchInput");
  const dd  = document.getElementById("searchDrop");

  inp.addEventListener("input", () => {
    const q = inp.value.trim().toLowerCase();
    if (q.length < 2) { dd.style.display = "none"; return; }

    const res = window.VAYU.allStations
      .filter((s) =>
        s.city.toLowerCase().includes(q) ||
        s.station.toLowerCase().includes(q),
      )
      .slice(0, 8);

    if (!res.length) { dd.style.display = "none"; return; }

    dd.innerHTML = res.map((s) =>
      '<div class="si">' +
        "<span>" +
          "<span>" + s.city + "</span>" +
          '<span class="sc">' + s.station + "</span>" +
        "</span>" +
        '<span style="font-weight:700;color:' + s.color + '">' + (s.isOffline ? "?" : s.aqi) + "</span>" +
      "</div>",
    ).join("");

    dd.style.display = "block";
    dd.querySelectorAll(".si").forEach((el, i) => {
      el.onclick = () => {
        const st = res[i];
        window.VAYU.map.flyTo([st.lat, st.lng], 12, { duration: 1.2 });
        inp.value = st.city;
        dd.style.display = "none";
      };
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#topbar")) dd.style.display = "none";
  });
}
