/* ==========================================================================
   워킹라이프 — 홈 화면
   ========================================================================== */

import { getExercises, filterExercises, isFav } from "../store.js";
import { renderExerciseList } from "../exerciseCard.js";
import { go } from "../router.js";

export function renderHome() {
  const viewEl = document.getElementById("view");
  const exercises = getExercises();
  const favs = exercises.filter(function (e) { return isFav(e.id); });
  viewEl.innerHTML = `
    <h1 class="page-title">어떤 운동을 찾으세요?</h1>
    <p class="page-sub">동작이나 부위, 또는 키워드(#해시태그)로 찾아보세요.</p>

    <div class="search-box">
      <span class="search-icon" aria-hidden="true">🔍</span>
      <input id="homeSearch" class="search-input" type="search"
             placeholder="예) 걷기, 무릎, 균형" aria-label="운동 검색" />
    </div>
    <p class="search-hint">동작 이름 · 부위 · 해시태그로 검색됩니다.</p>

    <div id="favSection" ${favs.length ? "" : "hidden"}>
      <h2 class="section-title">⭐ 즐겨찾기</h2>
      <div id="favList" class="exercise-list"></div>
    </div>

    <h2 class="section-title">부위로 찾기</h2>
    <div class="bodypart-grid">
      <button class="bodypart-btn" data-part="상체">
        <span class="emoji" aria-hidden="true">💪</span><span>상체</span>
      </button>
      <button class="bodypart-btn" data-part="하체">
        <span class="emoji" aria-hidden="true">🦵</span><span>하체</span>
      </button>
    </div>

    <h2 class="section-title">전체 운동</h2>
    <div id="homeList" class="exercise-list"></div>
  `;

  renderExerciseList(document.getElementById("favList"), favs);
  renderExerciseList(document.getElementById("homeList"), exercises);

  const searchInput = document.getElementById("homeSearch");
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") doSearch(searchInput.value);
  });
  // 입력 즉시 필터 (홈 목록에서)
  searchInput.addEventListener("input", function () {
    const q = searchInput.value.trim();
    renderExerciseList(document.getElementById("homeList"), q ? filterExercises(q) : exercises);
  });

  viewEl.querySelectorAll(".bodypart-btn").forEach(function (b) {
    b.addEventListener("click", function () { go("subparts", { part: b.dataset.part }); });
  });
}

function doSearch(q) {
  q = (q || "").trim();
  if (!q) return;
  go("search", { q: q });
}
