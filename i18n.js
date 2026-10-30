(() => {
  // Language picker. English lives in the HTML; other languages are
  // dictionaries in lang/*.json keyed by the English text.
  const LANGS = [
    ["en", "English", "EN"],
    ["fr", "Français", "FR"],
    ["es", "Español", "ES"],
    ["zh-Hans", "简体中文", "简"],
    ["zh-Hant", "繁體中文", "繁"],
    ["fa", "فارسی", "FA"],
    ["ko", "한국어", "KO"],
    ["ru", "Русский", "RU"],
  ];
  const RTL = new Set(["fa"]);
  const KEY = "serenity-lang";
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const cache = {};
  const subs = [];
  const texts = [];
  const attrs = [];
  let dict = null;
  let lang = "en";

  // A leading "~" in a translation means: drop the space before it (used
  // where a sentence continues straight after bold text in CJK languages).
  const clean = (s) => s.replace(/^~/, "");
  const t = (s) => (dict && dict[s] != null ? clean(dict[s]) : s);

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement.closest("script, style, .lang") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n; (n = walker.nextNode()); ) {
    const key = norm(n.nodeValue);
    if (!key) continue;
    texts.push({ node: n, orig: n.nodeValue, lead: n.nodeValue.match(/^\s*/)[0], trail: n.nodeValue.match(/\s*$/)[0], key });
  }
  document.querySelectorAll("[alt], [aria-label], [title]").forEach((el) => {
    if (el.closest(".lang")) return;
    ["alt", "aria-label", "title"].forEach((a) => {
      if (el.hasAttribute(a)) attrs.push({ el, a, orig: el.getAttribute(a) });
    });
  });

  const root = document.documentElement;
  const picker = document.querySelector(".lang");
  const btn = picker.querySelector(".lang-btn");
  const menu = picker.querySelector(".lang-menu");
  const code = picker.querySelector(".lang-code");

  menu.innerHTML = LANGS.map(([c, name]) => `<li><button type="button" lang="${c}" data-lang="${c}">${name}</button></li>`).join("");
  const items = [...menu.querySelectorAll("button")];

  function apply() {
    texts.forEach((x) => {
      const tr = dict && dict[x.key];
      if (tr == null) x.node.nodeValue = x.orig;
      else x.node.nodeValue = (tr.startsWith("~") ? "" : x.lead) + clean(tr) + x.trail;
    });
    attrs.forEach((x) => x.el.setAttribute(x.a, t(norm(x.orig))));
    root.lang = lang === "en" ? "en-CA" : lang;
    // Keep the page layout as is and only flip the direction of text.
    root.classList.toggle("rtl-text", RTL.has(lang));
    code.textContent = LANGS.find((l) => l[0] === lang)[2];
    btn.setAttribute("aria-label", t("Language"));
    items.forEach((b) => b.setAttribute("aria-current", String(b.dataset.lang === lang)));
    if (lang === "fa" && !document.getElementById("font-fa")) {
      const l = document.createElement("link");
      l.id = "font-fa"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
    subs.forEach((f) => f());
  }

  async function set(next) {
    if (!LANGS.some((l) => l[0] === next)) next = "en";
    if (next === "en") dict = null;
    else {
      try {
        cache[next] = cache[next] || (await (await fetch(`lang/${next}.json`)).json());
      } catch { return; }
      dict = cache[next];
    }
    lang = next;
    apply();
    try { localStorage.setItem(KEY, next); } catch {}
  }

  const open = (on) => {
    menu.hidden = !on;
    btn.setAttribute("aria-expanded", String(on));
    if (on) (items.find((b) => b.dataset.lang === lang) || items[0]).focus();
  };
  btn.addEventListener("click", () => open(menu.hidden));
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang]");
    if (!b) return;
    open(false); btn.focus();
    set(b.dataset.lang);
  });
  picker.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) { open(false); btn.focus(); }
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !menu.hidden) {
      e.preventDefault();
      const i = items.indexOf(document.activeElement);
      items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
    }
  });
  document.addEventListener("click", (e) => { if (!picker.contains(e.target)) open(false); });

  window.i18n = { t, on: (f) => subs.push(f), get lang() { return lang; } };

  let saved = null;
  try { saved = new URLSearchParams(location.search).get("lang") || localStorage.getItem(KEY); } catch {}
  if (saved && saved !== "en") set(saved);
  else apply();
})();
