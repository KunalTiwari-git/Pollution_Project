// ═══════════════════════════════════════════════════════════════════
//  STATE-TABLE.JS
//  deaths in DATA.state_summary are now raw counts (×1000 removed).
// ═══════════════════════════════════════════════════════════════════

(function () {

  function formatDeaths(rawCount) {
    // rawCount is stored as thousands (×1000 in original data)
    // Display as: full number + Indian notation
    const n = rawCount * 1000;
    const crore = 10_000_000;
    const lakh  =    100_000;
    const full  = n.toLocaleString("en-IN");
    let indian;
    if      (n >= crore) indian = (n / crore).toFixed(2) + " Cr";
    else if (n >= lakh)  indian = (n / lakh).toFixed(1)  + " L";
    else                 indian = full;
    return { full, indian };
  }

  function pollutionLabel(pm) {
    if (pm >= 100) return { label: "SEVERE",    color: "#ff4d6d", bg: "rgba(255,77,109,0.12)"  };
    if (pm >= 75)  return { label: "VERY HIGH", color: "#ff9a3c", bg: "rgba(255,154,60,0.12)"  };
    if (pm >= 50)  return { label: "HIGH",      color: "#fdd835", bg: "rgba(253,216,53,0.12)"  };
    if (pm >= 35)  return { label: "MODERATE",  color: "#4dffc3", bg: "rgba(77,255,195,0.12)"  };
    return                 { label: "LOW",      color: "#5b8fff", bg: "rgba(91,143,255,0.12)"  };
  }

  const states = Object.entries(DATA.state_summary).sort((a, b) => b[1].pm - a[1].pm);
  const maxPM  = states[0][1].pm;
  const tbody  = document.getElementById("stateBody");

  tbody.innerHTML = states.map(([name, v], i) => {
    const rank  = i + 1;
    const isTop = rank <= 3;
    const pl    = pollutionLabel(v.pm);
    const barW  = Math.round((v.pm / maxPM) * 120);
    const pmColor = v.pm >= 100 ? "#ff4d6d"
                  : v.pm >= 75  ? "#ff9a3c"
                  : v.pm >= 50  ? "#fdd835"
                  : v.pm >= 35  ? "#4dffc3"
                  : "#5b8fff";

    const { full, indian } = formatDeaths(v.deaths);

    return `<tr>
      <td><span class="rank-badge ${isTop ? "top" : ""}">${rank}</span></td>
      <td style="font-weight:600;font-size:15px">${name}</td>
      <td>
        <div class="pm-bar">
          <div class="pm-mini" style="width:${barW}px;background:${pmColor}"></div>
          <span style="font-family:'DM Mono',monospace;font-size:13px;color:${pmColor};font-weight:600">${v.pm}</span>
        </div>
      </td>
      <td>
        <div style="line-height:1.4">
          <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:600;color:#e2e4f0">${full}</div>
          <div style="font-family:'DM Mono',monospace;font-size:11px;color:#5a5e80">${indian}</div>
        </div>
      </td>
      <td>
        <span style="padding:3px 10px;border-radius:100px;font-size:10px;font-family:'DM Mono',monospace;
          font-weight:700;letter-spacing:0.06em;border:1px solid ${pl.color}60;
          background:${pl.bg};color:${pl.color}">
          ${pl.label}
        </span>
      </td>
    </tr>`;
  }).join("");
})();