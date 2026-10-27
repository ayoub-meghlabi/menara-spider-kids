/* =========================================================
   SoundElite Kids — Spider-Man pajama landing commerce logic
   ========================================================= */

const CONFIG = {
  BACKEND_URL: localStorage.getItem("menara_backend_url") || (window.location.protocol === "file:" ? "http://localhost:3000" : window.location.origin),
  CLOUD_URL: "https://underlying-jaguar-aus-safely.trycloudflare.com",
  GOOGLE_SHEET_WEBHOOK: "https://script.google.com/macros/s/AKfycbwVTa6dj32XVpKt17VV9GtITF8sUxNIGi9G9LRpP2WRgFpGm_jVqb_2zOmNb2FOn1NfiQ/exec",
  PRODUCT_NAME: "طقم بيجامة سبايدرمان للأطفال",
  PRODUCT_PRICE: 199,
  OLD_PRICE: 329,
  WHATSAPP: "212710054951",
  STORAGE_KEY: "soundelite_kids_offer_expiry",
  BUNDLES: {
    trio: { qty: 3, total: 199, old: 329, label: "3 أطقم" },
  },
  PACKS: {
    pack1: {
      id: "pack1",
      name: "المجموعة 1 (أسود + أزرق + رمادي)",
      label: "المجموعة 1: أسود + أزرق + رمادي",
      image: "images/trio-pack-1.jpeg",
      colors: ["أسود", "أزرق", "رمادي"],
    },
    pack2: {
      id: "pack2",
      name: "المجموعة 2 (أخضر + عنابي + بيج)",
      label: "المجموعة 2: أخضر + عنابي + بيج",
      image: "images/slide-2.jpeg",
      colors: ["أخضر", "عنابي", "بيج"],
    },
  },
  COLORS: {
    gray: { name: "رمادي", en: "Grey", image: "images/pajama-gray.jpeg" },
    green: { name: "أخضر", en: "Green", image: "images/pajama-green.jpeg" },
    navy: { name: "أزرق", en: "Blue", image: "images/pajama-navy.jpeg" },
    black: { name: "أسود", en: "Black", image: "images/pajama-black.jpeg" },
    burgundy: { name: "عنابي", en: "Burgundy", image: "images/pajama-burgundy.jpeg" },
    beige: { name: "بيج", en: "Beige", image: "images/pajama-beige.jpeg" },
  },
};

const MOROCCAN_CITIES = [
  "الدار البيضاء", "الرباط", "فاس", "مراكش", "أكادير", "طنجة", "مكناس",
  "وجدة", "القنيطرة", "تطوان", "سلا", "آسفي", "المحمدية", "خريبكة",
  "الجديدة", "بني ملال", "الناظور", "تازة", "الخميسات", "العرائش",
  "تمارة", "برشيد", "سطات", "القصر الكبير", "الصويرة", "ورزازات",
  "العيون", "الداخلة", "كلميم", "تارودانت", "الحسيمة", "أزرو", "إفران",
  "الرشيدية", "ميدلت", "أزيلال", "شفشاون", "وزان", "سيدي قاسم", "إنزكان",
  "أيت ملول", "تيزنيت", "سيدي إفني", "طانطان", "تيفلت", "الفقيه بن صالح",
  "أبو الجعد", "جرسيف", "تاوريرت", "بركان", "المضيق", "الفنيدق",
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const state = {
  bundle: "trio",
  orderQty: 1,
  pack: "pack1",
  color: "gray",
  isCustomColor: false,
  age: "",
  submitting: false,
  checkoutTracked: false,
  userInteractedWithColors: false,
  attribution: readAttribution(),
};

/* ---------------- Utilities ---------------- */
function formatMad(value) {
  return `${Number(value || 0).toLocaleString("ar-MA")} درهم`;
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[\s\-().]/g, "").replace(/[^\d+]/g, "");
}

function isValidMoroccanPhone(phone) {
  const value = normalizePhone(phone);
  return /^(?:\+212|00212|0)[5-7]\d{8}$/.test(value);
}

function formatMoroccanPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 12);
  if (digits.startsWith("212")) {
    const local = digits.slice(3);
    return `+212 ${local.replace(/(\d{2})(?=\d)/g, "$1 ").trim()}`;
  }
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

function readAttribution() {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("utm_source") || params.get("source") || "direct",
    medium: params.get("utm_medium") || "",
    campaign: params.get("utm_campaign") || "",
    content: params.get("utm_content") || "",
    referrer: document.referrer ? new URL(document.referrer).hostname : "",
  };
}

