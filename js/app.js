/**
 * АвтоЖрёт — интерактив: калькулятор (демо), анимации, шаринг, модалка статей.
 * Замените calculateOwnershipDemo на вызов API при готовности бэкенда.
 */

(function () {
  "use strict";

  /** @param {string} str */
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  /**
   * Демо-расчёт стоимости владения. Замените на async fetch('/api/calculate', { body: ... })
   * @param {{ vin: string, mileage: number, fuelLPer100: number | null }} input
   * @returns {{ perKm: number, perMonth: number, perYear: number, rating: number, youBarPct: number }}
   */
  function calculateOwnershipDemo(input) {
    const seed = hashString((input.vin || "DEMO").toUpperCase().replace(/\s/g, ""));
    const mileage = Math.min(Math.max(input.mileage || 0, 0), 2e6);
    const mileageFactor = 1 + Math.min(mileage / 500000, 0.35);

    const baseFuel = input.fuelLPer100 != null && input.fuelLPer100 > 0
      ? input.fuelLPer100
      : 7 + (seed % 60) / 10;

    const fuelRubPerKm = (baseFuel / 100) * 52;
    const fixedMonthly = 8000 + (seed % 12000);
    const monthlyKm = 1500;
    const perMonth = fixedMonthly + fuelRubPerKm * monthlyKm * mileageFactor * (0.85 + (seed % 30) / 100);
    const perKm = perMonth / monthlyKm;
    const perYear = perMonth * 12;

    const rating = Math.min(100, Math.max(35, Math.round(78 + (seed % 20) - mileageFactor * 8 + (10 - baseFuel))));

    const avgBar = 62;
    const ecoBar = 38;
    const youBar = Math.min(95, Math.max(25, Math.round((perKm / 0.18) * 10)));

    return {
      perKm: Math.round(perKm * 100) / 100,
      perMonth: Math.round(perMonth),
      perYear: Math.round(perYear),
      rating,
      youBarPct: youBar,
      avgBarPct: avgBar,
      ecoBarPct: ecoBar,
    };
  }

  function drawForecastChart(canvasId, perMonth) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;

    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
    var lineColor = "#007aff";
    var fillColor = isDark ? "rgba(0,122,255,0.12)" : "rgba(0,122,255,0.08)";
    var dotColor = "#007aff";
    var labelColor = isDark ? "#9090a0" : "#6e6e6e";
    var textColor = isDark ? "#e8e8ee" : "#1f1f1f";

    ctx.clearRect(0, 0, w, h);

    var months = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
    var baseCost = perMonth || 20000;
    var variation = baseCost * 0.05;
    var dataPoints = months.map(function(_, i) {
      return baseCost + (Math.sin(i * 0.8) * variation) + ((i % 3 === 0) ? variation * 0.5 : 0);
    });

    var maxVal = Math.max.apply(null, dataPoints) * 1.15;
    var minVal = Math.min.apply(null, dataPoints) * 0.85;
    var padLeft = 50;
    var padRight = 20;
    var padTop = 15;
    var padBottom = 35;
    var plotW = w - padLeft - padRight;
    var plotH = h - padTop - padBottom;

    function xPos(i) {
      return padLeft + (i / (months.length - 1)) * plotW;
    }
    function yPos(val) {
      return padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;
    }

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    var gridLines = 4;
    for (var g = 0; g <= gridLines; g++) {
      var gy = padTop + (g / gridLines) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, gy);
      ctx.lineTo(padLeft + plotW, gy);
      ctx.stroke();
    }

    ctx.fillStyle = labelColor;
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    for (var g2 = 0; g2 <= gridLines; g2++) {
      var gv = maxVal - (g2 / gridLines) * (maxVal - minVal);
      var gyy = padTop + (g2 / gridLines) * plotH;
      ctx.fillText(Math.round(gv / 1000) + "к", padLeft - 5, gyy + 4);
    }

    ctx.textAlign = "center";
    months.forEach(function(m, i) {
      if (i % 2 === 0) {
        ctx.fillText(m, xPos(i), h - 8);
      }
    });

    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(dataPoints[0]));
    for (var i2 = 1; i2 < dataPoints.length; i2++) {
      var xc = (xPos(i2 - 1) + xPos(i2)) / 2;
      var yc = (yPos(dataPoints[i2 - 1]) + yPos(dataPoints[i2])) / 2;
      ctx.quadraticCurveTo(xPos(i2 - 1), yPos(dataPoints[i2 - 1]), xc, yc);
    }
    ctx.quadraticCurveTo(xPos(dataPoints.length - 2), yPos(dataPoints[dataPoints.length - 2]), xPos(dataPoints.length - 1), yPos(dataPoints[dataPoints.length - 1]));
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    var grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    grad.addColorStop(0, fillColor);
    grad.addColorStop(1, "rgba(0,122,255,0)");
    ctx.lineTo(xPos(dataPoints.length - 1), padTop + plotH);
    ctx.lineTo(xPos(0), padTop + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    dataPoints.forEach(function(val, i) {
      ctx.beginPath();
      ctx.arc(xPos(i), yPos(val), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
    });

    var last = dataPoints[dataPoints.length - 1];
    ctx.fillStyle = textColor;
    ctx.font = "bold 12px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("~" + Math.round(last).toLocaleString("ru-RU") + " ₽", xPos(dataPoints.length - 1) + 6, yPos(last) + 4);
  }

  function animateValue(el, end, decimals, duration) {
    if (!el) return;
    const start = 0;
    const t0 = performance.now();
    function frame(now) {
      const t = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = start + (end - start) * eased;
      el.textContent = decimals > 0 ? val.toFixed(decimals) : String(Math.round(val));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    const io = new IntersectionObserver(
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

  function initHeroCounters() {
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.querySelectorAll(".counter[data-target]").forEach(function (el) {
            const target = parseFloat(el.getAttribute("data-target") || "0");
            const decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
            animateValue(el, target, decimals, 1400);
          });
          io.unobserve(e.target);
        });
      },
      { threshold: 0.3 }
    );
    io.observe(hero);
  }

  function initTripleBars() {
    const root = document.querySelector("[data-animated-bars]");
    if (!root) return;
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          root.querySelectorAll("[data-bar-pct]").forEach(function (bar) {
            const p = bar.getAttribute("data-bar-pct") || "0";
            requestAnimationFrame(function () {
              bar.style.width = p + "%";
            });
          });
          io.unobserve(e.target);
        });
      },
      { threshold: 0.25 }
    );
    io.observe(root);
  }

  function initBarRows() {
    const wrap = document.querySelector(".expense-bars");
    if (!wrap) return;
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.querySelectorAll(".bar-row__fill").forEach(function (bar) {
            bar.classList.add("is-animated");
          });
          io.unobserve(e.target);
        });
      },
      { threshold: 0.2 }
    );
    io.observe(wrap);
  }

  function initStackedTooltip() {
    const tooltip = document.getElementById("stacked-tooltip");
    const wrap = document.querySelector(".stacked-wrap");
    if (!tooltip || !wrap) return;

    wrap.querySelectorAll(".stacked-seg").forEach(function (seg) {
      seg.addEventListener("mouseenter", function (ev) {
        const label = seg.getAttribute("data-label") || "";
        const pct = seg.getAttribute("data-pct") || "";
        const amount = seg.getAttribute("data-amount") || "";
        tooltip.innerHTML = "<strong>" + label + "</strong> " + pct + "% · ~" + amount + " в мес.";
        tooltip.hidden = false;
        const rect = wrap.getBoundingClientRect();
        const sr = seg.getBoundingClientRect();
        tooltip.style.left = Math.max(0, sr.left - rect.left + sr.width / 2 - tooltip.offsetWidth / 2) + "px";
      });
      seg.addEventListener("mousemove", function () {
        const rect = wrap.getBoundingClientRect();
        const sr = seg.getBoundingClientRect();
        tooltip.style.left = Math.max(0, sr.left - rect.left + sr.width / 2 - tooltip.offsetWidth / 2) + "px";
      });
      seg.addEventListener("mouseleave", function () {
        tooltip.hidden = true;
      });
      seg.addEventListener("focus", function () {
        tooltip.innerHTML = "<strong>" + (seg.getAttribute("data-label") || "") + "</strong>";
        tooltip.hidden = false;
      });
      seg.addEventListener("blur", function () {
        tooltip.hidden = true;
      });
    });
  }

  function initCalculator() {
    const form = document.getElementById("calc-form");
    const results = document.getElementById("calc-results");
    const btnShare = document.getElementById("btn-share");
    const feedback = document.getElementById("share-feedback");
    if (!form || !results) return;

    let lastShareText = "";
    let lastShareUrl = "";

    function processCalcResult(vin, mileage, fuel, data) {
      document.getElementById("res-per-km").dataset.value = String(data.perKm);
      document.getElementById("res-month").dataset.value = String(data.perMonth);
      document.getElementById("res-year").dataset.value = String(data.perYear);
      document.getElementById("res-rating").dataset.value = String(data.rating);

      results.hidden = false;

      const perKmEl = document.getElementById("res-per-km");
      const monthEl = document.getElementById("res-month");
      const yearEl = document.getElementById("res-year");
      const ratingEl = document.getElementById("res-rating");
      perKmEl.textContent = "0";
      monthEl.textContent = "0";
      yearEl.textContent = "0";
      ratingEl.textContent = "0";

      animateValue(perKmEl, data.perKm, 2, 1000);
      animateValue(monthEl, data.perMonth, 0, 1000);
      animateValue(yearEl, data.perYear, 0, 1000);
      animateValue(ratingEl, data.rating, 0, 1000);

      const barYou = document.getElementById("bar-you");
      if (barYou) {
        barYou.style.width = "0%";
        requestAnimationFrame(function () {
          barYou.style.width = data.youBarPct + "%";
        });
      }

      const ratingBar = document.getElementById("res-rating-bar");
      if (ratingBar) {
        ratingBar.style.width = "0%";
        requestAnimationFrame(function () {
          ratingBar.style.width = data.rating + "%";
        });
      }

      lastShareUrl = typeof window.location.href === "string" ? window.location.href.split("#")[0] : "";
      lastShareText =
        "АвтоЖрёт: моя стоимость владения ~" +
        data.perKm +
        " ₽/км, " +
        data.perMonth +
        " ₽/мес., рейтинг " +
        data.rating +
        "/100. " +
        lastShareUrl;

      if (window.AvtoJretAuth && typeof window.AvtoJretAuth.getCurrentUser === "function" && window.AvtoJretAuth.getCurrentUser()) {
        window.AvtoJretAuth.saveCalculation(vin || "DEMO", mileage, fuel, data);
        if (typeof window.AvtoJretAuth.renderCabinet === "function") window.AvtoJretAuth.renderCabinet();
        if (typeof window.AvtoJretAuth.showToast === "function") {
          window.AvtoJretAuth.showToast("Расчёт сохранён в личном кабинете.", "success");
        }
      }

      results.scrollIntoView({ behavior: "smooth", block: "nearest" });

      var chartCanvas = document.getElementById("forecast-chart");
      if (chartCanvas) {
        drawForecastChart("forecast-chart", data.perMonth);
      }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const fd = new FormData(form);
      const vin = String(fd.get("vin") || "").trim();
      const mileage = parseInt(String(fd.get("mileage") || "0"), 10) || 0;
      const fuelRaw = fd.get("fuel");
      let fuel = fuelRaw === "" || fuelRaw == null ? null : parseFloat(String(fuelRaw));
      if (fuel != null && (Number.isNaN(fuel) || fuel <= 0)) fuel = null;

      const submitBtn = form.querySelector(".calc-form__submit");
      submitBtn.classList.add("is-loading");
      submitBtn.disabled = true;

      window.setTimeout(function () {
        const data = calculateOwnershipDemo({
          vin: vin || "DEMO1234567890",
          mileage: mileage,
          fuelLPer100: fuel,
        });

        submitBtn.classList.remove("is-loading");
        submitBtn.disabled = false;
        processCalcResult(vin, mileage, fuel, data);
      }, 650);
    });

    if (btnShare && feedback) {
      btnShare.addEventListener("click", async function () {
        feedback.textContent = "";
        if (!lastShareText) {
          feedback.textContent = "Сначала выполните расчёт.";
          return;
        }
        try {
          if (navigator.share) {
            await navigator.share({
              title: "АвтоЖрёт — мой результат",
              text: lastShareText,
              url: lastShareUrl || undefined,
            });
            feedback.textContent = "Готово!";
          } else if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(lastShareText);
            feedback.textContent = "Текст скопирован в буфер обмена.";
          } else {
            feedback.textContent = lastShareText;
          }
        } catch (err) {
          if (err && err.name === "AbortError") return;
          try {
            await navigator.clipboard.writeText(lastShareText);
            feedback.textContent = "Текст скопирован в буфер обмена.";
          } catch {
            feedback.textContent = "Не удалось поделиться. Скопируйте вручную.";
          }
        }
      });
    }
  }

  function initWhatIf() {
    var mileageSlider = document.getElementById("whatif-mileage");
    var fuelSlider = document.getElementById("whatif-fuel");
    if (!mileageSlider || !fuelSlider) return;

    var mileageVal = document.getElementById("whatif-mileage-val");
    var fuelVal = document.getElementById("whatif-fuel-val");
    var perkmEl = document.getElementById("whatif-perkm");
    var monthEl = document.getElementById("whatif-month");
    var yearEl = document.getElementById("whatif-year");
    var ratingEl = document.getElementById("whatif-rating");

    function recalc() {
      var mileage = parseInt(mileageSlider.value, 10);
      var fuel = parseFloat(fuelSlider.value);
      if (mileageVal) mileageVal.textContent = mileage.toLocaleString("ru-RU");
      if (fuelVal) fuelVal.textContent = fuel.toFixed(1);

      var monthlyKm = mileage / 12;
      var fuelCost = (fuel / 100) * 52 * monthlyKm;
      var fixedMonthly = 8000;
      var perMonth = fixedMonthly + fuelCost;
      var perKm = perMonth / monthlyKm;
      var perYear = perMonth * 12;
      var rating = Math.min(100, Math.max(35, Math.round(78 + (10 - fuel))));

      if (perkmEl) perkmEl.textContent = perKm.toFixed(2);
      if (monthEl) monthEl.textContent = Math.round(perMonth).toLocaleString("ru-RU");
      if (yearEl) yearEl.textContent = Math.round(perYear).toLocaleString("ru-RU");
      if (ratingEl) ratingEl.textContent = rating;
    }

    mileageSlider.addEventListener("input", recalc);
    fuelSlider.addEventListener("input", recalc);
    recalc();
  }

  function initCabinetCalculator() {
    const form = document.getElementById("cabinet-calc-form");
    const result = document.getElementById("cabinet-calc-result");
    const btnSave = document.getElementById("cab-save-calc");
    if (!form || !result) return;

    let currentCalcData = null;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const fd = new FormData(form);
      const vin = String(fd.get("vin") || "").trim();
      const mileage = parseInt(String(fd.get("mileage") || "0"), 10) || 0;
      const fuelRaw = fd.get("fuel");
      let fuel = fuelRaw === "" || fuelRaw == null ? null : parseFloat(String(fuelRaw));
      if (fuel != null && (Number.isNaN(fuel) || fuel <= 0)) fuel = null;

      if (mileage <= 0) {
        if (window.AvtoJretAuth && typeof window.AvtoJretAuth.showToast === "function") {
          window.AvtoJretAuth.showToast("Укажите пробег для расчёта.", "error");
        }
        return;
      }

      const submitBtn = form.querySelector(".cabinet-calc-submit");
      submitBtn.textContent = "...";
      submitBtn.disabled = true;

      window.setTimeout(function () {
        const data = calculateOwnershipDemo({
          vin: vin || "DEMO",
          mileage: mileage,
          fuelLPer100: fuel,
        });

        currentCalcData = { vin, mileage, fuel, data };
        result.hidden = false;

        const perKmEl = document.getElementById("cab-res-perkm");
        const monthEl = document.getElementById("cab-res-month");
        const yearEl = document.getElementById("cab-res-year");
        const ratingEl = document.getElementById("cab-res-rating");
        perKmEl.textContent = "0";
        monthEl.textContent = "0";
        yearEl.textContent = "0";
        ratingEl.textContent = "0";

        animateValue(perKmEl, data.perKm, 2, 800);
        animateValue(monthEl, data.perMonth, 0, 800);
        animateValue(yearEl, data.perYear, 0, 800);
        animateValue(ratingEl, data.rating, 0, 800);

        submitBtn.textContent = "Рассчитать";
        submitBtn.disabled = false;
      }, 400);
    });

    if (btnSave) {
      btnSave.addEventListener("click", function () {
        if (!currentCalcData) return;
        if (window.AvtoJretAuth && typeof window.AvtoJretAuth.getCurrentUser === "function" && window.AvtoJretAuth.getCurrentUser()) {
          window.AvtoJretAuth.saveCalculation(currentCalcData.vin || "DEMO", currentCalcData.mileage, currentCalcData.fuel, currentCalcData.data);
          if (typeof window.AvtoJretAuth.renderCabinet === "function") window.AvtoJretAuth.renderCabinet();
          if (typeof window.AvtoJretAuth.showToast === "function") {
            window.AvtoJretAuth.showToast("Расчёт сохранён!", "success");
          }
        }
      });
    }
  }

  var ARTICLES = {
    1: {
      title: "Плавный разгон и торможение",
      html:
        "<p>В городском цикле резкие ускорения и позднее торможение увеличивают расход топлива заметно — часто на 15–20%. Держите дистанцию, смотрите дальше по потоку и избегайте «догонялок» на светофорах.</p>" +
        "<p>Это не только экономия, но и меньший износ тормозов и подвески.</p>",
    },
    2: {
      title: "Регламент ТО по мануалу",
      html:
        "<p>Производитель заложил интервалы замены масла и расходников под реальные нагрузки. Сокращать их «на всякий случай» не всегда оправдано: лишние визиты в сервис напрямую бьют по бюджету.</p>" +
        "<p>Сохраняйте историю обслуживания — она пригодится при продаже.</p>",
    },
    3: {
      title: "Давление в шинах",
      html:
        "<p>Проверяйте давление хотя бы раз в месяц и перед дальними поездками. Недокачка увеличивает сопротивление качению и расход, перекачка ухудшает сцепление и износ центра протектора.</p>" +
        "<p>Ориентируйтесь на табличку на стойке двери или в мануале.</p>",
    },
    4: {
      title: "Сравните страховки",
      html:
        "<p>У разных страховщиков премии по ОСАГО на одинаковый профиль риска могут отличаться на тысячи рублей в год. Используйте сравнение и аккуратно указывайте данные.</p>" +
        "<p>КАСКО с франшизой часто существенно снижает взнос при сохранении защиты от крупных убытков.</p>",
    },
  };

  function initModal() {
    const modal = document.getElementById("article-modal");
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    if (!modal || !title || !body) return;

    function openModal(id) {
      const a = ARTICLES[id];
      if (!a) return;
      title.textContent = a.title;
      body.innerHTML = a.html;
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      modal.querySelector(".modal__close").focus();
    }

    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = "";
    }

    document.querySelectorAll(".tip-card").forEach(function (card) {
      card.setAttribute("tabindex", "0");
      card.addEventListener("click", function () {
        openModal(card.getAttribute("data-article"));
      });
      card.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          openModal(card.getAttribute("data-article"));
        }
      });
    });

    modal.querySelectorAll("[data-close-modal]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || modal.hidden) return;
      var authOpen = document.querySelector(".modal--auth:not([hidden])");
      if (authOpen) return;
      closeModal();
    });
  }

  function initNav() {
    const toggle = document.querySelector(".nav-toggle");
    const mobileNav = document.getElementById("mobile-nav");
    if (!toggle || !mobileNav) return;

    toggle.addEventListener("click", function () {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      mobileNav.hidden = open;
    });

    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        mobileNav.hidden = true;
      });
    });
  }

  function initSocialButtons() {
    var btnInvite = document.getElementById("btn-invite-friend");
    if (btnInvite) {
      btnInvite.addEventListener("click", function () {
        var msg = "Пригласите друга в АвтоЖрёт! Ссылка: " + (window.location.href.split("#")[0] || "");
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(msg).then(function () {
            btnInvite.textContent = "Скопировано!";
            setTimeout(function () { btnInvite.textContent = "Пригласить друга"; }, 2000);
          });
        }
      });
    }
    var btnShareGlobal = document.getElementById("btn-share-global");
    if (btnShareGlobal) {
      btnShareGlobal.addEventListener("click", function () {
        var text = "Мой рейтинг экономичности на АвтоЖрёт: " +
          (document.getElementById("stat-rating") ? document.getElementById("stat-rating").textContent : "?") + "/100. " +
          (window.location.href.split("#")[0] || "");
        if (navigator.share) {
          navigator.share({ title: "АвтоЖрёт", text: text }).catch(function() {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            btnShareGlobal.textContent = "Скопировано!";
            setTimeout(function () { btnShareGlobal.textContent = "Поделиться"; }, 2000);
          });
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initReveal();
    initHeroCounters();
    initBarRows();
    initTripleBars();
    initStackedTooltip();
    initCalculator();
    initCabinetCalculator();
    initModal();
    initNav();
    initWhatIf();
    initSocialButtons();
  });

  window.AvtoJretAPI = {
    calculateOwnershipDemo: calculateOwnershipDemo,
  };
})();
