// ============================================
// مجد الدين - منطق الموقع
// ============================================

// ⚠️ غيّر هذا الرقم لرقم واتساب المحل (بصيغة دولية بدون + أو 00)
const WHATSAPP_NUMBER = "966566909707";

// ⚠️ بعد إنشاء حساب على formspree.io (مجاني) حط رابط الفورم هنا
// التفاصيل بآخر الملف بقسم "تعليمات الإيميل التلقائي"
const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";

let PRODUCTS_DATA = null;
let cart = []; // { id, name, unit, unitLabel, qty, pricePerUnit, image }

// ===== تحميل المنتجات =====
async function loadProducts() {
  try {
    const res = await fetch('products.json');
    const data = await res.json();
    PRODUCTS_DATA = data["الفئات"];
    renderCategoryNav();
    renderProducts();
  } catch (err) {
    document.getElementById('categoriesContainer').innerHTML =
      '<p style="text-align:center;color:#b04848;padding:40px;">تعذّر تحميل القائمة، تأكد من ملف products.json</p>';
    console.error(err);
  }
}

// ===== بناء شريط الفئات =====
function renderCategoryNav() {
  const nav = document.getElementById('categoryNav');
  nav.innerHTML = PRODUCTS_DATA.map((cat, i) =>
    `<button class="cat-pill ${i === 0 ? 'active' : ''}" data-target="cat-${cat.id}">${cat["اسم"]}</button>`
  ).join('');

  nav.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) {
        const offset = 130;
        window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
      }
    });
  });
}

// ===== بناء كروت المنتجات =====
function renderProducts() {
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = PRODUCTS_DATA.map(cat => {
    const products = cat["المنتجات"].filter(p => p["متوفر"] !== false);
    if (products.length === 0) return '';

    return `
      <section class="category-block" id="cat-${cat.id}">
        <h2 class="category-title">${cat["اسم"]}</h2>
        <div class="product-grid">
          ${products.map(p => renderProductCard(p, cat.id)).join('')}
        </div>
      </section>
    `;
  }).join('');

  attachProductEvents();
}

function productKey(catId, name) {
  return `${catId}__${name}`.replace(/\s+/g, '_');
}

