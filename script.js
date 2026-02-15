import { characters } from "./characters.js";

/* DOM  */

const input = document.getElementById("guessInput");
const guessBtn = document.getElementById("guessBtn");
const newGameBtn = document.getElementById("newGameBtn");
const result = document.getElementById("result");
const board = document.getElementById("board");
const suggestionsEl = document.getElementById("suggestions");
const bandFilterBtn = document.getElementById("bandFilterBtn");
const bandFilterWrap = document.getElementById("bandFilterWrap");
const bandDropdown = document.getElementById("bandDropdown");
const bandAll = document.getElementById("bandAll");
const bandOptions = document.getElementById("bandOptions");

const modePracticeBtn = document.getElementById("modePractice");
const modeChallengeBtn = document.getElementById("modeChallenge");
const heartsBar = document.getElementById("heartsBar");
const fxOverlay = document.getElementById("fxOverlay");
const wrap = document.querySelector(".wrap");
const stageEl = document.getElementById("stage");
const bestEl = document.getElementById("best");


function requireEl(el, id) {
  if (!el) {
    if (result) result.textContent = `页面缺少元素 #${id}，请确认 index.html 已覆盖并保存`;
    throw new Error(`Missing element: #${id}`);
  }
  return el;
}

requireEl(input, "guessInput");
requireEl(guessBtn, "guessBtn");
requireEl(newGameBtn, "newGameBtn");
requireEl(result, "result");
requireEl(board, "board");
requireEl(suggestionsEl, "suggestions");
requireEl(modePracticeBtn, "modePractice");
requireEl(modeChallengeBtn, "modeChallenge");
requireEl(heartsBar, "heartsBar");
requireEl(fxOverlay, "fxOverlay");
requireEl(wrap, ".wrap");
requireEl(stageEl, "stage");
requireEl(bestEl, "best");
requireEl(bandFilterBtn, "bandFilterBtn");
requireEl(bandFilterWrap, "bandFilterWrap");
requireEl(bandDropdown, "bandDropdown");
requireEl(bandAll, "bandAll");
requireEl(bandOptions, "bandOptions");


/* 常量  */

const RESULT = {
  FULL: "ok",
  PARTIAL: "partial",
  NONE: "bad",
  HIGH: "bad",
  LOW: "bad"
};

const MODE = {
  PRACTICE: "practice",
  CHALLENGE: "challenge"
};

const BEST_KEY = "bangdle_best_challenge";

/*  游戏状态  */

let ANSWER = null;
/* 选择乐队 */

const ALL_BANDS = [
  "Poppin'Party",
  "Afterglow",
  "Pastel*Palettes",
  "Roselia",
  "Hello, Happy World!",
  "Morfonica",
  "RAISE A SUILEN",
  "MyGO!!!!!",
  "Ave Mujica"
];

// 默认所有乐队
let selectedBands = new Set(ALL_BANDS);

// 挑战模式不能选乐队
function isPracticeBandAllowed(char) {
  if (currentMode !== MODE.PRACTICE) return true;
  return selectedBands.has(char.band);
}


function updateBandButtonText() {
  if (selectedBands.size === ALL_BANDS.length) {
    bandFilterBtn.textContent = "选择乐队";
  } else {
    bandFilterBtn.textContent = `已选${selectedBands.size}个乐队`;
  }
}

function openBandDropdown() {
  bandDropdown.hidden = false;
}

function closeBandDropdown() {
  bandDropdown.hidden = true;
}

function syncBandAllCheckbox() {
  bandAll.checked = (selectedBands.size === ALL_BANDS.length);
}

function renderBandOptions() {
  bandOptions.innerHTML = "";

  for (const band of ALL_BANDS) {
    const label = document.createElement("label");
    label.className = "opt";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = selectedBands.has(band);

    const span = document.createElement("span");
    span.textContent = band;

    input.addEventListener("change", () => {
      if (input.checked) selectedBands.add(band);
      else selectedBands.delete(band);

      // 避免一个都不选
      if (selectedBands.size === 0) {
        selectedBands = new Set(ALL_BANDS);
        renderBandOptions();
      }

      syncBandAllCheckbox();
      updateBandButtonText();

      // 在练习模式立刻切新题清空表格
      if (currentMode === MODE.PRACTICE) startPractice();

    });

    label.append(input, span);
    bandOptions.appendChild(label);
  }

  syncBandAllCheckbox();
  updateBandButtonText();
}

renderBandOptions();

bandFilterBtn.addEventListener("click", () => {
  bandDropdown.hidden ? openBandDropdown() : closeBandDropdown();
});

