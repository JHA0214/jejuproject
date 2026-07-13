/* ==========================================================================
   워킹라이프 — 진입점
   화면 모듈을 라우터에 등록하고, 상단 헤더 버튼 이벤트를 연결한 뒤 첫 화면을 그립니다.
   ========================================================================== */

import { applySettings, setAdmin } from "./store.js";
import { go, render, registerScreen } from "./router.js";
import { openAdminLogin, closeModal } from "./adminAuth.js";

import { renderHome } from "./views/home.js";
import { renderSubparts } from "./views/subparts.js";
import { renderSearchResults } from "./views/search.js";
import { renderExercise } from "./views/exercise.js";
import { renderSettings } from "./views/settings.js";
import { renderAdmin } from "./views/admin.js";
import { renderAdminEdit } from "./views/adminEdit.js";

registerScreen("home", renderHome);
registerScreen("subparts", renderSubparts);
registerScreen("search", renderSearchResults);
registerScreen("exercise", renderExercise);
registerScreen("settings", renderSettings);
registerScreen("admin", renderAdmin);
registerScreen("adminEdit", renderAdminEdit);

// ---------- 헤더 버튼 이벤트 ----------
document.getElementById("btnHome").addEventListener("click", function () { go("home"); });
document.getElementById("btnSettings").addEventListener("click", function () { go("settings"); });
document.getElementById("btnAdminLogin").addEventListener("click", openAdminLogin);
document.getElementById("btnGoAdmin").addEventListener("click", function () { go("admin"); });
document.getElementById("btnLogout").addEventListener("click", function () {
  setAdmin(false);
  go("home");
});
document.getElementById("modalOverlay").addEventListener("click", function (e) {
  if (e.target.id === "modalOverlay") closeModal();
});

// ---------- 시작 ----------
applySettings();
render();
