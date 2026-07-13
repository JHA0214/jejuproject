/* ==========================================================================
   워킹라이프 — 음성 카운트 (운동 시작 시 "하나, 둘, 셋..." 음성 안내)
   ========================================================================== */

// 한글 고유수(하나, 둘, 셋...)로 변환 — 어르신이 듣기 자연스럽도록
const NATIVE_ONES = ["", "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉"];
const NATIVE_TENS = ["", "열", "스물", "서른", "마흔", "쉰", "예순", "일흔", "여든", "아흔"];

let countTimer = null;       // 음성 카운트 진행용 타이머
let countDoneTimer = null;   // 카운트 완료 안내용 타이머
let countSecTimer = null;    // 경과 시간(초) 표시용 타이머
let countPrepTimer = null;   // 시작 전 준비(안내+카운트다운) 타이머

function koreanNativeCount(n) {
  if (n <= 0 || n > 99) return String(n);
  return (NATIVE_TENS[Math.floor(n / 10)] || "") + (NATIVE_ONES[n % 10] || "");
}

function speak(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 0.95;
    window.speechSynthesis.cancel();   // 이전 발화 중단 후 재생
    window.speechSynthesis.speak(u);
  } catch (e) { /* 무시 */ }
}

export function stopCount() {
  if (countTimer) { clearInterval(countTimer); countTimer = null; }
  if (countDoneTimer) { clearTimeout(countDoneTimer); countDoneTimer = null; }
  if (countSecTimer) { clearInterval(countSecTimer); countSecTimer = null; }
  if (countPrepTimer) { clearTimeout(countPrepTimer); countPrepTimer = null; }
  try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch (e) { /* 무시 */ }
}

// 카운트(준비 안내 또는 실제 카운트)가 진행 중인지
export function isCounting() {
  return !!(countTimer || countPrepTimer);
}

// 시작 버튼 → "운동을 시작합니다" 안내 + 3초 카운트다운 후 음성 카운트
export function startCount(displayEl, secEl, btnEl, intervalSec, total) {
  stopCount();
  const intervalMs = Math.max(0.5, intervalSec) * 1000;
  btnEl.textContent = "■ 정지";
  secEl.textContent = "";

  // ----- 준비 단계: 안내 후 3 → 2 → 1 카운트다운 -----
  speak("운동을 시작합니다.");
  displayEl.textContent = "곧 시작합니다";
  let pre = 3;
  // 안내 음성이 끝날 시간을 준 뒤 카운트다운 시작
  countPrepTimer = setTimeout(function preTick() {
    displayEl.textContent = String(pre);
    speak(koreanNativeCount(pre));
    if (pre > 1) {
      pre--;
      countPrepTimer = setTimeout(preTick, 1000);
    } else {
      // "1"을 1초간 보여준 뒤 실제 카운트 시작
      countPrepTimer = setTimeout(function () {
        countPrepTimer = null;
        runRealCount();
      }, 1000);
    }
  }, 1300);

  // ----- 실제 카운트 -----
  function runRealCount() {
    let n = 0;
    let elapsed = 0;                         // 현재 카운트의 경과 시간(초) — 카운트마다 0으로 초기화

    // 1초마다 현재 카운트의 경과 시간 갱신
    secEl.textContent = "0초";
    countSecTimer = setInterval(function () {
      elapsed++;
      secEl.textContent = elapsed + "초";
    }, 1000);

    function tick() {
      n++;
      elapsed = 0;                           // 카운트가 바뀔 때마다 초 초기화
      secEl.textContent = "0초";
      displayEl.textContent = n + " / " + total + " 회";
      speak(koreanNativeCount(n));
      if (n >= total) {
        clearInterval(countTimer);
        countTimer = null;
        btnEl.textContent = "▶ 다시 시작";
        // 마지막 카운트를 다 읽은 뒤 마무리 안내
        countDoneTimer = setTimeout(function () {
          countDoneTimer = null;
          if (countSecTimer) { clearInterval(countSecTimer); countSecTimer = null; }
          displayEl.textContent = "완료! 수고하셨습니다 👏";
          secEl.textContent = "";
          speak("끝. 수고하셨습니다.");
        }, intervalMs);
      }
    }
    countTimer = setInterval(tick, intervalMs);
    tick();                                  // 첫 카운트(하나)는 바로 시작
  }
}
