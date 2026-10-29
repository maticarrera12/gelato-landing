import { addToCart } from "./cart";
import { showToast } from "./toast";

const WHATSAPP = "5491100000000";
const wa = (text: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

export function initOrder() {
  const picker = document.getElementById("formatPicker");
  const cta = document.getElementById("orderWhatsapp") as HTMLAnchorElement | null;
  const options = picker ? Array.from(picker.querySelectorAll<HTMLButtonElement>("[data-format]")) : [];

  const flavorBtns = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-flavor]"));
  const counter = document.getElementById("flavorCounter");
  const chosen = new Set<string>();
  let selected: HTMLButtonElement | undefined;
  const maxFlavors = () => Number(selected?.dataset.max ?? 0);

  const syncFlavors = () => {
    flavorBtns.forEach((b) => b.setAttribute("aria-pressed", String(chosen.has(b.dataset.flavor!))));
    if (counter) counter.textContent = `${chosen.size}/${maxFlavors()}`;
    if (cta && selected) {
      const flavors = chosen.size ? ` de ${[...chosen].join(", ")}` : "";
      cta.href = wa(`Hola MIMI & CO.! Quiero pedir ${selected.dataset.label}${flavors}`);
    }
  };

  flavorBtns.forEach((b) =>
    b.addEventListener("click", () => {
      const name = b.dataset.flavor!;
      if (chosen.has(name)) chosen.delete(name);
      else if (chosen.size >= maxFlavors()) return showToast(`Este formato admite hasta ${maxFlavors()} sabores`);
      else chosen.add(name);
      syncFlavors();
    }),
  );

  const select = (btn: HTMLButtonElement) => {
    selected = btn;
    // A smaller size keeps only the first flavors that still fit
    [...chosen].slice(maxFlavors()).forEach((n) => chosen.delete(n));
    syncFlavors();
    options.forEach((o) => o.setAttribute("aria-checked", String(o === btn)));
  };

  options.forEach((o) => o.addEventListener("click", () => select(o)));
  if (options[0]) select(options[0]);

  document.getElementById("orderAdd")?.addEventListener("click", () => {
    if (!selected) return;
    if (chosen.size === 0) return showToast("¡Elegí al menos un sabor!");
    const { format, label, price } = selected.dataset;
    const flavors = [...chosen];
    addToCart({
      id: `format:${format}:${[...flavors].sort().join("|")}`,
      name: `${label}: ${flavors.join(" + ")}`,
      price: Number(price),
    });
    showToast(`Agregaste ${label} al pedido`);
    chosen.clear();
    syncFlavors();
  });

  const form = document.getElementById("eventForm") as HTMLFormElement | null;
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const text = `Hola MIMI & CO.! Soy ${d.get("name")}. Quiero un presupuesto para un evento (${d.get("type")}) el ${d.get("date")}, ${d.get("guests")} invitados.`;
    window.open(wa(text), "_blank", "noopener");
    showToast("Te abrimos WhatsApp con tu consulta");
  });
}
