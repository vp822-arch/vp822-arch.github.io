// Workbench: a 2-link IK arm and a PID balancing robot, drawn on canvas.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function css(n) { return getComputedStyle(root).getPropertyValue(n).trim(); }

  function setup(cv) {
    var ctx = cv.getContext("2d"), st = { w: 0, h: 0, ctx: ctx };
    function size() {
      var d = window.devicePixelRatio || 1;
      st.w = cv.offsetWidth; st.h = cv.offsetHeight;
      cv.width = Math.round(st.w * d); cv.height = Math.round(st.h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    size(); window.addEventListener("resize", size);
    return st;
  }
  function grid(ctx, w, h, step, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    for (var x = step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, h); ctx.stroke(); }
    for (var y = step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(w, Math.round(y) + .5); ctx.stroke(); }
  }
  // Only animate while on screen.
  function whenVisible(el, start, stop) {
    if (!("IntersectionObserver" in window)) { start(); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? start() : stop(); }); }, { threshold: 0.05 }).observe(el);
  }

  /* ================= Two-link arm, inverse kinematics ================= */
  (function arm() {
    var cv = document.getElementById("arm");
    if (!cv) return;
    var S = setup(cv), ctx = S.ctx;
    var out = { t1: document.getElementById("arm-t1"), t2: document.getElementById("arm-t2"), xy: document.getElementById("arm-xy"), mode: document.getElementById("arm-mode") };
    var target = null, tip = { x: 0, y: 0 }, grip = 0, gripGoal = 0, trail = [], hover = false, raf = 0, t0 = performance.now();

    function geom() {
      var L = Math.min(S.w * 0.27, S.h * 0.42);
      return { bx: S.w / 2, by: S.h * 0.86, L1: L, L2: L * 0.82 };
    }
    function ik(g, x, y) {
      var dx = x - g.bx, dy = g.by - y; // y up
      var r = Math.hypot(dx, dy), max = g.L1 + g.L2 - 1, min = Math.abs(g.L1 - g.L2) + 1;
      if (r > max) { dx *= max / r; dy *= max / r; r = max; }
      if (r < min) { var k = min / (r || 1); dx *= k; dy *= k; r = min; }
      var c2 = (r * r - g.L1 * g.L1 - g.L2 * g.L2) / (2 * g.L1 * g.L2);
      var t2 = -Math.acos(Math.max(-1, Math.min(1, c2))); // elbow up
      var t1 = Math.atan2(dy, dx) - Math.atan2(g.L2 * Math.sin(t2), g.L1 + g.L2 * Math.cos(t2));
      return { t1: t1, t2: t2 };
    }
    function idleTarget(g, now) {
      // a slow figure-eight inside the reach envelope
      var t = (now - t0) / 1000 * 0.55, R = (g.L1 + g.L2) * 0.62;
      return { x: g.bx + Math.sin(t) * R * 0.95, y: g.by - (g.L1 + g.L2) * 0.62 - Math.sin(2 * t) * R * 0.32 };
    }
    function link(x1, y1, x2, y2, wdt, fill, stroke) {
      var a = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1);
      ctx.save(); ctx.translate(x1, y1); ctx.rotate(a);
      ctx.beginPath(); ctx.roundRect(-wdt / 2, -wdt / 2, len + wdt, wdt, wdt / 2);
      ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    }
    function joint(x, y, r, ring, core) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = ring; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r * .42, 0, 7); ctx.fillStyle = core; ctx.fill();
    }
    function frame(now) {
      var g = geom(), w = S.w, h = S.h;
      var ink = css("--scope-ink"), trace = css("--scope-trace"), gridc = css("--scope-grid"), accent = css("--accent");
      var goal = (hover && target) ? target : idleTarget(g, now);
      if (!tip.x) { tip.x = goal.x; tip.y = goal.y; }
      var k = reduce ? 1 : 0.14;
      tip.x += (goal.x - tip.x) * k; tip.y += (goal.y - tip.y) * k;
      grip += (gripGoal - grip) * (reduce ? 1 : 0.25);
      var a = ik(g, tip.x, tip.y);
      var ex = g.bx + g.L1 * Math.cos(a.t1), ey = g.by - g.L1 * Math.sin(a.t1);
      var tx = ex + g.L2 * Math.cos(a.t1 + a.t2), ty = ey - g.L2 * Math.sin(a.t1 + a.t2);

      ctx.clearRect(0, 0, w, h);
      grid(ctx, w, h, 24, gridc);
      // reach envelope
      ctx.setLineDash([3, 6]); ctx.strokeStyle = ink; ctx.globalAlpha = .28;
      ctx.beginPath(); ctx.arc(g.bx, g.by, g.L1 + g.L2, Math.PI, 0); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      // floor
      ctx.strokeStyle = ink; ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(16, g.by + 14); ctx.lineTo(w - 16, g.by + 14); ctx.stroke(); ctx.globalAlpha = 1;
      // trail of the end effector
      trail.push({ x: tx, y: ty }); if (trail.length > 70) trail.shift();
      for (var i = 1; i < trail.length; i++) {
        ctx.strokeStyle = trace; ctx.globalAlpha = i / trail.length * .55; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // target crosshair
      if (hover && target) {
        ctx.strokeStyle = accent; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(target.x - 8, target.y); ctx.lineTo(target.x + 8, target.y); ctx.moveTo(target.x, target.y - 8); ctx.lineTo(target.x, target.y + 8); ctx.stroke();
        ctx.beginPath(); ctx.arc(target.x, target.y, 12, 0, 7); ctx.stroke();
      }
      // base
      ctx.fillStyle = ink; ctx.globalAlpha = .9;
      ctx.beginPath(); ctx.roundRect(g.bx - 34, g.by + 4, 68, 10, 3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(g.bx - 20, g.by + 4); ctx.lineTo(g.bx - 12, g.by - 8); ctx.lineTo(g.bx + 12, g.by - 8); ctx.lineTo(g.bx + 20, g.by + 4); ctx.fill();
      ctx.globalAlpha = 1;
      // links
      var bodyFill = css("--scope-bg"), wd = Math.max(12, g.L1 * 0.12);
      link(g.bx, g.by, ex, ey, wd, bodyFill, ink);
      link(ex, ey, tx, ty, wd * 0.8, bodyFill, ink);
      // gripper
      var ang = a.t1 + a.t2, open = (1 - grip) * 0.5 + 0.12, fl = wd * 1.25;
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(-ang);
      ctx.strokeStyle = trace; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(open) * fl, -Math.sin(open) * fl); ctx.lineTo(fl * 1.5, -Math.sin(open) * fl * .6);
      ctx.moveTo(0, 0); ctx.lineTo(Math.cos(open) * fl, Math.sin(open) * fl); ctx.lineTo(fl * 1.5, Math.sin(open) * fl * .6); ctx.stroke();
      ctx.restore();
      joint(g.bx, g.by, wd * .62, ink, trace);
      joint(ex, ey, wd * .55, ink, trace);
      joint(tx, ty, wd * .4, ink, accent);
      // angle arcs
      ctx.strokeStyle = trace; ctx.globalAlpha = .6; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(g.bx, g.by, wd * 1.6, -a.t1, 0, a.t1 < 0); ctx.stroke(); ctx.globalAlpha = 1;

      var d1 = a.t1 * 180 / Math.PI, d2 = a.t2 * 180 / Math.PI;
      if (out.t1) out.t1.textContent = d1.toFixed(1) + "°";
      if (out.t2) out.t2.textContent = d2.toFixed(1) + "°";
      if (out.xy) out.xy.textContent = Math.round((tx - g.bx) / g.L1 * 200) + ", " + Math.round((g.by - ty) / g.L1 * 200) + " mm";
      if (out.mode) out.mode.textContent = hover ? (gripGoal ? "Gripping" : "Tracking cursor") : "Auto path";
      if (!reduce) raf = requestAnimationFrame(frame);
    }
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener("pointerenter", function () { hover = true; });
    cv.addEventListener("pointerleave", function () { hover = false; gripGoal = 0; });
    cv.addEventListener("pointermove", function (e) { hover = true; target = pos(e); if (reduce) frame(performance.now()); });
    cv.addEventListener("pointerdown", function (e) { hover = true; target = pos(e); gripGoal = 1; if (reduce) frame(performance.now()); });
    window.addEventListener("pointerup", function () { gripGoal = 0; });
    if (reduce) { frame(performance.now()); window.addEventListener("resize", function () { frame(performance.now()); }); return; }
    whenVisible(cv, function () { if (!raf) raf = requestAnimationFrame(frame); }, function () { cancelAnimationFrame(raf); raf = 0; });
  })();

  /* ================= Self-balancing robot, PID ================= */
  (function balance() {
    var cv = document.getElementById("bot");
    if (!cv) return;
    var S = setup(cv), ctx = S.ctx;
    var out = { th: document.getElementById("bot-th"), u: document.getElementById("bot-u"), state: document.getElementById("bot-state") };
    // state: th lean (rad, + right), w rate, x cart (m), v cart speed
    var th = 0.18, w = 0, x = 0, v = 0, I = 0, u = 0, g = 9.81, l = 0.6;
    var Kp = 38, Ki = 4, Kd = 7, Kx = 1.2, Kv = 1.9;
    var hist = [], last = null, nextNudge = performance.now() + 4500, flash = 0, wheel = 0, raf = 0, fallen = 0;

    function step(dt) {
      var thRef = Math.max(-0.2, Math.min(0.2, -(Kx * x + Kv * v) * 0.1));
      var e = th - thRef;
      I = Math.max(-0.5, Math.min(0.5, I + e * dt));
      u = Kp * e + Ki * I + Kd * w;
      var alpha = (g * Math.sin(th) - u * Math.cos(th)) / l;
      w += alpha * dt; th += w * dt; v += u * dt; x += v * dt;
      wheel += v * dt / 0.08;
      if (Math.abs(th) > 1.1 || Math.abs(x) > 2.2) { th = 0; w = 0; x = 0; v = 0; I = 0; fallen = 1; }
    }
    function nudge(dir) { w += dir * (1.8 + Math.random() * 0.7); flash = 1; }
    function frame(now) {
      var dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000); last = now;
      if (!reduce) {
        for (var s = 0; s < 4; s++) step(dt / 4);
        if (now > nextNudge) { nudge(Math.random() < .5 ? -1 : 1); nextNudge = now + 5000 + Math.random() * 3000; }
      }
      var W = S.w, H = S.h, ink = css("--scope-ink"), trace = css("--scope-trace"), gridc = css("--scope-grid"), comp = css("--comp"), bg = css("--scope-bg");
      ctx.clearRect(0, 0, W, H);
      grid(ctx, W, H, 24, gridc);
      var plotH = H * 0.26, floorY = H - plotH - 18, ppm = W / 4.6, cx = W / 2 + x * ppm;
      // floor with moving ticks so motion reads
      ctx.strokeStyle = ink; ctx.globalAlpha = .55; ctx.beginPath(); ctx.moveTo(10, floorY); ctx.lineTo(W - 10, floorY); ctx.stroke();
      for (var t = -3; t <= 3; t += 0.5) { var px = W / 2 + t * ppm; ctx.beginPath(); ctx.moveTo(px, floorY); ctx.lineTo(px, floorY + (t % 1 === 0 ? 7 : 4)); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // robot: wheel + body
      var r = Math.max(10, W * 0.045), bodyL = Math.min(H * 0.42, W * 0.32), bw = r * 1.5;
      var wx = cx, wy = floorY - r;
      ctx.save(); ctx.translate(wx, wy); ctx.rotate(th);
      ctx.beginPath(); ctx.roundRect(-bw / 2, -bodyL, bw, bodyL, 5);
      ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = flash > .05 ? comp : ink; ctx.lineWidth = 1.5; ctx.stroke();
      // board details: IMU chip + status LED
      ctx.fillStyle = ink; ctx.globalAlpha = .6; ctx.fillRect(-bw * .28, -bodyL * .55, bw * .56, bw * .4); ctx.globalAlpha = 1;
      ctx.fillStyle = trace; ctx.shadowColor = trace; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, -bodyL + 9, 3, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      // sensor eye
      ctx.strokeStyle = trace; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-bw * .3, -bodyL * .8); ctx.lineTo(bw * .3, -bodyL * .8); ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(wx, wy, r, 0, 7); ctx.fillStyle = ink; ctx.fill();
      ctx.strokeStyle = bg; ctx.lineWidth = 2;
      for (var sp = 0; sp < 3; sp++) { var aa = wheel + sp * 2.094; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(aa) * r * .8, wy + Math.sin(aa) * r * .8); ctx.stroke(); }
      // vertical reference
      ctx.setLineDash([3, 5]); ctx.strokeStyle = ink; ctx.globalAlpha = .35;
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx, wy - bodyL - 14); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (flash > .05) {
        ctx.fillStyle = comp; ctx.globalAlpha = flash; ctx.font = "600 11px 'IBM Plex Mono', monospace";
        ctx.fillText("PUSH", wx - 14, wy - bodyL - 22); ctx.globalAlpha = 1; flash *= 0.96;
      }
      // tilt history plot
      hist.push(th); if (hist.length > 240) hist.shift();
      var py = H - plotH / 2 - 6;
      ctx.strokeStyle = ink; ctx.globalAlpha = .3; ctx.beginPath(); ctx.moveTo(10, py); ctx.lineTo(W - 10, py); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.beginPath();
      for (var i = 0; i < hist.length; i++) {
        var hx = 10 + (W - 20) * i / 239, hy = py - Math.max(-1, Math.min(1, hist[i] / 0.35)) * plotH * .45;
        i ? ctx.lineTo(hx, hy) : ctx.moveTo(hx, hy);
      }
      ctx.strokeStyle = trace; ctx.lineWidth = 1.5; ctx.shadowColor = trace; ctx.shadowBlur = 6; ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = ink; ctx.globalAlpha = .6; ctx.font = "10px 'IBM Plex Mono', monospace"; ctx.fillText("TILT", 12, H - plotH - 2); ctx.globalAlpha = 1;

      if (out.th) out.th.textContent = (th * 180 / Math.PI).toFixed(1) + "°";
      if (out.u) out.u.textContent = u.toFixed(1);
      if (out.state) out.state.textContent = fallen ? "Reset" : (Math.abs(th) > 0.08 ? "Recovering" : "Balanced");
      if (fallen && Math.abs(th) < 0.02) fallen = 0;
      if (!reduce) raf = requestAnimationFrame(frame);
    }
    cv.addEventListener("pointerdown", function (e) {
      var rct = cv.getBoundingClientRect(), cx = rct.width / 2 + x * rct.width / 4.6;
      nudge(e.clientX - rct.left < cx ? 1 : -1); // push away from the click side
      nextNudge = performance.now() + 7000;
      if (reduce) { for (var s = 0; s < 240; s++) step(1 / 120); frame(performance.now()); }
    });
    if (reduce) { th = 0; frame(performance.now()); window.addEventListener("resize", function () { frame(performance.now()); }); return; }
    whenVisible(cv, function () { if (!raf) { last = null; raf = requestAnimationFrame(frame); } }, function () { cancelAnimationFrame(raf); raf = 0; });
  })();
})();
