/* ==========================================================================
   워킹라이프 — 관리자 로그인 모달
   ========================================================================== */

import { ADMIN_PASSWORD } from "./data.js";
import { isAdmin, setAdmin } from "./store.js";
import { go } from "./router.js";

export function openAdminLogin() {
  if (isAdmin()) { go("admin"); return; }
  const overlay = document.getElementById("modalOverlay");
  document.getElementById("modalTitle").textContent = "관리자 로그인";
  document.getElementById("modalBody").innerHTML = `
    <div class="field">
      <label for="pw">비밀번호</label>
      <input type="password" id="pw" inputmode="numeric" autocomplete="off"
             placeholder="비밀번호 입력" />
      <p id="pwError" class="pw-error" hidden>비밀번호가 올바르지 않습니다.</p>
    </div>
    <div class="actions-row" style="margin-top:8px;">
      <button class="btn btn-primary btn-block" id="pwOk">로그인</button>
      <button class="btn btn-block" id="pwCancel">취소</button>
    </div>
  `;
  overlay.hidden = false;
  const pw = document.getElementById("pw");
  pw.focus();

  function attempt() {
    if (pw.value === ADMIN_PASSWORD) {
      setAdmin(true);
      closeModal();
      go("admin");
    } else {
      document.getElementById("pwError").hidden = false;
      pw.value = "";
      pw.focus();
    }
  }
  document.getElementById("pwOk").addEventListener("click", attempt);
  pw.addEventListener("keydown", function (e) { if (e.key === "Enter") attempt(); });
  document.getElementById("pwCancel").addEventListener("click", closeModal);
}

export function closeModal() {
  document.getElementById("modalOverlay").hidden = true;
  document.getElementById("modalBody").innerHTML = "";
}
