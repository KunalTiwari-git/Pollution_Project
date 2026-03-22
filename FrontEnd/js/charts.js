// ═══════════════════════════════════════════════════════════════════
//  CHARTS.JS — Section 01 & 02 Chart rendering
//  Depends on: data.js, Chart.js
// ═══════════════════════════════════════════════════════════════════

Chart.defaults.color = "#5a5e80";
Chart.defaults.font.family = "'Syne', sans-serif";

const gridColor = "rgba(255,255,255,0.04)";

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 900, easing: "easeOutQuart" },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(13,15,26,0.95)",
      borderColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      titleColor: "#e2e4f0",
      bodyColor: "#9a9ec4",
      padding: 12,
      titleFont: { family: "'Syne', sans-serif", size: 13, weight: "700" },
      bodyFont: { family: "'DM Mono', monospace", size: 12 },
    },
  },
  scales: {
    x: {
      grid: { color: gridColor },
      ticks: { color: "#5a5e80", font: { size: 12 } },
    },
    y: {
      grid: { color: gridColor },
      ticks: { color: "#5a5e80", font: { size: 12 } },
    },
  },
};

// ── PM2.5 TREND CHART ────────────────────────────────────────────
(function () {
  const years = Object.keys(DATA.nat_pm).sort();
  const vals  = years.map(y => DATA.nat_pm[y]);

  const ctx  = document.getElementById("chartPM").getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 220);
  grad.addColorStop(0, "rgba(255,77,109,0.35)");
  grad.addColorStop(1, "rgba(255,77,109,0.00)");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: years,
      datasets: [{
        data: vals,
        borderColor: "#ff4d6d",
        borderWidth: 2,
        backgroundColor: grad,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#ff4d6d",
        pointBorderColor: "#060810",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      }],
    },
    options: {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            title: ctx => `Year ${ctx[0].label}`,
            label: ctx => `PM2.5: ${ctx.parsed.y} μg/m³`,
            afterLabel: ctx => {
              const v = ctx.parsed.y;
              const whoLimit = 5;
              const pct = Math.round(((v - whoLimit) / whoLimit) * 100);
              return `WHO limit: 5 μg/m³  (${pct}% above safe level)`;
            },
          },
        },
      },
      scales: {
        x: { ...baseOptions.scales.x },
        y: {
          ...baseOptions.scales.y,
          ticks: {
            color: "#5a5e80",
            font: { size: 12 },
            callback: v => v + " μg/m³",
          },
        },
      },
    },
  });

  // Update stat display
  const lastYear = years[years.length - 1];
  const lastVal  = DATA.nat_pm[lastYear];
  document.getElementById("pm-cur").textContent = lastVal;
  const whoAbove = Math.round(((lastVal - 5) / 5) * 100);
  document.getElementById("pm-delta").textContent = `▲ ${whoAbove}% above WHO safe limit`;
})();


// ── ALL-CAUSE DEATHS TREND CHART ─────────────────────────────────
(function () {
  const years = Object.keys(DATA.nat_all_deaths).sort();
  const vals  = years.map(y => DATA.nat_all_deaths[y] / 1e6);

  const ctx  = document.getElementById("chartDeaths").getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 220);
  grad.addColorStop(0, "rgba(199,125,255,0.35)");
  grad.addColorStop(1, "rgba(199,125,255,0.00)");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: years,
      datasets: [{
        data: vals,
        backgroundColor: years.map((y, i) => {
          if (y === "2021") return "rgba(255,77,109,0.7)";    // COVID spike
          return i === years.length - 1
            ? "rgba(199,125,255,0.85)"
            : "rgba(199,125,255,0.45)";
        }),
        borderColor: "rgba(199,125,255,0.5)",
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: "rgba(199,125,255,0.85)",
      }],
    },
    options: {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            title: ctx => `Year ${ctx[0].label}`,
            label: ctx => {
              const millions = ctx.parsed.y.toFixed(2);
              const raw = Math.round(ctx.parsed.y * 1e6).toLocaleString("en-IN");
              return `Deaths: ${millions}M (${raw} people)`;
            },
            afterLabel: ctx => {
              const y = ctx.label;
              if (y === "2021") return "Note: 2021 spike includes COVID-19 disruption to reporting";
              return "Air-pollution-attributed deaths across all 21 GBD disease categories";
            },
          },
        },
      },
      scales: {
        x: { ...baseOptions.scales.x },
        y: {
          ...baseOptions.scales.y,
          ticks: {
            color: "#5a5e80",
            font: { size: 12 },
            callback: v => v.toFixed(1) + "M",
          },
          title: {
            display: true,
            text: "Deaths (Millions)",
            color: "#5a5e80",
            font: { size: 11, family: "'DM Mono', monospace" },
          },
        },
      },
    },
  });

  // Update stat display
  const lastYear = years[years.length - 1];
  const lastVal  = DATA.nat_all_deaths[lastYear];
  const millions = (lastVal / 1e6).toFixed(2);
  document.getElementById("deaths-cur").textContent = millions + "M";
})();


