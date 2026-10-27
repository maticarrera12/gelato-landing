import confetti from "canvas-confetti";
import { addToCart } from "./cart";
import { showToast } from "./toast";

const ACTIVE = ["bg-candy-mango", "shadow-pop"];
const IDLE = "bg-white";

function filter(category: string, active: HTMLElement) {
  document.querySelectorAll<HTMLElement>("[data-filter]").forEach((btn) => {
    const on = btn === active;
    btn.classList.toggle(IDLE, !on);
    ACTIVE.forEach((c) => btn.classList.toggle(c, on));
  });

  document.querySelectorAll<HTMLElement>(".flavor-card").forEach((card) => {
    const visible = category === "todos" || card.dataset.cat === category;
    card.style.display = visible ? "flex" : "none";
  });
}

export function initCatalog() {
  document.querySelectorAll<HTMLElement>("[data-filter]").forEach((btn) =>
    btn.addEventListener("click", () => filter(btn.dataset.filter!, btn)),
  );

  document.querySelectorAll<HTMLElement>("[data-quick-add]").forEach((btn) =>
    btn.addEventListener("click", () => {
      addToCart();
      showToast(`Agregaste 1x ${btn.dataset.quickAdd} al carrito`);
    }),
  );

  document.querySelectorAll<HTMLElement>("[data-mood]").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.getElementById("moodTitle")!.textContent = btn.dataset.moodTitle!;
      document.getElementById("moodDesc")!.textContent = btn.dataset.moodDesc!;
      confetti({ particleCount: 20, spread: 50, origin: { y: 0.8 } });
    }),
  );
}
