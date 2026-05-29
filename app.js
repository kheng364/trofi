import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA1WLxLX5TzwxR1mip6sbkPiQfCbOCO-5w",
  authDomain: "trofi-97629.firebaseapp.com",
  databaseURL: "https://trofi-97629-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "trofi-97629",
  storageBucket: "trofi-97629.firebasestorage.app",
  messagingSenderId: "1018385943184",
  appId: "1:1018385943184:web:1448f087f21ba57ee72615"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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

function money(n) {
  return Number(n || 0).toFixed(2);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function cryptoId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(16);
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getUnit(category) {
  return category === "Drink" || category === "Beer" ? "per drink" : "per dish";
}

function getTableFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("table") || "1";
}

function ensureSeed() {
  if (!LS.get("adminCred", null)) {
    LS.set("adminCred", { username: "admin", password: "1234" });
  }

  const foods = LS.get("foods", null);

  if (!Array.isArray(foods) || foods.length === 0) {
    LS.set("foods", [
      {
        id: cryptoId(),
        name: "Fried Rice",
        price: 5,
        category: "Rice",
        img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80"
      },
      {
        id: cryptoId(),
        name: "Noodles",
        price: 4.5,
        category: "Soup",
        img: "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=800&q=80"
      },
      {
        id: cryptoId(),
        name: "Burger",
        price: 6,
        category: "Fast Food",
        img: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80"
      },
      {
        id: cryptoId(),
        name: "French Fries",
        price: 2,
        category: "Fry",
        img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80"
      },
      {
        id: cryptoId(),
        name: "Coffee",
        price: 2,
        category: "Drink",
        img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80"
      }
    ]);
  }
}

let cart = {};
let activeCategory = "All";

const CATEGORY_ORDER = ["All", "Grill", "Fry", "Soup", "Rice", "Fast Food", "Drink", "Beer"];

function renderMenuPage() {
  ensureSeed();

  const table = getTableFromUrl();
  if (qs("tableBadge")) qs("tableBadge").textContent = `Table ${table}`;

  buildCategoryChips();
  applyMenuFilters();
  renderCart();
}

function buildCategoryChips() {
  const wrap = qs("catChips");
  if (!wrap) return;

  const foods = LS.get("foods", []);
  const existing = new Set(foods.map(f => f.category || "Other"));
  const cats = CATEGORY_ORDER.filter(c => c === "All" || existing.has(c));

  wrap.innerHTML = cats.map(c => `
    <div class="chip ${c === activeCategory ? "active" : ""}" onclick="setCategory('${c}')">
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
  const q = (qs("searchInput")?.value || "").toLowerCase();

  const filtered = foods.filter(f => {
    const okCat = activeCategory === "All" || f.category === activeCategory;
    const okSearch = !q || f.name.toLowerCase().includes(q);
    return okCat && okSearch;
  });

  renderMenuList(filtered);
  buildCategoryChips();
}

function renderMenuList(foods) {
  const wrap = qs("menuList");
  if (!wrap) return;

  if (foods.length === 0) {
    wrap.innerHTML = `<div class="menuItem"><p class="note">No food found.</p></div>`;
    return;
  }

  wrap.innerHTML = foods.map(food => {
    const qty = cart[food.id]?.qty || 0;
    return `
      <div class="menuItem">
        <img src="${food.img}" alt="${escapeHtml(food.name)}">
        <div class="menuInfo">
          <div class="menuName">${escapeHtml(food.name)}</div>
          <div class="menuPrice">$${money(food.price)} ${getUnit(food.category)}</div>
        </div>
        <div class="qtyRow">
          <button class="qtyBtn minus" onclick="decrease('${food.id}')">-</button>
          <div class="qtyNum">${qty}</div>
          <button class="qtyBtn plus" onclick="increase('${food.id}')">+</button>
        </div>
      </div>
    `;
  }).join("");
}

function increase(foodId) {
  const food = LS.get("foods", []).find(f => f.id === foodId);
  if (!food) return;

  if (!cart[foodId]) cart[foodId] = { ...food, qty: 0 };
  cart[foodId].qty++;

  applyMenuFilters();
  renderCart();
}

function decrease(foodId) {
  if (!cart[foodId]) return;

  cart[foodId].qty--;

  if (cart[foodId].qty <= 0) delete cart[foodId];

  applyMenuFilters();
  renderCart();
}

function removeItem(foodId) {
  delete cart[foodId];
  applyMenuFilters();
  renderCart();
}

function renderCart() {
  const cartDiv = qs("cartItems");
  const totalEl = qs("totalPrice");
  if (!cartDiv || !totalEl) return;

  const items = Object.values(cart);

  if (items.length === 0) {
    cartDiv.innerHTML = `<p class="note">No items selected yet.</p>`;
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
        <button class="btn small" onclick="decrease('${it.id}')">-</button>
        <button class="btn small" onclick="increase('${it.id}')">+</button>
        <button class="btn danger small" onclick="removeItem('${it.id}')">Remove</button>
      </div>
    </div>
  `).join("<hr>");

  const total = items.reduce((s, it) => s + Number(it.price) * it.qty, 0);
  totalEl.textContent = money(total);
}

