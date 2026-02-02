(function(){
  // Shared cart script — safe to include on any page.
  const CART_KEY = 'hb_cart_v1';
  const DELIVERY_COST = 10; // default delivery cost in €

  function $(s, ctx=document){ return ctx.querySelector(s); }
  function $all(s, ctx=document){ return Array.from(ctx.querySelectorAll(s)); }

  function ensureDrawer(){
    if(document.getElementById('cartDrawer')) return;
    const aside = document.createElement('aside');
    aside.id = 'cartDrawer';
    aside.className = 'drawer';
    aside.setAttribute('aria-label','Warenkorb');
    aside.setAttribute('aria-hidden','true');
    aside.innerHTML = `
      <div class="drawer-head">
        <div class="drawer-title">Warenkorb</div>
        <button class="x" type="button" aria-label="Schließen" data-close-cart>
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
        </button>
      </div>
      <div class="drawer-body">Noch leer.</div>
    `;
    document.body.appendChild(aside);
    document.querySelector('[data-close-cart]')?.addEventListener('click', closeCart);
  }

  function loadCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)) || {} }catch(e){ return {} } }
  function saveCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  function cartTotalCount(cart){ return Object.values(cart).reduce((s,i)=> s + (i.qty||0), 0); }

  function updateCartBadge(){ const cart = loadCart(); const count = cartTotalCount(cart); const badge = document.querySelector('.icon-btn.badge'); if(badge) badge.setAttribute('data-count', String(count)); }

  function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  function renderCartDrawer(){
    ensureDrawer();
    const cart = loadCart();
    const drawer = document.querySelector('#cartDrawer .drawer-body');
    if(!drawer) return;
    const items = Object.values(cart);
    if(items.length === 0){ drawer.innerHTML = 'Noch leer.'; return }
    let html = '<ul class="cart-list">';
    let subtotal = 0;
    items.forEach(it=>{
      const lineTotal = Number(it.price) * Number(it.qty);
      subtotal += lineTotal;
      html += `<li class="cart-item" data-id="${escapeHtml(it.id)}">` +
              `<div class="ci-left"><span class="ci-name">${escapeHtml(it.name)}</span></div>` +
              `<div class="ci-right">` +
                `<div class="ci-controls">` +
                  `<button class="ci-btn ci-decrease" data-id="${escapeHtml(it.id)}" aria-label="Menge verringern">−</button>` +
                  `<span class="ci-qty">${it.qty}</span>` +
                  `<button class="ci-btn ci-increase" data-id="${escapeHtml(it.id)}" aria-label="Menge erhöhen">+</button>` +
                `</div>` +
                `<span class="ci-price">${formatPrice(lineTotal)}</span>` +
                `<button class="ci-btn ci-remove" data-id="${escapeHtml(it.id)}" aria-label="Entfernen">Entfernen</button>` +
              `</div>` +
             `</li>`;
    });
    html += `</ul>`;
    html += `<div class="cart-subtotal">Zwischensumme: <strong>${formatPrice(subtotal)}</strong></div>`;
    html += `<div class="cart-shipping">Lieferkosten: <strong>${formatPrice(DELIVERY_COST)}</strong></div>`;
    const total = subtotal + Number(DELIVERY_COST);
    html += `<div class="cart-total">Gesamt: <strong>${formatPrice(total)}</strong></div>`;
    html += `<div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;"><button class="btn primary checkout" type="button">Zur Kasse</button></div>`;
    drawer.innerHTML = html;
  }

  function formatPrice(n){
    const num = Number(n) || 0;
    if(Number.isInteger(num)) return `${num} €`;
    return `${num.toFixed(2)} €`;
  }

  // ------------------
  // Search handling
  // ------------------
  function filterProducts(query){
    const q = String(query || '').trim().toLowerCase();
    const cards = document.querySelectorAll('.product-card');
    if(!cards) return;
    cards.forEach(card => {
      const title = (card.querySelector('h2')?.textContent || '').toLowerCase();
      const desc = (card.querySelector('.product-desc')?.textContent || '').toLowerCase();
      const price = (card.querySelector('.product-price')?.textContent || '').toLowerCase();
      const matches = !q || title.includes(q) || desc.includes(q) || price.includes(q);
      card.style.display = matches ? '' : 'none';
    });
  }

  function performSearch(query){
    const q = String(query || '').trim();
    if(!q) return;
    const onProducts = location.pathname.includes('produkte.html') || location.pathname === '/' || location.pathname.endsWith('/');
    if(onProducts){
      filterProducts(q);
      // close overlay if open
      const o = document.getElementById('searchOverlay');
      if(o) o.classList.remove('open');
      return;
    }
    // otherwise redirect to products page with query param
    const url = new URL('produkte.html', location.origin + location.pathname.replace(/\/[^/]*$/,'/'));
    url.searchParams.set('q', q);
    location.href = url.pathname + url.search;
  }

  // expose search
  window.performSearch = performSearch;

  function addToCartItem(id, name, price){ const cart = loadCart(); if(!cart[id]) cart[id] = { id, name, price: Number(price), qty: 0 }; cart[id].qty = (cart[id].qty || 0) + 1; saveCart(cart); updateCartBadge(); renderCartDrawer(); }
  function changeCartQty(id, delta){ const cart = loadCart(); if(!cart[id]) return; cart[id].qty = (cart[id].qty || 0) + delta; if(cart[id].qty <= 0){ delete cart[id]; } saveCart(cart); updateCartBadge(); renderCartDrawer(); }
  function removeCartItem(id){ const cart = loadCart(); if(cart[id]){ delete cart[id]; saveCart(cart); updateCartBadge(); renderCartDrawer(); } }

  function openCart(){ ensureDrawer(); const d = document.getElementById('cartDrawer'); d.classList.add('open'); d.setAttribute('aria-hidden','false'); renderCartDrawer(); }
  function closeCart(){ const d = document.getElementById('cartDrawer'); if(d){ d.classList.remove('open'); d.setAttribute('aria-hidden','true'); } }

  // expose globally for inline onclicks
  window.openCart = openCart;
  window.closeCart = closeCart;
  window.addToCartItem = addToCartItem;

  // event delegation
  document.addEventListener('click', (e)=>{
    const b = e.target.closest && e.target.closest('.add-to-cart');
    if(b){ const id = b.getAttribute('data-id'); const name = b.getAttribute('data-name'); const price = b.getAttribute('data-price'); addToCartItem(id,name,price); b.textContent = 'Hinzugefügt ✓'; setTimeout(()=> b.textContent = 'In den Warenkorb', 900); return; }
    const inc = e.target.closest && e.target.closest('.ci-increase'); if(inc){ changeCartQty(inc.getAttribute('data-id'),1); return }
    const dec = e.target.closest && e.target.closest('.ci-decrease'); if(dec){ changeCartQty(dec.getAttribute('data-id'),-1); return }
    const rem = e.target.closest && e.target.closest('.ci-remove'); if(rem){ removeCartItem(rem.getAttribute('data-id')); return }
    if(e.target.closest && e.target.closest('[data-close-cart]')){ closeCart(); }
  });

  // checkout button
  document.addEventListener('click', (e)=>{
    const c = e.target.closest && e.target.closest('.checkout');
    if(c){ window.location.href = 'checkout.html'; }
  });

  // esc closes
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape'){ closeCart(); const so = document.getElementById('searchOverlay'); if(so) so.classList.remove('open'); } });

  // init
  updateCartBadge();
  renderCartDrawer();
  // if on products page and q param present, run search
  try{
    const sp = new URLSearchParams(location.search);
    const q = sp.get('q');
    if(q && (location.pathname.includes('produkte.html') || location.pathname === '/' || location.pathname.endsWith('/'))){
      // run after DOM ready
      setTimeout(()=> filterProducts(q), 50);
    }
  }catch(e){}
})();
