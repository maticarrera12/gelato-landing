import { showToast } from "./toast";

async function copyHex(hex: string) {
  try {
    await navigator.clipboard.writeText(hex);
    showToast(`Copiado: ${hex}`);
  } catch {
    showToast(hex);
  }
}

export function initPalette() {
  const drawer = document.getElementById("paletteDrawer");

  document
    .querySelectorAll("[data-toggle-palette]")
    .forEach((btn) => btn.addEventListener("click", () => drawer?.classList.toggle("hidden")));

  document.querySelectorAll<HTMLElement>("[data-copy-hex]").forEach((el) =>
    el.addEventListener("click", () => copyHex(el.dataset.copyHex!)),
  );
}