// ── CORRELATION BARS ─────────────────────────────────────────────
(function () {
  const pos = DATA.correlations.filter(c =>  c.r > 0.05);
  const neg = DATA.correlations.filter(c =>  c.r < -0.05);

  function colorFor(c) {
    if (c.type === "direct")   return "#ff4d6d";
    if (c.type === "strong")   return "#ff9a3c";
    return "#5b8fff";
  }

  function renderCorr(list, containerId, reverse = false) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const sorted = reverse ? [...list].sort((a,b) => a.r - b.r) : list;
    el.innerHTML = sorted.map(c => {
      const absR = Math.abs(c.r);
      const w    = Math.round(absR * 120);
      const col  = colorFor(c);
      const pctAbove = c.sig ? "" : '<span style="font-size:10px;color:#5a5e80;margin-left:6px">not significant</span>';
      return `<div class="corr-item">
        <span class="corr-name" title="${c.d}">${c.d}</span>
        <div class="corr-bar-wrap">
          <div class="corr-bar" style="width:${w}px;background:${col};opacity:${c.sig ? 1 : 0.4}"></div>
        </div>
        <span class="corr-val" style="color:${col}">${c.r >= 0 ? "+" : ""}${c.r.toFixed(3)}</span>
        <span class="corr-sig" style="background:${col};opacity:${c.sig ? 1 : 0.3}"></span>
        ${pctAbove}
      </div>`;
    }).join("");
  }

  renderCorr(pos, "corrPos");
  renderCorr(neg, "corrNeg", true);
})();


// ── CORRELATION DISTRIBUTION CHART ───────────────────────────────
(function () {
  const sorted = [...DATA.correlations].sort((a, b) => b.r - a.r);
  const ctx    = document.getElementById("chartCorr").getContext("2d");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(d => d.d),
      datasets: [{
        data: sorted.map(d => d.r),
        backgroundColor: sorted.map(d => {
          if (!d.sig) return "rgba(90,94,128,0.4)";
          if (d.r > 0.5)  return "rgba(255,77,109,0.75)";
          if (d.r > 0.15) return "rgba(255,154,60,0.7)";
          if (d.r > 0)    return "rgba(255,154,60,0.45)";
          if (d.r > -0.3) return "rgba(91,143,255,0.55)";
          return "rgba(91,143,255,0.75)";
        }),
        borderColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            title: ctx => ctx[0].label,
            label: ctx => {
              const r = ctx.parsed.y.toFixed(4);
              const strength = Math.abs(ctx.parsed.y) > 0.5 ? "Strong" :
                               Math.abs(ctx.parsed.y) > 0.3 ? "Moderate" : "Weak";
              const dir = ctx.parsed.y > 0 ? "positive (more pollution = more deaths)"
                                           : "negative (see note on urban healthcare)";
              return [`Pearson r = ${r}`, `${strength} ${dir}`];
            },
          },
        },
      },
      scales: {
        x: {
          ...baseOptions.scales.x,
          ticks: {
            color: "#5a5e80",
            font: { size: 10 },
            maxRotation: 40,
            minRotation: 30,
          },
        },
        y: {
          ...baseOptions.scales.y,
          min: -0.7,
          max: 0.8,
          ticks: {
            color: "#5a5e80",
            font: { size: 12 },
            callback: v => v.toFixed(1),
          },
          title: {
            display: true,
            text: "Pearson r  (correlation strength)",
            color: "#5a5e80",
            font: { size: 11, family: "'DM Mono', monospace" },
          },
        },
      },
    },
  });
})();