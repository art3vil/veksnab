(function () {
  var cfg = window.VEKSNAB || {};
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  var statusEl = document.getElementById("form-status");
  var year = document.getElementById("year");
  var category = document.getElementById("category");
  var maxLink = document.getElementById("max-link");

  var geoMap = document.querySelector("[data-geo-map]");
  if (geoMap) {
    if ("IntersectionObserver" in window) {
      var geoObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            geoMap.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.25 });
      geoObserver.observe(geoMap);
    } else {
      geoMap.classList.add("is-visible");
    }
  }

  document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
    a.href = "tel:" + cfg.phone;
    if (a.textContent.indexOf("+7") !== -1) a.textContent = cfg.phonePretty;
  });
  document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
    a.href = "mailto:" + cfg.email;
    if (a.textContent.indexOf("@") !== -1) a.textContent = cfg.email;
  });

  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  document.querySelectorAll("[data-cat]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (category) category.value = btn.getAttribute("data-cat") || "";
      var need = document.querySelector("#order-form [name='need']");
      if (need && !need.value) {
        need.placeholder = "Нужно по категории «" + btn.getAttribute("data-cat") + "»: объём, толщина, бренд если важен";
      }
      document.getElementById("order").scrollIntoView({ behavior: "smooth" });
    });
  });

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function validPhone(value) {
    var d = digits(value);
    return d.length >= 10 && d.length <= 15;
  }

  function collect(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      data[key] = String(value).trim();
    });
    return data;
  }

  function message(data, source) {
    return [
      "Заявка ВЕКСНАБ (" + source + ")",
      "Имя: " + (data.name || "—"),
      "Телефон: " + (data.phone || "—"),
      "Email: " + (data.email || "—"),
      "Адрес: " + (data.address || "—"),
      "Категория: " + (data.category || "—"),
      "Объём: " + (data.volume || "—"),
      "Срок: " + (data.deadline || "—"),
      "Доставка: " + (data.delivery ? "да" : "не указана"),
      "Потребность: " + (data.need || "—")
    ].join("\n");
  }

  function sendMail(data, source) {
    var subject = encodeURIComponent("Заявка ВЕКСНАБ");
    var body = encodeURIComponent(message(data, source));
    var href = "mailto:" + (cfg.email || "") + "?subject=" + subject + "&body=" + body;
    window.location.href = href;
  }

  function postRequest(data) {
    var body = new URLSearchParams();
    Object.keys(data).forEach(function (key) {
      if (data[key]) body.append(key, data[key]);
    });
    return fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: body.toString()
    }).then(function (res) {
      return res.json().catch(function () { return { ok: false }; });
    }).catch(function () {
      return { ok: false };
    });
  }

  function maxHref() {
    return cfg.maxUrl || "https://max.ru";
  }

  function setStatus(target, text, ok) {
    if (!target) return;
    target.textContent = text;
    target.classList.toggle("is-ok", !!ok);
    target.classList.toggle("is-err", !ok);
  }

  function bindForm(form) {
    var source = form.getAttribute("data-form") === "mini" ? "быстрая форма" : "полная форма";
    var formStatus = form.querySelector(".form-status") || statusEl;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var data = collect(form);
      var phoneInput = form.querySelector("[name='phone']");
      var needInput = form.querySelector("[name='need']");
      [phoneInput, needInput].forEach(function (el) {
        if (el) el.classList.remove("field-error");
      });

      if (!data.name || !validPhone(data.phone) || !data.need) {
        if (phoneInput && !validPhone(data.phone)) phoneInput.classList.add("field-error");
        if (needInput && !data.need) needInput.classList.add("field-error");
        setStatus(formStatus, "Укажите имя, телефон и что нужно поставить.", false);
        return;
      }
      if (form.id === "order-form" && !data.consent) {
        setStatus(formStatus, "Нужно согласие на обработку персональных данных.", false);
        return;
      }

      var submitBtn = form.querySelector("[type='submit']");
      if (submitBtn) submitBtn.disabled = true;
      setStatus(formStatus, "Отправляем заявку…", true);
      postRequest(data).then(function (result) {
        if (result && result.ok) {
          setStatus(formStatus, "Заявка отправлена. Мы свяжемся с вами в рабочие часы.", true);
          form.reset();
        } else {
          setStatus(formStatus, "Сервер не принял заявку. Откроется письмо для отправки вручную.", false);
          sendMail(data, source);
          form.reset();
        }
      }).finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  document.querySelectorAll("form[data-form]").forEach(bindForm);

  if (maxLink) {
    maxLink.href = maxHref();
    maxLink.addEventListener("click", function () {
      var form = document.getElementById("order-form");
      var data = form ? collect(form) : {};
      if (!data.need) data.need = "Здравствуйте! Нужен подбор стройматериалов.";
      var text = message(data, "MAX") + "\nТелефон ВЕКСНАБ: " + (cfg.phonePretty || "");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
      }
    });
  }
})();
