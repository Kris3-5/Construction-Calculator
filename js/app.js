/* ============================================================
   App logic. You should not need to touch this file to add a
   calculator or a language.
   ============================================================ */

(function () {
  "use strict";

  var LOCALES = { en: "en-GB", ru: "ru-RU", lv: "lv-LV" };
  var STORE_LANG = "bb.lang";

  var lang = pickLang();
  var current = CALCULATORS[0];
  var values = {};

  var els = {
    picker: document.getElementById("picker"),
    fields: document.getElementById("fields"),
    name: document.getElementById("calcName"),
    desc: document.getElementById("calcDesc"),
    outBody: document.getElementById("outBody"),
    copy: document.getElementById("copy"),
    print: document.getElementById("print"),
    reset: document.getElementById("reset")
  };

  /* ---------------------------------------------------- language */

  function pickLang() {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    if (fromUrl && I18N[fromUrl]) return fromUrl;

    var saved = null;
    try { saved = localStorage.getItem(STORE_LANG); } catch (e) {}
    if (saved && I18N[saved]) return saved;

    var nav = (navigator.languages || [navigator.language || ""]).join(",").toLowerCase();
    if (nav.indexOf("lv") === 0 || nav.indexOf(",lv") > -1) return "lv";
    if (nav.indexOf("ru") > -1) return "ru";
    if (nav.indexOf("en") > -1) return "en";
    return DEFAULT_LANG;
  }

  function t(key) {
    var pack = I18N[lang] || I18N[DEFAULT_LANG];
    if (pack[key] != null) return pack[key];
    if (I18N.en[key] != null) return I18N.en[key];
    return key;
  }

  function setLang(next) {
    if (!I18N[next]) return;
    lang = next;
    try { localStorage.setItem(STORE_LANG, next); } catch (e) {}

    var url = new URL(location.href);
    url.searchParams.set("lang", next);
    history.replaceState(null, "", url);

    applyLang();
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t("meta.title");

    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var attr = el.getAttribute("data-i18n-attr");
      if (attr) el.setAttribute(attr, t(el.getAttribute("data-i18n")));
      else el.textContent = t(el.getAttribute("data-i18n"));
    }

    var buttons = document.querySelectorAll(".lang");
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].setAttribute("aria-current", String(buttons[j].dataset.lang === lang));
    }

    renderPicker();
    renderForm();
  }

  /* ---------------------------------------------------- numbers */

  function fmt(value, dec, ceil) {
    if (!isFinite(value)) return "—";
    var n = ceil ? Math.ceil(value) : value;
    return new Intl.NumberFormat(LOCALES[lang] || "en-GB", {
      minimumFractionDigits: ceil ? 0 : dec,
      maximumFractionDigits: ceil ? 0 : dec
    }).format(n);
  }

  /* ---------------------------------------------------- picker */

  function renderPicker() {
    els.picker.textContent = "";
    CALCULATORS.forEach(function (calc) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(calc === current));
      b.innerHTML = "<small></small><span></span>";
      b.querySelector("small").textContent = t("group." + calc.group);
      b.querySelector("span").textContent = t("calc." + calc.id + ".name");
      b.addEventListener("click", function () {
        current = calc;
        values = {};
        renderPicker();
        renderForm();
      });
      els.picker.appendChild(b);
    });
  }

  /* ---------------------------------------------------- form */

  function renderForm() {
    els.name.textContent = t("calc." + current.id + ".name");
    els.desc.textContent = t("calc." + current.id + ".desc");
    els.fields.textContent = "";

    current.fields.forEach(function (f) {
      if (values[f.id] === undefined) values[f.id] = f.def;

      var wrap = document.createElement("div");
      wrap.className = "field" + (f.flag ? " field--flag" : "");

      var id = "f-" + current.id + "-" + f.id;
      var label = document.createElement("label");
      label.setAttribute("for", id);
      label.textContent = t("field." + f.id);

      var row = document.createElement("div");
      row.className = "field__row";

      var input;
      if (f.options) {
        input = document.createElement("select");
        f.options.forEach(function (opt) {
          var o = document.createElement("option");
          o.value = opt[0];
          o.textContent = opt[1];
          input.appendChild(o);
        });
      } else {
        input = document.createElement("input");
        input.type = "number";
        input.inputMode = "decimal";
        if (f.min != null) input.min = f.min;
        if (f.step != null) input.step = f.step;
      }
      input.id = id;
      input.value = values[f.id];
      input.addEventListener("input", function () {
        values[f.id] = input.value;
        renderOut();
      });

      row.appendChild(input);
      if (f.unit) {
        var u = document.createElement("span");
        u.className = "field__unit";
        u.textContent = t("unit." + f.unit);
        row.appendChild(u);
      }

      wrap.appendChild(label);
      wrap.appendChild(row);
      els.fields.appendChild(wrap);
    });

    renderOut();
  }

  /* ---------------------------------------------------- results */

  function readValues() {
    var out = {};
    var ok = true;
    current.fields.forEach(function (f) {
      var raw = values[f.id];
      if (f.options) { out[f.id] = raw; return; }
      var n = parseFloat(String(raw).replace(",", "."));
      if (!isFinite(n)) { ok = false; n = 0; }
      out[f.id] = n;
    });
    return ok ? out : null;
  }

  function renderOut() {
    els.outBody.textContent = "";
    var v = readValues();
    var result = v ? current.compute(v) : null;

    if (!result || !isFinite(result.headline.value) || result.headline.value <= 0) {
      var p = document.createElement("p");
      p.className = "empty";
      p.textContent = t("ui.empty");
      els.outBody.appendChild(p);
      return;
    }

    var head = document.createElement("div");
    head.className = "headline";
    head.innerHTML =
      '<span class="headline__val">' + fmt(result.headline.value, result.headline.dec, result.headline.ceil) +
      '<em>' + t("unit." + result.headline.unit) + '</em></span>' +
      '<span class="headline__lbl">' + t(result.headline.key) + '</span>';
    els.outBody.appendChild(head);

    var tally = document.createElement("div");
    tally.className = "tally";
    result.rows.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "tally__row";
      row.innerHTML =
        '<span class="tally__lbl"></span>' +
        '<span class="tally__lead"></span>' +
        '<span class="tally__val"></span>';
      row.querySelector(".tally__lbl").textContent = t(r.key);
      row.querySelector(".tally__val").innerHTML =
        fmt(r.value, r.dec, r.ceil) + '<span>' + t("unit." + r.unit) + '</span>';
      tally.appendChild(row);
    });
    els.outBody.appendChild(tally);

    if (result.noteKey) {
      var note = document.createElement("p");
      note.className = "note";
      note.textContent = t(result.noteKey);
      els.outBody.appendChild(note);
    }
  }

  function plainText() {
    var v = readValues();
    if (!v) return "";
    var r = current.compute(v);
    var lines = [t("calc." + current.id + ".name"), ""];
    lines.push(t(r.headline.key) + ": " + fmt(r.headline.value, r.headline.dec, r.headline.ceil) + " " + t("unit." + r.headline.unit));
    r.rows.forEach(function (row) {
      lines.push(t(row.key) + ": " + fmt(row.value, row.dec, row.ceil) + " " + t("unit." + row.unit));
    });
    lines.push("", t("ui.reserveNote"));
    return lines.join("\n");
  }

  /* ---------------------------------------------------- wiring */

  document.querySelectorAll(".lang").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.dataset.lang); });
  });

  els.reset.addEventListener("click", function () {
    values = {};
    renderForm();
  });

  els.print.addEventListener("click", function () { window.print(); });

  els.copy.addEventListener("click", function () {
    var text = plainText();
    if (!text) return;
    var done = function () {
      els.copy.textContent = t("ui.copied");
      els.copy.dataset.state = "done";
      setTimeout(function () {
        els.copy.textContent = t("ui.copy");
        delete els.copy.dataset.state;
      }, 1600);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done);
    else done();
  });

  applyLang();
})();
