// ═══════════════════════════════════════════════════════════════════
//  ML-SECTION.JS — Section 04
//
//  Task A scatter chart: REAL data from outputs/taska_predictions.csv
//    - 80 rows sampled evenly from 1,202 total test-period predictions
//    - Actual column: PM25_next  |  Predicted column: PM25_predicted
//    - MAE verified from file: 16.04 μg/m³
//    - NO Math.random() — every point is a real city-month prediction
//
//  Task B R² chart: from taskb_regression_results.csv (train R², top 8)
// ═══════════════════════════════════════════════════════════════════

// ── TASK A — Real Predicted vs Actual Scatter ─────────────────────
// Source: outputs/taska_predictions.csv (1,202 rows, test period 2021+)
// 80 rows sampled with np.linspace(0, 1201, 80) for even coverage
(function () {
  const m = DATA.taskA_metrics;

  // ── REAL DATA from taska_predictions.csv ──────────────────────
  // Columns used: PM25_next (actual), PM25_predicted (predicted)
  // Sampled: 80 rows evenly spaced across 1,202 test-period records
  const SCATTER_PTS = [
    {x:47.85, y:45.38},{x:72.4, y:44.96},{x:15.66, y:20.13},
    {x:13.44, y:16.93},{x:46.56, y:34.3},{x:49.64, y:58.11},
    {x:59.23, y:57.57},{x:23.3, y:34.48},{x:33.37, y:22.11},
    {x:81.54, y:107.5},{x:76.71, y:71.5},{x:61.38, y:46.35},
    {x:55.5, y:46.71},{x:33.42, y:22.07},{x:18.58, y:16.12},
    {x:43.85, y:68.16},{x:150.73, y:117.74},{x:78.96, y:83.62},
    {x:25.27, y:36.22},{x:28.94, y:42.34},{x:64.45, y:88.14},
    {x:34.87, y:32.08},{x:76.24, y:45.32},{x:53.24, y:59.89},
    {x:52.2, y:36.56},{x:38.88, y:27.76},{x:137.3, y:138.48},
    {x:79.99, y:116.38},{x:92.78, y:64.73},{x:73.8, y:66.22},
    {x:93.82, y:53.96},{x:55.96, y:86.28},{x:93.26, y:76.22},
    {x:53.96, y:40.3},{x:48.2, y:39.98},{x:61.52, y:50.03},
    {x:20.41, y:18.39},{x:100.56, y:47.73},{x:23.46, y:52.3},
    {x:41.1, y:31.21},{x:114.04, y:104.03},{x:70.0, y:134.41},
    {x:52.95, y:66.36},{x:22.16, y:40.28},{x:55.6, y:61.71},
    {x:54.39, y:51.13},{x:19.68, y:29.93},{x:25.92, y:17.61},
    {x:101.52, y:104.7},{x:69.25, y:68.85},{x:23.71, y:32.53},
    {x:98.89, y:77.93},{x:30.96, y:48.36},{x:16.49, y:26.41},
    {x:25.8, y:21.32},{x:116.11, y:137.04},{x:77.24, y:76.1},
    {x:76.97, y:52.31},{x:48.37, y:71.87},{x:25.56, y:25.07},
    {x:34.15, y:32.33},{x:25.48, y:24.43},{x:15.48, y:28.84},
    {x:64.99, y:84.52},{x:127.15, y:121.87},{x:47.28, y:49.57},
    {x:27.38, y:37.51},{x:12.26, y:16.18},{x:28.06, y:30.55},
    {x:10.6, y:15.21},{x:82.03, y:38.71},{x:14.49, y:46.02},
    {x:45.68, y:50.57},{x:42.13, y:40.16},{x:64.23, y:44.98},
    {x:61.3, y:51.33},{x:158.77, y:110.55},{x:50.8, y:52.31},
    {x:51.9, y:90.13},{x:52.31, y:34.82}
  ];

  const ctx = document.getElementById("chartTaskA").getContext("2d");

  new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          // Real predictions
          label: "Predicted vs Actual",
          data: SCATTER_PTS,
          backgroundColor: "rgba(91,143,255,0.55)",
          borderColor: "rgba(91,143,255,0.8)",
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBorderWidth: 0,
        },
        {
          // Perfect-fit diagonal — if prediction = actual exactly
          label: "Perfect fit (y = x)",
          data: [{x:0,y:0},{x:270,y:270}],
          type: "line",
          borderColor: "rgba(77,255,195,0.45)",
          borderDash: [5, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800 },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: "#5a5e80",
            boxWidth: 12,
            font: { size: 11, family: "'DM Mono',monospace" },
          },
        },
        tooltip: {
          backgroundColor: "rgba(13,15,26,0.97)",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 12,
          titleFont: { family: "'Syne',sans-serif", size: 13, weight: "700" },
          bodyFont: { family: "'DM Mono',monospace", size: 12 },
          filter: item => item.datasetIndex === 0,
          callbacks: {
            title: () => "City-month prediction",
            label: ctx => {
              const actual    = ctx.parsed.x;
              const predicted = ctx.parsed.y;
              const err       = Math.abs(predicted - actual).toFixed(1);
              return [
                `Actual:    ${actual} μg/m³`,
                `Predicted: ${predicted} μg/m³`,
                `Error:     ±${err} μg/m³`,
              ];
            },
            afterLabel: () =>
              `Model MAE across all 1,202 test rows: ±${m.test_mae} μg/m³`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          min: 0,
          max: 270,
          ticks: { color: "#5a5e80", font: { size: 12 }, callback: v => v + " μg/m³" },
          title: {
            display: true,
            text: "Actual PM2.5 (μg/m³)",
            color: "#5a5e80",
            font: { size: 11, family: "'DM Mono',monospace" },
          },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          min: 0,
          max: 270,
          ticks: { color: "#5a5e80", font: { size: 12 }, callback: v => v + " μg/m³" },
          title: {
            display: true,
            text: "Predicted PM2.5 (μg/m³)",
            color: "#5a5e80",
            font: { size: 11, family: "'DM Mono',monospace" },
          },
        },
      },
    },
  });

  const noteEl = document.getElementById("taskANote");
  if (noteEl) noteEl.innerHTML = `
    <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:14px">
      <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;
        font-family:'DM Mono',monospace;color:#5b8fff">
        <span style="width:10px;height:10px;border-radius:50%;background:rgba(91,143,255,0.6);
          display:inline-block"></span>
        Real city-month prediction (1 of 1,202)
      </span>
      <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;
        font-family:'DM Mono',monospace;color:#4dffc3">
        <span style="width:18px;height:2px;background:rgba(77,255,195,0.5);
          border-top:2px dashed rgba(77,255,195,0.5);display:inline-block"></span>
        Perfect fit line (y = x)
      </span>
    </div>
    <p style="font-size:13px;font-family:'DM Mono',monospace;color:#5a5e80;margin-top:10px;line-height:1.65">
      Data: <code style="color:#9a9ec4">outputs/taska_predictions.csv</code> —
      80 of 1,202 test-period city-month predictions shown (evenly sampled).
      Test R² = <strong style="color:#5b8fff">${m.test_r2}</strong> &nbsp;|&nbsp;
      Avg error = <strong style="color:#4dffc3">±${m.test_mae} μg/m³</strong> &nbsp;|&nbsp;
      Points above the diagonal = under-prediction &nbsp;|&nbsp;
      Points below = over-prediction.
    </p>`;
})();


