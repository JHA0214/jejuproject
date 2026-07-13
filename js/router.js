/* ==========================================================================
   워킹라이프 — 라우팅 (화면 전환)
   각 화면(view) 모듈이 registerScreen으로 자신을 등록하면,
   go(name, params) 호출 시 해당 화면의 렌더 함수가 실행됩니다.
   ========================================================================== */

import { stopCount } from "./voiceCount.js";
import { isAdmin } from "./store.js";

let route = { name: "home", params: {} };
const screens = {};

export function registerScreen(name, renderFn) {
  screens[name] = renderFn;
}

export function getRoute() {
  return route;
}

export function go(name, params) {
  stopCount();                 // 화면 이동 시 진행 중인 음성 카운트 중지
  route = { name: name, params: params || {} };
  window.scrollTo(0, 0);
  render();
}

export function render() {
  updateAdminBanner();
  const fn = screens[route.name] || screens.home;
  fn();
}

function updateAdminBanner() {
  const banner = document.getElementById("adminBanner");
  banner.hidden = !isAdmin();
}
