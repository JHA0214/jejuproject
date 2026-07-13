/* ==========================================================================
   워킹라이프 — 상태 + localStorage/sessionStorage 저장소
   운동 목록 / 설정 / 즐겨찾기 / 관리자 세션을 관리하는 유일한 모듈
   ========================================================================== */

import { DEFAULT_EXERCISES, DEFAULT_COUNT_SETTINGS, SEED_VERSION } from "./data.js";

const STORE_EX = "wl_exercises";
const STORE_VER = "wl_seed_version";
const STORE_SETTINGS = "wl_settings";
const STORE_ADMIN = "wl_admin_session";
const STORE_FAVORITES = "wl_favorites";

// ---------- 저장/불러오기 ----------
function loadExercises() {
  try {
    const savedVer = localStorage.getItem(STORE_VER);
    const raw = localStorage.getItem(STORE_EX);
    // 저장된 데이터가 있고 기본 데이터 버전이 같을 때만 그대로 사용
    if (raw && String(savedVer) === String(SEED_VERSION)) return JSON.parse(raw);
  } catch (e) { /* 무시 */ }
  // 최초 실행 또는 기본 데이터 버전 변경: 기본 데이터로 재설정
  localStorage.setItem(STORE_EX, JSON.stringify(DEFAULT_EXERCISES));
  localStorage.setItem(STORE_VER, String(SEED_VERSION));
  return JSON.parse(JSON.stringify(DEFAULT_EXERCISES));
}
function saveExercises() {
  localStorage.setItem(STORE_EX, JSON.stringify(exercises));
}
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORE_SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* 무시 */ }
  return { fontScale: 1, highContrast: false };
}
function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORE_FAVORITES);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* 무시 */ }
  return [];
}
function saveFavorites() {
  localStorage.setItem(STORE_FAVORITES, JSON.stringify(favorites));
}

// ---------- 상태 ----------
let exercises = loadExercises();
let settings = loadSettings();
let favorites = loadFavorites();       // 즐겨찾기한 운동 id 목록
let adminFlag = sessionStorage.getItem(STORE_ADMIN) === "1";

// ---------- 운동 데이터 ----------
export function getExercises() {
  return exercises;
}
export function findExercise(id) {
  return exercises.find(function (e) { return e.id === id; });
}
export function addExercise(data) {
  exercises.push(data);
  saveExercises();
}
export function updateExercise(id, data) {
  const ex = findExercise(id);
  if (ex) { for (const k in data) ex[k] = data[k]; }
  saveExercises();
}
export function removeExercise(id) {
  exercises = exercises.filter(function (x) { return x.id !== id; });
  saveExercises();
  if (isFav(id)) toggleFav(id);
}
export function filterExercises(q) {
  q = q.trim().toLowerCase().replace(/^#/, "");
  if (!q) return exercises.slice();
  return exercises.filter(function (e) {
    const hay = [
      e.title, e.bodyPart, e.subPart, e.description,
      (e.hashtags || []).join(" "),
    ].join(" ").toLowerCase();
    return hay.indexOf(q) !== -1;
  });
}

// 운동별 음성 카운트 설정 읽기 (값이 없으면 기본값 사용)
export function exInterval(ex) {
  return Number(ex && ex.intervalSec) > 0 ? Number(ex.intervalSec) : DEFAULT_COUNT_SETTINGS.intervalSec;
}
export function exReps(ex) {
  return Number(ex && ex.reps) > 0 ? Number(ex.reps) : DEFAULT_COUNT_SETTINGS.reps;
}
// 운동 난이도 읽기 (1.0~5.0, 0.5 단위 / 값이 없거나 잘못되면 기본 3.0)
export function exDifficulty(ex) {
  const n = Number(ex && ex.difficulty);
  if (!(n >= 1 && n <= 5)) return 3;
  return Math.round(n * 2) / 2;
}

// ---------- 즐겨찾기 ----------
export function isFav(id) {
  return favorites.indexOf(id) !== -1;
}
export function toggleFav(id) {
  const i = favorites.indexOf(id);
  if (i === -1) favorites.push(id); else favorites.splice(i, 1);
  saveFavorites();
}

// ---------- 설정 ----------
export function getSettings() {
  return settings;
}
export function saveSettings() {
  localStorage.setItem(STORE_SETTINGS, JSON.stringify(settings));
}
// ---------- 접근성 설정 적용 ----------
export function applySettings() {
  document.documentElement.style.setProperty("--font-scale", settings.fontScale);
  document.body.classList.toggle("high-contrast", !!settings.highContrast);
}

// ---------- 관리자 세션 ----------
export function isAdmin() {
  return adminFlag;
}
export function setAdmin(value) {
  adminFlag = value;
  if (value) sessionStorage.setItem(STORE_ADMIN, "1");
  else sessionStorage.removeItem(STORE_ADMIN);
}
