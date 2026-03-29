/**
 * Главная страница: reveal, демо калькулятора, график сравнения, подсказка для вошедших.
 */
(function () {
  "use strict";

  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }

  function formatRuInt(n) {
    return Math.round(n)
      .toString()
      .replace(/\u00a0/g, " ")
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function animateNumber(el, target, duration, formatter) {
    if (!el) return;
    var start = 0;
    var t0 = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - t0) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      var val = start + (target - start) * eased;
      el.textContent = formatter(val, t >= 1);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initDemoCalculator() {
    var btn = document.getElementById("demo-calc-btn");
    var resultWrap = document.getElementById("demo-calc-result");
    var bar = document.getElementById("demo-result-bar");
    var elPerKm = document.getElementById("demo-val-perkm");
    var elMonth = document.getElementById("demo-val-month");
    var elRating = document.getElementById("demo-val-rating");
    if (!btn || !resultWrap) return;

    var ran = false;
    var busy = false;
    btn.addEventListener("click", function () {
      if (ran) {
        resultWrap.hidden = false;
        resultWrap.classList.add("demo-calc-result--replay");
        window.setTimeout(function () {
          resultWrap.classList.remove("demo-calc-result--replay");
        }, 400);
        return;
      }
      if (busy) return;
      busy = true;
      btn.classList.add("is-loading");
      btn.setAttribute("aria-busy", "true");
      window.setTimeout(function () {
        busy = false;
        btn.classList.remove("is-loading");
        btn.removeAttribute("aria-busy");
        resultWrap.hidden = false;
        ran = true;
        var card = resultWrap.querySelector(".demo-result__card");
        if (card) {
          card.classList.remove("demo-result__card--pulse");
          void card.offsetWidth;
          card.classList.add("demo-result__card--pulse");
        }

        animateNumber(elPerKm, 12.4, 950, function (v, done) {
          return (done ? 12.4 : v).toFixed(1).replace(".", ",");
        });
        animateNumber(elMonth, 18400, 1000, function (v, done) {
          return formatRuInt(done ? 18400 : v);
        });
        animateNumber(elRating, 72, 850, function (v, done) {
          return String(Math.round(done ? 72 : v));
        });
        if (bar) {
          bar.style.width = "0%";
          requestAnimationFrame(function () {
            bar.style.width = "68%";
          });
        }
      }, 720);
    });
  }

  function initCompareChart() {
    var root = document.querySelector("[data-landing-compare-chart]");
    if (!root) return;
    var bars = root.querySelectorAll("[data-pct]");
    bars.forEach(function (b) {
      b.style.width = "0%";
    });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          requestAnimationFrame(function () {
            bars.forEach(function (b) {
              var p = b.getAttribute("data-pct") || "0";
              b.style.width = p + "%";
            });
          });
          io.unobserve(root);
        });
      },
      { threshold: 0.28 }
    );
    io.observe(root);
  }

  function initHeroTilt() {
    var el = document.getElementById("hero-visual-tilt");
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var max = 7;
    el.addEventListener(
      "mousemove",
      function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform =
          "perspective(720px) rotateY(" + (-px * max).toFixed(2) + "deg) rotateX(" + (py * max).toFixed(2) + "deg)";
      },
      { passive: true }
    );
    el.addEventListener(
      "mouseleave",
      function () {
        el.style.transform = "";
      },
      { passive: true }
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
    initHeroTilt();
    initDemoCalculator();
    initCompareChart();

    var params = new URLSearchParams(window.location.search);
    if (params.get("needauth") === "1") {
      window.setTimeout(function () {
        var openBtn = document.querySelector('[data-open-auth="login"]');
        if (openBtn) openBtn.click();
      }, 350);
    }

    if (window.AvtoJretAuth && typeof window.AvtoJretAuth.getSessionEmail === "function") {
      var logged = !!window.AvtoJretAuth.getSessionEmail();
      var note = document.getElementById("hero-logged-note");
      if (note) note.hidden = !logged;
    }
  });
})();
