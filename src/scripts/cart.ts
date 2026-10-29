import confetti from "canvas-confetti";
import { EASE_OUT, prefersReducedMotion } from "./motion";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

const STORAGE_KEY = "mimi-cart";
const items = new Map<string, CartItem>();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(saved)) return;
    for (const i of saved) {
      if (typeof i?.id === "string" && typeof i.name === "string" && Number.isFinite(i.price) && Number.isInteger(i.qty) && i.qty > 0) {
        items.set(i.id, { id: i.id, name: i.name, price: i.price, qty: i.qty });
      }
    }
  } catch {
    // Storage blocked or corrupt: start with an empty cart
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...items.values()]));
  } catch {
    // Persistence is a convenience, never a requirement
  }
}

const $ = (id: string) => document.getElementById(id)!;
const money = (n: number) => `$${n.toLocaleString("es-AR")}`;

export function addToCart(item: Omit<CartItem, "qty">) {
  const existing = items.get(item.id);
  if (existing) existing.qty++;
  else items.set(item.id, { ...item, qty: 1 });
  render();
  bumpBadge();
}

function bumpBadge() {
  // Confirms the add without stealing attention
  if (prefersReducedMotion()) return;
  $("cartCount").animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.35)", offset: 0.4 }, { transform: "scale(1)" }],
    { duration: 280, easing: EASE_OUT },
  );
}

function changeQty(id: string, delta: number) {
  const item = items.get(id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) items.delete(id);
  render();
}

function iconButton(label: string, icon: string, onClick: () => void) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", label);
  btn.className = "w-7 h-7 rounded-lg bg-white border-2 border-candy-ink flex items-center justify-center text-xs pressable hover:bg-candy-mango";
  btn.innerHTML = `<i class="ph-bold ${icon}"></i>`;
  btn.addEventListener("click", onClick);
  return btn;
}

function row(item: CartItem) {
  const li = document.createElement("li");
  li.className = "bg-white border-2 border-candy-ink rounded-2xl p-3 flex items-center gap-3 shadow-pop";

  const info = document.createElement("div");
  info.className = "flex-1 min-w-0";
  const name = document.createElement("div");
  name.className = "font-display font-bold text-sm leading-tight";
  name.textContent = item.name;
  const price = document.createElement("div");
  price.className = "font-mono text-xs text-candy-ink/70 mt-0.5";
  price.textContent = money(item.price * item.qty);
  info.append(name, price);

  const qty = document.createElement("span");
  qty.className = "font-mono font-bold text-sm w-5 text-center";
  qty.textContent = String(item.qty);

  const controls = document.createElement("div");
  controls.className = "flex items-center gap-1.5";
  controls.append(
    iconButton(`Quitar uno de ${item.name}`, "ph-minus", () => changeQty(item.id, -1)),
    qty,
    iconButton(`Sumar uno de ${item.name}`, "ph-plus", () => changeQty(item.id, 1)),
    iconButton(`Eliminar ${item.name}`, "ph-trash", () => changeQty(item.id, -item.qty)),
  );

  li.append(info, controls);
  return li;
}

function render() {
  const list = Array.from(items.values());
  const count = list.reduce((n, i) => n + i.qty, 0);
  const total = list.reduce((n, i) => n + i.price * i.qty, 0);
  const empty = list.length === 0;

  save();
  $("cartCount").textContent = String(count);
  $("cartTotal").textContent = money(total);
  $("cartList").replaceChildren(...list.map(row));
  $("cartList").classList.toggle("hidden", empty);
  $("cartFooter").classList.toggle("hidden", empty);
  $("cartEmpty").classList.toggle("hidden", !empty || !$("cartDone").classList.contains("hidden"));
}

function setOpen(open: boolean) {
  const drawer = $("cartDrawer");
  drawer.dataset.open = String(open);
  drawer.inert = !open;
  drawer.setAttribute("aria-hidden", String(!open));
  $("cartBackdrop").dataset.open = String(open);
  if (open) $("cartClose").focus();
}

const isOpen = () => $("cartDrawer").dataset.open === "true";

function showDone(show: boolean) {
  $("cartDone").classList.toggle("hidden", !show);
  $("cartDone").classList.toggle("flex", show);
}

function checkout() {
  $("cartOrderId").textContent = `#MC-${Math.floor(1000 + Math.random() * 9000)}`;
  items.clear();
  render();
  showDone(true);
  $("cartEmpty").classList.add("hidden");
  confetti({ particleCount: 90, spread: 70, origin: { x: 0.85, y: 0.6 } });
}

export function openCart() {
  showDone(false);
  render();
  setOpen(true);
}

export function initCart() {
  load();
  document.querySelectorAll("[data-toggle-cart]").forEach((btn) =>
    btn.addEventListener("click", () => (isOpen() ? setOpen(false) : openCart())),
  );
  $("cartClose").addEventListener("click", () => setOpen(false));
  $("cartDoneClose").addEventListener("click", () => setOpen(false));
  $("cartBackdrop").addEventListener("click", () => setOpen(false));
  $("cartClear").addEventListener("click", () => {
    items.clear();
    render();
  });
  $("cartCheckout").addEventListener("click", checkout);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) setOpen(false);
  });
  render();
}
