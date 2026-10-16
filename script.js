/* ==========================================================================
   DressFresh — script.js
   Storage keys (shared with admin.js via localStorage):
     df_products   -> array of product objects
     df_cart       -> array of {id, qty}
     df_users      -> array of {name, email, password}   (demo auth only)
     df_session    -> email of logged-in user | null
     df_pqrsf      -> array of submitted PQRSF tickets
   ========================================================================== */

const CATEGORY_LABELS = {
  'camisas': 'Camisas',
  'camisetas': 'Camisetas',
  'pantalones': 'Pantalones',
  'sudaderas': 'Sudaderas',
  'shorts': 'Shorts',
  'ropa-interior': 'Ropa interior',
  'tenis': 'Tenis',
  'zapatos': 'Zapatos',
  'perfumes': 'Perfumes',
  'bolsos': 'Bolsos'
};

const DEFAULT_PRODUCTS = [
  { id:'p01', name:'Camisa Oxford Clásica', cat:'camisas', price:129000, oldPrice:null, stock:14, promo:false },
  { id:'p02', name:'Camisa Lino Beige', cat:'camisas', price:145000, oldPrice:169000, stock:6, promo:true },
  { id:'p03', name:'Camiseta Básica Algodón', cat:'camisetas', price:49000, oldPrice:null, stock:40, promo:false },
  { id:'p04', name:'Camiseta Estampada Sello', cat:'camisetas', price:59000, oldPrice:79000, stock:0, promo:true },
  { id:'p05', name:'Pantalón Cargo Negro', cat:'pantalones', price:139000, oldPrice:null, stock:11, promo:false },
  { id:'p06', name:'Pantalón Jean Slim', cat:'pantalones', price:159000, oldPrice:null, stock:9, promo:false },
  { id:'p07', name:'Sudadera Oversize Gris', cat:'sudaderas', price:135000, oldPrice:165000, stock:8, promo:true },
  { id:'p08', name:'Sudadera Capucha Negra', cat:'sudaderas', price:145000, oldPrice:null, stock:5, promo:false },
  { id:'p09', name:'Short Deportivo', cat:'shorts', price:69000, oldPrice:null, stock:20, promo:false },
  { id:'p10', name:'Short Cargo Beige', cat:'shorts', price:79000, oldPrice:null, stock:0, promo:false },
  { id:'p11', name:'Pack x3 Ropa Interior', cat:'ropa-interior', price:59000, oldPrice:null, stock:30, promo:false },
  { id:'p12', name:'Boxer Algodón Premium', cat:'ropa-interior', price:29000, oldPrice:null, stock:25, promo:false },
  { id:'p13', name:'Tenis Urbanos Blancos', cat:'tenis', price:249000, oldPrice:299000, stock:7, promo:true },
  { id:'p14', name:'Tenis Running Pro', cat:'tenis', price:279000, oldPrice:null, stock:4, promo:false },
  { id:'p15', name:'Zapato Casual Cuero', cat:'zapatos', price:219000, oldPrice:null, stock:6, promo:false },
  { id:'p16', name:'Zapato Formal Negro', cat:'zapatos', price:239000, oldPrice:null, stock:3, promo:false },
  { id:'p17', name:'Perfume Signature 100ml', cat:'perfumes', price:189000, oldPrice:null, stock:12, promo:false },
  { id:'p18', name:'Perfume Fresh Wood 50ml', cat:'perfumes', price:129000, oldPrice:159000, stock:0, promo:true },
  { id:'p19', name:'Bolso Bandolera Cuero', cat:'bolsos', price:169000, oldPrice:null, stock:9, promo:false },
  { id:'p20', name:'Bolso Tote Lona', cat:'bolsos', price:99000, oldPrice:null, stock:15, promo:false }
];

/* ---------------------------------------------------------------------- */
/* Storage helpers                                                        */
/* ---------------------------------------------------------------------- */
const store = {
  get(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){ return fallback; }
  },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};

function getProducts(){
  let products = store.get('df_products', null);
  if(!products || !products.length){
    products = DEFAULT_PRODUCTS;
    store.set('df_products', products);
  }
  return products;
}
function getCart(){ return store.get('df_cart', []); }
function setCart(cart){ store.set('df_cart', cart); }
function getUsers(){ return store.get('df_users', []); }
function setUsers(u){ store.set('df_users', u); }
function getSession(){ return localStorage.getItem('df_session'); }
function setSession(email){
  if(email) localStorage.setItem('df_session', email);
  else localStorage.removeItem('df_session');
}

