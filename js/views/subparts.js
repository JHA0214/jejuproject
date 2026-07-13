/* ==========================================================================
   워킹라이프 — 세부 부위 선택 화면
   ========================================================================== */

import { BODY_PARTS } from "../data.js";
import { esc } from "../utils.js";
import { go, getRoute } from "../router.js";

export function renderSubparts() {
  const viewEl = document.getElementById("view");
  const part = getRoute().params.part;
  const subs = BODY_PARTS[part] || [];
  viewEl.innerHTML = `
    <button class="back-btn" id="back">← 처음으로</button>
    <h1 class="page-title">${esc(part)} · 세부 부위</h1>
    <p class="page-sub">강화하고 싶은 부위를 선택하세요.</p>
    <div class="subpart-grid">
      ${subs.map(function (s) {
        return `<button class="subpart-btn" data-sub="${esc(s)}">${esc(s)}</button>`;
      }).join("")}
    </div>
  `;
  document.getElementById("back").addEventListener("click", function () { go("home"); });
  viewEl.querySelectorAll(".subpart-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      go("search", { part: part, sub: b.dataset.sub });
    });
  });
}
