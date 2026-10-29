export function initNav() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mobileNav");
  if (!toggle || !nav) return;

  const setOpen = (open: boolean) => {
    nav.dataset.open = String(open);
    nav.inert = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    toggle.firstElementChild?.classList.toggle("ph-list", !open);
    toggle.firstElementChild?.classList.toggle("ph-x", open);
  };

  toggle.addEventListener("click", () => setOpen(nav.dataset.open !== "true"));
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.dataset.open === "true") setOpen(false);
  });
  // Reaching the desktop breakpoint hides the panel, so reset its state too
  window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => e.matches && setOpen(false));
}
