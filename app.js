/* =========================================================
   워킹라이프 — 앱 로직
   - 화면 전환(라우팅), 검색, 부위 선택, 운동 가이드(유튜브 내장 재생)
   - 설정(글자 크기 / 고대비), 관리자(로그인·운동 생성/수정/삭제)
   - 데이터는 브라우저 localStorage 에 저장됩니다.
   ========================================================= */

(function () {
  "use strict";

  var ADMIN_PASSWORD = "007181";
  var STORE_EXERCISES = "workinglife_exercises_v4";
  var STORE_SETTINGS = "workinglife_settings";

  /* ----- 부위 정의 ----- */
  var PART_GROUPS = {
    upper: { label: "상체", parts: ["목", "어깨", "팔", "등", "허리"] },
    lower: { label: "하체", parts: ["엉덩이", "허벅지", "무릎", "종아리", "발목"] }
  };

  /* ----- 기본(시드) 운동 데이터 ----- */
  var DEFAULT_EXERCISES = [
    {
      id: "ex-walk",
      title: "제자리 걷기",
      category: "lower",
      part: "무릎",
      keywords: ["걷기", "균형", "다리", "유산소"],
      youtube: "https://www.youtube.com/embed/sY3gngzGzsM",
      desc: "1. 벽이나 튼튼한 의자를 한 손으로 잡습니다.\n2. 허리를 곧게 펴고 제자리에서 천천히 걷습니다.\n3. 무릎을 편하게 들어 올리며 1분간 반복합니다.\n※ 숨이 차면 잠시 쉬었다가 다시 시작하세요."
    },
    {
      id: "ex-sit",
      title: "앉았다 일어서기",
      category: "lower",
      part: "허벅지",
      keywords: ["앉기", "일어서기", "허벅지", "근력"],
      youtube: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      desc: "1. 의자 앞쪽에 바르게 앉습니다.\n2. 두 팔을 앞으로 뻗으며 천천히 일어섭니다.\n3. 다시 천천히 앉습니다. 10번 반복합니다.\n※ 어지러우면 즉시 멈추고 앉으세요."
    },
    {
      id: "ex-ankle",
      title: "발목 돌리기",
      category: "lower",
      part: "발목",
      keywords: ["발목", "스트레칭", "관절"],
      youtube: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      desc: "1. 의자에 앉아 한쪽 다리를 살짝 듭니다.\n2. 발목을 시계 방향으로 10번 돌립니다.\n3. 반대 방향으로 10번 돌립니다.\n4. 다른 발도 똑같이 합니다."
    },
    {
      id: "ex-shoulder",
      title: "어깨 으쓱하기",
      category: "upper",
      part: "어깨",
      keywords: ["어깨", "스트레칭", "긴장 완화"],
      youtube: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      desc: "1. 편하게 앉거나 섭니다.\n2. 숨을 들이쉬며 두 어깨를 귀 쪽으로 올립니다.\n3. 숨을 내쉬며 어깨를 툭 내립니다.\n4. 10번 반복합니다."
    },
    {
      id: "ex-balance",
      title: "한 발로 균형 잡기",
      category: "lower",
      part: "무릎",
      keywords: ["균형", "낙상 예방", "다리", "서기"],
      youtube: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      desc: "1. 튼튼한 의자 등받이를 잡습니다.\n2. 한쪽 발을 바닥에서 살짝 뗍니다.\n3. 10초간 균형을 잡습니다.\n4. 발을 바꿔 반복합니다.\n※ 넘어지지 않도록 반드시 잡을 것을 준비하세요."
    }
  ];

  /* ----- 상태 ----- */
  var exercises = loadExercises();
  var settings = loadSettings();
  var screenStack = ["home"];
  var editingId = null; // 관리자 편집 중인 운동 id (null 이면 새로 만들기)

  /* ----- DOM 헬퍼 ----- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* =========================================================
     저장소
     ========================================================= */
  function loadExercises() {
    try {
      var raw = localStorage.getItem(STORE_EXERCISES);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) { /* 무시 */ }
    return DEFAULT_EXERCISES.slice();
  }
  function saveExercises() {
    try { localStorage.setItem(STORE_EXERCISES, JSON.stringify(exercises)); } catch (e) {}
  }
  function loadSettings() {
    try {
      var raw = localStorage.getItem(STORE_SETTINGS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { fontSize: "normal", highContrast: false };
  }
  function saveSettings() {
    try { localStorage.setItem(STORE_SETTINGS, JSON.stringify(settings)); } catch (e) {}
  }

  /* =========================================================
     유튜브 링크 → 영상 ID 추출
     ========================================================= */
  function extractYoutubeId(url) {
    if (!url) return "";
    url = String(url).trim();
    // 이미 ID 만 들어온 경우
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    var patterns = [
      /[?&]v=([a-zA-Z0-9_-]{11})/,       // watch?v=ID
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,   // youtu.be/ID
      /embed\/([a-zA-Z0-9_-]{11})/,       // embed/ID
      /shorts\/([a-zA-Z0-9_-]{11})/       // shorts/ID
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = url.match(patterns[i]);
      if (m) return m[1];
    }
    return "";
  }

  /* =========================================================
     라우팅 (화면 전환)
     ========================================================= */
  function showScreen(name, opts) {
    opts = opts || {};
    if (opts.push !== false) {
      if (screenStack[screenStack.length - 1] !== name) screenStack.push(name);
    }
    $all(".screen").forEach(function (s) {
      s.hidden = s.getAttribute("data-screen") !== name;
    });
    // 가이드 화면을 벗어나면 영상 정지(iframe 제거)
    if (name !== "guide") $("#guideVideo").innerHTML = "";
    // 뒤로 버튼 표시 여부
    $("#backBtn").hidden = screenStack.length <= 1;
    window.scrollTo(0, 0);
  }

  function goBack() {
    if (screenStack.length > 1) {
      screenStack.pop();
      var prev = screenStack[screenStack.length - 1];
      showScreen(prev, { push: false });
      // 되돌아온 화면 새로고침
      if (prev === "home") renderHome();
      if (prev === "admin") renderAdminList();
    }
  }

  /* =========================================================
     렌더링
     ========================================================= */
  function makeExerciseItem(ex) {
    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.className = "exercise-item";
    btn.type = "button";
    var partLabel = (PART_GROUPS[ex.category] ? PART_GROUPS[ex.category].label : "") +
                    (ex.part ? " · " + ex.part : "");
    btn.innerHTML =
      '<span class="ex-text">' +
        '<span class="ex-title">' + escapeHtml(ex.title) + '</span>' +
        '<span class="ex-meta">' + escapeHtml(partLabel) + '</span>' +
      '</span>' +
      '<span class="ex-arrow" aria-hidden="true">▶</span>';
    btn.addEventListener("click", function () { openGuide(ex.id); });
    li.appendChild(btn);
    return li;
  }

  function renderHome() {
    var list = $("#homeExerciseList");
    list.innerHTML = "";
    exercises.forEach(function (ex) { list.appendChild(makeExerciseItem(ex)); });
  }

  function renderResults(title, items) {
    $("#resultsTitle").textContent = title;
    var list = $("#resultsList");
    list.innerHTML = "";
    items.forEach(function (ex) { list.appendChild(makeExerciseItem(ex)); });
    $("#resultsEmpty").hidden = items.length > 0;
    showScreen("results");
  }

  function openGuide(id) {
    var ex = findExercise(id);
    if (!ex) return;
    $("#guideTitle").textContent = ex.title;
    $("#guideDesc").textContent = ex.desc || "설명이 아직 등록되지 않았습니다.";
    var vid = extractYoutubeId(ex.youtube);
    var holder = $("#guideVideo");
    var fallback = $("#guideFallback");
    if (vid) {
      // 페이지를 벗어나지 않고 현재 화면에서 재생 (유튜브 iframe 내장)
      // youtube-nocookie 도메인 + origin 지정으로 임베드 오류를 줄입니다.
      var iframe = document.createElement("iframe");
      var origin = (location.protocol === "http:" || location.protocol === "https:")
        ? "&origin=" + encodeURIComponent(location.origin) : "";
      iframe.src = "https://www.youtube-nocookie.com/embed/" + vid +
                   "?rel=0&playsinline=1&modestbranding=1" + origin;
      iframe.title = ex.title;
      iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen");
      iframe.setAttribute("allowfullscreen", "");
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      holder.innerHTML = "";
      holder.appendChild(iframe);
      // 예비 링크: 영상이 임베드를 막아 두었을 때만 사용
      fallback.hidden = false;
      $("#guideFallbackLink").href = "https://www.youtube.com/watch?v=" + vid;
    } else {
      holder.innerHTML = '<div class="video-missing">등록된 영상이 없습니다.<br>관리자에게 문의해 주세요.</div>';
      fallback.hidden = true;
    }
    showScreen("guide");
  }

  /* ----- 세부 부위 화면 ----- */
  function openParts(category) {
    var group = PART_GROUPS[category];
    if (!group) return;
    $("#partsTitle").textContent = group.label + " 운동";
    var wrap = $("#partsList");
    wrap.innerHTML = "";
    group.parts.forEach(function (part) {
      var btn = document.createElement("button");
      btn.className = "subpart-btn";
      btn.type = "button";
      btn.textContent = part;
      btn.addEventListener("click", function () {
        var items = exercises.filter(function (ex) {
          return ex.category === category && ex.part === part;
        });
        renderResults(group.label + " · " + part, items);
      });
      wrap.appendChild(btn);
    });
    showScreen("parts");
  }

  /* ----- 검색 ----- */
  function doSearch() {
    var q = $("#searchInput").value.trim().toLowerCase();
    if (!q) return;
    var items = exercises.filter(function (ex) {
      var hay = [ex.title, ex.part, (PART_GROUPS[ex.category] || {}).label]
        .concat(ex.keywords || [])
        .join(" ")
        .toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    renderResults('"' + $("#searchInput").value.trim() + '" 검색 결과', items);
  }

  /* =========================================================
     설정
     ========================================================= */
  var FONT_SCALES = { normal: 1, large: 1.2, xlarge: 1.45 };

  function applySettings() {
    document.documentElement.style.setProperty("--font-scale", FONT_SCALES[settings.fontSize] || 1);
    document.body.classList.toggle("high-contrast", !!settings.highContrast);
    // 버튼 활성 표시
    $all(".font-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-font") === settings.fontSize);
    });
    var t = $("#contrastToggle");
    t.setAttribute("aria-checked", settings.highContrast ? "true" : "false");
    $(".toggle-state", t).textContent = settings.highContrast ? "켜짐" : "꺼짐";
  }

  /* =========================================================
     관리자
     ========================================================= */
  function openAdminLogin() {
    $("#adminPassword").value = "";
    $("#adminError").hidden = true;
    showScreen("adminLogin");
    setTimeout(function () { $("#adminPassword").focus(); }, 50);
  }

  function trySubmitAdmin() {
    if ($("#adminPassword").value === ADMIN_PASSWORD) {
      $("#adminPassword").value = "";
      renderAdminList();
      // 로그인 화면을 스택에서 관리자 화면으로 교체 (뒤로 가면 홈으로)
      screenStack[screenStack.length - 1] = "admin";
      showScreen("admin", { push: false });
    } else {
      $("#adminError").hidden = false;
    }
  }

  function renderAdminList() {
    var list = $("#adminList");
    list.innerHTML = "";
    exercises.forEach(function (ex) {
      var li = document.createElement("li");
      li.className = "admin-item";
      var meta = (PART_GROUPS[ex.category] ? PART_GROUPS[ex.category].label : "") +
                 (ex.part ? " · " + ex.part : "") +
                 (extractYoutubeId(ex.youtube) ? " · 영상 있음" : " · 영상 없음");
      li.innerHTML =
        '<div>' +
          '<div class="admin-item-title">' + escapeHtml(ex.title) + '</div>' +
          '<div class="admin-item-meta">' + escapeHtml(meta) + '</div>' +
        '</div>';
      var editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "수정";
      editBtn.addEventListener("click", function () { openAdminEdit(ex.id); });
      li.appendChild(editBtn);
      list.appendChild(li);
    });
  }

  function fillPartOptions(category, selected) {
    var sel = $("#fPart");
    sel.innerHTML = "";
    (PART_GROUPS[category] || PART_GROUPS.upper).parts.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      if (p === selected) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function openAdminEdit(id) {
    editingId = id;
    var ex = id ? findExercise(id) : null;
    $("#adminEditTitle").textContent = ex ? "운동 수정" : "새 운동 만들기";
    $("#fTitle").value = ex ? ex.title : "";
    $("#fCategory").value = ex ? ex.category : "upper";
    fillPartOptions($("#fCategory").value, ex ? ex.part : null);
    $("#fKeywords").value = ex && ex.keywords ? ex.keywords.join(", ") : "";
    $("#fYoutube").value = ex ? ex.youtube : "";
    $("#fDesc").value = ex ? ex.desc : "";
    $("#fDeleteBtn").style.display = ex ? "" : "none";
    showScreen("adminEdit");
  }

  function saveAdminEdit(e) {
    e.preventDefault();
    var title = $("#fTitle").value.trim();
    if (!title) { $("#fTitle").focus(); return; }
    var data = {
      title: title,
      category: $("#fCategory").value,
      part: $("#fPart").value,
      keywords: $("#fKeywords").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean),
      youtube: $("#fYoutube").value.trim(),
      desc: $("#fDesc").value
    };
    if (editingId) {
      var ex = findExercise(editingId);
      if (ex) { for (var k in data) ex[k] = data[k]; }
    } else {
      data.id = "ex-" + genId();
      exercises.push(data);
    }
    saveExercises();
    renderHome();
    renderAdminList();
    goBack();
  }

  function deleteAdminEdit() {
    if (!editingId) return;
    if (!window.confirm("이 운동을 삭제할까요? 되돌릴 수 없습니다.")) return;
    exercises = exercises.filter(function (ex) { return ex.id !== editingId; });
    saveExercises();
    renderHome();
    renderAdminList();
    goBack();
  }

  /* =========================================================
     유틸
     ========================================================= */
  function findExercise(id) {
    for (var i = 0; i < exercises.length; i++) if (exercises[i].id === id) return exercises[i];
    return null;
  }
  function genId() {
    return Math.floor(performance.now() * 1000).toString(36) + exercises.length;
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* =========================================================
     이벤트 바인딩
     ========================================================= */
  function bind() {
    // 상단 바
    $("#backBtn").addEventListener("click", goBack);
    $("#settingsBtn").addEventListener("click", function () { showScreen("settings"); });

    // 검색
    $("#searchBtn").addEventListener("click", doSearch);
    $("#searchInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") doSearch();
    });

    // 부위 버튼
    $all(".part-btn").forEach(function (b) {
      b.addEventListener("click", function () { openParts(b.getAttribute("data-category")); });
    });

    // 관리자 로그인
    $("#adminLoginBtn").addEventListener("click", openAdminLogin);
    $("#adminSubmit").addEventListener("click", trySubmitAdmin);
    $("#adminPassword").addEventListener("keydown", function (e) {
      if (e.key === "Enter") trySubmitAdmin();
    });

    // 관리자 페이지
    $("#adminNewBtn").addEventListener("click", function () { openAdminEdit(null); });
    $("#adminEditForm").addEventListener("submit", saveAdminEdit);
    $("#fDeleteBtn").addEventListener("click", deleteAdminEdit);
    $("#fCategory").addEventListener("change", function () {
      fillPartOptions($("#fCategory").value, null);
    });

    // 설정
    $all(".font-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        settings.fontSize = b.getAttribute("data-font");
        saveSettings();
        applySettings();
      });
    });
    $("#contrastToggle").addEventListener("click", function () {
      settings.highContrast = !settings.highContrast;
      saveSettings();
      applySettings();
    });
  }

  /* =========================================================
     시작
     ========================================================= */
  function init() {
    bind();
    applySettings();
    renderHome();
    showScreen("home", { push: false });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
