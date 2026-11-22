// Motion + filters. Everything is readable without this file; it only adds movement.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canObserve = "IntersectionObserver" in window;
  if (!reduce && canObserve) root.classList.add("motion");

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
  var hero = document.querySelector(".intro h1");
  var lede = document.querySelector(".intro .lede");
  var scrubs = document.querySelectorAll("[data-scrub]");
  var bar = document.querySelector(".progress");
  var reel = document.querySelector(".reel");
  var ticking = false;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function frame() {
    ticking = false;
    var vh = window.innerHeight, y = window.scrollY;

    // Home: the name compresses along Archivo's width axis as you scroll away.
    if (hero) {
      var p = clamp(y / (vh * 0.55));
      hero.style.fontVariationSettings = '"wdth" ' + (100 - 38 * p).toFixed(1) + ', "wght" ' + (800 + 100 * p).toFixed(0);
      hero.style.transform = "translateY(" + (p * -18).toFixed(1) + "px)";
      if (lede) lede.style.opacity = (1 - p * 0.9).toFixed(3);
    }

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