let toastTimer;
function showToast(message, type = "info") {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3400);
}

function track(event, data = {}) {
  try {
    if (typeof window.fbq === "function") window.fbq("track", event, data);
  } catch {
    /* pixel is optional */
  }
}

/* ---------------- Countdown ---------------- */
function initCountdown() {
  const key = CONFIG.STORAGE_KEY;
  let expiry = Number(localStorage.getItem(key));
  if (!expiry || expiry < Date.now()) {
    expiry = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(key, String(expiry));
  }

  const els = {
    hours: [$("#bar-hours"), $("#cd-hours")],
    mins: [$("#bar-mins"), $("#cd-mins")],
    secs: [$("#bar-secs"), $("#cd-secs")],
  };

  function setText(list, value) {
    list.forEach((el) => { if (el) el.textContent = value; });
  }

  function tick() {
    const remaining = Math.max(0, expiry - Date.now());
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    setText(els.hours, String(h).padStart(2, "0"));
    setText(els.mins, String(m).padStart(2, "0"));
    setText(els.secs, String(s).padStart(2, "0"));

    if (remaining <= 0) {
      expiry = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(key, String(expiry));
    }
  }

  tick();
  setInterval(tick, 1000);
}

/* ---------------- Product options ---------------- */
function getBundle() {
  const q = state.orderQty || 1;
  return {
    qty: 3 * q,
    total: 199 * q,
    old: 329 * q,
    label: q === 1 ? "عرض 3 أطقم" : `عرض ${q * 3} أطقم (${q} طلبات)`,
  };
}

function getActiveSelection() {
  if (!state.isCustomColor) {
    const pack = CONFIG.PACKS[state.pack] || CONFIG.PACKS.pack1;
    return {
      isPack: true,
      name: pack.name,
      label: pack.label,
      image: pack.image,
      key: pack.id,
      en: pack.id,
    };
  }
  const color = CONFIG.COLORS[state.color] || CONFIG.COLORS.gray;
  return {
    isPack: false,
    name: color.name,
    label: color.name,
    image: color.image,
    key: state.color,
    en: color.en,
  };
}

function updateSummary() {
  const bundle = getBundle();
  const sel = getActiveSelection();
  const ageLabel = state.age ? (state.age.includes('سنة') || state.age.includes('سنوات') ? state.age : `${state.age} سنوات`) : "المقاس";
  const summaryEl = $("#summary-bundle");
  const totalEl = $("#total-price");
  const submitLabel = $("#submit-btn span");
  const imageEl = $("#summary-image");
  const colorLabel = $("#color-selected-label");
  const barPriceEl = $("#mobile-bar .mb-price strong");
  const barLabelEl = $("#mobile-bar .mb-price small");
  const qtyNote = $("#order-qty-note");

  if (qtyNote) {
    const q = state.orderQty || 1;
    qtyNote.textContent = q === 1 ? "1 طلب (3 أطقم بـ 199 درهم)" : `${q} طلبات (${q * 3} أطقم بـ ${q * 199} درهم)`;
  }

  if (summaryEl) summaryEl.textContent = `${bundle.label} · ${sel.name} · ${ageLabel}`;
  if (totalEl) totalEl.textContent = formatMad(bundle.total);
  if (submitLabel) submitLabel.textContent = `تأكيد الطلب — ${formatMad(bundle.total)} عند الاستلام`;
  if (imageEl) {
    imageEl.src = sel.image;
    imageEl.alt = sel.name;
  }
  if (colorLabel) colorLabel.textContent = sel.label;
  if (barPriceEl) barPriceEl.innerHTML = `${Number(bundle.total).toLocaleString("ar-MA")} <span>درهم</span>`;
  if (barLabelEl) barLabelEl.textContent = bundle.label;
}

function selectBundle(bundleKey, options = {}) {
  const bundle = CONFIG.BUNDLES[bundleKey] || CONFIG.BUNDLES.trio;
  state.bundle = bundleKey;
  const input = document.querySelector(`input[name="bundle"][value="${bundleKey}"]`);
  if (input) input.checked = true;

  // Toggle pack selector visibility vs individual colors
  const packSelector = $("#trio-pack-selector");
  if (packSelector) {
    if (bundleKey === "trio" || bundleKey === "duo") {
      packSelector.style.display = "grid";
    } else {
      packSelector.style.display = "none";
      state.isCustomColor = true;
      const customGrid = $("#color-grid");
      if (customGrid) customGrid.classList.remove("hidden");
    }
  }

  updateSummary();

  if (!options.silent) {
    track("AddToCart", {
      content_name: CONFIG.PRODUCT_NAME,
      content_category: "kids_pajamas",
      content_ids: [state.color],
      value: bundle.total,
      currency: "MAD",
      num_items: bundle.qty,
    });
  }
}

