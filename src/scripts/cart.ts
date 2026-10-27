let cartTotal = 0;

export function addToCart() {
  cartTotal++;
  const counter = document.getElementById("cartCount");
  if (counter) counter.textContent = String(cartTotal);
}
