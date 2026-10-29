/* =========================================================
   MENARA STORE — CLEAN MOROCCAN COD SCRIPT
   High-converting, zero-lag Moroccan COD interactions
   ========================================================= */

(function () {
  "use strict";

  const CONFIG = {
    PRODUCT_NAME: "طقم بيجامة سبايدرمان للأطفال",
    BASE_PRICE: 199,
    BASE_OLD_PRICE: 329,
    DOUBLE_PACK_PRICE: 379,
    DOUBLE_PACK_OLD_PRICE: 658,
    WHATSAPP: "212710054951",
    GOOGLE_SHEET_WEBHOOK: "https://script.google.com/macros/s/AKfycbwVTa6dj32XVpKt17VV9GtITF8sUxNIGi9G9LRpP2WRgFpGm_jVqb_2zOmNb2FOn1NfiQ/exec",
    STORAGE_KEY_ORDERS: "menara_orders_cache",
  };

  // State
  const state = {
    selectedSize: "5 سنوات",
    selectedPack: "pack1",
    selectedPackName: "المجموعة 1 (أسود + أزرق + رمادي)",
    isDoublePack: false,
    quantity: 1,
    submitting: false,
    checkoutTracked: false,
  };

  // DOM Elements
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const mainFeaturedImage = $("#main-featured-image");
  const thumbnailsContainer = $("#thumbnails-container");
  const sizePillsWrap = $("#size-pills-wrap");
  const selectedSizeLabel = $("#selected-size-label");
  const packCardsWrap = $("#pack-cards-wrap");
  const selectedPackLabel = $("#selected-pack-label");
  const btnQtyMinus = $("#btn-qty-minus");
  const btnQtyPlus = $("#btn-qty-plus");
  const qtyInput = $("#qty-input");
  const priceDisplay = $("#price-display");
  const oldPriceDisplay = $("#old-price-display");
  const discountDisplay = $("#discount-display");
  const msbPriceVal = $("#msb-price-val");
  const topTimer = $("#top-timer");
  const orderForm = $("#order-form");
  const customerName = $("#customer-name");
  const customerPhone = $("#customer-phone");
  const customerCity = $("#customer-city");
  const customerAddress = $("#customer-address");
  const customerNote = $("#customer-note");
  const btnSubmitOrder = $("#btn-submit-order");
  const submitText = $("#submit-text");
  const btnDirectWhatsapp = $("#btn-direct-whatsapp");
  const orderSuccessModal = $("#order-success-modal");
  const modalOrderId = $("#modal-order-id");
  const modalWhatsappBtn = $("#modal-whatsapp-btn");
  const btnCloseModal = $("#btn-close-modal");

  /* ---------------- Price Calculations ---------------- */
  function calculateTotal() {
    const unitPrice = state.isDoublePack ? CONFIG.DOUBLE_PACK_PRICE : CONFIG.BASE_PRICE;
    const unitOldPrice = state.isDoublePack ? CONFIG.DOUBLE_PACK_OLD_PRICE : CONFIG.BASE_OLD_PRICE;
    const total = unitPrice * state.quantity;
    const oldTotal = unitOldPrice * state.quantity;
    const savings = oldTotal - total;
    const percent = Math.round((savings / oldTotal) * 100);
    return { unitPrice, total, oldTotal, savings, percent };
  }

  function updatePriceUI() {
    const { total, oldTotal, savings, percent } = calculateTotal();
    if (priceDisplay) priceDisplay.textContent = total;
    if (oldPriceDisplay) oldPriceDisplay.textContent = `${oldTotal} درهم`;
    if (discountDisplay) discountDisplay.textContent = `وفر ${savings} درهم (${percent}%)`;
    if (msbPriceVal) msbPriceVal.textContent = total;

    updateWhatsAppDirectLink();
  }

  /* ---------------- Gallery Thumbnails ---------------- */
  function initGallery() {
    if (!thumbnailsContainer || !mainFeaturedImage) return;

    thumbnailsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".thumb-btn");
      if (!btn) return;
      const targetImg = btn.getAttribute("data-img");
      if (!targetImg) return;

      $$(".thumb-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      mainFeaturedImage.style.opacity = "0.4";
      setTimeout(() => {
        mainFeaturedImage.src = targetImg;
        mainFeaturedImage.style.opacity = "1";
      }, 100);

      // مزامنة تلقائية مع اختيار الباقة
      if (targetImg.includes("trio-pack-1")) {
        const p1Card = $('.pack-card[data-pack="pack1"]');
        if (p1Card && !p1Card.classList.contains("active")) p1Card.click();
      } else if (targetImg.includes("trio-pack-2")) {
        const p2Card = $('.pack-card[data-pack="pack2"]');
        if (p2Card && !p2Card.classList.contains("active")) p2Card.click();
      }
    });
  }

  /* ---------------- Size Selector ---------------- */
  function initSizeSelector() {
    if (!sizePillsWrap) return;

    sizePillsWrap.addEventListener("click", (e) => {
      const pill = e.target.closest(".size-pill");
      if (!pill) return;

      $$(".size-pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");

      state.selectedSize = pill.getAttribute("data-size") || pill.textContent.trim();
      if (selectedSizeLabel) selectedSizeLabel.textContent = state.selectedSize;

      updateWhatsAppDirectLink();
    });
  }

  /* ---------------- Pack Cards ---------------- */
  function initPackCards() {
    if (!packCardsWrap) return;

    packCardsWrap.addEventListener("click", (e) => {
      const card = e.target.closest(".pack-card");
      if (!card) return;

      $$(".pack-card").forEach((c) => c.classList.remove("active"));
      card.classList.add("active");

      state.selectedPack = card.getAttribute("data-pack") || "pack1";
      state.selectedPackName = card.getAttribute("data-pack-name") || "المجموعة 1";
      state.isDoublePack = card.getAttribute("data-is-double") === "true";

      const packImg = card.getAttribute("data-pack-img");
      if (packImg && mainFeaturedImage) {
        mainFeaturedImage.src = packImg;
        const matchingThumb = $$(".thumb-btn").find((b) => b.getAttribute("data-img") === packImg);
        if (matchingThumb) {
          $$(".thumb-btn").forEach((b) => b.classList.remove("active"));
          matchingThumb.classList.add("active");
        }
      }

      if (selectedPackLabel) {
        selectedPackLabel.textContent = state.isDoublePack ? "العرض المزدوج (6 أطقم)" : (state.selectedPack === "pack2" ? "المجموعة 2" : "المجموعة 1");
      }

      updatePriceUI();
    });
  }

  /* ---------------- Quantity Buttons ---------------- */
  function initQuantityControls() {
    if (!btnQtyMinus || !btnQtyPlus || !qtyInput) return;

    btnQtyMinus.addEventListener("click", () => {
      if (state.quantity > 1) {
        state.quantity--;
        qtyInput.value = state.quantity;
        updatePriceUI();
      }
    });

    btnQtyPlus.addEventListener("click", () => {
      if (state.quantity < 10) {
        state.quantity++;
        qtyInput.value = state.quantity;
        updatePriceUI();
      }
    });
  }

  /* ---------------- Countdown Timer ---------------- */
  function initCountdownTimer() {
    if (!topTimer) return;

    let totalSeconds = 14 * 60 + 32; // 14 mins 32 secs
    const timerKey = "menara_timer_end";
    const savedEnd = localStorage.getItem(timerKey);
    const now = Date.now();

    let endTime;
    if (savedEnd && Number(savedEnd) > now) {
      endTime = Number(savedEnd);
    } else {
      endTime = now + totalSeconds * 1000;
      localStorage.setItem(timerKey, String(endTime));
    }

    function tick() {
      const remainingMs = endTime - Date.now();
      if (remainingMs <= 0) {
        endTime = Date.now() + 15 * 60 * 1000;
        localStorage.setItem(timerKey, String(endTime));
      }
      const remSec = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      const hours = Math.floor(remSec / 3600);
      const mins = Math.floor((remSec % 3600) / 60);
      const secs = remSec % 60;

      const pad = (n) => String(n).padStart(2, "0");
      topTimer.textContent = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }

    tick();
    setInterval(tick, 1000);
  }

  /* ---------------- FAQ Accordion ---------------- */
  function initFaq() {
    $$(".faq-question").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".faq-item");
        if (!item) return;
        const isOpen = item.classList.contains("open");
        $$(".faq-item").forEach((i) => i.classList.remove("open"));
        if (!isOpen) item.classList.add("open");
      });
    });
  }

  /* ---------------- Moroccan Cities Selector ---------------- */
  const MOROCCAN_CITIES = [
    "آسفي", "آيت ملول", "أبي الجعد", "أزرو", "أزيلال", "أصيلة", "أكادير", "أرفود", "إفران", "إمزورن",
    "إنزكان", "ابن جرير", "ابن سليمان", "البروج", "بئر جديد", "بوعرفة", "بوزنيقة", "بولمان", "بني ملال",
    "بركان", "برشيد", "تارودانت", "تازة", "تاونات", "تاوريرت", "تاهلة", "تحناوت", "تطوان", "تمارة",
    "تنغير", "تيزنيت", "تيفلت", "جرسيف", "جرادة", "الجديدة", "الحسيمة", "خريبكة", "خنيفرة", "الخميسات",
    "الداخلة", "الدار البيضاء", "الدروة", "دريوش", "دمنات", "الرشيدية", "الرباط", "الريش", "زاكورة",
    "زايو", "سطات", "سلا", "سيدي إفني", "سيدي بنور", "سيدي رحال", "سيدي سليمان", "سيدي قاسم",
    "سيدي يحيى الغرب", "شفشاون", "الشماعية", "الصخيرات", "الصويرة", "طرفاية", "طانطان", "طنجة", "طاطا",
    "العرائش", "العيون", "فاس", "الفنيدق", "الفقيه بن صالح", "كلميم", "القصر الكبير", "القنيطرة",
    "قلعة السراغنة", "مارتيل", "مراكش", "مشرع بلقصيري", "المضيق", "المحمدية", "مكناس", "مولاي يعقوب",
    "ميدلت", "ميسور", "الناظور", "النواصر", "ورزازات", "وزان", "وادي زم", "وجدة", "ولماس", "اليوسفية"
  ];

  function initCitySelector() {
    const btnMoreCities = $("#btn-more-cities");
    const btnCityIcon = $("#btn-city-icon");
    const btnCloseCities = $("#btn-close-cities");
    const citiesDropdownPanel = $("#cities-dropdown-panel");
    const allCitiesContainer = $("#all-cities-container");
    const citiesPanelFilter = $("#cities-panel-filter");
    const cityInput = $("#customer-city");
    const cityFieldWrap = $(".city-form-field");

    if (!citiesDropdownPanel || !allCitiesContainer || !cityInput) return;

    // Build the alphabetical cities list
    allCitiesContainer.innerHTML = MOROCCAN_CITIES.map((c) => {
      return `<button type="button" class="city-item-btn" data-city="${c}">${c}</button>`;
    }).join("");

    function openCities() {
      citiesDropdownPanel.style.display = "flex";
      if (citiesPanelFilter) {
        citiesPanelFilter.value = "";
        filterCities("");
        setTimeout(() => citiesPanelFilter.focus(), 80);
      }
    }

    function closeCities() {
      citiesDropdownPanel.style.display = "none";
    }

    function toggleCities() {
      if (citiesDropdownPanel.style.display === "flex") {
        closeCities();
      } else {
        openCities();
      }
    }

    if (btnMoreCities) btnMoreCities.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleCities();
    });

    if (btnCityIcon) btnCityIcon.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleCities();
    });

    if (btnCloseCities) btnCloseCities.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeCities();
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (cityFieldWrap && !cityFieldWrap.contains(e.target)) {
        closeCities();
      }
    });

    // Selecting a city from items or popular chips
    citiesDropdownPanel.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-city]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const city = btn.getAttribute("data-city");
      if (city) {
        cityInput.value = city;
        const cityErr = $("#city-error");
        if (cityErr) cityErr.style.display = "none";
        closeCities();
        const addressInput = $("#customer-address");
        if (addressInput) addressInput.focus();
      }
    });

    // Filter cities function
    function filterCities(term) {
      const q = term.trim().toLowerCase();
      const items = allCitiesContainer.querySelectorAll(".city-item-btn");
      items.forEach((item) => {
        const text = item.getAttribute("data-city") || "";
        if (!q || text.includes(q)) {
          item.style.display = "";
        } else {
          item.style.display = "none";
        }
      });
    }

    if (citiesPanelFilter) {
      citiesPanelFilter.addEventListener("input", (e) => {
        filterCities(e.target.value);
      });
    }

    // Also support typing directly in customerCity to filter if panel is open
    cityInput.addEventListener("input", (e) => {
      if (citiesDropdownPanel.style.display === "flex") {
        filterCities(e.target.value);
      }
    });
  }

  /* ---------------- Phone Helpers & Validation ---------------- */
  function normalizePhone(phone) {
    let val = String(phone || "").replace(/[\s\-().]/g, "").replace(/[^\d+]/g, "");
    if (val.startsWith("+212")) val = "0" + val.slice(4);
    else if (val.startsWith("00212")) val = "0" + val.slice(5);
    else if (val.startsWith("212")) val = "0" + val.slice(3);
    else if (/^[5-7]\d{8}$/.test(val)) val = "0" + val;
    return val;
  }

  function isValidMoroccanPhone(phone) {
    const val = normalizePhone(phone);
    return /^(?:\+212|00212|0)[5-7]\d{8}$/.test(val);
  }

  /* ---------------- WhatsApp Link Updater ---------------- */
  function updateWhatsAppDirectLink() {
    if (!btnDirectWhatsapp) return;
    const { total } = calculateTotal();
    const customer = (customerName && customerName.value.trim()) || "زبون متجر منارة";
    const msg = `سلام عليكم، بغيت نطلب ${CONFIG.PRODUCT_NAME} (${state.selectedPackName} - مقاس: ${state.selectedSize} - الكمية: ${state.quantity}) بمبلغ ${total} درهم مع التوصيل المجاني. الاسم: ${customer}.`;
    btnDirectWhatsapp.href = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  /* ---------------- Meta Pixel Tracking Helper ---------------- */
  function trackPixel(eventName, data = {}) {
    try {
      if (typeof window.fbq === "function") {
        window.fbq("track", eventName, data);
      }
    } catch (_) {}
  }

  /* ---------------- Order Storage ---------------- */
  function saveOrderLocally(order) {
    try {
      const orders = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_ORDERS) || "[]");
      orders.unshift(order);
      if (orders.length > 50) orders.length = 50;
      localStorage.setItem(CONFIG.STORAGE_KEY_ORDERS, JSON.stringify(orders));
    } catch (_) {}
  }

  /* ---------------- Send Order to Cloud & Local ---------------- */
  async function dispatchOrder(order) {
    const webhookUrl = CONFIG.GOOGLE_SHEET_WEBHOOK;
    const jsonStr = JSON.stringify(order);

    // Primary High-Speed Direct Delivery with keepalive (immune to CORS preflight, delivers in < 1s)
    try {
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: jsonStr,
        keepalive: true,
      });
    } catch (_) {
      // Fallback only if fetch failed to initiate
      try {
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          const blob = new Blob([jsonStr], { type: "text/plain;charset=utf-8" });
          navigator.sendBeacon(webhookUrl, blob);
        }
      } catch (__) {}
    }

    // Also post to local backend if running
    try {
      const localUrl = "http://localhost:3000/api/orders";
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 1000);
      fetch(localUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonStr,
        signal: ctrl.signal,
      }).then(() => clearTimeout(to)).catch(() => {});
    } catch (_) {}
  }
      }).then(() => clearTimeout(to)).catch(() => {});
    } catch (_) {}

    return true;
  }

  /* ---------------- Order Form Submission ---------------- */
  function initOrderForm() {
    if (!orderForm) return;

    // Trigger InitiateCheckout on first interaction
    orderForm.addEventListener("focusin", () => {
      if (!state.checkoutTracked) {
        state.checkoutTracked = true;
        const { total } = calculateTotal();
        trackPixel("InitiateCheckout", {
          content_name: CONFIG.PRODUCT_NAME,
          value: total,
          currency: "MAD",
          num_items: state.quantity * (state.isDoublePack ? 6 : 3),
        });
      }
    });

    if (customerName) customerName.addEventListener("input", updateWhatsAppDirectLink);

    orderForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (state.submitting) return;

      const name = customerName ? customerName.value.trim() : "";
      const rawPhone = customerPhone ? customerPhone.value.trim() : "";
      const phone = normalizePhone(rawPhone);
      const city = customerCity ? customerCity.value.trim() : "";
      const address = customerAddress ? customerAddress.value.trim() : "";
      const note = customerNote ? customerNote.value.trim() : "";

      const nameErr = $("#name-error");
      const phoneErr = $("#phone-error");
      const cityErr = $("#city-error");

      if (nameErr) nameErr.style.display = "none";
      if (phoneErr) phoneErr.style.display = "none";
      if (cityErr) cityErr.style.display = "none";

      let hasError = false;

      if (!name || name.length < 2) {
        if (nameErr) {
          nameErr.textContent = "يرجى إدخال اسمكم الكريم (حرفين على الأقل).";
          nameErr.style.display = "block";
        }
        if (customerName) customerName.focus();
        hasError = true;
      } else if (!isValidMoroccanPhone(rawPhone)) {
        if (phoneErr) {
          phoneErr.textContent = "يرجى إدخال رقم هاتف مغربي صحيح (مثال: 0612345678).";
          phoneErr.style.display = "block";
        }
        if (customerPhone) customerPhone.focus();
        hasError = true;
      } else if (!city) {
        if (cityErr) {
          cityErr.textContent = "يرجى تحديد المدينة للتوصيل المجاني.";
          cityErr.style.display = "block";
        }
        if (customerCity) customerCity.focus();
        hasError = true;
      }

      if (hasError) return;

      // Prepare order object
      const { total, unitPrice } = calculateTotal();
      const orderId = `#${Math.floor(100000 + Math.random() * 900000)}`;
      const nowIso = new Date().toISOString();
      const order = {
        orderId,
        id: orderId,
        customerName: name,
        name: name,
        fullName: name,
        customerPhone: phone,
        phone: phone,
        customerCity: city,
        city: city,
        address: address || "غير محدد",
        product: CONFIG.PRODUCT_NAME,
        productName: CONFIG.PRODUCT_NAME,
        size: state.selectedSize,
        age: state.selectedSize,
        pack: state.selectedPackName,
        color: state.selectedPackName,
        quantity: state.quantity,
        pieces: state.quantity * (state.isDoublePack ? 6 : 3),
        price: total,
        total: total,
        bundlePrice: total,
        unitPrice: unitPrice,
        note: note,
        shipping: "مجاني",
        status: "pending",
        source: "landing_page",
        createdAt: nowIso,
        timestamp: nowIso,
      };

      state.submitting = true;
      btnSubmitOrder.disabled = true;
      submitText.textContent = "جاري تأكيد وتسجيل طلبك...";

      // Save locally immediately
      saveOrderLocally(order);

      // Send to server / Google Cloud in parallel
      try {
        await Promise.race([
          dispatchOrder(order),
          new Promise((resolve) => setTimeout(resolve, 2500)),
        ]);
      } catch (_) {}

      // Fire Meta Pixel Purchase event
      trackPixel("Purchase", {
        content_name: CONFIG.PRODUCT_NAME,
        content_type: "product",
        value: total,
        currency: "MAD",
        num_items: state.quantity,
        order_id: orderId,
      });

      // Also fire Lead event
      trackPixel("Lead", {
        content_name: CONFIG.PRODUCT_NAME,
        value: total,
        currency: "MAD",
        order_id: orderId,
      });

      // Show success modal
      if (modalOrderId) modalOrderId.textContent = orderId;
      if (modalWhatsappBtn) {
        const waText = `سلام متجر منارة، أنا ${name} من ${city}. قمت بتسجيل طلب ${CONFIG.PRODUCT_NAME} (${state.selectedPackName} - مقاس: ${state.selectedSize} - كمية: ${state.quantity}) برقم ${orderId} بمبلغ ${total} درهم. أرجو تأكيد إرسال الطلبية وشكراً!`;
        modalWhatsappBtn.href = `https://wa.me/${CONFIG.WHATSAPP}?text=${encodeURIComponent(waText)}`;
      }

      if (orderSuccessModal) orderSuccessModal.classList.add("show");

      // Reset form
      orderForm.reset();
      state.quantity = 1;
      if (qtyInput) qtyInput.value = "1";
      updatePriceUI();

      state.submitting = false;
      btnSubmitOrder.disabled = false;
      submitText.textContent = "اضغط هنا لتأكيد الطلب الآن 🛍️";
    });
  }

  /* ---------------- Modal Events ---------------- */
  function initModal() {
    if (!orderSuccessModal) return;

    if (btnCloseModal) {
      btnCloseModal.addEventListener("click", () => {
        orderSuccessModal.classList.remove("show");
      });
    }

    orderSuccessModal.addEventListener("click", (e) => {
      if (e.target === orderSuccessModal) {
        orderSuccessModal.classList.remove("show");
      }
    });
  }

  /* ---------------- Mobile Sticky Bar Scroll ---------------- */
  function initMobileBar() {
    const msbOrderBtn = $("#msb-order-btn");
    if (!msbOrderBtn) return;

    msbOrderBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const formEl = $("#order-form-container");
      if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth", block: "start" });
        if (customerName) setTimeout(() => customerName.focus(), 500);
      }
    });
  }

  /* ---------------- Initialization ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initGallery();
    initSizeSelector();
    initPackCards();
    initQuantityControls();
    initCountdownTimer();
    initFaq();
    initCitySelector();
    initOrderForm();
    initModal();
    initMobileBar();
    updatePriceUI();
  });

  // If DOM is already loaded
  if (document.readyState === "interactive" || document.readyState === "complete") {
    initGallery();
    initSizeSelector();
    initPackCards();
    initQuantityControls();
    initCountdownTimer();
    initFaq();
    initCitySelector();
    initOrderForm();
    initModal();
    initMobileBar();
    updatePriceUI();
  }
})();
