"use strict";

// ════════════════════════════════════════════
// NODE MANAGER — drag, connectors, remove
// All functions read/write window.VAYU state
// ════════════════════════════════════════════

function removeNodeAndChildren(targetId) {
  const { connections, paths, nodeCharts } = window.VAYU;

  const children = connections.filter((c) => c.from === targetId);
  children.forEach((child) => {
    removeNodeAndChildren(child.to);
    const childEl = document.getElementById(child.to);
    if (childEl) childEl.remove();
    const pKey = child.from + "-" + child.to;
    if (paths[pKey]) { paths[pKey].remove(); delete paths[pKey]; }
  });

  const incoming = connections.filter((c) => c.to === targetId);
  incoming.forEach((parentConn) => {
    const pKey = parentConn.from + "-" + parentConn.to;
    if (paths[pKey]) { paths[pKey].remove(); delete paths[pKey]; }
  });

  window.VAYU.connections = connections.filter(
    (c) => c.from !== targetId && c.to !== targetId,
  );

  if (nodeCharts[targetId]) {
    nodeCharts[targetId].destroy();
    delete nodeCharts[targetId];
  }
}

function makeDraggable(node) {
  node.querySelector(".header").addEventListener("mousedown", (e) => {
    window.VAYU.isDraggingNode = true;
    const sX = e.clientX - node.offsetLeft;
    const sY = e.clientY - node.offsetTop;

    const move = (m) => {
      node.style.left = (m.clientX - sX) + "px";
      node.style.top  = (m.clientY - sY) + "px";
      updateLines();
    };

    const up = () => {
      const ll = window.VAYU.map.containerPointToLatLng([
        parseInt(node.style.left),
        parseInt(node.style.top),
      ]);
      node.dataset.lat = ll.lat;
      node.dataset.lng = ll.lng;
      window.VAYU.isDraggingNode = false;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  });
}

function updateLines() {
  const { connections, paths, map } = window.VAYU;
  const scaleFactor = map.getZoom() / 5;

  connections.forEach((conn) => {
    const f = document.getElementById(conn.from);
    const t = document.getElementById(conn.to);
    const p = paths[conn.from + "-" + conn.to];
    if (!f || !t || !p) return;

    let fX, fY;
    if (conn.from.startsWith("marker-")) {
      const appEl = document.getElementById("app");
      const r     = f.getBoundingClientRect();
      const cr    = appEl.getBoundingClientRect();
      fX = r.left - cr.left + r.width  / 2;
      fY = r.top  - cr.top  + r.height / 2;
    } else {
      fX = f.offsetLeft + f.offsetWidth  * scaleFactor;
      fY = f.offsetTop  + (f.offsetHeight * scaleFactor) / 2;
    }

    const tX = t.offsetLeft;
    const tY = t.offsetTop + (t.offsetHeight * scaleFactor) / 2;
    p.setAttribute(
      "d",
      "M " + fX + " " + fY +
      " C " + (fX + (tX - fX) / 2) + " " + fY +
      " "   + (fX + (tX - fX) / 2) + " " + tY +
      " "   + tX + " " + tY,
    );
  });
}

function syncNodes() {
  if (window.VAYU.isDraggingNode) return;
  const scaleFactor = window.VAYU.map.getZoom() / 5;
  document.querySelectorAll(".node").forEach((node) => {
    const point = window.VAYU.map.latLngToContainerPoint([
      node.dataset.lat,
      node.dataset.lng,
    ]);
    node.style.left      = point.x + "px";
    node.style.top       = point.y + "px";
    node.style.transform = "scale(" + scaleFactor + ")";
  });
  updateLines();
}

function setupNode(node) {
  makeDraggable(node);

  const ro = new ResizeObserver(() => {
    const chart = window.VAYU.nodeCharts[node.id];
    if (chart) chart.resize();
    updateLines();
  });
  ro.observe(node);

  node.querySelector(".close-btn").onclick = (e) => {
    e.stopPropagation();
    ro.disconnect();
    removeNodeAndChildren(node.id);
    node.remove();
  };

  // PPF buttons on root station nodes
  node.querySelectorAll(".ppf-btn").forEach((btn) => {
    btn.onclick = () => {
      const type      = btn.dataset.type;
      const aqi       = +node.dataset.stationAqi;
      const prominent = node.dataset.prominentPollutant;
      const color     = node.dataset.color;
      const rowsHtml  = decodeURIComponent(node.dataset.rowsHtml || "");
      const isOffline = node.dataset.isOffline === "true";
      const cityName  = node.dataset.cityName  || "";
      spawnChildNode(node, type, { aqi, prominent, color, rowsHtml, isOffline, cityName });
    };
  });
}