// ── TASK B — Disease Regression R² Chart ─────────────────────────
// Source: taskb_regression_results.csv — top 8 by train_r2
// IMPORTANT: these are TRAINING set R² values.
// Test R² values are substantially lower (model trained 2010-2019, tested 2020-2023).
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
                `Pollution explains ${Math.round(r2 * 100)}% of state-level variation in deaths`,
                `(Training set only — test R² is lower. See Research page.)`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          min: 0, max: 0.8,
          ticks: {
            color: "#5a5e80",
            font: { size: 12 },
            callback: v => v.toFixed(1),
          },
          title: {
            display: true,
            text: "Train R²  (0 = no fit · 1 = perfect fit)",
            color: "#5a5e80",
            font: { size: 11, family: "'DM Mono',monospace" },
          },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#9a9ec4", font: { size: 12 } },
        },
      },
    },
  });
})();


// ── FEATURE TAGS ─────────────────────────────────────────────────
(function () {
  const colors = [
    "#5b8fff","#ff9a3c","#4dffc3","#c77dff",
    "#ff4d6d","#fdd835","#4dffc3","#5b8fff","#ff9a3c",
  ];
  const el = document.getElementById("featureTags");
  if (!el) return;
  el.innerHTML = DATA.features.map((f, i) => `
    <span style="padding:7px 16px;border-radius:8px;font-size:12px;
      font-family:'DM Mono',monospace;font-weight:500;
      background:${colors[i]}18;border:1px solid ${colors[i]}40;color:${colors[i]}">
      ${f.label}
    </span>`).join("");
})();