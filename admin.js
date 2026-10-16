/* ==========================================================================
   DressFresh — admin.js
   Shares localStorage keys with script.js: df_products, df_pqrsf, df_users
   Demo-only auth: NOT secure for production use.
   ========================================================================== */

const ADMIN_CREDENTIALS = { user: 'admin@dressfresh.co', pass: 'admin123' };
const CATEGORY_LABELS = {
  'camisas': 'Camisas', 'camisetas': 'Camisetas', 'pantalones': 'Pantalones',
  'sudaderas': 'Sudaderas', 'shorts': 'Shorts', 'ropa-interior': 'Ropa interior',
  'tenis': 'Tenis', 'zapatos': 'Zapatos', 'perfumes': 'Perfumes', 'bolsos': 'Bolsos'
};

const store = {
  get(key, fallback){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch(e){ return fallback; }
  },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};
const money = n => '$' + Number(n).toLocaleString('es-CO');

/* ---------------------------------------------------------------------- */
/* Login gate                                                              */
/* ---------------------------------------------------------------------- */
const loginShell = document.getElementById('loginShell');
const adminShell = document.getElementById('adminShell');

function isAdminAuthed(){ return sessionStorage.getItem('df_admin_auth') === '1'; }
function showAdmin(){
  loginShell.style.display = 'none';
  adminShell.classList.add('show');
  renderAll();
}
function showLogin(){
  loginShell.style.display = 'flex';
  adminShell.classList.remove('show');
}

if(isAdminAuthed()) showAdmin(); else showLogin();

document.getElementById('adminLoginForm').addEventListener('submit', e => {
  e.preventDefault();
  const user = document.getElementById('adminUser').value.trim().toLowerCase();
  const pass = document.getElementById('adminPass').value;
  const msg = document.getElementById('adminLoginMsg');
  if(user === ADMIN_CREDENTIALS.user && pass === ADMIN_CREDENTIALS.pass){
    sessionStorage.setItem('df_admin_auth', '1');
    showAdmin();
  } else {
    msg.className = 'form-msg show err';
    msg.textContent = 'Credenciales incorrectas. Verifica usuario y contraseña.';
  }
});

document.getElementById('adminLogout').addEventListener('click', e => {
  e.preventDefault();
  sessionStorage.removeItem('df_admin_auth');
  showLogin();
});

/* ---------------------------------------------------------------------- */
/* Sidebar panel switching                                                 */
/* ---------------------------------------------------------------------- */
document.querySelectorAll('.admin-nav a[data-panel]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.admin-nav a[data-panel]').forEach(a => a.classList.remove('active'));
    link.classList.add('active');
    ['panelProducts','panelPqrsf','panelUsers'].forEach(id => {
      document.getElementById(id).style.display = (id === link.dataset.panel) ? 'block' : 'none';
    });
    const titles = { panelProducts:'Gestión de productos', panelPqrsf:'Buzón PQRSF', panelUsers:'Usuarios registrados' };
    document.querySelector('.admin-topline h2').textContent = titles[link.dataset.panel];
    document.getElementById('btnNewProduct').style.display = link.dataset.panel === 'panelProducts' ? 'inline-flex' : 'none';
  });
});

/* ---------------------------------------------------------------------- */
/* Toast                                                                    */
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
/* Products CRUD                                                           */
/* ---------------------------------------------------------------------- */
function getProducts(){ return store.get('df_products', []); }
function setProducts(list){ store.set('df_products', list); }

function stockPillClass(stock){
  if(stock <= 0) return 'out';
  if(stock <= 5) return 'low';
  return 'ok';
}

function renderProducts(){
  const products = getProducts();
  const tbody = document.getElementById('productsTableBody');
  tbody.innerHTML = products.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${CATEGORY_LABELS[p.cat] || p.cat}</td>
      <td>${money(p.price)}${p.oldPrice ? ` <span style="color:var(--muted-2);text-decoration:line-through;">${money(p.oldPrice)}</span>` : ''}</td>
      <td><span class="stock-pill ${stockPillClass(p.stock)}">${p.stock <= 0 ? 'Agotado' : p.stock + ' und.'}</span></td>
      <td>${p.promo ? '✓' : '—'}</td>
      <td>
        <div class="row-actions">
          <button data-edit="${p.id}">Editar</button>
          <button data-del="${p.id}" class="danger">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join('');

  document.getElementById('stTotal').textContent = products.length;
  document.getElementById('stOut').textContent = products.filter(p => p.stock <= 0).length;
  document.getElementById('stPromo').textContent = products.filter(p => p.promo).length;
  document.getElementById('stValue').textContent = money(products.reduce((s,p) => s + p.price * p.stock, 0));

  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openProductForm(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteProduct(b.dataset.del)));
}

