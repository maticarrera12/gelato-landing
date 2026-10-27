import { EASE_OUT, prefersReducedMotion } from "./motion";

let cartTotal = 0;

export function addToCart() {
  cartTotal++;
  const counter = document.getElementById("cartCount");
  if (!counter) return;
  counter.textContent = String(cartTotal);

  // Confirms the add without stealing attention
  if (prefersReducedMotion()) return;
  counter.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.35)", offset: 0.4 }, { transform: "scale(1)" }],
    { duration: 280, easing: EASE_OUT },
  );
}
