import confetti from "canvas-confetti";
import { addToCart } from "./cart";
import { EASE_OUT, prefersReducedMotion } from "./motion";
import { markRevealed } from "./reveal";
import { showToast } from "./toast";

const ACTIVE = ["bg-candy-mango", "shadow-pop"];
const IDLE = "bg-white";

const running: Animation[] = [];

function filter(category: string, active: HTMLElement) {
  // Interrupting a filter cancels the previous entrance instead of stacking
  running.splice(0).forEach((a) => a.cancel());
  const reduce = prefersReducedMotion();
  document.querySelectorAll<HTMLElement>("[data-filter]").forEach((btn) => {
    const on = btn === active;
    btn.classList.toggle(IDLE, !on);
    ACTIVE.forEach((c) => btn.classList.toggle(c, on));
  });

  let order = 0;
  document.querySelectorAll<HTMLElement>(".flavor-card").forEach((card) => {
    const visible = category === "todos" || card.dataset.cat === category;
    card.style.display = visible ? "flex" : "none";
    if (!visible) return;
    markRevealed(card);
    // Cards that remain re-enter with a short stagger so the grid never just teleports
    running.push(
      card.animate(
        [
          { opacity: 0, transform: reduce ? "none" : "translateY(10px) scale(0.98)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 260, delay: order++ * 45, easing: EASE_OUT, fill: "backwards" },
      ),
    );
  });
}

export function initCatalog() {
  document.querySelectorAll<HTMLElement>("[data-filter]").forEach((btn) =>
    btn.addEventListener("click", () => filter(btn.dataset.filter!, btn)),
  );

  document.querySelectorAll<HTMLElement>("[data-quick-add]").forEach((btn) =>
    btn.addEventListener("click", () => {
      addToCart({ id: `flavor:${btn.dataset.quickAdd}`, name: btn.dataset.quickAdd!, price: Number(btn.dataset.price) });
      showToast(`Agregaste 1x ${btn.dataset.quickAdd} al carrito`);
    }),
  );

  document.querySelectorAll<HTMLElement>("[data-mood]").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.getElementById("moodTitle")!.textContent = btn.dataset.moodTitle!;
      document.getElementById("moodDesc")!.textContent = btn.dataset.moodDesc!;
      // Blur bridges old and new text so it reads as one object changing, not two overlapping
      document.getElementById("moodResult")?.animate(
        [
          { opacity: 0, transform: prefersReducedMotion() ? "none" : "translateY(6px)", filter: "blur(3px)" },
          { opacity: 1, transform: "none", filter: "blur(0)" },
        ],
        { duration: 260, easing: EASE_OUT },
      );
      confetti({ particleCount: 20, spread: 50, origin: { y: 0.8 } });
    }),
  );
}