/* Ensure a demo account exists */
(function seedDemoUser(){
  const users = getUsers();
  if(!users.find(u => u.email === 'demo@dressfresh.co')){
    users.push({ name:'Cliente Demo', email:'demo@dressfresh.co', password:'demo1234' });
    setUsers(users);
  }
})();

const money = n => '$' + Number(n).toLocaleString('es-CO');

/* ---------------------------------------------------------------------- */
/* Toast                                                                  */
/* ---------------------------------------------------------------------- */
let toastTimer;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------------------------------------------------------------------- */
/* Catalog rendering                                                      */
/* ---------------------------------------------------------------------- */
let state = { cat:'all', query:'', sort:'default' };

function initials(name){
  return name;
}

function renderProducts(){
  const grid = document.getElementById('productsGrid');
  const products = getProducts();
  let list = products.filter(p => state.cat === 'all' || p.cat === state.cat);
  if(state.query.trim()){
    const q = state.query.trim().toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || CATEGORY_LABELS[p.cat].toLowerCase().includes(q));
  }
  if(state.sort === 'price-asc') list = [...list].sort((a,b)=>a.price-b.price);
  if(state.sort === 'price-desc') list = [...list].sort((a,b)=>b.price-a.price);
  if(state.sort === 'name') list = [...list].sort((a,b)=>a.name.localeCompare(b.name));

  document.getElementById('statProducts').textContent = products.length;

  if(!list.length){
    grid.innerHTML = `<div class="empty-state">No encontramos productos con esos filtros.<br>Prueba con otra categoría o término de búsqueda.</div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const out = p.stock <= 0;
    return `
    <article class="card">
      <div class="card-media">
        ${p.promo && !out ? '<span class="card-badge">OFERTA</span>' : ''}
        ${out ? '<span class="card-badge out">AGOTADO</span>' : ''}
        <button class="card-fav" aria-label="Favorito" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.6-9.5 9-9.5 9Z"/></svg>
        </button>
        ${p.name}
      </div>
      <div class="card-body">
        <span class="card-cat">${CATEGORY_LABELS[p.cat] || p.cat}</span>
        <span class="card-name">${p.name}</span>
        <div class="card-price-row">
          <span class="card-price">${p.oldPrice ? `<span class="old">${money(p.oldPrice)}</span>` : ''}${money(p.price)}</span>
          <button class="card-add" data-add="${p.id}" ${out ? 'disabled' : ''} aria-label="Agregar al carrito">
            ${out ? '−' : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 5v14M5 12h14"/></svg>`}
          </button>
        </div>
      </div>
    </article>`;
  }).join('');

  grid.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.add));
  });
}

document.getElementById('filters').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if(!chip) return;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  state.cat = chip.dataset.cat;
  renderProducts();
});
document.getElementById('searchInput').addEventListener('input', e => {
  state.query = e.target.value;
  renderProducts();
});
document.getElementById('sortSelect').addEventListener('change', e => {
  state.sort = e.target.value;
  renderProducts();
});

/* ---------------------------------------------------------------------- */
/* Cart                                                                    */
/* ---------------------------------------------------------------------- */
function addToCart(id){
  const products = getProducts();
  const product = products.find(p => p.id === id);
  if(!product || product.stock <= 0) return;
  const cart = getCart();
  const line = cart.find(c => c.id === id);
  if(line){
    if(line.qty < product.stock) line.qty += 1;
    else { toast('No hay más stock disponible de ese producto.'); return; }
  } else {
    cart.push({ id, qty:1 });
  }
  setCart(cart);
  refreshCartUI();
  toast(`${product.name} agregado al carrito`);
}

function updateQty(id, delta){
  const products = getProducts();
  const product = products.find(p => p.id === id);
  const cart = getCart();
  const line = cart.find(c => c.id === id);
  if(!line) return;
  line.qty += delta;
  if(line.qty <= 0){
    setCart(cart.filter(c => c.id !== id));
  } else if(product && line.qty > product.stock){
    line.qty = product.stock;
    toast('Alcanzaste el stock máximo disponible.');
    setCart(cart);
  } else {
    setCart(cart);
  }
  refreshCartUI();
}

function removeFromCart(id){
  setCart(getCart().filter(c => c.id !== id));
  refreshCartUI();
}

function cartLines(){
  const products = getProducts();
  return getCart().map(c => {
    const product = products.find(p => p.id === c.id);
    return product ? { ...c, product } : null;
  }).filter(Boolean);
}

function cartTotal(){
  return cartLines().reduce((sum, l) => sum + l.product.price * l.qty, 0);
}

function refreshCartUI(){
  const lines = cartLines();
  const count = lines.reduce((s,l) => s + l.qty, 0);
  document.getElementById('cartCount').textContent = count;

  const body = document.getElementById('cartBody');
  if(!lines.length){
    body.innerHTML = `<div class="cart-empty">Tu carrito está vacío.<br>Explora el catálogo y agrega tus prendas favoritas.</div>`;
  } else {
    body.innerHTML = lines.map(l => `
      <div class="cart-item">
        <div class="cart-item-thumb">${l.product.name.split(' ').slice(0,2).join(' ')}</div>
        <div>
          <div class="cart-item-name">${l.product.name}</div>
          <div class="cart-item-cat">${CATEGORY_LABELS[l.product.cat]}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" data-qty-down="${l.id}">−</button>
            <span>${l.qty}</span>
            <button class="qty-btn" data-qty-up="${l.id}">+</button>
          </div>
          <a href="#" class="cart-item-remove" data-remove="${l.id}">Quitar</a>
        </div>
        <div class="cart-item-price">${money(l.product.price * l.qty)}</div>
      </div>
    `).join('');
  }

  const total = cartTotal();
  document.getElementById('cartSubtotal').textContent = money(total);
  document.getElementById('cartTotal').textContent = money(total);
  document.getElementById('cartShipping').textContent = total > 0 ? (total >= 150000 ? 'Gratis' : money(12000)) : 'A calcular';

  body.querySelectorAll('[data-qty-up]').forEach(b => b.addEventListener('click', () => updateQty(b.dataset.qtyUp, 1)));
  body.querySelectorAll('[data-qty-down]').forEach(b => b.addEventListener('click', () => updateQty(b.dataset.qtyDown, -1)));
  body.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); removeFromCart(b.dataset.remove); }));
}

/* Cart drawer open/close */
const cartDrawer = document.getElementById('cartDrawer');
function openCart(){ cartDrawer.classList.add('open'); }
function closeCart(){ cartDrawer.classList.remove('open'); }
document.getElementById('btnCart').addEventListener('click', openCart);
document.getElementById('footerCartLink').addEventListener('click', e => { e.preventDefault(); openCart(); });
cartDrawer.querySelectorAll('[data-close-drawer]').forEach(el => el.addEventListener('click', closeCart));

/* ---------------------------------------------------------------------- */
/* Auth modal                                                             */
/* ---------------------------------------------------------------------- */
const authOverlay = document.getElementById('authOverlay');
function openAuth(){ authOverlay.classList.add('open'); syncAuthTitle(); }
function closeAuth(){ authOverlay.classList.remove('open'); }
document.getElementById('btnAccount').addEventListener('click', () => {
  if(getSession()){
    if(confirm(`Sesión iniciada como ${getSession()}. ¿Cerrar sesión?`)){
      setSession(null);
      toast('Sesión cerrada');
    }
  } else {
    openAuth();
  }
});
document.getElementById('footerLoginLink').addEventListener('click', e => { e.preventDefault(); openAuth(); });

document.querySelectorAll('.modal-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('paneLogin').classList.toggle('active', tab.dataset.tab === 'login');
    document.getElementById('paneRegister').classList.toggle('active', tab.dataset.tab === 'register');
    syncAuthTitle();
  });
});
function syncAuthTitle(){
  const active = document.querySelector('.modal-tab.active').dataset.tab;
  document.getElementById('authTitle').textContent = active === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta';
}

document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;
  const user = getUsers().find(u => u.email.toLowerCase() === email && u.password === pass);
  const msg = document.getElementById('loginMsg');
  if(user){
    setSession(user.email);
    msg.className = 'form-msg show ok';
    msg.textContent = `¡Hola, ${user.name}! Sesión iniciada.`;
    toast('Sesión iniciada correctamente');
    setTimeout(closeAuth, 700);
  } else {
    msg.className = 'form-msg show err';
    msg.textContent = 'Correo o contraseña incorrectos.';
  }
});

document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass = document.getElementById('regPass').value;
  const msg = document.getElementById('registerMsg');
  if(pass.length < 6){
    msg.className = 'form-msg show err';
    msg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }
  const users = getUsers();
  if(users.find(u => u.email.toLowerCase() === email)){
    msg.className = 'form-msg show err';
    msg.textContent = 'Ya existe una cuenta con ese correo.';
    return;
  }
  users.push({ name, email, password: pass });
  setUsers(users);
  setSession(email);
  msg.className = 'form-msg show ok';
  msg.textContent = 'Cuenta creada. ¡Bienvenido a DressFresh!';
  toast('Cuenta creada correctamente');
  setTimeout(closeAuth, 700);
});

/* ---------------------------------------------------------------------- */
/* Generic modal close (backdrop + close buttons + Esc)                   */
/* ---------------------------------------------------------------------- */
document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => { if(e.target === ov) ov.classList.remove('open'); });
});
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.remove('open'));
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){
    document.querySelectorAll('.overlay.open').forEach(ov => ov.classList.remove('open'));
    closeCart();
  }
});

/* ---------------------------------------------------------------------- */
/* Checkout / pago en línea                                                */
/* ---------------------------------------------------------------------- */
const checkoutOverlay = document.getElementById('checkoutOverlay');
document.getElementById('btnCheckout').addEventListener('click', () => {
  const lines = cartLines();
  if(!lines.length){ toast('Tu carrito está vacío.'); return; }
  const total = cartTotal();
  const shipping = total >= 150000 ? 0 : 12000;
  document.getElementById('checkoutSummary').innerHTML = `
    <div><span>${lines.reduce((s,l)=>s+l.qty,0)} producto(s)</span><span>${money(total)}</span></div>
    <div><span>Envío</span><span>${shipping ? money(shipping) : 'Gratis'}</span></div>
    <div class="total"><span>Total a pagar</span><span>${money(total + shipping)}</span></div>
  `;
  closeCart();
  checkoutOverlay.classList.add('open');
});

document.querySelectorAll('.pay-method').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('cardFields').style.display = btn.dataset.method === 'Tarjeta' ? 'block' : 'none';
  });
});

document.getElementById('checkoutForm').addEventListener('submit', e => {
  e.preventDefault();
  const msg = document.getElementById('checkoutMsg');
  msg.className = 'form-msg show ok';
  msg.textContent = 'Pago simulado con éxito. ¡Gracias por tu compra! Recibirás confirmación por correo.';
  setCart([]);
  refreshCartUI();
  setTimeout(() => {
    checkoutOverlay.classList.remove('open');
    msg.classList.remove('show');
    document.getElementById('checkoutForm').reset();
  }, 2200);
});

/* ---------------------------------------------------------------------- */
/* PQRSF                                                                   */
/* ---------------------------------------------------------------------- */
document.getElementById('pqrsfForm').addEventListener('submit', e => {
  e.preventDefault();
  const ticket = {
    id: 'PQ-' + Date.now().toString().slice(-6),
    nombre: document.getElementById('pqNombre').value.trim(),
    email: document.getElementById('pqEmail').value.trim(),
    tipo: document.getElementById('pqTipo').value,
    mensaje: document.getElementById('pqMensaje').value.trim(),
    fecha: new Date().toISOString()
  };
  const all = store.get('df_pqrsf', []);
  all.unshift(ticket);
  store.set('df_pqrsf', all);

  const success = document.getElementById('pqrsfSuccess');
  success.classList.add('show');
  success.textContent = `Solicitud registrada. Tu número de radicado es ${ticket.id}. Te contactaremos a ${ticket.email}.`;
  document.getElementById('pqrsfForm').reset();
  toast('PQRSF enviado correctamente');
});

document.getElementById('openPqrsfInfo').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('pqNombre').focus();
});

/* ---------------------------------------------------------------------- */
/* Mobile nav                                                              */
/* ---------------------------------------------------------------------- */
document.getElementById('btnBurger').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});
document.querySelectorAll('#navLinks a').forEach(a => {
  a.addEventListener('click', () => document.getElementById('navLinks').classList.remove('open'));
});

/* ---------------------------------------------------------------------- */
/* Init                                                                     */
/* ---------------------------------------------------------------------- */
renderProducts();
refreshCartUI();
