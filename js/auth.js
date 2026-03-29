/**
 * АвтоЖрёт — демо-авторизация и личный кабинет (localStorage).
 * В продакшене замените хранение паролей на сервер и хэширование.
 */
(function () {
  "use strict";

  function isAppPage() {
    return /(^|\/)app\.html$/i.test(window.location.pathname || "");
  }

  var STORAGE_DB = "avtojret_db_v1";
  var STORAGE_SESSION = "avtojret_session";
  var STORAGE_REMEMBER_EMAIL = "avtojret_remember_email";

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function loadDb() {
    try {
      var raw = localStorage.getItem(STORAGE_DB);
      if (!raw) return { version: 1, users: [] };
      var data = JSON.parse(raw);
      if (!data.users) data.users = [];
      return data;
    } catch (e) {
      return { version: 1, users: [] };
    }
  }

  function saveDb(data) {
    localStorage.setItem(STORAGE_DB, JSON.stringify(data));
  }

  function seedDemoIfNeeded() {
    var db = loadDb();
    if (db.users.length > 0) return;
    var demoEmail = "demo@avtozhryot.ru";
    var demoCalc = {
      id: newId(),
      vin: "XTA211440S1234567",
      mileage: 85000,
      fuel: 8.5,
      result: {
        perKm: 12.4,
        perMonth: 18600,
        perYear: 223200,
        rating: 82,
        youBarPct: 69,
      },
      createdAt: new Date().toISOString(),
    };
    db.users.push({
      name: "Демо Пользователь",
      email: demoEmail,
      password: "123456",
      cars: [
        {
          id: newId(),
          vin: "XTA211440S1234567",
          mileage: 85000,
          fuel: 8.5,
          addedAt: new Date().toISOString(),
        },
      ],
      calculations: [demoCalc],
    });
    saveDb(db);
  }

  function getSessionEmail() {
    try {
      var raw = localStorage.getItem(STORAGE_SESSION);
      if (!raw) return null;
      var s = JSON.parse(raw);
      return s && s.email ? normalizeEmail(s.email) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(email) {
    if (!email) {
      localStorage.removeItem(STORAGE_SESSION);
    } else {
      localStorage.setItem(STORAGE_SESSION, JSON.stringify({ email: normalizeEmail(email) }));
    }
  }

  function findUser(email) {
    var e = normalizeEmail(email);
    var db = loadDb();
    for (var i = 0; i < db.users.length; i++) {
      if (normalizeEmail(db.users[i].email) === e) return db.users[i];
    }
    return null;
  }

  function isValidEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function registerUser(name, email, password) {
    var db = loadDb();
    var em = normalizeEmail(email);
    if (!isValidEmail(em)) return { ok: false, error: "Введите корректный email." };
    if (password.length < 6) return { ok: false, error: "Пароль не короче 6 символов." };
    if (findUser(em)) return { ok: false, error: "Пользователь с таким email уже зарегистрирован." };
    db.users.push({
      name: name.trim(),
      email: em,
      password: password,
      cars: [],
      calculations: [],
    });
    saveDb(db);
    return { ok: true };
  }

  function loginUser(email, password) {
    var u = findUser(email);
    if (!u || u.password !== password) {
      return { ok: false, error: "Неверный email или пароль." };
    }
    setSession(u.email);
    return { ok: true };
  }

  function logoutUser() {
    setSession(null);
  }

  function getCurrentUser() {
    var em = getSessionEmail();
    if (!em) return null;
    return findUser(em);
  }

  function persistUser(user) {
    var db = loadDb();
    var em = normalizeEmail(user.email);
    for (var i = 0; i < db.users.length; i++) {
      if (normalizeEmail(db.users[i].email) === em) {
        db.users[i] = user;
        saveDb(db);
        return;
      }
    }
  }

  function addCarToUser(vin, mileage, fuel) {
    var u = getCurrentUser();
    if (!u) return { ok: false };
    var v = String(vin || "").trim();
    if (!v) return { ok: false, error: "Укажите VIN или госномер." };
    if (!u.cars) u.cars = [];
    if (u.cars.length >= 5) return { ok: false, error: "Максимум 5 автомобилей." };
    u.cars.push({
      id: newId(),
      vin: v,
      mileage: mileage,
      fuel: fuel == null || fuel === "" ? null : Number(fuel),
      addedAt: new Date().toISOString(),
    });
    persistUser(u);
    return { ok: true };
  }

  function removeCarFromUser(carId) {
    var u = getCurrentUser();
    if (!u || !u.cars) return false;
    var idx = -1;
    for (var i = 0; i < u.cars.length; i++) {
      if (u.cars[i].id === carId) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return false;
    u.cars.splice(idx, 1);
    persistUser(u);
    return true;
  }

  function saveCalculationRecord(vin, mileage, fuel, result) {
    var u = getCurrentUser();
    if (!u) return;
    if (!u.calculations) u.calculations = [];
    u.calculations.unshift({
      id: newId(),
      vin: String(vin || "").trim() || "—",
      mileage: mileage,
      fuel: fuel,
      result: {
        perKm: result.perKm,
        perMonth: result.perMonth,
        perYear: result.perYear,
        rating: result.rating,
        youBarPct: result.youBarPct,
      },
      createdAt: new Date().toISOString(),
    });
    if (u.calculations.length > 50) u.calculations.length = 50;
    persistUser(u);
  }

  /* ——— UI ——— */

  var toastTimer = null;

  function showToast(message, type) {
    var root = document.getElementById("toast-root");
    if (!root) return;
    var el = document.createElement("div");
    el.className = "toast toast--" + (type === "error" ? "error" : "success");
    el.textContent = message;
    root.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add("toast--show");
    });
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.classList.remove("toast--show");
      window.setTimeout(function () {
        el.remove();
      }, 300);
    }, 4200);
  }

  function clearFieldErrors(form) {
    form.querySelectorAll(".field__error").forEach(function (x) {
      x.textContent = "";
    });
    form.querySelectorAll(".auth-form__msg").forEach(function (x) {
      x.hidden = true;
      x.textContent = "";
    });
  }

  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    document.querySelectorAll(".modal--auth").forEach(function (x) {
      x.classList.remove("modal--visible");
      x.hidden = true;
    });
    var closeArticle = document.getElementById("article-modal");
    if (closeArticle && !closeArticle.hidden) {
      closeArticle.hidden = true;
    }
    m.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(function () {
      m.classList.add("modal--visible");
    });
    var focusEl = m.querySelector("input, button");
    if (focusEl) window.setTimeout(function () {
      focusEl.focus();
    }, 50);
  }

  function closeModalEl(m) {
    if (!m) return;
    m.classList.remove("modal--visible");
    window.setTimeout(function () {
      m.hidden = true;
      var anyAuth = document.querySelector(".modal--auth:not([hidden])");
      var art = document.getElementById("article-modal");
      if (!anyAuth && (!art || art.hidden)) document.body.style.overflow = "";
    }, 280);
  }

  function closeAllAuthModals() {
    document.querySelectorAll(".modal--auth").forEach(function (m) {
      m.classList.remove("modal--visible");
      m.hidden = true;
    });
    var art = document.getElementById("article-modal");
    if (!art || art.hidden) document.body.style.overflow = "";
  }

  function renderAuthChrome() {
    var logged = !!getSessionEmail();
    var authBar = document.getElementById("auth-bar");
    var landingBar = authBar && authBar.classList.contains("auth-bar--logged-only");
    if (landingBar) {
      authBar.hidden = !logged;
    } else {
      var guest = document.getElementById("auth-guest");
      var user = document.getElementById("auth-user");
      if (guest) guest.hidden = logged;
      if (user) user.hidden = !logged;
      if (authBar) authBar.hidden = false;
    }

    var navLi = document.getElementById("nav-cabinet-li");
    var mobCab = document.getElementById("mobile-nav-cabinet");
    var mobLoggedOnly = document.getElementById("mobile-auth-logged");
    if (mobLoggedOnly) {
      mobLoggedOnly.hidden = !logged;
      var guestHint = document.getElementById("mobile-nav-guest-hint");
      if (guestHint) guestHint.hidden = logged;
    } else {
      var mobGuest = document.getElementById("mobile-auth-guest");
      var mobUser = document.getElementById("mobile-auth-user");
      if (mobGuest) mobGuest.hidden = logged;
      if (mobUser) mobUser.hidden = !logged;
    }
    if (navLi) navLi.hidden = !logged;
    if (mobCab) mobCab.hidden = !logged;

    var cabinet = document.getElementById("cabinet");
    if (cabinet) cabinet.hidden = !logged;
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
    } catch (e) {
      return iso;
    }
  }

  function sortCalculations(calcs, sortBy) {
    var sorted = calcs.slice();
    switch (sortBy) {
      case "date-asc":
        sorted.sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
        break;
      case "date-desc":
        sorted.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        break;
      case "cost-asc":
        sorted.sort(function (a, b) { return (a.result && a.result.perKm || 999) - (b.result && b.result.perKm || 999); });
        break;
      case "cost-desc":
        sorted.sort(function (a, b) { return (b.result && b.result.perKm || 0) - (a.result && a.result.perKm || 0); });
        break;
      case "rating-desc":
        sorted.sort(function (a, b) { return (b.result && b.result.rating || 0) - (a.result && a.result.rating || 0); });
        break;
      default:
        break;
    }
    return sorted;
  }

  function renderCabinet() {
    var u = getCurrentUser();
    var nameEl = document.getElementById("cabinet-name");
    var carsList = document.getElementById("cabinet-cars-list");
    var carsEmpty = document.getElementById("cabinet-cars-empty");
    var tbody = document.getElementById("cabinet-calculations-body");
    var calcEmpty = document.getElementById("cabinet-calc-empty");
    if (!u) return;
    if (nameEl) nameEl.textContent = u.name || "—";

    var cars = u.cars || [];
    var calcs = u.calculations || [];

    var statCarsCount = document.getElementById("stat-cars-count");
    var statCalcCount = document.getElementById("stat-calc-count");
    var statAvgCost = document.getElementById("stat-avg-cost");
    var statMonthly = document.getElementById("stat-monthly");
    var statRating = document.getElementById("stat-rating");
    var statRatingIcon = document.getElementById("stat-rating-icon");
    if (statCarsCount) statCarsCount.textContent = cars.length;
    if (statCalcCount) statCalcCount.textContent = calcs.length;

    if (calcs.length > 0) {
      var totalPerKm = 0;
      var totalMonthly = 0;
      var totalRating = 0;
      calcs.forEach(function(c) {
        if (c.result && c.result.perKm) totalPerKm += c.result.perKm;
        if (c.result && c.result.perMonth) totalMonthly += c.result.perMonth;
        if (c.result && c.result.rating) totalRating += c.result.rating;
      });
      var avg = Math.round(totalPerKm / calcs.length * 100) / 100;
      var avgMonthly = Math.round(totalMonthly / calcs.length);
      var avgRating = Math.round(totalRating / calcs.length);
      if (statAvgCost) statAvgCost.textContent = avg.toFixed(1);
      if (statMonthly) statMonthly.textContent = avgMonthly.toLocaleString("ru-RU");
      if (statRating) {
        statRating.textContent = avgRating;
        if (avgRating >= 70) {
          statRating.style.color = "#28c76f";
          if (statRatingIcon) statRatingIcon.textContent = "🌿";
        } else if (avgRating >= 50) {
          statRating.style.color = "#ff9500";
          if (statRatingIcon) statRatingIcon.textContent = "⚡";
        } else {
          statRating.style.color = "#ff3b30";
          if (statRatingIcon) statRatingIcon.textContent = "🔥";
        }
      }
    } else {
      if (statAvgCost) statAvgCost.textContent = "—";
      if (statMonthly) statMonthly.textContent = "—";
      if (statRating) {
        statRating.textContent = "—";
        statRating.style.color = "";
      }
      if (statRatingIcon) statRatingIcon.textContent = "⭐";
    }

    if (carsList) {
      carsList.innerHTML = "";
      if (carsEmpty) carsEmpty.hidden = cars.length > 0;
      cars.forEach(function (c) {
        var li = document.createElement("li");
        li.className = "cabinet-list__item";
        li.setAttribute("data-car-id", c.id);
        li.innerHTML =
          "<div class=\"cabinet-list__info\">" +
          "<span class=\"cabinet-list__vin\">" + escapeHtml(c.vin) + "</span>" +
          "<span class=\"cabinet-list__meta\">" + 
          escapeHtml(String(c.mileage)) + " км" +
          (c.fuel != null ? " · " + c.fuel + " л/100 км" : "") +
          "</span></div>" +
          "<div class=\"cabinet-list__actions\">" +
          "<button type=\"button\" class=\"btn btn--secondary btn--xs\" data-use-car=\"" + escapeHtml(c.vin) + "\">Использовать</button>" +
          "<button type=\"button\" class=\"btn btn--danger btn--xs\" data-delete-car=\"" + escapeHtml(c.id) + "\" aria-label=\"Удалить\">×</button>" +
          "</div>";
        carsList.appendChild(li);
      });

      carsList.querySelectorAll("[data-use-car]").forEach(function(btn) {
        btn.addEventListener("click", function() {
          var vin = btn.getAttribute("data-use-car");
          var car = cars.find(function(c) { return c.vin === vin; });
          if (!car) return;
          var cabVin = document.getElementById("cab-vin");
          var cabMileage = document.getElementById("cab-mileage");
          var cabFuel = document.getElementById("cab-fuel");
          if (cabVin) cabVin.value = car.vin;
          if (cabMileage) cabMileage.value = car.mileage;
          if (cabFuel && car.fuel != null) cabFuel.value = car.fuel;
          document.querySelector(".cabinet-calc").scrollIntoView({ behavior: "smooth" });
        });
      });

      carsList.querySelectorAll("[data-delete-car]").forEach(function(btn) {
        btn.addEventListener("click", function() {
          var carId = btn.getAttribute("data-delete-car");
          if (removeCarFromUser(carId)) {
            renderCabinet();
            showToast("Автомобиль удалён.", "success");
          }
        });
      });
    }

    var tableWrap = document.getElementById("cabinet-table-wrap");
    if (tableWrap) tableWrap.hidden = calcs.length === 0;

    if (tbody) {
      tbody.innerHTML = "";
      if (calcEmpty) calcEmpty.hidden = calcs.length > 0;
      var sortSelect = document.getElementById("calc-sort-select");
      var sortBy = sortSelect ? sortSelect.value : "date-desc";
      var sortedCalcs = sortCalculations(calcs, sortBy);
      sortedCalcs.slice(0, 20).forEach(function (c) {
        var r = c.result || {};
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + escapeHtml(formatDate(c.createdAt)) + "</td>" +
          "<td>" + escapeHtml(c.vin) + "</td>" +
          "<td>" + escapeHtml(String(c.mileage)) + "</td>" +
          "<td>" + (r.perKm ? r.perKm.toFixed(2) : "—") + "</td>" +
          "<td>" + escapeHtml(String(r.perMonth || "—")) + "</td>" +
          "<td>" + escapeHtml(String(r.rating || "—")) + "/100</td>";
        tbody.appendChild(tr);
      });
    }

    var friendYouScore = document.getElementById("friend-you-score");
    if (friendYouScore) {
      if (calcs.length > 0) {
        var sum = 0;
        calcs.forEach(function(c) { if (c.result && c.result.perKm) sum += c.result.perKm; });
        var avg = Math.round(sum / calcs.length * 100) / 100;
        friendYouScore.textContent = avg.toFixed(1) + " ₽/км";
      } else {
        friendYouScore.textContent = "—";
      }
    }
  }

  function bindForms() {
    document.querySelectorAll("[data-open-auth]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var toggle = document.querySelector(".nav-toggle");
        var mobileNav = document.getElementById("mobile-nav");
        if (toggle && mobileNav && !mobileNav.hidden) {
          toggle.setAttribute("aria-expanded", "false");
          mobileNav.hidden = true;
        }
        var which = btn.getAttribute("data-open-auth");
        if (which === "login") openModal("modal-login");
        if (which === "register") openModal("modal-register");
      });
    });

    document.querySelectorAll("[data-close-auth]").forEach(function (el) {
      el.addEventListener("click", function () {
        var modal = el.closest(".modal--auth");
        closeModalEl(modal);
      });
    });

    document.getElementById("btn-forgot") &&
      document.getElementById("btn-forgot").addEventListener("click", function () {
        closeModalEl(document.getElementById("modal-login"));
        openModal("modal-forgot");
      });

    var formLogin = document.getElementById("form-login");
    if (formLogin) {
      formLogin.addEventListener("submit", function (e) {
        e.preventDefault();
        clearFieldErrors(formLogin);
        var email = formLogin.querySelector("#login-email").value;
        var password = formLogin.querySelector("#login-password").value;
        var msg = document.getElementById("login-form-msg");
        if (!isValidEmail(email)) {
          if (msg) {
            msg.textContent = "Введите корректный email.";
            msg.hidden = false;
          }
          return;
        }
        if (password.length < 6) {
          if (msg) {
            msg.textContent = "Пароль не короче 6 символов.";
            msg.hidden = false;
          }
          return;
        }
        var res = loginUser(email, password);
        if (!res.ok) {
          if (msg) {
            msg.textContent = res.error;
            msg.hidden = false;
          }
          return;
        }
        var rememberCb = document.getElementById("login-remember");
        try {
          if (rememberCb && rememberCb.checked) {
            localStorage.setItem(STORAGE_REMEMBER_EMAIL, normalizeEmail(email));
          } else {
            localStorage.removeItem(STORAGE_REMEMBER_EMAIL);
          }
        } catch (e2) {}
        closeAllAuthModals();
        if (!isAppPage()) {
          window.location.href = "app.html";
          return;
        }
        renderAuthChrome();
        renderCabinet();
        showToast("Вход выполнен успешно.", "success");
      });
    }

    var formReg = document.getElementById("form-register");
    if (formReg) {
      formReg.addEventListener("submit", function (e) {
        e.preventDefault();
        clearFieldErrors(formReg);
        var name = formReg.querySelector("#reg-name").value.trim();
        var email = formReg.querySelector("#reg-email").value;
        var pw = formReg.querySelector("#reg-password").value;
        var pw2 = formReg.querySelector("#reg-password2").value;
        var err = document.getElementById("register-form-msg");
        var ok = document.getElementById("register-success-msg");
        if (name.length < 2) {
          if (err) {
            err.textContent = "Имя — не менее 2 символов.";
            err.hidden = false;
          }
          return;
        }
        if (!isValidEmail(email)) {
          if (err) {
            err.textContent = "Введите корректный email.";
            err.hidden = false;
          }
          return;
        }
        if (pw.length < 6) {
          if (err) {
            err.textContent = "Пароль не короче 6 символов.";
            err.hidden = false;
          }
          return;
        }
        if (pw !== pw2) {
          if (err) {
            err.textContent = "Пароли не совпадают.";
            err.hidden = false;
          }
          return;
        }
        var res = registerUser(name, email, pw);
        if (!res.ok) {
          if (err) {
            err.textContent = res.error;
            err.hidden = false;
          }
          return;
        }
        if (err) err.hidden = true;
        if (ok) {
          ok.textContent = "Аккаунт создан. Вы вошли в систему.";
          ok.hidden = false;
        }
        loginUser(email, pw);
        window.setTimeout(function () {
          closeAllAuthModals();
          if (ok) ok.hidden = true;
          if (!isAppPage()) {
            window.location.href = "app.html";
            return;
          }
          renderAuthChrome();
          renderCabinet();
          showToast("Добро пожаловать, " + name + "!", "success");
          formReg.reset();
        }, 600);
      });
    }

    function doLogout() {
      logoutUser();
      var c = document.getElementById("cabinet");
      if (c) c.hidden = true;
      if (isAppPage()) {
        window.location.href = "index.html";
        return;
      }
      renderAuthChrome();
      showToast("Вы вышли из аккаунта.", "success");
    }

    ["btn-logout-header", "btn-logout-mobile", "btn-logout-cabinet"].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener("click", doLogout);
    });

    var btnAdd = document.getElementById("btn-add-car");
    if (btnAdd) {
      btnAdd.addEventListener("click", function () {
        if (!getCurrentUser()) {
          showToast("Сначала войдите в аккаунт.", "error");
          openModal("modal-login");
          return;
        }
        openModal("modal-add-car");
      });
    }

    var formCar = document.getElementById("form-add-car");
    var mobCab = document.querySelector(".mobile-auth__cabinet");

    var sortSelect = document.getElementById("calc-sort-select");
    if (sortSelect) {
      sortSelect.addEventListener("change", function () {
        if (typeof renderCabinet === "function") renderCabinet();
      });
    }
    if (mobCab) {
      mobCab.addEventListener("click", function () {
        var toggle = document.querySelector(".nav-toggle");
        var mobileNav = document.getElementById("mobile-nav");
        if (toggle && mobileNav) {
          toggle.setAttribute("aria-expanded", "false");
          mobileNav.hidden = true;
        }
      });
    }

    if (formCar) {
      formCar.addEventListener("submit", function (e) {
        e.preventDefault();
        var vin = formCar.querySelector("#car-vin").value.trim();
        var mileage = parseInt(formCar.querySelector("#car-mileage").value, 10) || 0;
        var fuelRaw = formCar.querySelector("#car-fuel").value;
        var fuel = fuelRaw === "" ? null : parseFloat(fuelRaw);
        var msg = document.getElementById("add-car-msg");
        if (msg) {
          msg.hidden = true;
          msg.textContent = "";
        }
        if (!vin) {
          if (msg) {
            msg.textContent = "Укажите VIN или госномер.";
            msg.hidden = false;
          }
          return;
        }
        var res = addCarToUser(vin, mileage, fuel);
        if (!res.ok) {
          if (msg) {
            msg.textContent = res.error || "Ошибка сохранения.";
            msg.hidden = false;
          }
          return;
        }
        formCar.reset();
        closeModalEl(document.getElementById("modal-add-car"));
        renderCabinet();
        showToast("Автомобиль добавлен.", "success");
      });
    }

    document.addEventListener(
      "keydown",
      function (e) {
        if (e.key !== "Escape") return;
        var authOpen = document.querySelector(".modal--auth:not([hidden])");
        if (authOpen) {
          e.stopPropagation();
          closeModalEl(authOpen);
        }
      },
      true
    );

    function bindRegisterLiveValidation() {
      var form = document.getElementById("form-register");
      if (!form) return;
      function setErr(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text || "";
      }
      var nameIn = form.querySelector("#reg-name");
      var emailIn = form.querySelector("#reg-email");
      var pwIn = form.querySelector("#reg-password");
      var pw2In = form.querySelector("#reg-password2");
      if (nameIn) {
        nameIn.addEventListener("input", function () {
          var v = nameIn.value.trim();
          setErr("reg-name-err", v.length > 0 && v.length < 2 ? "Не менее 2 символов." : "");
        });
      }
      if (emailIn) {
        emailIn.addEventListener("input", function () {
          var v = emailIn.value.trim();
          setErr("reg-email-err", v.length > 0 && !isValidEmail(v) ? "Некорректный email." : "");
        });
      }
      if (pwIn) {
        pwIn.addEventListener("input", function () {
          var v = pwIn.value;
          setErr("reg-password-err", v.length > 0 && v.length < 6 ? "Минимум 6 символов." : "");
          if (pw2In && pw2In.value) pw2In.dispatchEvent(new Event("input"));
        });
      }
      if (pw2In && pwIn) {
        pw2In.addEventListener("input", function () {
          var a = pwIn.value;
          var b = pw2In.value;
          setErr("reg-password2-err", b.length > 0 && a !== b ? "Пароли не совпадают." : "");
        });
      }
    }
    bindRegisterLiveValidation();
  }

  function onHashCabinet() {
    if (window.location.hash !== "#cabinet") return;
    if (!getSessionEmail()) {
      showToast("Войдите в аккаунт, чтобы открыть личный кабинет.", "error");
      openModal("modal-login");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (isAppPage() && !getSessionEmail()) {
      window.location.replace("index.html?needauth=1");
      return;
    }
    seedDemoIfNeeded();
    renderAuthChrome();
    renderCabinet();
    bindForms();
    try {
      var remembered = localStorage.getItem(STORAGE_REMEMBER_EMAIL);
      var loginEmailInput = document.getElementById("login-email");
      if (loginEmailInput && remembered && !getSessionEmail()) {
        loginEmailInput.value = remembered;
      }
    } catch (e) {}
    onHashCabinet();
    window.addEventListener("hashchange", onHashCabinet);
  });

  window.AvtoJretAuth = {
    getCurrentUser: getCurrentUser,
    getSessionEmail: getSessionEmail,
    saveCalculation: saveCalculationRecord,
    showToast: showToast,
    renderCabinet: renderCabinet,
    refreshUI: function () {
      renderAuthChrome();
      renderCabinet();
    },
    removeCar: removeCarFromUser,
  };
})();
