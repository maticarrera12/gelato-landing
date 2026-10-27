import { showToast } from "./toast";

async function copyHex(hex: string) {
  try {
    await navigator.clipboard.writeText(hex);
    showToast(`Copiado: ${hex}`);
  } catch {
    showToast(hex);
  }
}

function toggleDrawer(drawer: HTMLElement | null) {
  if (!drawer) return;
  const open = drawer.dataset.open !== "true";
  drawer.dataset.open = String(open);
  drawer.inert = !open;
  drawer.setAttribute("aria-hidden", String(!open));
}

export function initPalette() {
  const drawer = document.getElementById("paletteDrawer");

  document
    .querySelectorAll("[data-toggle-palette]")
    .forEach((btn) => btn.addEventListener("click", () => toggleDrawer(drawer)));

  document.querySelectorAll<HTMLElement>("[data-copy-hex]").forEach((el) =>
    el.addEventListener("click", () => copyHex(el.dataset.copyHex!)),
  );
}