async function submitOrder() {
  const items = Object.values(cart);

  if (items.length === 0) {
    alert("Please select at least 1 item.");
    return;
  }

  const table = getTableFromUrl();
  const request = qs("chefRequest")?.value.trim() || "";
  const total = items.reduce((s, it) => s + Number(it.price) * it.qty, 0);

  const order = {
    table,
    items: items.map(it => ({
      name: it.name,
      price: Number(it.price),
      qty: it.qty,
      category: it.category || "Other"
    })),
    request,
    total,
    status: "Pending",
    date: todayStr(),
    createdAt: new Date().toISOString()
  };

  await push(ref(db, "orders"), order);

  cart = {};
  if (qs("chefRequest")) qs("chefRequest").value = "";

  applyMenuFilters();
  renderCart();

  alert("Order sent to admin!");
}

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

  const u = qs("username")?.value.trim();
  const p = qs("password")?.value.trim();
  const cred = LS.get("adminCred", { username: "admin", password: "1234" });

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
  LS.set("adminCred", { username: "admin", password: "1234" });
  alert("Reset done: admin / 1234");
}

function renderAdminPage() {
  ensureSeed();
  requireAdmin();

  onValue(ref(db, "orders"), snapshot => {
    const data = snapshot.val() || {};
    const orders = Object.entries(data).map(([id, order]) => ({ id, ...order }));

    renderAdminStats(orders);
    renderOrdersTable(orders);
    renderSalesChart(orders);
  });

  renderFoodsTable(LS.get("foods", []));
}

function renderAdminStats(orders) {
  const today = todayStr();
  const todayOrders = orders.filter(o => o.date === today);
  const todaySales = todayOrders.reduce((s, o) => s + Number(o.total || 0), 0);

  if (qs("kpiTodayOrders")) qs("kpiTodayOrders").textContent = todayOrders.length;
  if (qs("kpiTodaySales")) qs("kpiTodaySales").textContent = `$${money(todaySales)}`;
  if (qs("kpiTotalOrders")) qs("kpiTotalOrders").textContent = orders.length;
}

