/*****************
  Storage helper
******************/
const LS = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }
};

function qs(id) {
  return document.getElementById(id);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function money(n) {
  return Number(n).toFixed(2);
}

function cryptoId() {
  return (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getUnit(category) {
  return (category === "Drink" || category === "Beer") ? "per drink" : "per dish";
}

/*****************
  Seed
******************/
function ensureSeed() {
  const cred = LS.get("adminCred", null);

  if (!cred || typeof cred.username !== "string" || typeof cred.password !== "string") {
    LS.set("adminCred", { username: "admin", password: "1234" });
  }

  const foods = LS.get("foods", null);

  if (!Array.isArray(foods) || foods.length === 0) {
    LS.set("foods", [
      { id: cryptoId(), name: "Fried Rice", price: 5.00, category: "Rice", img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80" },
      { id: cryptoId(), name: "Noodles", price: 4.50, category: "Soup", img: "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=800&q=80" },
      { id: cryptoId(), name: "Burger", price: 6.00, category: "Fast Food", img: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80" },
      { id: cryptoId(), name: "French Fries", price: 2.00, category: "Fry", img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80" },
      { id: cryptoId(), name: "Grill Chicken", price: 5.50, category: "Grill", img: "https://images.unsplash.com/photo-1604908554049-25d644cd6b4b?w=800&q=80" },
      { id: cryptoId(), name: "Coffee", price: 2.00, category: "Drink", img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80" },
      { id: cryptoId(), name: "Beer", price: 3.00, category: "Beer", img: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&q=80" }
    ]);
  }

  const orders = LS.get("orders", null);
  if (!Array.isArray(orders)) {
    LS.set("orders", []);
  }
}

function getTableFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("table") || "1";
}

/*****************
  Customer Menu
******************/
let cart = {};
let activeCategory = "All";

const CATEGORY_ORDER = ["All", "Grill", "Fry", "Soup", "Rice", "Fast Food", "Drink", "Beer"];

function renderMenuPage() {
  ensureSeed();

  const table = getTableFromUrl();
  qs("tableBadge").textContent = `Table ${table}`;

  const foods = LS.get("foods", []);
  buildCategoryChips(foods);
  applyMenuFilters();
  renderCart();
}

function buildCategoryChips(foods) {
  const wrap = qs("catChips");
  if (!wrap) return;

  const existing = new Set(foods.map(f => f.category || "Other"));
  const cats = CATEGORY_ORDER.filter(c => c === "All" || existing.has(c));

  wrap.innerHTML = cats.map(c => `
    <div class="chip ${c === activeCategory ? "active" : ""}" onclick="setCategory('${escapeHtml(c)}')">
      ${escapeHtml(c)}
    </div>
  `).join("");
}

function setCategory(cat) {
  activeCategory = cat;
  applyMenuFilters();
}

function applyMenuFilters() {
  const foods = LS.get("foods", []);
  const q = (qs("searchInput")?.value || "").trim().toLowerCase();

  const filtered = foods.filter(f => {
    const cat = f.category || "Other";
    const okCat = activeCategory === "All" ? true : cat === activeCategory;
    const okSearch = !q ? true : (f.name || "").toLowerCase().includes(q);
    return okCat && okSearch;
  });

  renderMenuList(filtered);
  buildCategoryChips(foods);
}

function renderMenuList(foods) {
  const wrap = qs("menuList");
  if (!wrap) return;

  wrap.innerHTML = "";

  if (foods.length === 0) {
    wrap.innerHTML = `<div class="menuItem"><div class="note">No food found.</div></div>`;
    return;
  }

  foods.forEach(food => {
    const qty = cart[food.id]?.qty || 0;
    const unit = getUnit(food.category);

    const el = document.createElement("div");
    el.className = "menuItem";

    el.innerHTML = `
      <img src="${food.img}" alt="${escapeHtml(food.name)}">
      <div class="menuInfo">
        <div class="menuName">${escapeHtml(food.name)}</div>
        <div class="menuPrice">$${money(food.price)} ${unit}</div>
      </div>
      <div class="qtyRow">
        <button class="qtyBtn minus" onclick="decrease('${food.id}')">-</button>
        <div class="qtyNum">${qty}</div>
        <button class="qtyBtn plus" onclick="increase('${food.id}')">+</button>
      </div>
    `;

    wrap.appendChild(el);
  });
}

function increase(foodId) {
  const foods = LS.get("foods", []);
  const food = foods.find(f => f.id === foodId);
  if (!food) return;

  if (!cart[foodId]) {
    cart[foodId] = { ...food, qty: 0 };
  }

  cart[foodId].qty += 1;
  applyMenuFilters();
  renderCart();
}

function decrease(foodId) {
  if (!cart[foodId]) return;

  cart[foodId].qty -= 1;

  if (cart[foodId].qty <= 0) {
    delete cart[foodId];
  }

  applyMenuFilters();
  renderCart();
}

function removeItem(foodId) {
  if (cart[foodId]) {
    delete cart[foodId];
  }

  applyMenuFilters();
  renderCart();
}

function renderCart() {
  const cartDiv = qs("cartItems");
  const totalEl = qs("totalPrice");
  if (!cartDiv || !totalEl) return;

  const items = Object.values(cart);

  if (items.length === 0) {
    cartDiv.innerHTML = `<div class="note">No items selected yet.</div>`;
    totalEl.textContent = "0.00";
    return;
  }

  cartDiv.innerHTML = items.map(it => `
    <div class="cart-item">
      <div>
        <b>${escapeHtml(it.name)}</b>
        <div class="note">$${money(it.price)} × ${it.qty}</div>
      </div>
      <div class="cart-actions">
        <button class="btn gray small" onclick="decrease('${it.id}')">-</button>
        <span style="font-weight:800">${it.qty}</span>
        <button class="btn gray small" onclick="increase('${it.id}')">+</button>
        <button class="btn danger small" onclick="removeItem('${it.id}')">Remove</button>
      </div>
    </div>
  `).join("<hr>");

  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  totalEl.textContent = money(total);
}

function submitOrder() {
  const table = getTableFromUrl();
  const items = Object.values(cart);

  if (items.length === 0) {
    alert("Please select at least 1 item.");
    return;
  }

  const request = qs("chefRequest").value.trim();
  const total = items.reduce((s, it) => s + it.price * it.qty, 0);

  const orders = LS.get("orders", []);

  orders.push({
    id: cryptoId(),
    table,
    items: items.map(it => ({
      id: it.id,
      name: it.name,
      price: it.price,
      qty: it.qty
    })),
    request,
    total,
    date: todayStr(),
    createdAt: new Date().toISOString()
  });

  LS.set("orders", orders);

  cart = {};
  qs("chefRequest").value = "";
  applyMenuFilters();
  renderCart();

  alert("Order sent to admin!");
}

/*****************
  Admin Auth
******************/
function isAdminLoggedIn() {
  return localStorage.getItem("adminLoggedIn") === "true";
}

function requireAdmin() {
  if (!isAdminLoggedIn()) {
    window.location.href = "admin-login.html";
  }
}

function adminLogin() {
  ensureSeed();

  const u = (qs("username")?.value || "").trim();
  const p = (qs("password")?.value || "").trim();

  const cred = LS.get("adminCred", {
    username: "admin",
    password: "1234"
  });

  if (u === cred.username && p === cred.password) {
    localStorage.setItem("adminLoggedIn", "true");
    window.location.href = "admin.html";
  } else {
    alert("Wrong username or password");
  }
}

function adminLogout() {
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "admin-login.html";
}

function resetAdminCred() {
  LS.set("adminCred", {
    username: "admin",
    password: "1234"
  });

  localStorage.removeItem("adminLoggedIn");
  alert("Reset done: admin / 1234");
}

/*****************
  Admin Dashboard
******************/
function nowTimeHHMM(iso) {
  if (!iso) return "-";

  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  return `${hh}:${mm}`;
}

function renderAdminPage() {
  ensureSeed();
  requireAdmin();

  const orders = LS.get("orders", []);
  const foods = LS.get("foods", []);
  const today = todayStr();

  const todayOrders = orders.filter(o => o.date === today);
  const todaySales = todayOrders.reduce((s, o) => s + Number(o.total || 0), 0);

  qs("kpiTodayOrders").textContent = String(todayOrders.length);
  qs("kpiTodaySales").textContent = `$${money(todaySales)}`;
  qs("kpiTotalOrders").textContent = String(orders.length);

  renderSalesChart(orders);
  renderOrdersTable(orders);
  renderFoodsTable(foods);
}

function renderSalesChart(orders) {
  const canvas = document.getElementById("salesChart");
  if (!canvas || typeof Chart === "undefined") return;

  const map = {};

  orders.forEach(o => {
    const day = o.date || "";
    if (!day) return;
    map[day] = (map[day] || 0) + Number(o.total || 0);
  });

  const labels = Object.keys(map).sort();
  const data = labels.map(d => map[d]);

  if (window._salesChart) {
    window._salesChart.destroy();
  }

  window._salesChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: "#ffd600",
        borderColor: "#111827",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function renderOrdersTable(orders) {
  const wrap = qs("ordersWrap");
  if (!wrap) return;

  if (orders.length === 0) {
    wrap.innerHTML = `<div class="card"><div class="note">No orders yet.</div></div>`;
    return;
  }

  const sorted = [...orders].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  wrap.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
        <h2 style="margin:0;">Orders</h2>
        <button class="btn danger small" onclick="clearOrders()">Clear Orders</button>
      </div>

      <br>

      <table class="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Table</th>
            <th>Items</th>
            <th>Request</th>
            <th>Total</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(o => `
            <tr>
              <td>${nowTimeHHMM(o.createdAt)}</td>
              <td><span class="badge">Table ${escapeHtml(String(o.table))}</span></td>
              <td>${(o.items || []).map(i => `${escapeHtml(i.name)} × ${i.qty}`).join("<br>")}</td>
              <td>${escapeHtml(o.request || "-")}</td>
              <td><b>$${money(o.total || 0)}</b></td>
              <td>${escapeHtml(o.date || "")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderFoodsTable(foods) {
  const wrap = qs("foodsWrap");
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="card">
      <h2 style="margin-top:0;">Manage Foods</h2>

      <label>Food name</label>
      <input id="newFoodName" placeholder="e.g., Pizza">

      <br><br>

      <label>Price</label>
      <input id="newFoodPrice" placeholder="e.g., 7.50" type="number" step="0.01">

      <br><br>

      <label>Category</label>
      <input id="newFoodCat" placeholder="Grill / Fry / Soup / Rice / Fast Food / Drink / Beer">

      <br><br>

      <label>Image URL</label>
      <input id="newFoodImg" placeholder="https://...">

      <br><br>

      <button class="btn primary" onclick="addFood()">Add Food</button>

      <hr>

      <table class="table">
        <thead>
          <tr>
            <th>Preview</th>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Image URL</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          ${foods.map(f => `
            <tr>
              <td><img src="${f.img}" alt="" style="width:64px;height:46px;object-fit:cover;border-radius:10px;background:#eee"></td>
              <td><input id="fn-${f.id}" value="${escapeHtml(f.name)}"></td>
              <td><input id="fc-${f.id}" value="${escapeHtml(f.category || "Other")}"></td>
              <td><input id="fp-${f.id}" type="number" step="0.01" value="${escapeHtml(String(f.price))}"></td>
              <td><input id="fi-${f.id}" value="${escapeHtml(f.img)}"></td>
              <td>
                <button class="btn gray small" onclick="updateFood('${f.id}')">Update</button>
                <button class="btn danger small" onclick="deleteFood('${f.id}')">Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function addFood() {
  const name = (qs("newFoodName")?.value || "").trim();
  const price = Number(qs("newFoodPrice")?.value);
  const cat = (qs("newFoodCat")?.value || "").trim() || "Other";
  const img = (qs("newFoodImg")?.value || "").trim();

  if (!name || !isFinite(price) || price < 0 || !img) {
    alert("Please enter name, price, category, and image URL.");
    return;
  }

  const foods = LS.get("foods", []);
  foods.push({
    id: cryptoId(),
    name,
    price,
    category: cat,
    img
  });

  LS.set("foods", foods);

  qs("newFoodName").value = "";
  qs("newFoodPrice").value = "";
  qs("newFoodCat").value = "";
  qs("newFoodImg").value = "";

  renderFoodsTable(foods);
}

function updateFood(id) {
  const foods = LS.get("foods", []);
  const idx = foods.findIndex(f => f.id === id);
  if (idx === -1) return;

  const name = (document.getElementById(`fn-${id}`)?.value || "").trim();
  const cat = (document.getElementById(`fc-${id}`)?.value || "").trim() || "Other";
  const price = Number(document.getElementById(`fp-${id}`)?.value);
  const img = (document.getElementById(`fi-${id}`)?.value || "").trim();

  if (!name || !isFinite(price) || price < 0 || !img) {
    alert("Invalid data.");
    return;
  }

  foods[idx] = {
    ...foods[idx],
    name,
    category: cat,
    price,
    img
  };

  LS.set("foods", foods);
  alert("Food updated!");
}

function deleteFood(id) {
  if (!confirm("Delete this food item?")) return;

  const foods = LS.get("foods", []);
  const next = foods.filter(f => f.id !== id);

  LS.set("foods", next);
  renderFoodsTable(next);
}

function clearOrders() {
  if (!confirm("Clear all orders?")) return;

  LS.set("orders", []);
  renderAdminPage();
}

/*****************
  Auto Init
******************/
window.addEventListener("DOMContentLoaded", () => {
  const page = document.body.getAttribute("data-page");

  if (page === "menu") renderMenuPage();
  if (page === "admin-login") ensureSeed();
  if (page === "admin") renderAdminPage();
});

/*****************
  Expose
******************/
window.increase = increase;
window.decrease = decrease;
window.removeItem = removeItem;
window.submitOrder = submitOrder;

window.setCategory = setCategory;
window.applyMenuFilters = applyMenuFilters;

window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
window.resetAdminCred = resetAdminCred;

window.addFood = addFood;
window.updateFood = updateFood;
window.deleteFood = deleteFood;
window.clearOrders = clearOrders;