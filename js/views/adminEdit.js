/* ==========================================================================
   워킹라이프 — 관리자 편집/생성 폼
   ========================================================================== */

import { BODY_PARTS, DEFAULT_COUNT_SETTINGS } from "../data.js";
import { findExercise, addExercise, updateExercise, isAdmin, exInterval, exReps, exDifficulty } from "../store.js";
import { starRatingHtml } from "../starRating.js";
import { esc, uid } from "../utils.js";
import { go, getRoute } from "../router.js";
import { openAdminLogin } from "../adminAuth.js";

export function renderAdminEdit() {
  if (!isAdmin()) { openAdminLogin(); return; }
  const viewEl = document.getElementById("view");
  const editing = getRoute().params.id
    ? findExercise(getRoute().params.id)
    : null;
  const draft = editing
    ? JSON.parse(JSON.stringify(editing))
    : { id: null, title: "", bodyPart: "상체", subPart: "", youtubeUrl: "", description: "", hashtags: [],
        intervalSec: DEFAULT_COUNT_SETTINGS.intervalSec, reps: DEFAULT_COUNT_SETTINGS.reps, difficulty: 3 };

  viewEl.innerHTML = `
    <button class="back-btn" id="back">← 관리자 페이지</button>
    <h1 class="page-title">${editing ? "운동 수정" : "새 운동 만들기"}</h1>

    <div class="field">
      <label for="fTitle">운동 이름</label>
      <input id="fTitle" type="text" value="${esc(draft.title)}" placeholder="예) 제자리 걷기 운동" />
    </div>

    <div class="field">
      <label for="fBody">부위 (상체/하체)</label>
      <select id="fBody">
        ${Object.keys(BODY_PARTS).map(function (p) {
          return `<option value="${p}" ${draft.bodyPart === p ? "selected" : ""}>${p}</option>`;
        }).join("")}
      </select>
    </div>

    <div class="field">
      <label for="fSub">세부 부위</label>
      <select id="fSub"></select>
    </div>

    <div class="field">
      <label for="fDifficulty">운동 난이도</label>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <input id="fDifficulty" type="number" min="1" max="5" step="0.5"
               value="${esc(exDifficulty(draft))}" style="max-width:110px;" />
        <span id="difficultyPreview"></span>
      </div>
      <p class="field-hint">1.0(매우 쉬움) ~ 5.0(매우 어려움), 0.5 단위로 설정하세요.</p>
    </div>

    <div class="field">
      <label for="fUrl">유튜브 링크</label>
      <input id="fUrl" type="text" value="${esc(draft.youtubeUrl)}"
             placeholder="https://www.youtube.com/watch?v=..." />
      <p class="field-hint">유튜브 주소를 붙여넣으면 앱 안에서 바로 재생됩니다.</p>
    </div>

    <div class="field">
      <label for="fDesc">운동 설명</label>
      <textarea id="fDesc" placeholder="운동 방법을 순서대로 적어주세요.">${esc(draft.description)}</textarea>
    </div>

    <div class="field">
      <label>음성 카운트 설정</label>
      <p class="field-hint" style="margin:0 0 10px;">이 운동의 “운동 시작” 버튼을 눌렀을 때 음성으로 세는 간격과 횟수입니다.</p>
      <div class="count-fields">
        <div>
          <label for="fInterval" style="font-size:0.9em;">간격 (초)</label>
          <input id="fInterval" type="number" min="1" max="60" step="1" value="${esc(exInterval(draft))}" />
        </div>
        <div>
          <label for="fReps" style="font-size:0.9em;">횟수 (회)</label>
          <input id="fReps" type="number" min="1" max="99" step="1" value="${esc(exReps(draft))}" />
        </div>
      </div>
    </div>

    <div class="field">
      <label for="fTag">해시태그 (키워드 검색용)</label>
      <div style="display:flex;gap:8px;">
        <input id="fTag" type="text" placeholder="예) 균형  (입력 후 추가)" />
        <button class="btn" id="addTag" type="button">추가</button>
      </div>
      <div class="chip-list" id="chipList"></div>
      <p class="field-hint">여기 등록한 단어로 검색됩니다.</p>
    </div>

    <div class="actions-row">
      <button class="btn btn-primary" id="save">💾 저장</button>
      <button class="btn" id="cancel">취소</button>
    </div>
  `;

  const subSel = document.getElementById("fSub");
  const bodySel = document.getElementById("fBody");
  function fillSubs() {
    const parts = BODY_PARTS[bodySel.value] || [];
    subSel.innerHTML = parts.map(function (s) {
      return `<option value="${s}" ${draft.subPart === s ? "selected" : ""}>${s}</option>`;
    }).join("");
    // 목록에 draft.subPart가 없으면 첫번째로
    if (parts.indexOf(draft.subPart) === -1) draft.subPart = parts[0];
  }
  fillSubs();
  bodySel.addEventListener("change", function () { draft.subPart = ""; fillSubs(); });

  // 난이도 실시간 별점 미리보기
  const diffInput = document.getElementById("fDifficulty");
  const diffPreview = document.getElementById("difficultyPreview");
  function renderDiffPreview() {
    diffPreview.innerHTML = starRatingHtml(exDifficulty({ difficulty: diffInput.value }));
  }
  renderDiffPreview();
  diffInput.addEventListener("input", renderDiffPreview);

  // 해시태그 칩
  function renderChips() {
    const cl = document.getElementById("chipList");
    cl.innerHTML = draft.hashtags.map(function (t, i) {
      return `<span class="chip">#${esc(t)} <button type="button" data-i="${i}" aria-label="삭제">✕</button></span>`;
    }).join("");
    cl.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        draft.hashtags.splice(parseInt(b.dataset.i, 10), 1);
        renderChips();
      });
    });
  }
  renderChips();
  function addTag() {
    const inp = document.getElementById("fTag");
    const v = inp.value.trim().replace(/^#/, "");
    if (v && draft.hashtags.indexOf(v) === -1) {
      draft.hashtags.push(v);
      renderChips();
    }
    inp.value = "";
    inp.focus();
  }
  document.getElementById("addTag").addEventListener("click", addTag);
  document.getElementById("fTag").addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  });

  document.getElementById("back").addEventListener("click", function () { go("admin"); });
  document.getElementById("cancel").addEventListener("click", function () { go("admin"); });

  document.getElementById("save").addEventListener("click", function () {
    const title = document.getElementById("fTitle").value.trim();
    if (!title) { alert("운동 이름을 입력해 주세요."); return; }
    const interval = parseInt(document.getElementById("fInterval").value, 10);
    const reps = parseInt(document.getElementById("fReps").value, 10);
    if (!(interval >= 1 && interval <= 60)) { alert("음성 카운트 간격은 1~60초 사이로 입력해 주세요."); return; }
    if (!(reps >= 1 && reps <= 99)) { alert("음성 카운트 횟수는 1~99회 사이로 입력해 주세요."); return; }
    const difficultyRaw = parseFloat(diffInput.value);
    if (!(difficultyRaw >= 1 && difficultyRaw <= 5)) { alert("운동 난이도는 1.0~5.0 사이로 입력해 주세요."); return; }
    draft.title = title;
    draft.bodyPart = bodySel.value;
    draft.subPart = subSel.value;
    draft.youtubeUrl = document.getElementById("fUrl").value.trim();
    draft.description = document.getElementById("fDesc").value;
    draft.intervalSec = interval;
    draft.reps = reps;
    draft.difficulty = Math.round(difficultyRaw * 2) / 2;

    if (editing) {
      updateExercise(editing.id, draft);
    } else {
      draft.id = uid();
      addExercise(draft);
    }
    alert("저장되었습니다.");
    go("admin");
  });
}
