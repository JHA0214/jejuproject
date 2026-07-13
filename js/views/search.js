/* ==========================================================================
   워킹라이프 — 검색 결과 (키워드 또는 부위/세부부위)
   ========================================================================== */

import { getExercises, filterExercises } from "../store.js";
import { renderExerciseList } from "../exerciseCard.js";
import { esc } from "../utils.js";
import { go, getRoute } from "../router.js";

export function renderSearchResults() {
  const viewEl = document.getElementById("view");
  const { q, part, sub } = getRoute().params;
  let results, heading;

  if (sub) {
    results = getExercises().filter(function (e) { return e.subPart === sub; });
    heading = `${esc(part)} · ${esc(sub)} 운동`;
  } else if (part) {
    results = getExercises().filter(function (e) { return e.bodyPart === part; });
    heading = `${esc(part)} 운동`;
  } else {
    results = filterExercises(q);
    heading = `"${esc(q)}" 검색 결과`;
  }

  viewEl.innerHTML = `
    <button class="back-btn" id="back">← 뒤로</button>
    <h1 class="page-title">${heading}</h1>
    <p class="page-sub">${results.length}개의 운동을 찾았습니다.</p>
    <div id="results" class="exercise-list"></div>
  `;
  renderExerciseList(document.getElementById("results"), results);
  document.getElementById("back").addEventListener("click", function () {
    if (sub) go("subparts", { part: part });
    else go("home");
  });
}