function renderProductCard(p, catId) {
  const key = productKey(catId, p["اسم"]);
  const isWeight = p["نوع_التسعير"] === "وزن";

  const priceDisplay = isWeight
    ? `${p["سعر_نص_كيلو"]} ريال`
    : `${p["سعر_الحبة"]} ريال`;

  const unitControls = isWeight
    ? `
      <div class="unit-toggle" data-key="${key}">
        <button type="button" class="unit-btn active" data-unit="نص كيلو" data-price="${p["سعر_نص_كيلو"]}">نص كيلو</button>
        <button type="button" class="unit-btn" data-unit="كيلو" data-price="${p["سعر_كيلو"]}">كيلو</button>
      </div>
    `
    : `<div class="unit-toggle-spacer"></div>`;

  const defaultUnit = isWeight ? "نص كيلو" : "حبة";
  const defaultPrice = isWeight ? p["سعر_نص_كيلو"] : p["سعر_الحبة"];

  return `
    <article class="product-card" data-key="${key}" data-name="${p["اسم"]}" data-image="${p["صورة"]}">
      <div class="product-img-wrap">
        <img src="${p["صورة"]}" alt="${p["اسم"]}" loading="lazy">
      </div>
      <div class="product-body">
        <div class="product-name">${p["اسم"]}</div>
        <div class="product-desc">${p["وصف"] || ''}</div>
        <div class="product-controls">
          ${unitControls}
          <div class="price-row">
            <span class="product-price" data-current-price="${defaultPrice}" data-current-unit="${defaultUnit}">${priceDisplay}</span>
            <div class="qty-area" data-qty-area="${key}">
              <button class="add-btn" data-add="${key}" aria-label="أضف للسلة">+</button>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
}

// ===== ربط أحداث المنتجات (تبديل الوحدة + الإضافة) =====
function attachProductEvents() {
  // تبديل نص كيلو / كيلو
  document.querySelectorAll('.unit-toggle').forEach(toggle => {
    toggle.addEventListener('click', e => {
      const btn = e.target.closest('.unit-btn');
      if (!btn) return;
      toggle.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const card = toggle.closest('.product-card');
      const priceEl = card.querySelector('.product-price');
      const price = btn.dataset.price;
      const unit = btn.dataset.unit;
      priceEl.textContent = `${price} ريال`;
      priceEl.dataset.currentPrice = price;
      priceEl.dataset.currentUnit = unit;
    });
  });

  // إضافة للسلة
  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.product-card');
      addToCart(card);
    });
  });
}

// ===== منطق السلة =====
function addToCart(card) {
  const key = card.dataset.key;
  const name = card.dataset.name;
  const image = card.dataset.image;
  const priceEl = card.querySelector('.product-price');
  const unit = priceEl.dataset.currentUnit;
  const price = parseFloat(priceEl.dataset.currentPrice);

  const cartItemId = `${key}__${unit}`;
  const existing = cart.find(item => item.id === cartItemId);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: cartItemId, key, name, unit, qty: 1, pricePerUnit: price, image });
  }

  updateCartUI();
  showToast(`أُضيف ${name} للسلة`);
  renderQtyControl(card, cartItemId);
}

function renderQtyControl(card, cartItemId) {
  const key = card.dataset.key;
  const area = card.querySelector(`[data-qty-area="${key}"]`);
  const item = cart.find(i => i.id === cartItemId);
  if (!item) {
    area.innerHTML = `<button class="add-btn" data-add="${key}" aria-label="أضف للسلة">+</button>`;
    attachSingleAddEvent(area, card);
    return;
  }
  area.innerHTML = `
    <div class="qty-stepper">
      <button type="button" data-action="dec">−</button>
      <span>${item.qty}</span>
      <button type="button" data-action="inc">+</button>
    </div>
  `;
  area.querySelector('[data-action="inc"]').addEventListener('click', () => {
    item.qty += 1;
    updateCartUI();
    renderQtyControl(card, cartItemId);
  });
  area.querySelector('[data-action="dec"]').addEventListener('click', () => {
    item.qty -= 1;
    if (item.qty <= 0) {
      cart = cart.filter(i => i.id !== cartItemId);
    }
    updateCartUI();
    renderQtyControl(card, cartItemId);
  });
}

function attachSingleAddEvent(area, card) {
  const btn = area.querySelector('.add-btn');
  if (btn) btn.addEventListener('click', () => addToCart(card));
}

function cartTotal() {
  return cart.reduce((sum, item) => sum + item.pricePerUnit * item.qty, 0);
}

function cartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

// ===== تحديث واجهة السلة =====
function updateCartUI() {
  const count = cartCount();
  document.getElementById('cartCount').textContent = count;

  const fab = document.getElementById('fabCart');
  const fabText = document.getElementById('fabCartText');
  if (count > 0) {
    fab.classList.add('visible');
    fabText.textContent = `عرض السلة (${count}) — ${cartTotal().toFixed(2)} ريال`;
  } else {
    fab.classList.remove('visible');
  }

  renderCartBody();
}

function renderCartBody() {
  const body = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');

  if (cart.length === 0) {
    body.innerHTML = '<p class="cart-empty">سلتك فاضية، روح ضيف شي حلو 🍯</p>';
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'block';
  body.innerHTML = cart.map(item => `
    <div class="cart-item" data-cart-id="${item.id}">
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-unit">${item.unit}</div>
        <div class="cart-item-row">
          <div class="cart-item-stepper">
            <button type="button" data-cart-action="dec">−</button>
            <span>${item.qty}</span>
            <button type="button" data-cart-action="inc">+</button>
          </div>
          <span class="cart-item-price">${(item.pricePerUnit * item.qty).toFixed(2)} ريال</span>
        </div>
        <div class="remove-item" data-cart-action="remove">إزالة</div>
      </div>
    </div>
  `).join('');

  document.getElementById('cartTotal').textContent = `${cartTotal().toFixed(2)} ريال`;

  body.querySelectorAll('.cart-item').forEach(el => {
    const id = el.dataset.cartId;
    const item = cart.find(i => i.id === id);
    el.querySelector('[data-cart-action="inc"]').addEventListener('click', () => {
      item.qty += 1;
      updateCartUI();
      syncCardStepper(item);
    });
    el.querySelector('[data-cart-action="dec"]').addEventListener('click', () => {
      item.qty -= 1;
      if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
      updateCartUI();
      syncCardStepper(item);
    });
    el.querySelector('[data-cart-action="remove"]').addEventListener('click', () => {
      cart = cart.filter(i => i.id !== id);
      updateCartUI();
      syncCardStepper(item);
    });
  });
}

// يحدّث زر +/- على كرت المنتج نفسه لو السلة تغيرت من الدرج
function syncCardStepper(item) {
  if (!item) return;
  const card = document.querySelector(`.product-card[data-key="${item.key}"]`);
  if (card) renderQtyControl(card, item.id);
}

// ===== فتح / إغلاق السلة =====
function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('visible');
}
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('visible');
}

document.getElementById('cartTrigger').addEventListener('click', openCart);
document.getElementById('fabCart').addEventListener('click', openCart);
document.getElementById('cartClose').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);

// ===== فتح / إغلاق إتمام الطلب =====
function openCheckout() {
  if (cart.length === 0) return;
  closeCart();
  renderOrderSummary();
  document.getElementById('checkoutDrawer').classList.add('open');
  document.getElementById('checkoutOverlay').classList.add('visible');
}
function closeCheckout() {
  document.getElementById('checkoutDrawer').classList.remove('open');
  document.getElementById('checkoutOverlay').classList.remove('visible');
}

document.getElementById('goToCheckout').addEventListener('click', openCheckout);
document.getElementById('checkoutClose').addEventListener('click', closeCheckout);
document.getElementById('checkoutOverlay').addEventListener('click', closeCheckout);

function renderOrderSummary() {
  const summary = document.getElementById('orderSummary');
  summary.innerHTML = cart.map(item => `
    <div class="order-summary-line">
      <span>${item.name} (${item.unit}) × ${item.qty}</span>
      <span>${(item.pricePerUnit * item.qty).toFixed(2)} ريال</span>
    </div>
  `).join('') + `
    <div class="order-summary-total">
      <span>الإجمالي</span>
      <span>${cartTotal().toFixed(2)} ريال</span>
    </div>
  `;
}

// ===== تبديل طريقة الاستلام =====
let deliveryMethod = 'pickup';
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    deliveryMethod = btn.dataset.method;
    document.getElementById('addressGroup').style.display =
      deliveryMethod === 'delivery' ? 'flex' : 'none';
    document.getElementById('custAddress').required = deliveryMethod === 'delivery';
  });
});

// ===== إرسال الطلب =====
document.getElementById('checkoutForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  const notes = document.getElementById('custNotes').value.trim();

  if (!name || !phone) return;
  if (deliveryMethod === 'delivery' && !address) {
    document.getElementById('custAddress').focus();
    return;
  }

  const message = buildWhatsAppMessage(name, phone, address, notes);

  // 1) إرسال نسخة بالإيميل بالخلفية (تلقائي، بدون أي تدخل من العميل)
  sendEmailBackup(name, phone, address, notes, message);

  // 2) فتح واتساب برسالة الطلب الجاهزة
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');

  showToast('تم تجهيز طلبك، تابع على واتساب لتأكيده ✅');

  // تفريغ السلة بعد إرسال الطلب
  cart = [];
  updateCartUI();
  document.querySelectorAll('.qty-area').forEach(area => {
    const key = area.dataset.qtyArea;
    area.innerHTML = `<button class="add-btn" data-add="${key}" aria-label="أضف للسلة">+</button>`;
  });
  attachProductEvents();
  closeCheckout();
  this.reset();
});

function buildWhatsAppMessage(name, phone, address, notes) {
  let msg = `*طلب جديد من موقع مجد الدين* 🍯\n\n`;
  msg += `*الاسم:* ${name}\n`;
  msg += `*الجوال:* ${phone}\n`;
  msg += `*طريقة الاستلام:* ${deliveryMethod === 'delivery' ? 'توصيل' : 'استلام من المحل'}\n`;
  if (deliveryMethod === 'delivery') msg += `*العنوان:* ${address}\n`;
  msg += `\n*تفاصيل الطلب:*\n`;
  cart.forEach(item => {
    msg += `- ${item.name} (${item.unit}) × ${item.qty} = ${(item.pricePerUnit * item.qty).toFixed(2)} ريال\n`;
  });
  msg += `\n*الإجمالي: ${cartTotal().toFixed(2)} ريال*\n`;
  if (notes) msg += `\n*ملاحظات:* ${notes}`;
  return msg;
}

// ===== نسخة احتياطية بالإيميل (خلفية، بدون تدخل العميل) =====
function sendEmailBackup(name, phone, address, notes, message) {
  if (!FORMSPREE_ENDPOINT || FORMSPREE_ENDPOINT.includes('YOUR_FORM_ID')) {
    // لم يتم ضبط الإيميل بعد - يتم تجاوز هذه الخطوة بصمت
    return;
  }
  fetch(FORMSPREE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      الاسم: name,
      الجوال: phone,
      طريقة_الاستلام: deliveryMethod === 'delivery' ? 'توصيل' : 'استلام من المحل',
      العنوان: address || '-',
      الملاحظات: notes || '-',
      تفاصيل_الطلب: message,
      الإجمالي: `${cartTotal().toFixed(2)} ريال`
    })
  }).catch(() => {
    // فشل الإرسال بصمت، الطلب وصل أصلاً عبر واتساب وما بيتأثر
  });
}

// ===== رسالة تأكيد عابرة =====
let toastTimer;
function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

// ===== بدء التشغيل =====
loadProducts();

/* ============================================
   تعليمات الإيميل التلقائي (نسخة احتياطية لكل طلب)
   ============================================
   1. روح على formspree.io وسجل حساب مجاني بإيميلك.
   2. أنشئ "New Form" واختار الإيميل يلي بدك الطلبات توصله.
   3. هياخذلك رابط شكله: https://formspree.io/f/xxxxxxxx
   4. حط هاد الرابط فوق بمكان FORMSPREE_ENDPOINT (بدل القيمة الافتراضية).
   5. خلص! كل طلب رح يوصلك نسخة منه بالإيميل تلقائياً، 
      بدون ما العميل يحس أو يلمس أي شي.
   ============================================ */