function selectPack(packKey, options = {}) {
  const pack = CONFIG.PACKS[packKey];
  if (!pack) return;
  state.pack = packKey;
  state.isCustomColor = false;
  state.userInteractedWithColors = true;

  // Update pack radio & classes
  $$(".pack-opt-card").forEach((card) => {
    const isThis = card.dataset.pack === packKey;
    card.classList.toggle("active", isThis);
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = isThis;
  });

  // Only change hero slideshow image if user explicitly interacted with a pack button (not on silent startup)
  if (!options.silent) {
    const heroImg = $(".product-img");
    if (heroImg) {
      heroImg.classList.add("fading");
      setTimeout(() => {
        heroImg.src = pack.image;
        heroImg.alt = pack.name;
        heroImg.classList.remove("fading");
      }, 200);
    }
  }

  updateSummary();

  if (!options.silent) {
    track("AddToCart", {
      content_name: CONFIG.PRODUCT_NAME,
      content_category: "kids_pajamas",
      content_ids: [packKey],
      value: getBundle().total,
      currency: "MAD",
      num_items: getBundle().qty,
    });
  }

  if (options.scroll) {
    const target = $("#order-form");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(`اخترت ${pack.name}. كمل المعلومات باش نأكدو الطلب.`, "success");
  }
}

function selectColor(colorKey, options = {}) {
  const color = CONFIG.COLORS[colorKey];
  if (!color) return;
  state.color = colorKey;
  state.isCustomColor = true;
  state.userInteractedWithColors = true;

  const input = document.querySelector(`input[name="color"][data-color="${colorKey}"]`);
  if (input) input.checked = true;

  // Deactivate pack cards visually
  $$(".pack-opt-card").forEach((c) => c.classList.remove("active"));

  // Update hero img
  const heroImg = $(".product-img");
  if (heroImg) {
    heroImg.classList.add("fading");
    setTimeout(() => {
      heroImg.src = color.image;
      heroImg.alt = color.name;
      heroImg.classList.remove("fading");
    }, 200);
  }

  updateSummary();

  if (!options.silent) {
    track("AddToCart", {
      content_name: CONFIG.PRODUCT_NAME,
      content_category: "kids_pajamas",
      content_ids: [colorKey],
      value: getBundle().total,
      currency: "MAD",
      num_items: getBundle().qty,
    });
  }

  if (options.scroll) {
    const target = $("#order-form");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(`اخترت اللون ${color.name}. كمل المعلومات باش نأكدو الطلب.`, "success");
  }
}

function initBundles() {
  const grid = $("#bundle-grid");
  if (!grid) return;

  grid.addEventListener("change", (event) => {
    const input = event.target.closest('input[name="bundle"]');
    if (input) selectBundle(input.value);
  });

  const requested = new URLSearchParams(window.location.search).get("bundle");
  const initial = requested && CONFIG.BUNDLES[requested] ? requested : "trio";
  selectBundle(initial, { silent: true });
}

function initColors() {
  // Trio Pack selector cards
  $$(".pack-opt-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectPack(card.dataset.pack);
    });
  });

  // Showcase section pack buttons
  $$(".btn-select-pack").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const pack = btn.dataset.pack;
      if (pack) {
        selectBundle("trio", { silent: true });
        selectPack(pack, { scroll: true });
      }
    });
  });

  // Toggle custom individual colors
  const toggleBtn = $("#btn-toggle-custom");
  const colorGrid = $("#color-grid");
  if (toggleBtn && colorGrid) {
    toggleBtn.addEventListener("click", () => {
      colorGrid.classList.toggle("hidden");
    });
  }

  if (colorGrid) {
    colorGrid.addEventListener("change", (event) => {
      const input = event.target.closest('input[name="color"]');
      if (input) selectColor(input.dataset.color);
    });
  }

  $$(".color-card[data-color]").forEach((card) => {
    card.addEventListener("click", () => {
      selectColor(card.dataset.color, { scroll: true });
    });
  });

  selectPack("pack1", { silent: true });
}

