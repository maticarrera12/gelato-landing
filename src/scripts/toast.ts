const HIDDEN = "-translate-y-24";
let timer: ReturnType<typeof setTimeout> | undefined;

export function showToast(text: string) {
  const toast = document.getElementById("toast");
  const msg = document.getElementById("toastMsg");
  if (!toast || !msg) return;

  msg.textContent = text;
  toast.classList.remove(HIDDEN);
  clearTimeout(timer);
  timer = setTimeout(() => toast.classList.add(HIDDEN), 2400);
}
