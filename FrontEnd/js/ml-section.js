// ═══════════════════════════════════════════════════════════════════
//  ML-SECTION.JS — Section 04
//  Task A: real PM2.5 timeline with train/test split (no random data)
//  Task B: real train R² from taskb_regression_results.csv
// ═══════════════════════════════════════════════════════════════════

// ── TASK A — PM2.5 timeline, train vs test period ─────────────────
(function () {
  const m        = DATA.taskA_metrics;
  const allYears = Object.keys(DATA.nat_pm).sort().map(Number);
  const allVals  = allYears.map(y => DATA.nat_pm[y]);
  const testStart = 2021;

  const ctx = document.getElementById("chartTaskA").getContext("2d");

  const trainGrad = ctx.createLinearGradient(0, 0, 0, 280);
  trainGrad.addColorStop(0, "rgba(91,143,255,0.22)");
  trainGrad.addColorStop(1, "rgba(91,143,255,0.00)");

  new Chart(ctx, {
    type: "line",
    data: {
      labels: allYears,
      datasets: [{
        data: allVals,
        borderWidth: 2.5,
        backgroundColor: trainGrad,
        fill: true,
        tension: 0.4,
        pointRadius: allYears.map(y => 5),
        pointBackgroundColor: allYears.map(y => y >= testStart ? "#ff4d6d" : "#5b8fff"),
        pointBorderColor: "#060810",
        pointBorderWidth: 2,
        pointHoverRadius: 8,
        segment: {
          borderColor: ctx2 => allYears[ctx2.p0DataIndex] >= testStart ? "#ff4d6d" : "#5b8fff",
        },
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 900 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(13,15,26,0.97)",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 12,
          titleFont: { family: "'Syne',sans-serif", size: 13, weight: "700" },
          bodyFont: { family: "'DM Mono',monospace", size: 12 },
          callbacks: {
            title: ctx => `Year ${ctx[0].label}`,
            label: ctx => `Actual PM2.5: ${ctx.parsed.y} μg/m³`,
            afterLabel: ctx => {
              const y = Number(ctx.label);
              const who = 5, india = 40;
              const aboveWHO = Math.round(((ctx.parsed.y - who) / who) * 100);
              const period = y >= testStart ? "Test period — held out from training"
                           : y >= 2015      ? "Training period — model learned from these years"
                           : "Reference period (pre-training)";
              return [`${period}`, `${aboveWHO}% above WHO safe limit of 5 μg/m³`];
            },
          },
        },
      },
      scales: {
        x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#5a5e80", font: { size: 12 } } },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#5a5e80", font: { size: 12 }, callback: v => v + " μg/m³" },
        },
      },
    },
  });

  // Honest note below chart
  const noteEl = document.getElementById("taskANote");
  if (noteEl) noteEl.innerHTML = `
    <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:14px">
      <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;
        font-family:'DM Mono',monospace;color:#5b8fff">
        <span style="width:12px;height:3px;background:#5b8fff;border-radius:2px;display:inline-block"></span>
        Training data (up to 2020)
      </span>
      <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;
        font-family:'DM Mono',monospace;color:#ff4d6d">
        <span style="width:12px;height:3px;background:#ff4d6d;border-radius:2px;display:inline-block"></span>
        Test data (2021+, never seen during training)
      </span>
    </div>
    <p style="font-size:13px;font-family:'DM Mono',monospace;color:#5a5e80;margin-top:10px;line-height:1.65">
      This chart shows the real national PM2.5 values the model was trained and evaluated on.
      Individual city-level predicted vs. actual values are in
      <code style="color:#9a9ec4">outputs/taska_predictions.csv</code> (1,202 rows).
      Test R² = <strong style="color:#5b8fff">${m.test_r2}</strong> &nbsp;|&nbsp;
      Avg error = <strong style="color:#4dffc3">±${m.test_mae} μg/m³</strong> &nbsp;|&nbsp;
      Baseline (Linear Regression) test R² = ${m.lr_test_r2}
    </p>`;
})();


// ── TASK B — Disease Regression R² Chart ─────────────────────────
(function () {
  const sorted = [...DATA.taskb].sort((a, b) => b.r2 - a.r2);
  const ctx    = document.getElementById("chartTaskB").getContext("2d");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(d => d.d),
      datasets: [{
        data: sorted.map(d => d.r2),
        backgroundColor: sorted.map(d =>
          d.r2 >= 0.65 ? "rgba(199,125,255,0.85)" :
          d.r2 >= 0.5  ? "rgba(199,125,255,0.65)" :
          d.r2 >= 0.4  ? "rgba(91,143,255,0.65)"  :
                         "rgba(91,143,255,0.40)"
        ),
        borderColor:  "rgba(199,125,255,0.3)",
        borderWidth:  1,
        borderRadius: 6,
        hoverBackgroundColor: "rgba(199,125,255,0.95)",
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(13,15,26,0.97)",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 12,
          titleFont: { family: "'Syne',sans-serif", size: 13, weight: "700" },
          bodyFont: { family: "'DM Mono',monospace", size: 12 },
          callbacks: {
            title: ctx => ctx[0].label,
            label: ctx => {
              const r2 = ctx.parsed.x;
              return [
                `Train R² = ${r2.toFixed(3)}`,
                `Explains ${Math.round(r2*100)}% of state-level variation in deaths`,
                `(Note: test R² is lower — see Research page for full breakdown)`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          min: 0, max: 0.8,
          ticks: { color: "#5a5e80", font: { size: 12 }, callback: v => v.toFixed(1) },
          title: { display: true, text: "Train R²  (0 = no fit · 1 = perfect fit)",
            color: "#5a5e80", font: { size: 11, family: "'DM Mono',monospace" } },
        },
        y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#9a9ec4", font: { size: 12 } } },
      },
    },
  });
})();


// ── FEATURE TAGS ─────────────────────────────────────────────────
(function () {
  const colors = ["#5b8fff","#ff9a3c","#4dffc3","#c77dff","#ff4d6d","#fdd835","#4dffc3","#5b8fff","#ff9a3c"];
  const el = document.getElementById("featureTags");
  if (!el) return;
  el.innerHTML = DATA.features.map((f, i) => `
    <span style="padding:7px 16px;border-radius:8px;font-size:12px;font-family:'DM Mono',monospace;
      font-weight:500;background:${colors[i]}18;border:1px solid ${colors[i]}40;color:${colors[i]}">
      ${f.label}
    </span>`).join("");
})();