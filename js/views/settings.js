/* ==========================================================================
   워킹라이프 — 설정 (글자 크기 / 고대비)
   ========================================================================== */

import { getSettings, saveSettings, applySettings } from "../store.js";
import { go } from "../router.js";

export function renderSettings() {
  const viewEl = document.getElementById("view");
  const settings = getSettings();
  viewEl.innerHTML = `
    <button class="back-btn" id="back">← 뒤로</button>
    <h1 class="page-title">설정</h1>
    <p class="page-sub">보기 편하도록 화면을 조절하세요.</p>

    <div class="setting-group">
      <div class="setting-label">글자 크기</div>
      <div class="font-choices">
        <button class="font-choice" data-scale="1">보통</button>
        <button class="font-choice" data-scale="1.25">크게</button>
        <button class="font-choice" data-scale="1.55">아주 크게</button>
      </div>
    </div>

    <div class="setting-group">
      <div class="toggle-row">
        <div>
          <div class="setting-label" style="margin-bottom:4px;">고대비 모드</div>
          <div style="color:var(--text-soft);font-size:0.85em;">검은 배경에 밝은 글씨로 또렷하게 봅니다.</div>
        </div>
        <label class="switch">
          <input type="checkbox" id="hcToggle" ${settings.highContrast ? "checked" : ""} />
          <span class="slider"></span>
        </label>
      </div>
    </div>
  `;
  document.getElementById("back").addEventListener("click", function () { go("home"); });

  const choices = viewEl.querySelectorAll(".font-choice");
  function markActive() {
    choices.forEach(function (c) {
      c.classList.toggle("active", parseFloat(c.dataset.scale) === settings.fontScale);
    });
  }
  markActive();
  choices.forEach(function (c) {
    c.addEventListener("click", function () {
      settings.fontScale = parseFloat(c.dataset.scale);
      saveSettings(); applySettings(); markActive();
    });
  });
  document.getElementById("hcToggle").addEventListener("change", function (e) {
    settings.highContrast = e.target.checked;
    saveSettings(); applySettings();
  });
}
