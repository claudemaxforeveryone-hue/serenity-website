(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tr = (s) => (window.i18n ? window.i18n.t(s) : s);
  const onLang = (f) => window.i18n && window.i18n.on(f);

  // Colour grading: each section shifts the accent one step along
  // the report's lavender-to-indigo strip.
  const from = [155, 135, 182], to = [63, 66, 112];
  const toneSections = document.querySelectorAll("[data-tone]");
  const last = Math.max(...[...toneSections].map((s) => Number(s.dataset.tone) || 0)) || 1;
  const gradeAt = (t) => "rgb(" + from.map((c, i) => Math.round(c + (to[i] - c) * (t / last))).join(" ") + ")";
  const stripLabel = document.getElementById("stripSection");
  let stripKey = "Welcome";
  onLang(() => { if (stripLabel) stripLabel.textContent = tr(stripKey); });
  const toneObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const t = Number(e.target.dataset.tone) || 0;
      root.style.setProperty("--accent", gradeAt(t));
      stripKey = e.target.dataset.label || "";
      if (stripLabel) stripLabel.textContent = tr(stripKey);
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  toneSections.forEach((s) => toneObserver.observe(s));

  // Scroll reveals and the survey ring
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      e.target.querySelectorAll(".count").forEach(countUp);
      revealObserver.unobserve(e.target);
    });
  }, { threshold: 0.25 });
  document.querySelectorAll(".reveal, .stats").forEach((el) => revealObserver.observe(el));

  function countUp(el) {
    const to = Number(el.dataset.to);
    const fmt = (n) => n.toLocaleString("en-CA");
    if (reduce) { el.textContent = fmt(to); return; }
    const start = performance.now();
    const dur = 1800;
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Hero swirl: layers drift with the pointer at different depths
  const art = document.querySelector(".hero-art");
  if (art && !reduce && matchMedia("(pointer: fine)").matches) {
    const layers = [...art.querySelectorAll(".layer")];
    let frame = 0;
    window.addEventListener("pointermove", (ev) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const x = ev.clientX / innerWidth - 0.5;
        const y = ev.clientY / innerHeight - 0.5;
        layers.forEach((l) => {
          const d = Number(l.dataset.depth) || 20;
          l.style.transform = `translate(${x * d}px, ${y * d}px)`;
        });
      });
    }, { passive: true });
  }

  // Mobile menu
  const menuBtn = document.querySelector(".menu-btn");
  const links = document.getElementById("navLinks");
  menuBtn.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (e) => {
    if (e.target.closest("a")) { links.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
  });

  // BRAVE goals, from the report's Project Goals page
  const goals = [
    { word: "Build awareness", num: "10", unit: "posts shared", text: "Science-based posts on Instagram and TikTok that explain risk factors, warning signs and treatment in plain language." },
    { word: "Research", num: "5", unit: "sources used", text: "Every post is grounded in published research, from the National Institute of Mental Health to peer-reviewed journals." },
    { word: "Action", num: "2", unit: "events hosted", text: "In-person events at school, including Pose for Serenity and our Halloween Care Bags." },
    { word: "Validate knowledge", num: "1", unit: "advisor", text: "A registered psychotherapist reviews our content so it is accurate, careful and safe to share." },
    { word: "Extend support", num: "500", unit: "followers taught", text: "Reaching young people where they already are, and pointing them to real support when they need it." },
  ];
  const tabs = [...document.querySelectorAll(".brave-letters button")];
  const panel = document.getElementById("bravePanel");
  let goal = 0;
  const setGoal = (i) => {
    goal = i;
    tabs.forEach((t, j) => t.setAttribute("aria-selected", String(i === j)));
    const g = goals[i];
    document.getElementById("braveWord").textContent = tr(g.word);
    document.getElementById("braveNum").textContent = g.num;
    document.getElementById("braveUnit").textContent = tr(g.unit);
    document.getElementById("braveText").textContent = tr(g.text);
    panel.classList.remove("swap"); void panel.offsetWidth; panel.classList.add("swap");
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => setGoal(i));
    t.addEventListener("mouseenter", () => { if (matchMedia("(hover: hover)").matches) setGoal(i); });
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const n = (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
      tabs[n].focus(); setGoal(n);
    });
  });

  onLang(() => {
    if (tabs.some((x) => x.getAttribute("aria-selected") === "true")) setGoal(goal);
    document.querySelectorAll(".next-hint").forEach((b) => (b.textContent = tr(b.dataset.key)));
  });

  // Myth or fact deck
  const deck = document.getElementById("deck");
  const cards = [...deck.querySelectorAll(".card")];
  const done = document.getElementById("deckDone");
  const scoreEl = document.getElementById("score");
  let current = 0, score = 0;

  const layout = () => {
    cards.forEach((c, i) => {
      const off = i - current;
      if (off < 0) {
        c.style.transform = `translate(-40%, -6%) rotate(-12deg)`;
        c.style.opacity = "0";
        c.style.pointerEvents = "none";
        c.setAttribute("aria-hidden", "true");
      } else {
        c.style.transform = `translateY(${off * 14}px) scale(${1 - off * 0.04})`;
        c.style.opacity = off > 2 ? "0" : String(1 - off * 0.25);
        c.style.zIndex = String(cards.length - off);
        c.style.pointerEvents = off === 0 ? "auto" : "none";
        c.toggleAttribute("aria-hidden", off !== 0);
      }
      c.querySelectorAll("button").forEach((b) => (b.tabIndex = off === 0 ? 0 : -1));
    });
  };

  const next = () => {
    current += 1;
    layout();
    if (current >= cards.length) {
      document.getElementById("finalScore").textContent = score;
      setTimeout(() => { deck.hidden = true; done.hidden = false; }, reduce ? 0 : 500);
    } else {
      cards[current].querySelector("button").focus({ preventScroll: true });
    }
  };

  cards.forEach((card) => {
    card.querySelectorAll(".choices button").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (card.classList.contains("answered")) return;
        const correct = btn.dataset.pick === card.dataset.answer;
        card.classList.add("answered");
        btn.classList.add(correct ? "right" : "wrong");
        if (!correct) card.querySelector(`[data-pick="${card.dataset.answer}"]`).classList.add("right");
        if (correct) score += 1;
        scoreEl.textContent = score;
        const go = document.createElement("button");
        go.className = "next-hint";
        go.dataset.key = current === cards.length - 1 ? "See your score" : "Next statement";
        go.textContent = tr(go.dataset.key);
        go.addEventListener("click", next);
        card.appendChild(go);
        go.focus({ preventScroll: true });
      });
    });
  });

  document.getElementById("restart").addEventListener("click", () => {
    current = 0; score = 0; scoreEl.textContent = "0";
    cards.forEach((c) => {
      c.classList.remove("answered");
      c.querySelectorAll(".right, .wrong").forEach((b) => b.classList.remove("right", "wrong"));
      c.querySelector(".next-hint")?.remove();
    });
    done.hidden = true; deck.hidden = false;
    layout();
  });
  layout();

  // Risk and protective factors switch
  const sw = document.querySelector(".switch");
  const sets = document.querySelector(".factor-sets");
  sw.querySelectorAll(".switch-btn").forEach((b) => {
    b.addEventListener("click", () => {
      const side = b.dataset.side;
      sw.querySelectorAll(".switch-btn").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      sw.classList.toggle("protect", side === "protect");
      sets.dataset.side = side;
    });
  });

  // Post carousel: buttons and drag to scroll
  let dragged = false;
  document.querySelectorAll(".track-btns").forEach((group) => {
    const track = document.getElementById(group.dataset.for);
    group.querySelectorAll(".arrow").forEach((a) => {
      a.addEventListener("click", () => {
        track.scrollBy({ left: Number(a.dataset.dir) * track.clientWidth * 0.6, behavior: reduce ? "auto" : "smooth" });
      });
    });
    let dragX = null, startScroll = 0;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      dragX = e.clientX; startScroll = track.scrollLeft; dragged = false;
    });
    track.addEventListener("pointermove", (e) => {
      if (dragX === null) return;
      if (Math.abs(e.clientX - dragX) > 5 && !dragged) { dragged = true; track.classList.add("dragging"); track.setPointerCapture(e.pointerId); }
      if (dragged) track.scrollLeft = startScroll - (e.clientX - dragX);
    });
    const endDrag = () => { dragX = null; track.classList.remove("dragging"); };
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
  });

  // Event tabs
  const evTabs = [...document.querySelectorAll(".tabs [role=tab]")];
  evTabs.forEach((tab, i) => {
    const select = () => {
      evTabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
    };
    tab.addEventListener("click", select);
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const n = evTabs[(i + (e.key === "ArrowRight" ? 1 : evTabs.length - 1)) % evTabs.length];
      n.focus(); n.click();
    });
  });

  // Next steps accordion
  const rise = [...document.querySelectorAll(".rise li")];
  const openRise = (li) => rise.forEach((x) => x.classList.toggle("open", x === li));
  if (rise.length) openRise(rise[0]);
  rise.forEach((li) => {
    li.addEventListener("click", () => openRise(li));
    li.addEventListener("focus", () => openRise(li));
    li.addEventListener("mouseenter", () => { if (matchMedia("(hover: hover)").matches) openRise(li); });
  });

  // Lightbox for photos and posts
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbCap = document.getElementById("lbCap");
  let group = [], idx = 0;
  const show = () => {
    const img = group[idx];
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = img.alt;
  };
  document.addEventListener("click", (e) => {
    const img = e.target.closest("img[data-zoom]");
    if (!img || dragged) { dragged = false; return; }
    group = [...img.closest(".mosaic, .marquee").querySelectorAll("img[data-zoom]")].filter((i) => !i.closest("[aria-hidden]"));
    idx = Math.max(0, group.findIndex((i) => i.src === img.src));
    show();
    lb.showModal();
  });
  lb.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lb]");
    if (e.target === lb || (b && b.dataset.lb === "close")) { lb.close(); return; }
    if (b) { idx = (idx + Number(b.dataset.lb) + group.length) % group.length; show(); }
  });
  lb.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      idx = (idx + (e.key === "ArrowRight" ? 1 : -1) + group.length) % group.length; show();
    }
  });
  document.querySelectorAll("img[data-zoom]").forEach((img) => {
    if (img.closest("[aria-hidden]")) return;
    img.tabIndex = 0;
    img.addEventListener("keydown", (e) => { if (e.key === "Enter") img.click(); });
  });
})();
