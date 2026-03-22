// ═══════════════════════════════════════════════════════════════════
//  DEATHS-MODAL.JS — Clickable modal showing all 21 disease categories
//  Data: disease_national.csv via DATA.per_disease
//  Scalable: future pollution types (water, soil) can add their own
//  disease sets by passing a { type, diseases } config.
// ═══════════════════════════════════════════════════════════════════

let deathsModalChart = null;
let selectedDisease  = null;

// ── Category grouping (for display ordering) ─────────────────────
const DISEASE_GROUPS = [
  {
    label: "Respiratory Diseases",
    color: "#ff9a3c",
    diseases: [
      "Asthma",
      "Chronic obstructive pulmonary disease",
      "Chronic respiratory diseases",
      "Lower respiratory infections",
      "Upper respiratory infections",
      "Respiratory infections and tuberculosis",
      "Tuberculosis",
      "Pulmonary aspiration and foreign body in airway",
      "Interstitial lung disease and pulmonary sarcoidosis",
      "Pulmonary Arterial Hypertension",
    ],
  },
  {
    label: "Cardiovascular Diseases",
    color: "#ff4d6d",
    diseases: [
      "Cardiovascular diseases",
      "Ischemic heart disease",
      "Stroke",
      "Ischemic stroke",
      "Hypertensive heart disease",
      "Atrial fibrillation and flutter",
    ],
  },
  {
    label: "Cancer",
    color: "#c77dff",
    diseases: ["Tracheal, bronchus, and lung cancer"],
  },
  {
    label: "Neonatal & Developmental",
    color: "#5b8fff",
    diseases: [
      "Neonatal encephalopathy due to birth asphyxia and trauma",
      "Neonatal preterm birth",
      "Congenital birth defects",
      "Otitis media",
    ],
  },
];

// ── Open modal ───────────────────────────────────────────────────
function openDeathsModal() {
  const modal = document.getElementById("deathsModal");
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
  renderDeathsOverview();
}

// ── Close modal ──────────────────────────────────────────────────
function closeDeathsModal() {
  const modal = document.getElementById("deathsModal");
  modal.classList.remove("active");
  document.body.style.overflow = "";
  if (deathsModalChart) {
    deathsModalChart.destroy();
    deathsModalChart = null;
  }
  selectedDisease = null;
}

// Close on overlay click
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("deathsModal")
    .addEventListener("click", e => {
      if (e.target.id === "deathsModal") closeDeathsModal();
    });
  document.getElementById("deathsModalClose")
    .addEventListener("click", closeDeathsModal);
  document.getElementById("deathsCardTrigger")
    .addEventListener("click", openDeathsModal);
  document.getElementById("deathsCardTrigger")
    .style.cursor = "pointer";

  // ESC key
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeDeathsModal();
  });
});