/* ---------------- Auto Slideshow (تفاصيل وصور متحركة) ---------------- */
function initAutoSlideshow() {
  const heroImg = $(".product-img");
  const splitImg = $(".split-product-img");
  if (!heroImg) return;

  const slides = [
    { src: "images/slide-1.jpeg", label: "طقم بيجامة سبايدرمان للأطفال — موديل 1" },
    { src: "images/slide-2.jpeg", label: "طقم بيجامة سبايدرمان للأطفال — موديل 2" },
    { src: "images/slide-3.jpeg", label: "طقم بيجامة سبايدرمان للأطفال — موديل 3" },
    { src: "images/slide-4.jpeg", label: "طقم بيجامة سبايدرمان للأطفال — موديل 4" },
    { src: "images/slide-5.jpeg", label: "طقم بيجامة سبايدرمان للأطفال — موديل 5" },
    { src: "images/slide-6.jpeg", label: "طقم بيجامة سبايدرمان للأطفال — موديل 6" },
  ];

  let currentIdx = 0;
  let isHovered = false;
  const dots = $$(".stage-slider-dots .s-dot");

  function updateDots(idx) {
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === (idx % dots.length));
    });
  }

  function goToSlide(idx) {
    currentIdx = idx % slides.length;
    const slide = slides[currentIdx];

    heroImg.classList.add("fading");
    if (splitImg) splitImg.classList.add("fading");

    setTimeout(() => {
      heroImg.src = slide.src;
      heroImg.alt = slide.label;
      if (splitImg) {
        const nextSlide = slides[(currentIdx + 1) % slides.length];
        splitImg.src = nextSlide.src;
        splitImg.alt = nextSlide.label;
      }
      heroImg.classList.remove("fading");
      if (splitImg) splitImg.classList.remove("fading");
      updateDots(currentIdx);
    }, 280);
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const idx = Number(dot.dataset.idx || 0);
      goToSlide(idx);
    });
  });

  const stage = heroImg.closest(".product-stage");
  if (stage) {
    stage.addEventListener("mouseenter", () => { isHovered = true; });
    stage.addEventListener("mouseleave", () => { isHovered = false; });
  }

  function advanceSlide() {
    if (isHovered) return;
    goToSlide(currentIdx + 1);
  }

  setInterval(advanceSlide, 3200);
}

function initAge() {
  const hiddenInput = $("#customer-age");
  const label = $("#age-selected-label");
  const buttons = $$(".age-pill-btn");
  if (!buttons.length) return;

  const supportedAges = buttons.map((btn) => btn.dataset.age).filter(Boolean);
  const requestedAge = hiddenInput ? hiddenInput.value : "";
  // Only ages 2–10 are sold. Older builds defaulted to "سنة"; migrate that
  // stale value instead of submitting an unsupported size.
  const defaultAge = supportedAges.includes(requestedAge) ? requestedAge : "5 سنوات";
  state.age = defaultAge;
  if (hiddenInput) hiddenInput.value = defaultAge;
  if (label) label.textContent = defaultAge;

  buttons.forEach(btn => {
    const isDefault = btn.dataset.age === defaultAge;
    btn.classList.toggle("active", isDefault);
    btn.setAttribute("aria-checked", String(isDefault));

    const selectAge = (e) => {
      e.preventDefault();
      e.stopPropagation();
      buttons.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-checked", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-checked", "true");
      const chosenAge = btn.dataset.age;
      state.age = chosenAge;
      if (hiddenInput) hiddenInput.value = chosenAge;
      if (label) label.textContent = chosenAge;
      clearError("age-error");
      updateSummary();
    };

    btn.addEventListener("click", selectAge);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") selectAge(e);
    });
  });
}

/* ---------------- Quantity Stepper (Exact match to user's design) ---------------- */
function initOrderQty() {
  const hiddenInput = $("#order-quantity-input");
  const minusBtn = $("#qty-minus");
  const plusBtn = $("#qty-plus");
  const displayEl = $("#qty-val-display");

  state.orderQty = 1;
  if (hiddenInput) hiddenInput.value = "1";
  if (displayEl) displayEl.textContent = "1";

  if (minusBtn) {
    minusBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (state.orderQty > 1) {
        state.orderQty -= 1;
        if (displayEl) displayEl.textContent = String(state.orderQty);
        if (hiddenInput) hiddenInput.value = String(state.orderQty);
        updateSummary();
      }
    });
  }

  if (plusBtn) {
    plusBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (state.orderQty < 10) {
        state.orderQty += 1;
        if (displayEl) displayEl.textContent = String(state.orderQty);
        if (hiddenInput) hiddenInput.value = String(state.orderQty);
        updateSummary();
      }
    });
  }
}

