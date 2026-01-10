// HTML 工具：用于把“数据表内容”安全渲染到模板字符串里

export function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", " ");
}

