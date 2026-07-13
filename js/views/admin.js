/* ==========================================================================
   워킹라이프 — 관리자 페이지 (운동 목록 + 추가/수정/삭제)
   ========================================================================== */

import { getExercises, isAdmin, removeExercise, exDifficulty } from "../store.js";
import { youtubeId } from "../youtube.js";
import { starRatingHtml } from "../starRating.js";
import { esc } from "../utils.js";
import { go } from "../router.js";
import { openAdminLogin } from "../adminAuth.js";

export function renderAdmin() {
  if (!isAdmin()) { openAdminLogin(); return; }
  const viewEl = document.getElementById("view");
  const exercises = getExercises();
  viewEl.innerHTML = `
    <button class="back-btn" id="back">← 처음으로</button>
    <h1 class="page-title">관리자 페이지</h1>
    <p class="page-sub">운동을 생성·수정·삭제하고 유튜브 영상과 해시태그를 관리합니다.</p>

    <button class="btn btn-primary btn-block" id="addNew">＋ 새 운동 만들기</button>

    <h2 class="section-title">등록된 운동 (${exercises.length})</h2>
    <div id="adminList"></div>
  `;
  document.getElementById("back").addEventListener("click", function () { go("home"); });
  document.getElementById("addNew").addEventListener("click", function () { go("adminEdit", {}); });

  const listEl = document.getElementById("adminList");
  if (!exercises.length) {
    listEl.innerHTML = `<div class="empty">등록된 운동이 없습니다. 새 운동을 만들어 보세요.</div>`;
    return;
  }
  listEl.innerHTML = exercises.map(function (e) {
    const hasVid = youtubeId(e.youtubeUrl) ? "🎬 영상 있음" : "⚠️ 영상 없음";
    return `
      <div class="admin-item">
        <div>
          <div class="admin-item-title">${esc(e.title)}</div>
          ${starRatingHtml(exDifficulty(e))}
          <div class="admin-item-meta">${esc(e.bodyPart)} · ${esc(e.subPart)} · ${hasVid}</div>
        </div>
        <div class="admin-item-actions">
          <button class="btn btn-small" data-edit="${esc(e.id)}">수정</button>
          <button class="btn btn-small btn-danger" data-del="${esc(e.id)}">삭제</button>
        </div>
      </div>`;
  }).join("");
  listEl.querySelectorAll("[data-edit]").forEach(function (b) {
    b.addEventListener("click", function () { go("adminEdit", { id: b.dataset.edit }); });
  });
  listEl.querySelectorAll("[data-del]").forEach(function (b) {
    b.addEventListener("click", function () {
      const ex = exercises.find(function (x) { return x.id === b.dataset.del; });
      if (ex && confirm(`"${ex.title}" 운동을 삭제할까요?`)) {
        removeExercise(b.dataset.del);
        renderAdmin();
      }
    });
  });
}