/* ---------------- City dropdown ---------------- */
function initCityDropdown() {
  const trigger = $("#city-selected");
  const label = $("#city-label");
  const panel = $("#city-panel");
  const searchInput = $("#city-search");
  const list = $("#city-list");
  const hidden = $("#customer-city");
  if (!trigger || !panel) return;

  let activeIndex = -1;

  function setOpen(open) {
    panel.classList.toggle("hidden", !open);
    trigger.setAttribute("aria-expanded", String(open));
    if (open) {
      searchInput.value = "";
      renderList("");
      activeIndex = -1;
      // Do not pop the mobile keyboard just because the city panel opened;
      // it would cover the list the customer is trying to tap.
      if (window.matchMedia("(pointer: fine)").matches) {
        setTimeout(() => searchInput.focus(), 30);
      }
    }
  }

  function selectCity(city) {
    hidden.value = city;
    label.textContent = city;
    if (searchInput) searchInput.value = city;
    trigger.classList.remove("invalid");
    clearError("city-error");
    setOpen(false);
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
  }

  function filteredCities(term) {
    const query = term.trim();
    if (!query) return MOROCCAN_CITIES;
    return MOROCCAN_CITIES.filter((city) => city.includes(query) || city.replace(/[أإآ]/g, "ا").includes(query.replace(/[أإآ]/g, "ا")));
  }

  function renderList(term) {
    const cities = filteredCities(term);
    activeIndex = -1;
    list.innerHTML = "";
    if (!cities.length) {
      const li = document.createElement("li");
      li.className = "no-result";
      li.textContent = "ما لقيناش هاد المدينة. جرب اسم آخر أو تواصل معانا.";
      list.appendChild(li);
      return;
    }
    cities.forEach((city) => {
      const li = document.createElement("li");
      li.textContent = city;
      li.setAttribute("role", "option");
      li.tabIndex = 0;
      const isSelected = hidden.value === city;
      li.setAttribute("aria-selected", String(isSelected));
      if (isSelected) li.classList.add("selected");

      const handleSelect = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        selectCity(city);
      };

      li.addEventListener("click", handleSelect);
      li.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") handleSelect(event);
      });
      list.appendChild(li);
    });
  }

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(panel.classList.contains("hidden"));
  });

  searchInput.addEventListener("input", (event) => {
    renderList(event.target.value);
  });

  searchInput.addEventListener("keydown", (event) => {
    const options = Array.from(list.querySelectorAll("li:not(.no-result)"));
    if (!options.length) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = event.key === "ArrowDown"
        ? (activeIndex + 1) % options.length
        : (activeIndex - 1 + options.length) % options.length;
      options.forEach((el, i) => el.classList.toggle("selected", i === activeIndex));
      options[activeIndex].scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectCity(options[Math.max(0, activeIndex)].textContent);
    } else if (event.key === "Escape") {
      setOpen(false);
      trigger.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#city-wrapper")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

/* ---------------- Form ---------------- */
function setError(id, message) {
  const el = $(`#${id}`);
  if (el) el.textContent = message;
}

function clearError(id) {
  setError(id, "");
}

function markInvalid(input) {
  if (input) input.classList.add("invalid");
}

function clearInvalid(input) {
  if (input) input.classList.remove("invalid");
}

const GITHUB_TUNNEL_RAW = "https://raw.githubusercontent.com/menara-store-ma/menara-spider-kids/main/tunnel.json";

async function resolveOrderEndpoints() {
  const isLocalEnv = window.location.protocol === "file:" || 
                     window.location.hostname === "localhost" || 
                     window.location.hostname === "127.0.0.1";
  
  const endpoints = [];

  // 1. Last known working tunnel URL (instant zero-delay cache)
  try {
    const lastWorking = localStorage.getItem("menara_working_tunnel");
    if (lastWorking && lastWorking.startsWith("https://")) {
      const ep = `${lastWorking.trim()}/api/orders`;
      if (!endpoints.includes(ep)) endpoints.push(ep);
    }
  } catch (_) {}

  // 2. Fetch live Cloudflare tunnel URL dynamically from GitHub raw (bypassing browser cache)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const ghRes = await fetch(`${GITHUB_TUNNEL_RAW}?_t=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (ghRes.ok) {
      const data = await ghRes.json();
      if (data && data.url && data.url.startsWith("https://")) {
        const ep = `${data.url.trim()}/api/orders`;
        if (!endpoints.includes(ep)) endpoints.push(ep);
      }
    }
  } catch (_) {}

  // 3. Fallback: GitHub API directly (bypasses any Fastly CDN edge cache on GitHub Pages)
  if (endpoints.length <= 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const apiRes = await fetch(`https://api.github.com/repos/menara-store-ma/menara-spider-kids/contents/tunnel.json?_t=${Date.now()}`, {
        headers: { "Accept": "application/vnd.github.raw+json" },
        cache: "no-store",
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && data.url && data.url.startsWith("https://")) {
          const ep = `${data.url.trim()}/api/orders`;
          if (!endpoints.includes(ep)) endpoints.push(ep);
        }
      }
    } catch (_) {}
  }

  // 4. Add static CONFIG.CLOUD_URL if set
  if (CONFIG.CLOUD_URL && CONFIG.CLOUD_URL.startsWith("https://")) {
    const ep = `${CONFIG.CLOUD_URL.trim()}/api/orders`;
    if (!endpoints.includes(ep)) endpoints.push(ep);
  }

  // 5. Local environment only
  if (isLocalEnv) {
    endpoints.push("http://localhost:3000/api/orders");
    endpoints.push("http://192.168.11.105:3000/api/orders");
  }

  return endpoints;
}

