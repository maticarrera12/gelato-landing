let timer: ReturnType<typeof setTimeout> | undefined;

export function showToast(text: string) {
  const toast = document.getElementById("toast");
  const msg = document.getElementById("toastMsg");
  if (!toast || !msg) return;

  msg.textContent = text;
  toast.dataset.show = "true";
  clearTimeout(timer);
  timer = setTimeout(() => (toast.dataset.show = "false"), 2400);
}