// 点所有乐队
bandAll.addEventListener("change", () => {
  if (bandAll.checked) {
    selectedBands = new Set(ALL_BANDS);
  } else {
    selectedBands = new Set(["Poppin'Party"]);
  }
  renderBandOptions();
  updateBandButtonText();
  if (currentMode === MODE.PRACTICE) startPractice();
});

// 点击外部关闭下拉
document.addEventListener("mousedown", (e) => {
  const within = bandDropdown.contains(e.target) || bandFilterBtn.contains(e.target);
  if (!within) closeBandDropdown();
});

let gameOver = false;

let currentMode = MODE.PRACTICE;

// 每位角色内部的“已猜过”
let guessedNames = new Set();

/*  挑战模式专属状态  */
let hearts = 10;
let solvedCount = 0; // 连胜数
let stageBans = new Set(); // 本关固定 ban 的列




/* 归一化 */

function normalizeKey(s) {
  if (!s) return "";
  let t = s.trim().toLowerCase();
  t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  t = t.replace(/[\s\-_.'’]/g, "");
  return t;
}

function hasCJK(s) {
  return /[\u4E00-\u9FFF]/.test(s);
}

/*搜索索引 */

function buildSearchIndex(list) {
  return list.map((c) => {
    const aliases = [c.name, ...(c.aliases ?? [])];
    const normAliases = aliases.map(a => normalizeKey(a)).filter(Boolean);
    return { char: c, normAliases };
  });
}

const searchIndex = buildSearchIndex(characters);

/*自动补全状态*/

let activeIndex = -1;
let currentSuggestions = [];

function hideSuggestions() {
  suggestionsEl.hidden = true;
  suggestionsEl.innerHTML = "";
  activeIndex = -1;
  currentSuggestions = [];
}


function getBest() {
  const v = Number(localStorage.getItem(BEST_KEY) ?? "0");
  return Number.isFinite(v) ? v : 0;
}

function setBest(v) {
  localStorage.setItem(BEST_KEY, String(v));
}

let displayedHearts = 0;

function renderHeartsBar(count, { popFrom = 0 } = {}) {
  heartsBar.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.className = "heart" + (i >= popFrom ? " gain" : "");
    s.textContent = "❤️";
    heartsBar.appendChild(s);
  }
  displayedHearts = count;
}

function loseOneHeartFx() {
  const last = heartsBar.lastElementChild;
  if (last) {
    last.classList.remove("gain");
    last.classList.add("lose");
    // 动画结束后移除
    setTimeout(() => {
      if (last.parentElement) last.remove();
    }, 360);
  }
}

function flash(color) {
  fxOverlay.classList.remove("flash-red", "flash-green");
  void fxOverlay.offsetWidth;
  fxOverlay.classList.add(color === "red" ? "flash-red" : "flash-green");
}

function shakeWrap() {
  wrap.classList.remove("shake");
  void wrap.offsetWidth;
  wrap.classList.add("shake");
}


/*  新一局 / 新目标  */

function pickAnswer() {
  const pool = (currentMode === MODE.PRACTICE)
    ? characters.filter(isPracticeBandAllowed)
    : characters;

  const safePool = pool.length ? pool : characters;
  return safePool[Math.floor(Math.random() * safePool.length)];
}


function resetForNewTarget({ clearBoard } = { clearBoard: true }) {
  ANSWER = pickAnswer();
  gameOver = false;

  guessedNames = new Set();

  // 挑战模式每一关只抽一次 ban 列并固定
  if (currentMode === MODE.CHALLENGE) {
    const stageIndex = solvedCount + 1;          // 当前第几位角色
    const banN = banCountForStage(stageIndex);   // 本关 ban 几列
    stageBans = pickRandomBanKeys(banN);         // 固定
  } else {
    stageBans = new Set();
  }

  if (clearBoard) board.innerHTML = "";

  input.value = "";
  input.disabled = false;
  input.focus();

  newGameBtn.style.display = "none";
  hideSuggestions();
}

function newGame() {
  if (currentMode === MODE.PRACTICE) startPractice();
}


function startPractice() {
  currentMode = MODE.PRACTICE;
  solvedCount = 0;
  hearts = 10;

  resetForNewTarget({ clearBoard: true });
  result.textContent = "练习模式： 无猜测次数限制。";
  result.className = "card muted";

  syncHUD();
}

function startChallenge() {
  currentMode = MODE.CHALLENGE;
  hearts = 10;
  solvedCount = 0;

  resetForNewTarget({ clearBoard: true });
  renderHeartsBar(hearts, { popFrom: 0 });
  result.textContent = "挑战模式: 初始有10次输入机会, 猜测正确会补充输入机会, 在机会用尽前尽可能猜出更多角色!";
  result.className = "card muted";

  syncHUD();
}

function syncHUD() {
  const best = getBest();
  bestEl.textContent = String(best);

  if (currentMode === MODE.CHALLENGE) {
    stageEl.textContent = String(solvedCount + 1);

    if (displayedHearts !== hearts) {
      renderHeartsBar(hearts, { popFrom: displayedHearts });
    }
  } else {
    stageEl.textContent = "—";
    heartsBar.innerHTML = "∞";
    displayedHearts = 0;
  }

  modePracticeBtn.classList.toggle("active", currentMode === MODE.PRACTICE);
  modeChallengeBtn.classList.toggle("active", currentMode === MODE.CHALLENGE);

  // 选择乐队,只在练习模式显示
  if (bandFilterWrap) {
    const show = (currentMode === MODE.PRACTICE);
    bandFilterWrap.style.display = show ? "flex" : "none";
    if (!show) bandDropdown.hidden = true; 
  }

}


/* ========= 比较 ========= */

function compareEnum(a, b) {
  return a === b ? RESULT.FULL : RESULT.NONE;
}

function compareNumber(guessValue, answerValue) {
  if (guessValue === answerValue) {
    return { state: RESULT.FULL, arrow: "" };
  }

  if (answerValue > guessValue) {
    return { state: RESULT.NONE, arrow: " ↑" };
  }

  return { state: RESULT.NONE, arrow: " ↓" };
}


function compareInstruments(g, a) {
  const overlap = g.filter(i => a.includes(i));
  if (overlap.length === 0) return RESULT.NONE;
  if (overlap.length === g.length && overlap.length === a.length) return RESULT.FULL;
  return RESULT.PARTIAL;
}

/* ========= Cell ========= */

function makeCell(text, state) {
  const div = document.createElement("div");
  div.className = `cell ${state}`;
  div.textContent = text;
  return div;
}

function makeBanCell() {
  const div = document.createElement("div");
  div.className = "cell ban";
  div.textContent = "🚫";
  return div;
}

/* 头像列 */
const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
  <rect width="96" height="96" rx="18" fill="#9ca3af"/>
  <circle cx="48" cy="40" r="16" fill="#e5e7eb"/>
  <path d="M20 84c4-16 20-24 28-24s24 8 28 24" fill="#e5e7eb"/>
</svg>
`);

function makeNameCell(char, state) {
  const div = document.createElement("div");
  div.className = `cell name-cell ${state}`;

  const inner = document.createElement("div");
  inner.className = "name-inner";

  const img = document.createElement("img");
  img.className = "name-avatar";
  img.alt = char.name;
  img.loading = "lazy";
  img.decoding = "async";
  img.src = char.image || FALLBACK_AVATAR;

  img.addEventListener("error", () => {
    img.src = FALLBACK_AVATAR;
  }, { once: true });

  const span = document.createElement("span");
  span.className = "name-text";
  span.textContent = char.name;

  inner.append(img, span);
  div.append(inner);
  return div;
}

/* 挑战模式 */

function rewardHeartsForStage(stageIndex) {
  // stageIndex 从 1 开始：第几个角色
  if (stageIndex <= 5) return 5;
  if (stageIndex <= 10) return 3;
  return 2; // 11+
}

function banCountForStage(stageIndex) {
  // stageIndex 从 1 开始
  if (stageIndex >= 6 && stageIndex <= 8) return 1;
  if (stageIndex >= 9 && stageIndex <= 11) return 2;
  if (stageIndex >= 12 && stageIndex <= 15) return 3;
  if (stageIndex >= 16) return 4;
  return 0;
}

const BAN_KEYS = ["band", "instruments", "school", "year", "hair", "eyes", "height"];

function pickRandomBanKeys(count) {
  if (count <= 0) return new Set();
  const pool = [...BAN_KEYS];
  // Fisher–Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return new Set(pool.slice(0, count));
}

/*  渲染  */

function renderRow(guess, bannedKeysSet = new Set()) {
  const row = document.createElement("li");
  row.className = "row-cells";

  const yearCmp = compareNumber(guess.year, ANSWER.year);
  const heightCmp = compareNumber(guess.height, ANSWER.height);

  // 名不ban
  row.append(
    makeNameCell(guess, guess.name === ANSWER.name ? RESULT.FULL : RESULT.NONE)
  );

  // band
  row.append(
    bannedKeysSet.has("band")
      ? makeBanCell()
      : makeCell(guess.band, compareEnum(guess.band, ANSWER.band))
  );

  // instruments
  row.append(
    bannedKeysSet.has("instruments")
      ? makeBanCell()
      : makeCell(
          guess.instruments.join("/"),
          compareInstruments(guess.instruments, ANSWER.instruments)
        )
  );

  // school
  row.append(
    bannedKeysSet.has("school")
      ? makeBanCell()
      : makeCell(guess.school, compareEnum(guess.school, ANSWER.school))
  );

  // year
  row.append(
    bannedKeysSet.has("year")
      ? makeBanCell()
      : makeCell(String(guess.year) + yearCmp.arrow, yearCmp.state)
  );

  // hair
  row.append(
    bannedKeysSet.has("hair")
      ? makeBanCell()
      : makeCell(guess.hair, compareEnum(guess.hair, ANSWER.hair))
  );

  // eyes
  row.append(
    bannedKeysSet.has("eyes")
      ? makeBanCell()
      : makeCell(guess.eyes, compareEnum(guess.eyes, ANSWER.eyes))
  );

  // height
  row.append(
    bannedKeysSet.has("height")
      ? makeBanCell()
      : makeCell(String(guess.height) + heightCmp.arrow, heightCmp.state)
  );

  board.prepend(row);
}


function renderDivider() {
  const li = document.createElement("li");
  li.className = "divider-row";
  const line = document.createElement("div");
  line.className = "divider-line";
  li.appendChild(line);
  board.prepend(li);
}


function findCharByUserInput(userText) {
  const raw = (userText ?? "").trim();
  if (!raw) return null;

  // 汉字
  if (hasCJK(raw)) {
    const exact = characters.find(c => c.name === raw);
    if (exact) return exact;

    const includes = characters.find(c => c.name.includes(raw));
    if (includes) return includes;
  }

  // 罗马音/拼音
  const key = normalizeKey(raw);
  for (const item of searchIndex) {
    if (item.normAliases.includes(key)) return item.char;
  }
  return null;
}

/* ========= 自动补全：渲染 获取候选，过滤已猜过 ========= */

function renderSuggestions(list) {
  suggestionsEl.innerHTML = "";

  list.forEach((item, idx) => {
    const li = document.createElement("li");
    if (idx === activeIndex) li.classList.add("active");

    const title = document.createElement("div");
    title.className = "sug-title";
    title.textContent = item.char.name;

    const sub = document.createElement("div");
    sub.className = "sug-sub";
    sub.textContent = `${item.char.band}`;

    li.append(title, sub);

    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      input.value = item.char.name;
      hideSuggestions();
      submit(item.char);
    });

    suggestionsEl.appendChild(li);
  });

  suggestionsEl.hidden = list.length === 0;
}

function getSuggestions(query) {
  const q = query.trim();
  if (!q) return [];

  const limit = 8;
  const out = [];

  // 只过滤当前目标角色内部已经猜过的
  const isGuessed = (c) => guessedNames.has(c.name);

  if (hasCJK(q)) {
    for (const c of characters) {
      if (isGuessed(c)) continue;
      if (!isPracticeBandAllowed(c)) continue;
      if (c.name.includes(q)) out.push({ char: c });
      if (out.length >= limit) break;
    }
  return out;
}


  const key = normalizeKey(q);
  if (!key) return [];

  for (const item of searchIndex) {
    if (isGuessed(item.char)) continue;
    if (!isPracticeBandAllowed(item.char)) continue;
    if (item.normAliases.some(a => a.includes(key))) {
      out.push({ char: item.char });
      if (out.length >= limit) break;
    }
  }
  return out;
}

function updateSuggestions() {
  if (gameOver) { hideSuggestions(); return; }
  currentSuggestions = getSuggestions(input.value);
  activeIndex = currentSuggestions.length ? 0 : -1;
  renderSuggestions(currentSuggestions);
}

/*  提交  */

function endChallengeRun() {
  gameOver = true;
  input.disabled = true;
  newGameBtn.style.display = "inline-block";
  hideSuggestions();

  const best = getBest();
  if (solvedCount > best) {
    setBest(solvedCount);
  }
  syncHUD();

  result.textContent = ` 您已经耗尽所有猜测次数！你共猜对了 ${solvedCount} 位角色。`;
}

function submit(forceChar = null) {
  if (gameOver) return;

  const guess = forceChar ?? findCharByUserInput(input.value);

  if (!guess) {
    result.textContent = "找不到该角色：请检查拼写（支持中文 / 罗马音 / 拼音别名）";
    return;
  }

  if (currentMode === MODE.PRACTICE && !selectedBands.has(guess.band)) {
    result.textContent = "该角色不在当前选中的乐队题库中（请点“选择乐队”调整）。";
    input.value = "";
    input.focus();
    hideSuggestions();
    return;
  }


  // 重复猜拦截
  if (guessedNames.has(guess.name)) {
    result.textContent = `你已经猜过「${guess.name}」了，不能重复猜`;
    input.value = "";
    input.focus();
    hideSuggestions();
    return;
  }

  guessedNames.add(guess.name);

  // 挑战模式
  renderRow(guess, currentMode === MODE.CHALLENGE ? stageBans : new Set());


  const isCorrect = (guess.name === ANSWER.name);

  if (currentMode === MODE.PRACTICE) {
    if (isCorrect) {
      result.textContent = `🎉 恭喜！你猜对了：${ANSWER.name}`;
      gameOver = true;
      input.disabled = true;
      newGameBtn.style.display = "inline-block";
      hideSuggestions();
    } else {
      result.textContent = `❌ ${guess.name}`;
    }
  } else {
    // ====== CHALLENGE ======
    const stageIndex = solvedCount + 1;

    if (isCorrect) {
     // 绿闪
     flash("green");

     const bonus = rewardHeartsForStage(stageIndex);
     const before = hearts;
     hearts += bonus;

     solvedCount += 1;

     const best = getBest();
     if (solvedCount > best) setBest(solvedCount);

     // 奖励
     renderHeartsBar(before, { popFrom: before }); // 先确保现有心显示稳定
     // 再追加 bonus 颗心
     for (let i = 0; i < bonus; i++) {
       const s = document.createElement("span");
     s.className = "heart gain";
       s.textContent = "❤️";
       heartsBar.appendChild(s);
     }
     displayedHearts = hearts;

     result.textContent = ` 这是你猜对的第 ${stageIndex} 位角色+${bonus} ❤️`;
     syncHUD();

     // 插入分割线
     renderDivider();

     // 切换下一位
     resetForNewTarget({ clearBoard: false });
     result.textContent = `挑战模式：准备猜第 ${solvedCount + 1} 位角色（❤️ ${hearts}）`;
     result.className = "card muted";

    } else {
     // 扣心 红闪 抖动 心消失动画
     hearts -= 1;

     flash("red");
     shakeWrap();
     loseOneHeartFx();
     displayedHearts = hearts; // 让 HUD 状态一致

     if (hearts <= 0) {
      syncHUD();
       endChallengeRun();
     } else {
     syncHUD();
     result.textContent = `❌ 不是这个人物哦`;
     }
    }
  }
  
  input.value = "";
  input.focus();
  updateSuggestions();
}

/* ======== 事件 ======= */

guessBtn.addEventListener("click", () => submit());

input.addEventListener("input", updateSuggestions);

input.addEventListener("keydown", (e) => {
  if (suggestionsEl.hidden) {
    if (e.key === "Enter") submit();
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIndex = Math.min(activeIndex + 1, currentSuggestions.length - 1);
    renderSuggestions(currentSuggestions);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIndex = Math.max(activeIndex - 1, 0);
    renderSuggestions(currentSuggestions);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (activeIndex >= 0 && currentSuggestions[activeIndex]) {
      submit(currentSuggestions[activeIndex].char);
    } else {
      submit();
    }
  } else if (e.key === "Escape") {
    hideSuggestions();
  }
});

document.addEventListener("mousedown", (e) => {
  if (!suggestionsEl.hidden) {
    const within = e.target === input || suggestionsEl.contains(e.target);
    if (!within) hideSuggestions();
  }
});

newGameBtn.addEventListener("click", () => {
  // newGameBtn 在练习模式重新开始一局
  // newGameBtn 在挑战模式重新开始挑战
  if (currentMode === MODE.CHALLENGE) startChallenge();
  else startPractice();
});

modePracticeBtn.addEventListener("click", () => startPractice());
modeChallengeBtn.addEventListener("click", () => startChallenge());

/* ========= 启动 ========= */
bestEl.textContent = String(getBest());
startPractice();

/* 公告关闭 */
const announce = document.getElementById("announceSticker");
const closeBtn = announce?.querySelector(".announce-close");

if (announce && closeBtn) {
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    announce.style.display = "none";
  });
}