async function postOrder(order) {
  let posted = false;
  let responseData = null;

  // 1. السيرفر السحابي الدائم 24/7 على Google Cloud (يعمل دائماً حتى لو كان الحاسوب مطفأ)
  const sheetWebhook = CONFIG.GOOGLE_SHEET_WEBHOOK || localStorage.getItem("menara_sheet_webhook");
  if (sheetWebhook && sheetWebhook.startsWith("http")) {
    try {
      const controller = new AbortController();
      const tm = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(sheetWebhook, {
        method: "POST",
        body: JSON.stringify(order),
        signal: controller.signal
      });
      clearTimeout(tm);
      if (res.ok) {
        posted = true;
        const sData = await res.json().catch(() => ({}));
        responseData = sData || { success: true, orderId: order.orderId };
      }
    } catch (_) {}
  }

  // 2. فحص السيرفر المحلي والنفق السحابي كنسخة إضافية متزامنة
  const endpoints = await resolveOrderEndpoints();
  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        posted = true;
        if (!responseData) responseData = await res.json().catch(() => ({}));
        try {
          const workingBase = url.replace("/api/orders", "");
          if (workingBase.startsWith("https://")) {
            localStorage.setItem("menara_working_tunnel", workingBase);
          }
        } catch (_) {}
        break;
      }
    } catch (_) {}
  }

  if (posted) {
    order.syncedToServer = true;
    saveOrderLocally(order);
    return responseData || { success: true };
  } else {
    order.syncedToServer = false;
    saveOrderLocally(order);
    scheduleBackgroundRetry();
    return { success: false, localOnly: true };
  }
}

function saveOrderLocally(order) {
  try {
    const existing = JSON.parse(localStorage.getItem("pending_orders") || "[]");
    const next = [order, ...existing.filter((item) => (item.orderId || item.id) !== order.orderId)].slice(0, 500);
    localStorage.setItem("pending_orders", JSON.stringify(next));
  } catch {
    /* storage can be unavailable in private mode */
  }
}