// ── Render the overview bar chart (2023 deaths by disease) ───────
function renderDeathsOverview() {
  // Get 2023 deaths for every disease, sorted descending
  const year = "2023";
  const entries = Object.entries(DATA.per_disease)
    .map(([name, years]) => ({ name, deaths: years[year] || 0 }))
    .sort((a, b) => b.deaths - a.deaths);

  // Assign colors by group
  function colorForDisease(name) {
    for (const g of DISEASE_GROUPS) {
      if (g.diseases.includes(name)) return g.color;
    }
    return "#9a9ec4";
  }

  // Update title
  document.getElementById("modalChartTitle").textContent =
    "Annual Deaths by Disease — All Air Pollution Causes (2023)";

  // Destroy previous
  if (deathsModalChart) { deathsModalChart.destroy(); deathsModalChart = null; }

  const ctx = document.getElementById("deathsModalChart").getContext("2d");

  deathsModalChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: entries.map(e => e.name),
      datasets: [{
        data: entries.map(e => e.deaths),
        backgroundColor: entries.map(e => colorForDisease(e.name) + "BB"),
        borderColor:     entries.map(e => colorForDisease(e.name) + "80"),
        borderWidth: 1,
        borderRadius: 5,
        hoverBackgroundColor: entries.map(e => colorForDisease(e.name)),
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700 },
      onClick: (_, elements) => {
        if (!elements.length) return;
        const idx  = elements[0].index;
        const name = entries[idx].name;
        renderDiseaseTrend(name);
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(13,15,26,0.97)",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 12,
          titleFont: { family: "'Syne', sans-serif", size: 13, weight: "700" },
          bodyFont: { family: "'DM Mono', monospace", size: 12 },
          callbacks: {
            title: ctx => ctx[0].label,
            label: ctx => {
              const n = ctx.parsed.x;
              const full = n.toLocaleString("en-IN");
              const crore = 10_000_000, lakh = 100_000;
              const indian = n >= crore ? (n/crore).toFixed(2)+" Cr"
                           : n >= lakh  ? (n/lakh).toFixed(1)+" L"
                           : full;
              return [`Deaths in 2023: ${full}`, `(${indian})`];
            },
            afterLabel: () => "Click bar to see year-on-year trend",
          },
        },
      },
      scales: {
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#9a9ec4", font: { size: 11 } },
        },
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#5a5e80",
            font: { size: 11 },
            callback: v => v >= 1e6 ? (v/1e6).toFixed(1)+"M" : (v/1e3).toFixed(0)+"K",
          },
          title: {
            display: true,
            text: "Annual Deaths (2023)",
            color: "#5a5e80",
            font: { size: 11, family: "'DM Mono', monospace" },
          },
        },
      },
    },
  });

  // Render group legend
  renderGroupLegend();
  // Show back button state
  document.getElementById("modalBackBtn").style.display = "none";
}

// ── Render single disease year-on-year trend ─────────────────────
function renderDiseaseTrend(diseaseName) {
  selectedDisease = diseaseName;
  const yearData  = DATA.per_disease[diseaseName];
  if (!yearData) return;

  const years = Object.keys(yearData).sort();
  const vals  = years.map(y => yearData[y]);

  document.getElementById("modalChartTitle").textContent =
    `Annual Deaths — ${diseaseName} (2010–2023)`;

  if (deathsModalChart) { deathsModalChart.destroy(); deathsModalChart = null; }

  const ctx = document.getElementById("deathsModalChart").getContext("2d");

  // Find color
  let col = "#c77dff";
  for (const g of DISEASE_GROUPS) {
    if (g.diseases.includes(diseaseName)) { col = g.color; break; }
  }

  const grad = ctx.createLinearGradient(0, 0, 0, 360);
  grad.addColorStop(0, col + "44");
  grad.addColorStop(1, col + "00");

  deathsModalChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: years,
      datasets: [{
        data: vals,
        borderColor: col,
        borderWidth: 2.5,
        backgroundColor: grad,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: col,
        pointBorderColor: "#060810",
        pointBorderWidth: 2,
        pointHoverRadius: 7,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(13,15,26,0.97)",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 12,
          titleFont: { family: "'Syne', sans-serif", size: 13, weight: "700" },
          bodyFont: { family: "'DM Mono', monospace", size: 12 },
          callbacks: {
            title: ctx => `Year ${ctx[0].label}`,
            label: ctx => {
              const n = ctx.parsed.y;
              return `Deaths: ${n.toLocaleString("en-IN")}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#5a5e80", font: { size: 12 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#5a5e80",
            font: { size: 12 },
            callback: v => v >= 1e6 ? (v/1e6).toFixed(2)+"M"
                        : v >= 1e3  ? (v/1e3).toFixed(0)+"K"
                        : v,
          },
          title: {
            display: true,
            text: "Annual Deaths",
            color: "#5a5e80",
            font: { size: 11, family: "'DM Mono', monospace" },
          },
        },
      },
    },
  });

  document.getElementById("modalBackBtn").style.display = "inline-flex";
}

function renderGroupLegend() {
  const el = document.getElementById("modalGroupLegend");
  el.innerHTML = DISEASE_GROUPS.map(g => `
    <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;
      font-family:'DM Mono',monospace;color:#9a9ec4">
      <span style="width:10px;height:10px;border-radius:2px;background:${g.color};flex-shrink:0"></span>
      ${g.label}
    </span>`).join("");
}

// Back to overview
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("modalBackBtn")
    .addEventListener("click", () => {
      selectedDisease = null;
      renderDeathsOverview();
    });
});