const productOverlay = document.getElementById('productOverlay');
const productForm = document.getElementById('productForm');

function openProductForm(id){
  productForm.reset();
  document.getElementById('productMsg').classList.remove('show');
  if(id){
    const p = getProducts().find(x => x.id === id);
    if(!p) return;
    document.getElementById('productModalEyebrow').textContent = 'Editar producto';
    document.getElementById('productModalTitle').textContent = p.name;
    document.getElementById('prodId').value = p.id;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodCat').value = p.cat;
    document.getElementById('prodStock').value = p.stock;
    document.getElementById('prodPrice').value = p.price;
    document.getElementById('prodOldPrice').value = p.oldPrice || '';
    document.getElementById('prodPromo').checked = !!p.promo;
  } else {
    document.getElementById('productModalEyebrow').textContent = 'Nuevo producto';
    document.getElementById('productModalTitle').textContent = 'Agregar producto';
    document.getElementById('prodId').value = '';
  }
  productOverlay.classList.add('open');
}

document.getElementById('btnNewProduct').addEventListener('click', () => openProductForm(null));

productForm.addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('prodId').value;
  const data = {
    name: document.getElementById('prodName').value.trim(),
    cat: document.getElementById('prodCat').value,
    stock: parseInt(document.getElementById('prodStock').value, 10) || 0,
    price: parseInt(document.getElementById('prodPrice').value, 10) || 0,
    oldPrice: document.getElementById('prodOldPrice').value ? parseInt(document.getElementById('prodOldPrice').value, 10) : null,
    promo: document.getElementById('prodPromo').checked
  };
  const products = getProducts();
  if(id){
    const idx = products.findIndex(p => p.id === id);
    if(idx > -1) products[idx] = { ...products[idx], ...data };
    toast('Producto actualizado');
  } else {
    data.id = 'p' + Date.now().toString().slice(-8);
    products.push(data);
    toast('Producto creado');
  }
  setProducts(products);
  productOverlay.classList.remove('open');
  renderProducts();
});

function deleteProduct(id){
  const p = getProducts().find(x => x.id === id);
  if(!p) return;
  if(!confirm(`¿Eliminar "${p.name}" del catálogo? Esta acción no se puede deshacer.`)) return;
  setProducts(getProducts().filter(x => x.id !== id));
  renderProducts();
  toast('Producto eliminado');
}

document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => { if(e.target === ov) ov.classList.remove('open'); });
});
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => document.getElementById(btn.dataset.close).classList.remove('open'));
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') document.querySelectorAll('.overlay.open').forEach(ov => ov.classList.remove('open'));
});

/* ---------------------------------------------------------------------- */
/* PQRSF viewer                                                            */
/* ---------------------------------------------------------------------- */
function renderPqrsf(){
  const list = store.get('df_pqrsf', []);
  const el = document.getElementById('pqrsfList');
  if(!list.length){
    el.innerHTML = `<p style="color:var(--muted);font-size:13px;">Aún no se han recibido solicitudes.</p>`;
    return;
  }
  el.innerHTML = list.map(t => `
    <div class="pqrsf-item">
      <div class="meta">${t.id} · ${t.tipo} · ${new Date(t.fecha).toLocaleString('es-CO')}</div>
      <strong>${t.nombre}</strong> — ${t.email}<br>
      ${t.mensaje}
    </div>
  `).join('');
}

/* ---------------------------------------------------------------------- */
/* Users viewer                                                            */
/* ---------------------------------------------------------------------- */
function renderUsers(){
  const users = store.get('df_users', []);
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = users.map(u => `
    <tr><td>${u.name}</td><td>${u.email}</td><td>—</td></tr>
  `).join('') || `<tr><td colspan="3" style="color:var(--muted);">No hay usuarios registrados todavía.</td></tr>`;
}

function renderAll(){
  renderProducts();
  renderPqrsf();
  renderUsers();
}
