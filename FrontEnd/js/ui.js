// ═══════════════════════════════════════════════════════════════════
//  UI.JS — Card glow effects, unit tooltips, misc interactions
// ═══════════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {

  // ── CARD MOUSE GLOW ──────────────────────────────────────────
  document.querySelectorAll(".card, .ml-card").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  // ── SCROLL REVEAL ─────────────────────────────────────────────
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.animationPlayState = "running";
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".fade-up").forEach(el => {
    el.style.animationPlayState = "paused";
    observer.observe(el);
  });

  // ── UNIT TOOLTIP: μg/m³ ───────────────────────────────────────
  document.querySelectorAll("[data-unit-tip]").forEach(el => {
    const tip = document.createElement("div");
    tip.className = "unit-tip";
    tip.textContent = el.dataset.unitTip;
    document.body.appendChild(tip);

    el.addEventListener("mouseenter", ev => {
      tip.style.display = "block";
      positionTip(tip, ev);
    });
    el.addEventListener("mousemove", ev => positionTip(tip, ev));
    el.addEventListener("mouseleave", () => { tip.style.display = "none"; });
  });

  function positionTip(tip, ev) {
    tip.style.left = ev.clientX + 14 + "px";
    tip.style.top  = ev.clientY - 8 + "px";
  }

  // ── DEATHS CARD CURSOR HINT ───────────────────────────────────
  const trigger = document.getElementById("deathsCardTrigger");
  if (trigger) {
    trigger.title = "Click to explore deaths by all disease categories";
    trigger.style.cursor = "pointer";
    // Add visual "click to expand" hint
    const hint = trigger.querySelector(".click-hint");
    if (!hint) {
      const h = document.createElement("span");
      h.className = "click-hint";
      h.textContent = "Click to explore by disease ↗";
      trigger.appendChild(h);
    }
  }

  // ── SECTION COUNTER ANIMATION ─────────────────────────────────
  function animateCount(el, target, suffix = "", decimals = 0) {
    const duration = 1200;
    const start    = performance.now();
    const update   = now => {
      const p   = Math.min((now - start) / duration, 1);
      const val = target * (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
      el.textContent = val.toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  // Animate hero stats when visible
  const heroStats = document.querySelectorAll(".hstat-val[data-count]");
  const heroObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el  = e.target;
      const val = parseFloat(el.dataset.count);
      const sfx = el.dataset.suffix || "";
      const dec = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
      animateCount(el, val, sfx, dec);
      heroObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  heroStats.forEach(el => heroObserver.observe(el));

});