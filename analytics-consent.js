/* VIPACH GA4 – external tag loads only after explicit, page-scoped consent. */
(function () {
  "use strict";
  var id = "G-QKLWTP62ZJ";
  var lang = document.documentElement.lang.toLowerCase();
  lang = lang.indexOf("de") === 0 ? "de" : lang.indexOf("en") === 0 ? "en" : "hu";
  var copy = {
    hu: ["Látogatottsági mérés", "Engedélyezed, hogy a VIPACH for Business Google Analytics segítségével mérje az oldal látogatottságát? A Google kód csak az engedélyed után töltődik be. A döntés az aktuális oldalmegnyitásra érvényes.", "Engedélyezem", "Nem kérem"],
    en: ["Website analytics", "May VIPACH for Business use Google Analytics to measure visits to this page? The Google tag loads only after you agree. Your choice applies to this page view.", "Allow analytics", "No thanks"],
    de: ["Besuchermessung", "Darf VIPACH for Business Google Analytics zur Messung der Seitenbesuche verwenden? Das Google-Tag wird erst nach Ihrer Zustimmung geladen. Die Auswahl gilt für diesen Seitenaufruf.", "Erlauben", "Ablehnen"]
  }[lang];
  var loaded = false;
  var enabled = false;
  var block = "ga-disable-" + id;
  window[block] = true;
  var settings = {
    hu: ["Analitikai beállítások", "Hozzájárulás visszavonása"],
    en: ["Analytics settings", "Withdraw consent"],
    de: ["Analyse-Einstellungen", "Einwilligung widerrufen"]
  }[lang];
  function start() {
    enabled = true;
    window[block] = false;
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    var referrer = "";
    try { if (document.referrer) { var u = new URL(document.referrer); referrer = u.origin + u.pathname; } } catch (_) {}
    window.gtag("js", new Date());
    window.gtag("config", id, {
      page_location: location.origin + location.pathname,
      page_referrer: referrer,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
    document.head.appendChild(tag);
  }
  function mount() {
    if (document.getElementById("vipach-analytics-consent")) return;
    var style = document.createElement("style");
    style.textContent = "#vipach-analytics-consent{position:fixed;z-index:2147483646;left:16px;right:16px;bottom:16px;max-width:620px;margin:auto;padding:18px 20px;background:#fff;color:#15202e;border:1px solid #d6d8dd;border-radius:14px;box-shadow:0 12px 40px #0003;font:15px/1.5 system-ui,sans-serif}#vipach-analytics-consent p{margin:0 0 12px}#vipach-analytics-consent .vipach-actions{display:flex;gap:8px;flex-wrap:wrap}#vipach-analytics-consent button{font:inherit;padding:8px 14px;border:1px solid #687488;border-radius:8px;background:#fff;color:#15202e;cursor:pointer}#vipach-analytics-consent button.vipach-allow{background:#17283d;color:#fff;border-color:#17283d}#vipach-analytics-consent button:focus-visible{outline:3px solid #c9a227;outline-offset:2px}";
    style.textContent += "#vipach-analytics-settings{position:fixed;left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:80;min-height:44px;border:1px solid #687488;border-radius:8px;padding:8px 13px;background:#fff;color:#15202e;font:600 13px/1.3 system-ui,sans-serif;cursor:pointer}#vipach-analytics-settings:focus-visible{outline:3px solid #c9a227;outline-offset:2px}";
    document.head.appendChild(style);
    var box = document.createElement("div");
    box.id = "vipach-analytics-consent";
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", copy[0]);
    var message = document.createElement("p");
    var strong = document.createElement("strong");
    strong.textContent = copy[0] + ". ";
    message.appendChild(strong);
    message.appendChild(document.createTextNode(copy[1]));
    var actions = document.createElement("div");
    actions.className = "vipach-actions";
    var allow = document.createElement("button");
    allow.type = "button";
    allow.className = "vipach-allow";
    allow.textContent = copy[2];
    var change = document.createElement("button");
    change.id = "vipach-analytics-settings";
    change.type = "button";
    change.textContent = settings[0];
    change.hidden = true;
    change.setAttribute("aria-controls", box.id);
    change.setAttribute("aria-expanded", "false");
    function close() {
      box.hidden = true;
      change.hidden = false;
      change.setAttribute("aria-expanded", "false");
      change.focus();
    }
    function reopen() {
      box.hidden = false;
      deny.textContent = enabled ? settings[1] : copy[3];
      change.setAttribute("aria-expanded", "true");
      (enabled ? deny : allow).focus();
    }
    change.addEventListener("click", reopen);
    allow.addEventListener("click", function () { start(); close(); });
    var deny = document.createElement("button");
    deny.type = "button";
    deny.textContent = copy[3];
    deny.addEventListener("click", function () {
      window[block] = true;
      enabled = false;
      close();
    });
    actions.appendChild(allow);
    actions.appendChild(deny);
    box.appendChild(message);
    box.appendChild(actions);
    document.body.appendChild(box);
    document.body.appendChild(change);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
