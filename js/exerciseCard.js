/* ==========================================================================
   워킹라이프 — 운동 카드 목록 (홈/검색/즐겨찾기 공용) + 즐겨찾기 별표 버튼
   ========================================================================== */

import { esc } from "./utils.js";
import { getExercises, exDifficulty, isFav, toggleFav } from "./store.js";
import { thumbUrl } from "./youtube.js";
import { starRatingHtml } from "./starRating.js";
import { go } from "./router.js";

// ---------- 즐겨찾기 별표 버튼 ----------
export function favBtnHtml(id) {
  const active = isFav(id);
  return `<button type="button" class="fav-btn${active ? " active" : ""}" data-fav="${esc(id)}"
            aria-pressed="${active ? "true" : "false"}" aria-label="${active ? "즐겨찾기 해제" : "즐겨찾기 추가"}">${active ? "★" : "☆"}</button>`;
}
function updateFavButton(btn) {
  const active = isFav(btn.dataset.fav);
  btn.classList.toggle("active", active);
  btn.textContent = active ? "★" : "☆";
  btn.setAttribute("aria-pressed", active ? "true" : "false");
  btn.setAttribute("aria-label", active ? "즐겨찾기 해제" : "즐겨찾기 추가");
}
export function wireFavButton(btn) {
  btn.addEventListener("click", function (ev) {
    ev.stopPropagation();
    const id = btn.dataset.fav;
    toggleFav(id);
    // 같은 운동이 홈 화면의 "즐겨찾기"와 "전체 운동" 목록에 동시에 나타날 수 있으므로
    // 화면에 보이는 같은 id의 별 버튼을 전부 갱신한다.
    document.querySelectorAll('.fav-btn[data-fav="' + CSS.escape(id) + '"]').forEach(updateFavButton);
    syncFavSection();          // 홈 화면이면 즐겨찾기 섹션 목록(추가/삭제)도 갱신
  });
}
// 홈 화면의 "즐겨찾기" 섹션을 최신 상태로 다시 그림 (다른 화면이면 아무 것도 하지 않음)
function syncFavSection() {
  const favSection = document.getElementById("favSection");
  if (!favSection) return;
  const favs = getExercises().filter(function (e) { return isFav(e.id); });
  favSection.hidden = !favs.length;
  renderExerciseList(document.getElementById("favList"), favs);
}

// ---------- 운동 카드 목록 렌더 ----------
export function renderExerciseList(container, list) {
  if (!list.length) {
    container.innerHTML = `<div class="empty">조건에 맞는 운동이 없습니다.<br>다른 키워드로 검색해 보세요.</div>`;
    return;
  }
  container.innerHTML = list.map(function (e) {
    const thumb = thumbUrl(e.youtubeUrl);
    const thumbHtml = thumb
      ? `<img class="exercise-thumb" src="${esc(thumb)}" alt="" />`
      : `<div class="exercise-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.6em;">🎬</div>`;
    const tags = (e.hashtags || [])
      .map(function (t) { return `<span class="tag">#${esc(t)}</span>`; }).join("");
    return `
      <div class="exercise-card" data-id="${esc(e.id)}" role="button" tabindex="0">
        ${thumbHtml}
        <div class="exercise-card-body">
          <p class="exercise-card-title">${esc(e.title)}</p>
          ${starRatingHtml(exDifficulty(e))}
          <span class="badge">${esc(e.bodyPart)} · ${esc(e.subPart)}</span>
          <div class="exercise-card-tags" style="margin-top:8px;">${tags}</div>
        </div>
        ${favBtnHtml(e.id)}
        <span class="go" aria-hidden="true">›</span>
      </div>`;
  }).join("");
  container.querySelectorAll(".exercise-card").forEach(function (c) {
    function openIt() { go("exercise", { id: c.dataset.id }); }
    c.addEventListener("click", function (ev) {
      if (ev.target.closest(".fav-btn")) return;
      openIt();
    });
    c.addEventListener("keydown", function (ev) {
      if (ev.target.closest(".fav-btn")) return;
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openIt(); }
    });
  });
  container.querySelectorAll(".fav-btn").forEach(wireFavButton);
}
