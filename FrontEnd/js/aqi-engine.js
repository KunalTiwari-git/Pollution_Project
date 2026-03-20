"use strict";

// ════════════════════════════════════════════
// AQI ENGINE — pure functions, no DOM
// ════════════════════════════════════════════

const AQI_BREAKPOINTS = {
  "PM2.5": [
    { lo: 0,   hi: 30,  aqiLo: 0,   aqiHi: 50  },
    { lo: 31,  hi: 60,  aqiLo: 51,  aqiHi: 100 },
    { lo: 61,  hi: 90,  aqiLo: 101, aqiHi: 200 },
    { lo: 91,  hi: 120, aqiLo: 201, aqiHi: 300 },
    { lo: 121, hi: 250, aqiLo: 301, aqiHi: 400 },
    { lo: 251, hi: 500, aqiLo: 401, aqiHi: 500 },
  ],
  PM10: [
    { lo: 0,   hi: 50,   aqiLo: 0,   aqiHi: 50  },
    { lo: 51,  hi: 100,  aqiLo: 51,  aqiHi: 100 },
    { lo: 101, hi: 250,  aqiLo: 101, aqiHi: 200 },
    { lo: 251, hi: 350,  aqiLo: 201, aqiHi: 300 },
    { lo: 351, hi: 430,  aqiLo: 301, aqiHi: 400 },
    { lo: 431, hi: 1000, aqiLo: 401, aqiHi: 500 },
  ],
  NO2: [
    { lo: 0,   hi: 40,   aqiLo: 0,   aqiHi: 50  },
    { lo: 41,  hi: 80,   aqiLo: 51,  aqiHi: 100 },
    { lo: 81,  hi: 180,  aqiLo: 101, aqiHi: 200 },
    { lo: 181, hi: 280,  aqiLo: 201, aqiHi: 300 },
    { lo: 281, hi: 400,  aqiLo: 301, aqiHi: 400 },
    { lo: 401, hi: 1000, aqiLo: 401, aqiHi: 500 },
  ],
  OZONE: [
    { lo: 0,   hi: 50,   aqiLo: 0,   aqiHi: 50  },
    { lo: 51,  hi: 100,  aqiLo: 51,  aqiHi: 100 },
    { lo: 101, hi: 168,  aqiLo: 101, aqiHi: 200 },
    { lo: 169, hi: 208,  aqiLo: 201, aqiHi: 300 },
    { lo: 209, hi: 748,  aqiLo: 301, aqiHi: 400 },
    { lo: 749, hi: 1000, aqiLo: 401, aqiHi: 500 },
  ],
  CO: [
    { lo: 0,    hi: 1,   aqiLo: 0,   aqiHi: 50  },
    { lo: 1.1,  hi: 2,   aqiLo: 51,  aqiHi: 100 },
    { lo: 2.1,  hi: 10,  aqiLo: 101, aqiHi: 200 },
    { lo: 10.1, hi: 17,  aqiLo: 201, aqiHi: 300 },
    { lo: 17.1, hi: 34,  aqiLo: 301, aqiHi: 400 },
    { lo: 34.1, hi: 100, aqiLo: 401, aqiHi: 500 },
  ],
  NH3: [
    { lo: 0,    hi: 200,  aqiLo: 0,   aqiHi: 50  },
    { lo: 201,  hi: 400,  aqiLo: 51,  aqiHi: 100 },
    { lo: 401,  hi: 800,  aqiLo: 101, aqiHi: 200 },
    { lo: 801,  hi: 1200, aqiLo: 201, aqiHi: 300 },
    { lo: 1201, hi: 1800, aqiLo: 301, aqiHi: 400 },
    { lo: 1801, hi: 2500, aqiLo: 401, aqiHi: 500 },
  ],
};

// WHO 24-hour guideline values
const WHO_LIMITS = {
  "PM2.5": { limit: 15,  unit: "μg/m³" },
  "PM10":  { limit: 45,  unit: "μg/m³" },
  "NO2":   { limit: 25,  unit: "μg/m³" },
  "OZONE": { limit: 100, unit: "μg/m³" },
  "CO":    { limit: 4,   unit: "mg/m³"  },
  "NH3":   { limit: 200, unit: "μg/m³" },
  "SO2":   { limit: 40,  unit: "μg/m³" },
};

function calculateSubIndex(pollutant, concentration) {
  const table = AQI_BREAKPOINTS[pollutant.toUpperCase()];
  if (!table) return null;
  for (const r of table) {
    if (concentration >= r.lo && concentration <= r.hi) {
      return Math.round(
        ((r.aqiHi - r.aqiLo) / (r.hi - r.lo)) * (concentration - r.lo) + r.aqiLo,
      );
    }
  }
  return null;
}

function getAQIColor(value) {
  if (value <= 50)  return "#a8e063";
  if (value <= 100) return "#fdd835";
  if (value <= 200) return "#ff7c00";
  if (value <= 300) return "#f50057";
  if (value <= 400) return "#9c27b0";
  return "#6a0080";
}

function getAQILabel(value) {
  if (value <= 50)  return "Good";
  if (value <= 100) return "Satisfactory";
  if (value <= 200) return "Moderate";
  if (value <= 300) return "Poor";
  if (value <= 400) return "Very Poor";
  return "Severe";
}

function getGlowVars(value) {
  if (value <= 50)  return "rgba(168,224,99,0.75)";
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
  return "--gc1:" + gc1;
}

// Build the enriched pollutant rows HTML for the Present popup
function buildPollutantRowsHtml(pollutants) {
  let rowsHtml = "";
  let stationAQI = 0;
  let prominentPollutant = "N/A";
  const pollutantValues = {};

  pollutants.forEach((p) => {
    const conc = parseFloat(p.avg_value);
    const hasData = !isNaN(conc) && p.avg_value !== "NA";
    const subIndex = hasData ? calculateSubIndex(p.pollutant_id, conc) : null;

    pollutantValues[p.pollutant_id] = { conc: hasData ? conc : null, idx: subIndex };

    if (subIndex !== null && subIndex > stationAQI) {
      stationAQI = subIndex;
      prominentPollutant = p.pollutant_id;
    }

    const rowColor  = subIndex ? getAQIColor(subIndex) : "#607d8b";
    const label     = subIndex ? getAQILabel(subIndex) : "N/A";
    const who       = WHO_LIMITS[p.pollutant_id.toUpperCase()];
    const unitLabel = who ? who.unit : "μg/m³";

    let whoHtml;
    if (who && hasData) {
      const ratio = conc / who.limit;
      const cls   = ratio > 1 ? "over" : "safe";
      const txt   = ratio > 1
        ? (ratio.toFixed(1) + "× WHO")
        : (Math.round((1 - ratio) * 100) + "% below");
      whoHtml = '<span class="who-pill ' + cls + '">' + txt + "</span>";
    } else {
      whoHtml = '<span class="who-pill">—</span>';
    }

    const concCell = hasData
      ? (p.avg_value + ' <span style="color:#555;font-size:9px;">' + unitLabel + "</span>")
      : "NA";

    rowsHtml +=
      '<tr class="poll-row" style="border-left:3px solid ' + rowColor + ';">' +
      '<td style="color:#ccc;font-weight:600;">' + p.pollutant_id + "</td>" +
      "<td>" + concCell + "</td>" +
      "<td>" + whoHtml + "</td>" +
      '<td><span class="health-badge" style="background:' + rowColor + ';">' + label + "</span></td>" +
      "</tr>";
  });

  return { rowsHtml, stationAQI, prominentPollutant, pollutantValues };
}
