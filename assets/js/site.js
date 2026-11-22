// Motion + filters. Everything is readable without this file; it only adds movement.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canObserve = "IntersectionObserver" in window;
  if (!reduce && canObserve) root.classList.add("motion");

  // Arrived through a page morph: skip the title rise so the two don't fight.
  window.addEventListener("pagereveal", function (e) { if (e.viewTransition) root.classList.add("vt"); });

  /* ---------- Oscilloscope: PID step response (runs even with reduced motion, just without animating) ---------- */
  (function scope() {
    var cv = document.getElementById("scope");
    if (!cv) return;
    var ctx = cv.getContext("2d");
    var readout = document.getElementById("readout");
    var zeta = 0.3, target = 0.3, progress = reduce ? 1 : 0, start = null, w = 0, h = 0;
    function css(n) { return getComputedStyle(root).getPropertyValue(n).trim(); }
    function size() {
      var r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
      w = r.width; h = r.height;
      cv.width = Math.round(w * d); cv.height = Math.round(h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    function y(t, z) { // unit step response of a 2nd-order system, wn = 1
      if (t <= 0) return 0;
      var wd = Math.sqrt(1 - z * z), phi = Math.acos(z);
      return 1 - Math.exp(-z * t) / wd * Math.sin(wd * t + phi);
    }
    function draw(now) {
      var grid = css("--scope-grid"), trace = css("--scope-trace"), ink = css("--scope-ink");
      ctx.clearRect(0, 0, w, h);
      // graticule: 10 x 8 divisions with minor ticks on the center lines
      ctx.lineWidth = 1; ctx.strokeStyle = grid;
      for (var i = 0; i <= 10; i++) { var x = Math.round(i * w / 10) + .5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (var j = 0; j <= 8; j++) { var yy = Math.round(j * h / 8) + .5; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(w, yy); ctx.stroke(); }
      for (var k = 0; k <= 50; k++) { var tx = k * w / 50; ctx.beginPath(); ctx.moveTo(tx, h / 2 - 3); ctx.lineTo(tx, h / 2 + 3); ctx.stroke(); }
      var base = h * 0.82, top = h * 0.3, amp = base - top, x0 = w * 0.08, T = 24;
      // setpoint
      ctx.setLineDash([4, 5]); ctx.strokeStyle = ink; ctx.globalAlpha = .45;
      ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(w, top); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      // trace with phosphor glow
      var end = x0 + (w - x0) * progress, hx = 0, hy = base;
      ctx.beginPath();
      ctx.moveTo(0, base); ctx.lineTo(x0, base);
      for (var px = x0; px <= end; px += 1.5) {
        var t = (px - x0) / (w - x0) * T, jitter = Math.sin(px * 0.9 + now * 0.004) * 0.6;
        hx = px; hy = base - y(t, zeta) * amp + jitter;
        ctx.lineTo(hx, hy);
      }
      ctx.strokeStyle = trace; ctx.lineWidth = 2; ctx.shadowColor = trace; ctx.shadowBlur = 10;
      ctx.stroke(); ctx.shadowBlur = 0;
      // head dot
      if (progress > 0) { ctx.fillStyle = trace; ctx.shadowColor = trace; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, 7); ctx.fill(); ctx.shadowBlur = 0; }
      // labels
      ctx.fillStyle = ink; ctx.globalAlpha = .7; ctx.font = "10px 'IBM Plex Mono', monospace";
      ctx.fillText("SP", 6, top - 6); ctx.fillText("2 V/div", w - 52, 14); ctx.globalAlpha = 1;
    }
    function label() {
      var os = Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta)) * 100;
      readout.textContent = "\u03b6 " + zeta.toFixed(2) + " \u00b7 overshoot " + Math.round(os) + "%";
    }
    var ghost = null, ghostAlpha = 0, cycle = 0;
    function loop(now) {
      if (start === null) start = now;
      if (!reduce) {
        // Sweep, hold, then re-trigger forever; the old trace fades like phosphor.
        var period = 7200, first = 500, local = now - start - first;
        var c = Math.floor(Math.max(0, local) / period);
        if (c !== cycle) { cycle = c; ghost = document.createElement("canvas"); ghost.width = cv.width; ghost.height = cv.height; ghost.getContext("2d").drawImage(cv, 0, 0); ghostAlpha = 0.55; if (!pointerActive) target = 0.18 + Math.random() * 0.45; }
        var p = Math.min(1, (local - c * period) / 1900);
        progress = p <= 0 ? 0 : 1 - Math.pow(1 - p, 3);
        zeta += (target - zeta) * 0.12;
        ghostAlpha *= 0.985;
      } else { zeta = target; }
      label(); draw(now);
      if (ghost && ghostAlpha > 0.01) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = ghostAlpha; ctx.drawImage(ghost, 0, 0); ctx.restore(); }
      if (!reduce) requestAnimationFrame(loop);
    }
    function setFrom(clientX) {
      var r = cv.getBoundingClientRect();
      target = 0.08 + 0.84 * Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      if (reduce) loop(performance.now());
    }
    var pointerActive = false;
    cv.addEventListener("pointerenter", function () { pointerActive = true; });
    cv.addEventListener("pointerleave", function () { pointerActive = false; });
    cv.addEventListener("pointermove", function (e) { setFrom(e.clientX); });
    cv.addEventListener("pointerdown", function (e) { setFrom(e.clientX); });
    size(); window.addEventListener("resize", function () { size(); if (reduce) loop(performance.now()); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (reduce) loop(performance.now()); });
    requestAnimationFrame(loop);
  })();

  /* ---------- Filters on the home page ---------- */
  var buttons = document.querySelectorAll(".filter");
  var entries = document.querySelectorAll(".entry[data-kind]");
  var empty = document.querySelector(".empty");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter"), shown = 0;
      buttons.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      entries.forEach(function (e) {
        var match = f === "all" || e.getAttribute("data-kind") === f;
        e.hidden = !match;
        if (match) { shown++; e.classList.remove("in"); void e.offsetWidth; e.style.transitionDelay = (shown * 60) + "ms"; e.classList.add("in"); }
      });
      if (empty) empty.hidden = shown > 0;
    });
  });

  if (!root.classList.contains("motion")) return;

  /* ---------- Split headline words so they rise one by one ---------- */
  document.querySelectorAll(".split").forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map(function (w, i) {
      return '<span class="w" aria-hidden="true"><span style="transition-delay:' + (i * 55) + 'ms">' + w + "</span></span>";
    }).join(" ");
  });

  /* ---------- Name assembles letter by letter ---------- */
  var n = 0;
  document.querySelectorAll(".name .letters").forEach(function (el) {
    var txt = el.textContent;
    el.setAttribute("aria-label", txt);
    el.innerHTML = txt.split("").map(function (c) {
      return '<span class="ch" aria-hidden="true" style="--i:' + (n++) + '">' + c + "</span>";
    }).join("");
  });

  /* ---------- Stats count up ---------- */
  document.querySelectorAll(".stats dd").forEach(function (dd) {
    var end = parseInt(dd.textContent, 10);
    if (isNaN(end)) return;
    var t0 = null;
    function step(now) {
      if (t0 === null) t0 = now + 700;
      var p = Math.min(1, Math.max(0, (now - t0) / 900));
      dd.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    dd.textContent = "0";
    requestAnimationFrame(step);
  });

  /* ---------- Thumbnails tilt toward the cursor ---------- */
  document.querySelectorAll(".thumb").forEach(function (t) {
    t.addEventListener("pointermove", function (e) {
      var r = t.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      t.style.setProperty("--ry", (x * 14).toFixed(2) + "deg");
      t.style.setProperty("--rx", (y * -14).toFixed(2) + "deg");
    });
    t.addEventListener("pointerleave", function () { t.style.removeProperty("--rx"); t.style.removeProperty("--ry"); });
  });

  /* ---------- Reveal on enter ---------- */
  document.querySelectorAll(".entry, .prose > p > img, .prose > h2, .video, .gallery, .tags").forEach(function (el) {
    el.setAttribute("data-reveal", "");
  });
  var io = new IntersectionObserver(function (list) {
    list.forEach(function (it) {
      if (it.isIntersecting) { it.target.classList.add("in"); io.unobserve(it.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  var batch = 0;
  document.querySelectorAll("[data-reveal]").forEach(function (el) {
    if (el.classList.contains("entry")) { el.style.transitionDelay = (Math.min(batch++, 4) * 70) + "ms"; }
    io.observe(el);
  });

  /* ---------- Scroll-linked effects ---------- */
  var scrubs = document.querySelectorAll("[data-scrub]");
  var bar = document.querySelector(".progress");
  var reel = document.querySelector(".reel");
  var ticking = false;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function frame() {
    ticking = false;
    var vh = window.innerHeight, y = window.scrollY;

    // Post cover: opens from an inset frame to full width while it scrolls in.
    scrubs.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var t = clamp((vh - r.top) / (vh * 0.9));
      el.style.setProperty("--t", t.toFixed(3));
    });

    // Reading progress on posts.
    if (bar) {
      var max = document.documentElement.scrollHeight - vh;
      bar.style.transform = "scaleX(" + (max > 0 ? clamp(y / max) : 0).toFixed(4) + ")";
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  frame();

  /* ---------- Gallery reel: photos settle as they slide past center ---------- */
  if (reel) {
    var shots = reel.querySelectorAll(".shot");
    var rt = false;
    function reelFrame() {
      rt = false;
      var c = reel.getBoundingClientRect();
      var mid = c.left + c.width / 2;
      shots.forEach(function (s) {
        var b = s.getBoundingClientRect();
        var d = Math.min(1, Math.abs(b.left + b.width / 2 - mid) / c.width);
        s.style.setProperty("--d", d.toFixed(3));
      });
    }
    reel.addEventListener("scroll", function () { if (!rt) { rt = true; requestAnimationFrame(reelFrame); } }, { passive: true });
    window.addEventListener("resize", reelFrame);
    reelFrame();

    // Drag with a mouse, like a phone swipe.
    var down = false, sx = 0, sl = 0, moved = false;
    reel.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      down = true; moved = false; sx = e.clientX; sl = reel.scrollLeft; reel.classList.add("dragging");
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      if (Math.abs(e.clientX - sx) > 3) moved = true;
      reel.scrollLeft = sl - (e.clientX - sx);
    });
    window.addEventListener("pointerup", function () {
      if (!down) return;
      down = false; reel.classList.remove("dragging");
    });
    reel.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  }
})();
