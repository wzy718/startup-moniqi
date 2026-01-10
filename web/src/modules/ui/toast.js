export function createToast(toastEl) {
  function show(message) {
    toastEl.textContent = message;
    toastEl.classList.add("on");
    clearTimeout(show._t);
    show._t = setTimeout(() => toastEl.classList.remove("on"), 1200);
  }

  return { show };
}