let syncRetryTimer = null;
function scheduleBackgroundRetry() {
  if (syncRetryTimer) return;
  syncRetryTimer = setInterval(async () => {
    try {
      const existing = JSON.parse(localStorage.getItem("pending_orders") || "[]");
      const unsynced = existing.filter((o) => !o.syncedToServer);
      if (!unsynced.length) {
        clearInterval(syncRetryTimer);
        syncRetryTimer = null;
        return;
      }
      const sheetWebhook = CONFIG.GOOGLE_SHEET_WEBHOOK || localStorage.getItem("menara_sheet_webhook");
      const endpoints = await resolveOrderEndpoints();
      const allTargets = [];
      if (sheetWebhook && sheetWebhook.startsWith("http")) allTargets.push(sheetWebhook);
      allTargets.push(...endpoints);

      for (const order of unsynced) {
        for (const url of allTargets) {
          try {
            const controller = new AbortController();
            const tm = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(order),
              signal: controller.signal,
            });
            clearTimeout(tm);
            if (res.ok) {
              order.syncedToServer = true;
              saveOrderLocally(order);
              break;
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
  }, 12000);
}

function initForm() {
  const form = $("#orderForm");
  if (!form) return;
  const submitBtn = $("#submit-btn");
  const successBox = $("#success-box");
  const nameInput = $("#customer-name");
  const phoneInput = $("#customer-phone");
  const cityHidden = $("#customer-city");
  const addressInput = $("#customer-address");
  const ageSelect = $("#customer-age");
  const noteInput = $("#order-note");

  [nameInput, phoneInput, addressInput].filter(Boolean).forEach((input) => {
    input.addEventListener("input", () => {
      clearInvalid(input);
      const fieldName = input.id.replace("customer-", "");
      clearError(`${fieldName}-error`);
    });
  });

  phoneInput.addEventListener("input", () => {
    const formatted = formatMoroccanPhone(phoneInput.value);
    if (formatted !== phoneInput.value) phoneInput.value = formatted;
  });

  form.addEventListener("focusin", () => {
    if (state.checkoutTracked) return;
    state.checkoutTracked = true;
    track("InitiateCheckout", {
      content_name: CONFIG.PRODUCT_NAME,
      value: getBundle().total,
      currency: "MAD",
      num_items: getBundle().qty,
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.submitting) return;

    const name = nameInput.value.trim().replace(/\s+/g, " ");
    const phone = normalizePhone(phoneInput.value);
    const city = cityHidden.value.trim();
    const address = addressInput ? addressInput.value.trim() : "";
    const age = ageSelect.value;
    let valid = true;

    clearError("name-error");
    clearError("phone-error");
    clearError("city-error");
    clearError("address-error");
    clearError("age-error");
    [nameInput, phoneInput, addressInput, ageSelect].filter(Boolean).forEach(clearInvalid);

    if (name.length < 2 || !/[\u0600-\u06FFa-zA-Z]/.test(name)) {
      setError("name-error", "دخل الاسم الكامل باش نعرفو كيفاش نناديو عليك.");
      markInvalid(nameInput);
      valid = false;
    }
    if (!isValidMoroccanPhone(phone)) {
      setError("phone-error", "دخل رقم هاتف مغربي صحيح (مثال: 0612345678).");
      markInvalid(phoneInput);
      valid = false;
    }
    if (!city) {
      setError("city-error", "اختار مدينتك من القائمة باش نحسبو التوصيل.");
      valid = false;
    }
    if (!age) {
      setError("age-error", "اختار عمر الطفل باش نبعثو المقاس المناسب.");
      markInvalid(ageSelect);
      valid = false;
    }

    if (!valid) {
      const firstInvalid = form.querySelector(".invalid");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    state.age = age;
    const bundle = getBundle();
    const sel = getActiveSelection();
    const orderQty = state.orderQty || 1;
    const orderTotal = 199 * orderQty;
    const orderId = `#${Math.floor(100000 + Math.random() * 900000)}`;
    const order = {
      orderId,
      name,
      phone,
      city,
      address,
      quantity: orderQty,
      pieces: orderQty * 3,
      bundles: orderQty,
      bundleSize: 3,
      bundlePrice: 199,
      product: CONFIG.PRODUCT_NAME,
      price: 199,
      unitPrice: 199,
      total: orderTotal,
      shippingCost: 35,
      bundle: state.bundle,
      bundleLabel: bundle.label,
      color: sel.name,
      colorEn: sel.en,
      colorKey: sel.key,
      isPack: sel.isPack,
      age,
      note: noteInput ? noteInput.value.trim().slice(0, 300) : "",
      gift: "توصيل مجاني",
      source: "landing_page",
      attribution: state.attribution,
      status: "pending",
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
    };

    state.submitting = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>جاري تسجيل الطلب...</span>`;

    saveOrderLocally(order);

    let serverAccepted = false;
    try {
      await postOrder(order);
      serverAccepted = true;
    } catch {
      serverAccepted = false;
    }

    track("Lead", {
      content_name: CONFIG.PRODUCT_NAME,
      content_category: "kids_pajamas",
      value: bundle.total,
      currency: "MAD",
      num_items: bundle.qty,
      color: sel.name,
      age,
      order_id: orderId,
    });

    state.submitting = false;
    submitBtn.disabled = false;
    form.classList.add("hidden");
    if (successBox) {
      successBox.classList.remove("hidden");
      const idEl = $("#success-order-id");
      if (idEl) idEl.textContent = orderId;

      const ageText = (age.includes('سنة') || age.includes('سنوات')) ? age : `${age} سنوات`;
      const waMessage = `سلام، أنا ${name} من ${city}. عندي طلب ${CONFIG.PRODUCT_NAME} (${bundle.label}، ${sel.name}، مقاس ${ageText}) برقم ${orderId} بمبلغ ${formatMad(bundle.total)}. بغيت نأكد التوصيل.`;
      const waLink = $("#success-whatsapp");
      if (waLink) waLink.href = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(waMessage)}`;
      successBox.focus({ preventScroll: true });
      successBox.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    showToast(
      serverAccepted ? "تم تسجيل طلبك بنجاح! غادي نتصلو بيك قريباً." : "تم حفظ طلبك محلياً. غادي نتصلو بيك للتأكيد.",
      "success"
    );
    track("Purchase", {
      value: bundle.total,
      currency: "MAD",
      content_name: CONFIG.PRODUCT_NAME,
      color: sel.name,
      age,
      order_id: orderId,
    });
  });
}

window.resetOrderForm = function() {
  const form = $("#orderForm");
  const successBox = $("#success-box");
  const submitBtn = $("#submit-btn");
  if (successBox) successBox.classList.add("hidden");
  if (form) {
    form.classList.remove("hidden");
    const nameInput = $("#customer-name");
    const phoneInput = $("#customer-phone");
    const addressInput = $("#customer-address");
    const noteInput = $("#order-note");
    if (nameInput) { nameInput.value = ""; clearInvalid(nameInput); }
    if (phoneInput) { phoneInput.value = ""; clearInvalid(phoneInput); }
    if (addressInput) { addressInput.value = ""; clearInvalid(addressInput); }
    if (noteInput) noteInput.value = "";
    clearError("name-error");
    clearError("phone-error");
    clearError("city-error");
    clearError("address-error");
    clearError("age-error");
  }
  state.submitting = false;
  if (submitBtn) {
    submitBtn.disabled = false;
    const bundle = getBundle();
    submitBtn.innerHTML = `<span>تأكيد الطلب - ${formatMad(bundle.total)} عند الاستلام</span>`;
  }
  const formSection = $("#order");
  if (formSection) formSection.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.addEventListener("pageshow", () => {
  state.submitting = false;
  const submitBtn = $("#submit-btn");
  if (submitBtn) {
    submitBtn.disabled = false;
    const bundle = getBundle();
    submitBtn.innerHTML = `<span>تأكيد الطلب - ${formatMad(bundle.total)} عند الاستلام</span>`;
  }
});

/* ---------------- Page behavior ---------------- */
function initHeader() {
  const header = $(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initReveal() {
  const items = $$(".reveal");
  if (!items.length) return;
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach((el) => el.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  items.forEach((el, index) => {
    el.style.transitionDelay = `${Math.min(index % 4, 3) * 60}ms`;
    observer.observe(el);
  });
}

function initAccordion() {
  const items = $$(".faq-item");
  items.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      items.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });
}

function initMobileBar() {
  const bar = $("#mobile-bar");
  const orderCard = $("#order-form");
  if (!bar) return;

  const sync = () => {
    const passedHero = window.scrollY > 550;
    const orderVisible = orderCard && (() => {
      const rect = orderCard.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.85 && rect.bottom > 80;
    })();
    bar.classList.toggle("show", passedHero && !orderVisible);
  };

  sync();
  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
}

function initAnchorTracking() {
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      const target = link.getAttribute("href");
      if (target && target.length > 1) {
        track("ViewContent", { content_name: `${CONFIG.PRODUCT_NAME} — ${target.slice(1)}` });
      }
    });
  });
}

/* ---------------- Boot ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initCountdown();
  initBundles();
  initColors();
  initAge();
  initOrderQty();
  initCityDropdown();
  initForm();
  initReveal();
  initAccordion();
  initMobileBar();
  initAnchorTracking();
  initAutoSlideshow();

  track("ViewContent", {
    content_name: CONFIG.PRODUCT_NAME,
    content_category: "kids_pajamas",
    value: CONFIG.PRODUCT_PRICE,
    currency: "MAD",
  });
});
