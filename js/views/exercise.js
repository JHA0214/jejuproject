/* ==========================================================================
   워킹라이프 — 운동 가이드 (상세) — 상단 유튜브 영상 + 하단 설명
   ========================================================================== */

import { findExercise, isAdmin, exInterval, exReps, exDifficulty } from "../store.js";
import { youtubeId } from "../youtube.js";
import { starRatingHtml } from "../starRating.js";
import { favBtnHtml, wireFavButton } from "../exerciseCard.js";
import { isCounting, startCount, stopCount } from "../voiceCount.js";
import { esc } from "../utils.js";
import { go, getRoute } from "../router.js";

export function renderExercise() {
  const viewEl = document.getElementById("view");
  const ex = findExercise(getRoute().params.id);
  if (!ex) { go("home"); return; }

  const vid = youtubeId(ex.youtubeUrl);
  const videoHtml = vid
    ? `<iframe src="https://www.youtube-nocookie.com/embed/${vid}?rel=0"
               title="${esc(ex.title)} 운동 영상"
               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
               allowfullscreen></iframe>`
    : `<div class="video-missing">🎬 영상 준비중입니다.<br>관리자 페이지에서 유튜브 링크를 등록해 주세요.</div>`;

  const tags = (ex.hashtags || [])
    .map(function (t) { return `<span class="tag">#${esc(t)}</span>`; }).join("");

  viewEl.innerHTML = `
    <button class="back-btn" id="back">← 뒤로</button>
    <div class="detail-title-row">
      <h1 class="page-title">${esc(ex.title)}</h1>
      ${favBtnHtml(ex.id).replace('class="fav-btn', 'class="fav-btn detail')}
    </div>
    ${starRatingHtml(exDifficulty(ex), "detail")}
    <p class="page-sub"><span class="badge">${esc(ex.bodyPart)} · ${esc(ex.subPart)}</span></p>

    <div class="video-wrap">${videoHtml}</div>

    <div class="count-panel">
      <button class="btn btn-primary btn-block btn-start" id="countBtn">▶ 운동 시작</button>
      <div class="count-display" id="countDisplay" aria-live="polite"></div>
      <div class="count-seconds" id="countSeconds" aria-live="polite"></div>
      <p class="count-hint">시작을 누르면 ${esc(exInterval(ex))}초에 한 번씩 ${esc(exReps(ex))}회까지 음성으로 세어 드립니다.</p>
    </div>

    <h2 class="section-title">운동 방법</h2>
    <div class="exercise-desc">${esc(ex.description)}</div>

    ${tags ? `<div class="exercise-tags-row">${tags}</div>` : ""}

    ${isAdmin() ? `
      <div class="actions-row">
        <button class="btn btn-primary" id="editThis">✏️ 이 운동 수정</button>
      </div>` : ""}
  `;
  document.getElementById("back").addEventListener("click", function () { history.length > 1 ? go("home") : go("home"); });

  wireFavButton(viewEl.querySelector(".fav-btn"));

  // 음성 카운트 시작/정지 토글
  const countBtn = document.getElementById("countBtn");
  const countDisplay = document.getElementById("countDisplay");
  const countSeconds = document.getElementById("countSeconds");
  countBtn.addEventListener("click", function () {
    if (isCounting()) {                     // 진행 중(준비/카운트)이면 정지
      stopCount();
      countBtn.textContent = "▶ 운동 시작";
      countDisplay.textContent = "";
      countSeconds.textContent = "";
    } else {                                 // 시작
      startCount(countDisplay, countSeconds, countBtn, exInterval(ex), exReps(ex));
    }
  });

  if (isAdmin()) {
    document.getElementById("editThis").addEventListener("click", function () {
      go("adminEdit", { id: ex.id });
    });
  }
}
