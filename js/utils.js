/* ==========================================================================
   워킹라이프 — 공용 유틸 (HTML 이스케이프, id 생성)
   ========================================================================== */

export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function uid() {
  return "ex-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}
