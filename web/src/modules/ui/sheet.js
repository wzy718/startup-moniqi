export function createSheet({ maskEl, titleEl, bodyEl, closeBtnEl }) {
  function open(title, bodyHtml) {
    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;
    maskEl.style.display = "flex";
    maskEl.setAttribute("aria-hidden", "false");
  }

  function close() {
    maskEl.style.display = "none";
    maskEl.setAttribute("aria-hidden", "true");
  }

  function bindGlobalEsc() {
    closeBtnEl.addEventListener("click", close);
    maskEl.addEventListener("click", (e) => {
      if (e.target === maskEl) close();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  return { open, close, bindGlobalEsc };
}

