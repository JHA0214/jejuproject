/* ==========================================================================
   워킹라이프 — 앱 로직 (Vanilla JS)
   화면: 홈 / 세부부위 / 운동가이드 / 설정 / 관리자 / 관리자편집
   저장: localStorage
   ========================================================================== */

(function () {
  "use strict";

  const STORE_EX = "wl_exercises";
  const STORE_VER = "wl_seed_version";
  const STORE_SETTINGS = "wl_settings";
  const STORE_ADMIN = "wl_admin_session";
  const STORE_FAVORITES = "wl_favorites";

  // ---------- 상태 ----------
  let exercises = loadExercises();
  let settings = loadSettings();
  let favorites = loadFavorites();       // 즐겨찾기한 운동 id 목록
  let isAdmin = sessionStorage.getItem(STORE_ADMIN) === "1";
  let route = { name: "home", params: {} };
  let countTimer = null;       // 음성 카운트 진행용 타이머
  let countDoneTimer = null;   // 카운트 완료 안내용 타이머
  let countSecTimer = null;    // 경과 시간(초) 표시용 타이머
  let countPrepTimer = null;   // 시작 전 준비(안내+카운트다운) 타이머

  const viewEl = document.getElementById("view");

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
  function saveSettings() {
    localStorage.setItem(STORE_SETTINGS, JSON.stringify(settings));
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
  function isFav(id) {
    return favorites.indexOf(id) !== -1;
  }
  function toggleFav(id) {
    const i = favorites.indexOf(id);
    if (i === -1) favorites.push(id); else favorites.splice(i, 1);
    saveFavorites();
  }
  // 운동별 음성 카운트 설정 읽기 (값이 없으면 기본값 사용)
  function exInterval(ex) {
    return Number(ex && ex.intervalSec) > 0 ? Number(ex.intervalSec) : DEFAULT_COUNT_SETTINGS.intervalSec;
  }
  function exReps(ex) {
    return Number(ex && ex.reps) > 0 ? Number(ex.reps) : DEFAULT_COUNT_SETTINGS.reps;
  }
  // 운동 난이도 읽기 (1.0~5.0, 0.5 단위 / 값이 없거나 잘못되면 기본 3.0)
  function exDifficulty(ex) {
    const n = Number(ex && ex.difficulty);
    if (!(n >= 1 && n <= 5)) return 3;
    return Math.round(n * 2) / 2;
  }

  // ---------- 유틸 ----------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function uid() {
    return "ex-" + Math.random().toString(36).slice(2, 9) + "-" + (exercises.length + 1);
  }
  // 유튜브 링크 -> 영상 ID 추출
  function youtubeId(url) {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?[^ ]*v=)([\w-]{11})/,
      /(?:youtu\.be\/)([\w-]{11})/,
      /(?:youtube\.com\/embed\/)([\w-]{11})/,
      /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    // 순수 ID만 입력한 경우
    if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
    return null;
  }
  function thumbUrl(url) {
    const id = youtubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  }
  // 난이도(1.0~5.0, 0.5 단위)를 별 5개짜리 그래픽으로 표시 (회색 배경 별 위에 채워진 별을 % 너비로 겹침)
  function starRatingHtml(value, extraClass) {
    const pct = Math.max(0, Math.min(100, (value / 5) * 100));
    return `<div class="star-rating${extraClass ? " " + extraClass : ""}" role="img" aria-label="난이도 5점 만점에 ${esc(value)}점">
        <div class="star-rating-bg">★★★★★</div>
        <div class="star-rating-fg" style="width:${pct}%">★★★★★</div>
      </div>`;
  }

  // ---------- 음성 카운트 ----------
  // 한글 고유수(하나, 둘, 셋...)로 변환 — 어르신이 듣기 자연스럽도록
  const NATIVE_ONES = ["", "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉"];
  const NATIVE_TENS = ["", "열", "스물", "서른", "마흔", "쉰", "예순", "일흔", "여든", "아흔"];
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
  function stopCount() {
    if (countTimer) { clearInterval(countTimer); countTimer = null; }
    if (countDoneTimer) { clearTimeout(countDoneTimer); countDoneTimer = null; }
    if (countSecTimer) { clearInterval(countSecTimer); countSecTimer = null; }
    if (countPrepTimer) { clearTimeout(countPrepTimer); countPrepTimer = null; }
    try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch (e) { /* 무시 */ }
  }
  // 카운트(준비 안내 또는 실제 카운트)가 진행 중인지
  function isCounting() {
    return !!(countTimer || countPrepTimer);
  }
  // 시작 버튼 → "운동을 시작합니다" 안내 + 3초 카운트다운 후 음성 카운트
  function startCount(displayEl, secEl, btnEl, intervalSec, total) {
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

  // ---------- 접근성 설정 적용 ----------
  function applySettings() {
    document.documentElement.style.setProperty("--font-scale", settings.fontScale);
    document.body.classList.toggle("high-contrast", !!settings.highContrast);
  }

  // ---------- 라우팅 ----------
  function go(name, params) {
    stopCount();                 // 화면 이동 시 진행 중인 음성 카운트 중지
    route = { name: name, params: params || {} };
    window.scrollTo(0, 0);
    render();
  }

  function render() {
    updateAdminBanner();
    switch (route.name) {
      case "home": return renderHome();
      case "subparts": return renderSubparts();
      case "search": return renderSearchResults();
      case "exercise": return renderExercise();
      case "settings": return renderSettings();
      case "admin": return renderAdmin();
      case "adminEdit": return renderAdminEdit();
      default: return renderHome();
    }
  }

  function updateAdminBanner() {
    const banner = document.getElementById("adminBanner");
    banner.hidden = !isAdmin;
  }

  // ==========================================================================
  //  홈 화면
  // ==========================================================================
  function renderHome() {
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

  // ==========================================================================
  //  세부 부위 선택
  // ==========================================================================
  function renderSubparts() {
    const part = route.params.part;
    const subs = BODY_PARTS[part] || [];
    viewEl.innerHTML = `
      <button class="back-btn" id="back">← 처음으로</button>
      <h1 class="page-title">${esc(part)} · 세부 부위</h1>
      <p class="page-sub">강화하고 싶은 부위를 선택하세요.</p>
      <div class="subpart-grid">
        ${subs.map(function (s) {
          return `<button class="subpart-btn" data-sub="${esc(s)}">${esc(s)}</button>`;
        }).join("")}
      </div>
    `;
    document.getElementById("back").addEventListener("click", function () { go("home"); });
    viewEl.querySelectorAll(".subpart-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        go("search", { part: part, sub: b.dataset.sub });
      });
    });
  }

  // ==========================================================================
  //  검색 결과 (키워드 또는 부위/세부부위)
  // ==========================================================================
  function renderSearchResults() {
    const { q, part, sub } = route.params;
    let results, heading;

    if (sub) {
      results = exercises.filter(function (e) { return e.subPart === sub; });
      heading = `${esc(part)} · ${esc(sub)} 운동`;
    } else if (part) {
      results = exercises.filter(function (e) { return e.bodyPart === part; });
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

  function filterExercises(q) {
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

  // ---------- 즐겨찾기 별표 버튼 ----------
  function favBtnHtml(id) {
    const active = isFav(id);
    return `<button type="button" class="fav-btn${active ? " active" : ""}" data-fav="${esc(id)}"
              aria-pressed="${active ? "true" : "false"}" aria-label="${active ? "즐겨찾기 해제" : "즐겨찾기 추가"}">${active ? "★" : "☆"}</button>`;
  }
  function updateFavButton(btn) {
    const active = isFav(btn.dataset.fav);
    btn.classList.toggle("active", active);
    btn.textContent = active ? "★" : "☆";
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.setAttribute("aria-label", active ? "즐겨찾기 해제" : "즐겨찾기 추가");
  }
  function wireFavButton(btn) {
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      const id = btn.dataset.fav;
      toggleFav(id);
      // 같은 운동이 홈 화면의 "즐겨찾기"와 "전체 운동" 목록에 동시에 나타날 수 있으므로
      // 화면에 보이는 같은 id의 별 버튼을 전부 갱신한다.
      document.querySelectorAll('.fav-btn[data-fav="' + CSS.escape(id) + '"]').forEach(updateFavButton);
      syncFavSection();          // 홈 화면이면 즐겨찾기 섹션 목록(추가/삭제)도 갱신
    });
  }
  // 홈 화면의 "즐겨찾기" 섹션을 최신 상태로 다시 그림 (다른 화면이면 아무 것도 하지 않음)
  function syncFavSection() {
    const favSection = document.getElementById("favSection");
    if (!favSection) return;
    const favs = exercises.filter(function (e) { return isFav(e.id); });
    favSection.hidden = !favs.length;
    renderExerciseList(document.getElementById("favList"), favs);
  }

  // ---------- 운동 카드 목록 렌더 ----------
  function renderExerciseList(container, list) {
    if (!list.length) {
      container.innerHTML = `<div class="empty">조건에 맞는 운동이 없습니다.<br>다른 키워드로 검색해 보세요.</div>`;
      return;
    }
    container.innerHTML = list.map(function (e) {
      const thumb = thumbUrl(e.youtubeUrl);
      const thumbHtml = thumb
        ? `<img class="exercise-thumb" src="${esc(thumb)}" alt="" />`
        : `<div class="exercise-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.6em;">🎬</div>`;
      const tags = (e.hashtags || [])
        .map(function (t) { return `<span class="tag">#${esc(t)}</span>`; }).join("");
      return `
        <div class="exercise-card" data-id="${esc(e.id)}" role="button" tabindex="0">
          ${thumbHtml}
          <div class="exercise-card-body">
            <p class="exercise-card-title">${esc(e.title)}</p>
            ${starRatingHtml(exDifficulty(e))}
            <span class="badge">${esc(e.bodyPart)} · ${esc(e.subPart)}</span>
            <div class="exercise-card-tags" style="margin-top:8px;">${tags}</div>
          </div>
          ${favBtnHtml(e.id)}
          <span class="go" aria-hidden="true">›</span>
        </div>`;
    }).join("");
    container.querySelectorAll(".exercise-card").forEach(function (c) {
      function openIt() { go("exercise", { id: c.dataset.id }); }
      c.addEventListener("click", function (ev) {
        if (ev.target.closest(".fav-btn")) return;
        openIt();
      });
      c.addEventListener("keydown", function (ev) {
        if (ev.target.closest(".fav-btn")) return;
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openIt(); }
      });
    });
    container.querySelectorAll(".fav-btn").forEach(wireFavButton);
  }

  // ==========================================================================
  //  운동 가이드 (상세) — 상단 유튜브 영상 + 하단 설명
  // ==========================================================================
  function renderExercise() {
    const ex = exercises.find(function (e) { return e.id === route.params.id; });
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

      ${isAdmin ? `
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

    if (isAdmin) {
      document.getElementById("editThis").addEventListener("click", function () {
        go("adminEdit", { id: ex.id });
      });
    }
  }

  // ==========================================================================
  //  설정 (글자 크기 / 고대비)
  // ==========================================================================
  function renderSettings() {
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

  // ==========================================================================
  //  관리자 로그인 (모달)
  // ==========================================================================
  function openAdminLogin() {
    if (isAdmin) { go("admin"); return; }
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
        isAdmin = true;
        sessionStorage.setItem(STORE_ADMIN, "1");
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
  function closeModal() {
    document.getElementById("modalOverlay").hidden = true;
    document.getElementById("modalBody").innerHTML = "";
  }

  // ==========================================================================
  //  관리자 페이지 (운동 목록 + 추가/수정/삭제)
  // ==========================================================================
  function renderAdmin() {
    if (!isAdmin) { openAdminLogin(); return; }
    viewEl.innerHTML = `
      <button class="back-btn" id="back">← 처음으로</button>
      <h1 class="page-title">관리자 페이지</h1>
      <p class="page-sub">운동을 생성·수정·삭제하고 유튜브 영상과 해시태그를 관리합니다.</p>

      <button class="btn btn-primary btn-block" id="addNew">＋ 새 운동 만들기</button>

      <h2 class="section-title">등록된 운동 (${exercises.length})</h2>
      <div id="adminList"></div>
    `;
    document.getElementById("back").addEventListener("click", function () { go("home"); });
    document.getElementById("addNew").addEventListener("click", function () { go("adminEdit", {}); });

    const listEl = document.getElementById("adminList");
    if (!exercises.length) {
      listEl.innerHTML = `<div class="empty">등록된 운동이 없습니다. 새 운동을 만들어 보세요.</div>`;
      return;
    }
    listEl.innerHTML = exercises.map(function (e) {
      const hasVid = youtubeId(e.youtubeUrl) ? "🎬 영상 있음" : "⚠️ 영상 없음";
      return `
        <div class="admin-item">
          <div>
            <div class="admin-item-title">${esc(e.title)}</div>
            ${starRatingHtml(exDifficulty(e))}
            <div class="admin-item-meta">${esc(e.bodyPart)} · ${esc(e.subPart)} · ${hasVid}</div>
          </div>
          <div class="admin-item-actions">
            <button class="btn btn-small" data-edit="${esc(e.id)}">수정</button>
            <button class="btn btn-small btn-danger" data-del="${esc(e.id)}">삭제</button>
          </div>
        </div>`;
    }).join("");
    listEl.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { go("adminEdit", { id: b.dataset.edit }); });
    });
    listEl.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        const ex = exercises.find(function (x) { return x.id === b.dataset.del; });
        if (ex && confirm(`"${ex.title}" 운동을 삭제할까요?`)) {
          exercises = exercises.filter(function (x) { return x.id !== b.dataset.del; });
          saveExercises();
          if (isFav(b.dataset.del)) { toggleFav(b.dataset.del); }
          renderAdmin();
        }
      });
    });
  }

  // ==========================================================================
  //  관리자 편집/생성 폼
  // ==========================================================================
  function renderAdminEdit() {
    if (!isAdmin) { openAdminLogin(); return; }
    const editing = route.params.id
      ? exercises.find(function (e) { return e.id === route.params.id; })
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
        Object.assign(editing, draft);
      } else {
        draft.id = uid();
        exercises.push(draft);
      }
      saveExercises();
      alert("저장되었습니다.");
      go("admin");
    });
  }

  // ==========================================================================
  //  헤더 버튼 이벤트
  // ==========================================================================
  document.getElementById("btnHome").addEventListener("click", function () { go("home"); });
  document.getElementById("btnSettings").addEventListener("click", function () { go("settings"); });
  document.getElementById("btnAdminLogin").addEventListener("click", openAdminLogin);
  document.getElementById("btnGoAdmin").addEventListener("click", function () { go("admin"); });
  document.getElementById("btnLogout").addEventListener("click", function () {
    isAdmin = false;
    sessionStorage.removeItem(STORE_ADMIN);
    go("home");
  });
  document.getElementById("modalOverlay").addEventListener("click", function (e) {
    if (e.target.id === "modalOverlay") closeModal();
  });

  // ---------- 시작 ----------
  applySettings();
  render();
})();