function renderOrdersTable(orders) {
  const wrap = qs("ordersWrap");
  if (!wrap) return;

  if (orders.length === 0) {
    wrap.innerHTML = `<div class="card"><p class="note">No orders yet.</p></div>`;
    return;
  }

  const sorted = [...orders].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  wrap.innerHTML = `
    <div class="card">
      <h2>Live Orders</h2>
      <table class="table">
        <thead>
          <tr>
            <th>Table</th>
            <th>Items</th>
            <th>Request</th>
            <th>Total</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(o => `
            <tr>
              <td><b>Table ${escapeHtml(o.table)}</b></td>
              <td>${(o.items || []).map(i => `${escapeHtml(i.name)} × ${i.qty}`).join("<br>")}</td>
              <td>${escapeHtml(o.request || "-")}</td>
              <td><b>$${money(o.total)}</b></td>
              <td>${escapeHtml(o.status || "Pending")}</td>
              <td><button class="btn danger small" onclick="deleteOrder('${o.id}')">Complete</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSalesChart(orders) {
  const canvas = qs("salesChart");
  if (!canvas || typeof Chart === "undefined") return;

  const map = {};
  orders.forEach(o => {
    map[o.date] = (map[o.date] || 0) + Number(o.total || 0);
  });

  const labels = Object.keys(map).sort();
  const data = labels.map(d => map[d]);

  if (window._salesChart) window._salesChart.destroy();

  window._salesChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: "#ffd43b",
        borderColor: "#101828",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

async function deleteOrder(id) {
  if (!confirm("Complete this order?")) return;
  await remove(ref(db, `orders/${id}`));
}

function renderFoodsTable(foods) {
  const wrap = qs("foodsWrap");
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="card">
      <h2>Manage Foods</h2>

      <label>Food name</label>
      <input id="newFoodName" placeholder="e.g., Pizza">

      <label>Price</label>
      <input id="newFoodPrice" type="number" step="0.01" placeholder="e.g., 7.50">

      <label>Category</label>
      <input id="newFoodCat" placeholder="Grill / Fry / Soup / Rice / Fast Food / Drink / Beer">

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
              <td><img src="${f.img}" style="width:64px;height:46px;object-fit:cover;border-radius:10px"></td>
              <td><input id="fn-${f.id}" value="${escapeHtml(f.name)}"></td>
              <td><input id="fc-${f.id}" value="${escapeHtml(f.category)}"></td>
              <td><input id="fp-${f.id}" value="${escapeHtml(f.price)}" type="number" step="0.01"></td>
              <td><input id="fi-${f.id}" value="${escapeHtml(f.img)}"></td>
              <td>
                <button class="btn small" onclick="updateFood('${f.id}')">Update</button>
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
  const name = qs("newFoodName").value.trim();
  const price = Number(qs("newFoodPrice").value);
  const category = qs("newFoodCat").value.trim() || "Other";
  const img = qs("newFoodImg").value.trim();

  if (!name || !price || !img) {
    alert("Please enter all food information.");
    return;
  }

  const foods = LS.get("foods", []);
  foods.push({ id: cryptoId(), name, price, category, img });
  LS.set("foods", foods);
  renderFoodsTable(foods);
}

function updateFood(id) {
  const foods = LS.get("foods", []);
  const index = foods.findIndex(f => f.id === id);
  if (index === -1) return;

  foods[index] = {
    id,
    name: qs(`fn-${id}`).value.trim(),
    category: qs(`fc-${id}`).value.trim(),
    price: Number(qs(`fp-${id}`).value),
    img: qs(`fi-${id}`).value.trim()
  };

  LS.set("foods", foods);
  alert("Food updated!");
}

function deleteFood(id) {
  const foods = LS.get("foods", []).filter(f => f.id !== id);
  LS.set("foods", foods);
  renderFoodsTable(foods);
}

window.addEventListener("DOMContentLoaded", () => {
  const page = document.body.getAttribute("data-page");

  if (page === "menu") renderMenuPage();
  if (page === "admin-login") ensureSeed();
  if (page === "admin") renderAdminPage();
});

window.increase = increase;
window.decrease = decrease;
window.removeItem = removeItem;
window.submitOrder = submitOrder;
window.setCategory = setCategory;
window.applyMenuFilters = applyMenuFilters;

window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
window.resetAdminCred = resetAdminCred;

window.deleteOrder = deleteOrder;
window.addFood = addFood;
window.updateFood = updateFood;
window.deleteFood = deleteFood;