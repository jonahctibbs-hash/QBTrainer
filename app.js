/* QB Trainer web app — offline-capable static port of the Android app. */
"use strict";

const CAT_ORDER = ["Literature","History","Science","Fine Arts","Religion","Mythology","Philosophy","Social Science","Current Events","Geography","Other Academic","Pop Culture"];
const CAT_COLORS = { "Literature":"#375A7F","History":"#00BC8C","Science":"#E74C3C","Fine Arts":"#FD7E14" };
const DEFAULT_CAT_COLOR = "#6C757D";
const catColor = c => CAT_COLORS[c] || DEFAULT_CAT_COLOR;
const onCatColor = hex => {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299*r + 0.587*g + 0.114*b) / 255 > 0.55 ? "#1A1A1A" : "#FFFFFF";
};
// Material Design "star" and "emoji_events" (trophy) paths — same glyphs as the APK
const STAR_PATH = "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
const TROPHY_PATH = "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 9.94 5 8.6 5 8zm14 0c0 1.6-.84 2.94-2 3.82V7h2v1z";
const TROPHY_FILL = "evenodd";
const svgIcon = (path, cls, filled, rule) => `<svg class="${cls}${filled ? "" : " dim"}" viewBox="0 0 24 24"><path ${filled ? `fill="currentColor"${rule ? ` fill-rule="${rule}"` : ""}` : `fill="none" stroke="currentColor" stroke-width="1.6"`} d="${path}"/></svg>`;
const STAR_SVG = sel => svgIcon(STAR_PATH, "badge-ico", sel);
const TROPHY_SVG = sel => svgIcon(TROPHY_PATH, "badge-ico bigbadge", sel, TROPHY_FILL);

const $app = () => document.getElementById("app");
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const singularize = w => (w && w.length > 3 && /s$/.test(w) && !/(ss|us|is)$/.test(w)) ? w.slice(0, -1) : w;
// normalized form for identity checks: lowercase, alphanumerics only — so
// "The Waste Land" and The Waste Land can't be mistaken for different answers
const normAns = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
// crude stemmer for trick-pair detection (matrix/matrices, tree/Trees, ...)
const stemTok = w => w.replace(/ices$/, "ix").replace(/ies$/, "y").replace(/sses$/, "ss").replace(/(ches|shes|xes|zes)$/, m => w.length > 4 ? m.slice(0, -2) : m).replace(/(?<!ss|us|is)s$/, m => w.length > 3 ? "" : m);
const stemSet = s => new Set(normAns(s).match(/[a-z0-9]+/g)?.map(stemTok) || []);
const lev1 = (a, b) => {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let cur = [i], diag = prev[0];
    for (let j = 1; j <= b.length; j++) {
      const above = prev[j];
      cur[j] = Math.min(above + 1, cur[j - 1] + 1, diag + (a[i - 1] !== b[j - 1] ? 1 : 0));
      diag = above;
    }
    prev.splice(0, prev.length, ...cur);
  }
  return prev[b.length];
};
// True when ans and x are the same answer in different clothing: plural/case
// variants, spelling variants, or a trivially derivative substring.
const tooSimilar = (ans, x) => {
  if (normAns(ans) === normAns(x)) return true;
  const sa = stemSet(ans), sb = stemSet(x);
  const eq = (p, q) => p.size === q.size && [...p].every(v => q.has(v));
  if (eq(sa, sb)) return true;
  const da = [...sa].filter(v => !sb.has(v)), db = [...sb].filter(v => !sa.has(v));
  if (da.length <= 1 && db.length <= 1 && da[0] && db[0] && da[0].length >= 5 && db[0].length >= 5 && lev1(da[0], db[0]) <= 2) return true;
  if ([...sa].every(v => sb.has(v)) || [...sb].every(v => sa.has(v))) {
    const na = normAns(ans), nb = normAns(x);
    const short = na.length <= nb.length ? na : nb, lng = na.length <= nb.length ? nb : na;
    const st = short.match(/[a-z0-9]+/g) || [];
    if (st.length <= 2 && lng.length / Math.max(1, short.length) > 1.8) return true;
  }
  return false;
};
const notTrick = ans => x => !tooSimilar(ans, x);

/** Compact number: 950 -> 950, 1200 -> 1.2k, 2500000 -> 2.5m */
const fmtCount = n => n >= 1e6 ? (Math.round(n / 1e5) / 10) + "m" : n >= 1000 ? (Math.round(n / 100) / 10) + "k" : String(n);

/** Brighter, more saturated version of a hex color (for badge icons). */
function vibrantColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  s = Math.min(1, Math.max(0.65, s * 1.6));   // boost saturation
  l = Math.min(0.62, Math.max(0.52, l));      // keep it bright
  const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
  const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s, p2 = 2 * l - q2;
  const to255 = v => Math.round(v * 255).toString(16).padStart(2, "0");
  return "#" + to255(hue2rgb(p2, q2, h + 1/3)) + to255(hue2rgb(p2, q2, h)) + to255(hue2rgb(p2, q2, h - 1/3));
}

/* ---------- data ---------- */
let DATA = null;
let buckets = [];            // {category, subKey, alternate, topAnswers, types, questionsByAnswer}
// (reset on every loadData)
let distractorsByCat = {}, distractorsBySub = {}, closeBySub = {}, answerTypes = {}, typedIndex = {};
const categoriesSet = () => new Set(buckets.map(b => b.category));

async function loadData() {
  DATA = await (await fetch("questions.json")).json();
  buckets = []; distractorsByCat = {}; distractorsBySub = {}; closeBySub = {}; answerTypes = {}; typedIndex = {};
  answerTypes = DATA.answer_types || {};
  for (const [cat, ce] of Object.entries(DATA.categories)) {
    distractorsByCat[cat] = ce.distractors || [];
    for (const [key, sd] of Object.entries(ce.subcat_data)) {
      const alt = !!sd.alternate;
      buckets.push({ category: cat, subKey: key, alternate: alt, topAnswers: sd.top_answers, types: sd.types || {}, questionsByAnswer: sd.questions });
      distractorsBySub[cat + "|" + key] = ce.subcat_distractors[key] || [];
      closeBySub[cat + "|" + key] = sd.close_distractors || {};
      for (const [ans, t] of Object.entries(sd.types || {})) {
        if (t) (typedIndex[cat] = typedIndex[cat] || {})[t] = (typedIndex[cat][t] || new Set()).add(ans);
      }
    }
  }
}

/* ---------- persistence ---------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};
const settings = {
  selectedKeys: new Set(LS.get("selectedKeys", [])),
  selectedCats: new Set(LS.get("selectedCats", [])),
  roundLength: LS.get("roundLength", 10),
  topN: LS.get("topN", 30),
  wpm: LS.get("wpm", 300),
  theme: LS.get("theme", "dark"),
};
function saveSettings() {
  LS.set("selectedKeys", [...settings.selectedKeys]);
  LS.set("selectedCats", [...settings.selectedCats]);
  LS.set("roundLength", settings.roundLength);
  LS.set("topN", settings.topN);
  LS.set("wpm", settings.wpm);
  LS.set("theme", settings.theme);
}
let statsData = LS.get("stats", {});
/* ---- editable keybinds ---- */
const KEY_DEFAULTS = {
  home_keys: "KeyK",
  home_stats: "KeyS", home_selectAll: "KeyA", home_clear: "KeyC", home_theme: "KeyT", home_start: "Enter",
  nav_left: "ArrowLeft", nav_right: "ArrowRight", nav_up: "ArrowUp", nav_down: "ArrowDown", nav_toggle: "Space",
  quiz_pause: "KeyP", quiz_reveal: "KeyA",
  back: "Escape",
  result_again: "Enter", result_done: "Escape",
  stats_study: "KeyS",
};
const KEY_GROUPS = [
  { title: "All pages", items: [["back", "Back / exit"]] },
  { title: "Home", items: [
    ["home_keys", "Open keybinds"],
    ["home_stats", "Open stats"], ["home_selectAll", "Select all"], ["home_clear", "Clear selection"],
    ["home_theme", "Cycle theme"], ["home_start", "Start round"],
  ]},
  { title: "Category navigation", items: [
    ["nav_left", "Move left"], ["nav_right", "Move right"], ["nav_up", "Move up"], ["nav_down", "Move down"],
    ["nav_toggle", "Check / uncheck tile"],
  ]},
  { title: "Questions", items: [
    ["quiz_pause", "Pause / resume"], ["quiz_reveal", "Reveal all"],
  ]},
  { title: "Round complete", items: [
    ["result_again", "Play another round"], ["result_done", "Done"],
  ]},
  { title: "Stats", items: [["stats_study", "Study these"]], },
];
const KEY_LABELS = { ArrowLeft: "\u2190", ArrowRight: "\u2192", ArrowUp: "\u2191", ArrowDown: "\u2193", Enter: "Enter", Escape: "Esc", Space: "Space" };
const keyLabel = code => KEY_LABELS[code] || code.replace(/^Key/, "").replace(/^Digit/, "");
settings.keys = LS.get("keys", {});
const keyOf = id => settings.keys[id] || KEY_DEFAULTS[id];
let keyCapture = null;   // action id currently being rebound
// peek must not create entries (that used to pollute stats with 0-attempt records → NaN% badges)
const statsGet = (c, s, a) => statsData[`${c}|${s}|${a}`] || { c: 0, w: 0 };
const statsRecord = (c, s, a, ok) => { const k = `${c}|${s}|${a}`; const r = statsData[k] || (statsData[k] = { c: 0, w: 0 }); ok ? r.c++ : r.w++; LS.set("stats", statsData); };
const scopeFor = (cat, sub) => DEFAULT_SUB_SCOPED.has(cat + "|" + sub) ? "sub" : "cat";
let DEFAULT_SUB_SCOPED = new Set();

/* ---------- helpers over buckets ---------- */
const keysByCategory = () => {
  const m = {};
  buckets.forEach(b => (m[b.category] = m[b.category] || []).push(b.subKey));
  return m;
};
const alternatesByCategory = () => {
  const m = {};
  buckets.forEach(b => { if (b.alternate) (m[b.category] = m[b.category] || new Set()).add(b.subKey); });
  return m;
};

/* ---------- round generation (port of the Android engine) ---------- */
function buildRound(selectedKeys, count) {
  const bs = buckets.filter(b => selectedKeys.has(b.category + "|" + b.subKey));
  if (!bs.length) return [];
  const distractorPoolByCat = {};
  for (const c of new Set(bs.map(b => b.category))) distractorPoolByCat[c] = distractorsByCat[c] || [];

  const weighted = [];
  const qPools = new Map();
  for (const b of bs) for (const a of b.topAnswers.slice(0, settings.topN)) {
    const qs = b.questionsByAnswer[a] || [];
    if (!qs.length) continue;
    const s = statsGet(b.category, b.subKey, a);
    const w = Math.min(5, Math.max(0.25, 1 + 2 * Math.min(s.w, 3) - 0.5 * s.c));
    weighted.push({ b, a, w });
    qPools.set(b.category + "|" + b.subKey + "|" + a, qs);
  }

  const used = new Set(), recent = [], round = [];
  let guard = 0;
  while (round.length < count && guard++ < count * 30) {
    const eligible = weighted.filter(wk => !recent.slice(-3).includes(wk.a));
    const total = (eligible.length ? eligible : weighted).reduce((s, wk) => s + wk.w, 0);
    let r = Math.random() * total, picked = weighted[0];
    for (const wk of (eligible.length ? eligible : weighted)) { r -= wk.w; if (r <= 0) { picked = wk; break; } }
    const qs = (qPools.get(picked.b.category + "|" + picked.b.subKey + "|" + picked.a) || []).filter(q => !used.has(q.id));
    const q = qs.length ? qs[Math.floor(Math.random() * qs.length)] : null;
    if (!q) continue;
    used.add(q.id); recent.push(picked.a);

    // distractors: same-type first, then scope, then category
    const scope = scopeFor(picked.b.category, picked.b.subKey);
    const subPool = (distractorsBySub[picked.b.category + "|" + picked.b.subKey] || []).filter(x => x !== picked.a);
    const catPool = (distractorPoolByCat[picked.b.category] || []).filter(x => x !== picked.a);
    const scopePool = (scope === "sub" && subPool.length >= 3) ? subPool : catPool;
    const type = picked.b.types[picked.a] || answerTypes[picked.a] || null;
    const chosen = [];
    // 1) precomputed close distractors: same-subcategory answers ranked by
    //    shared type + shared significant tokens (confusable with the answer)
    const closeList = (closeBySub[picked.b.category + "|" + picked.b.subKey]?.[picked.a] || []).filter(notTrick(picked.a));
    // take the 6 highest-ranked close distractors, then pick 2 of them at random
    // (ranked enough to stay close, random enough to stay unpredictable)
    shuffle(closeList.slice(0, 6)).slice(0, 2).forEach(x => { if (chosen.length < 2 && !chosen.includes(x) && normAns(x) !== normAns(picked.a)) chosen.push(x); });
    // 2) one same-type distractor from anywhere in the category (variety)
    const ok = notTrick(picked.a);
    const addSameType = from => { if (!type) return; shuffle(from.filter(x => answerTypes[x] === type && ok(x))).forEach(x => { if (chosen.length < 3 && !chosen.includes(x)) chosen.push(x); }); };
    addSameType(scopePool);
    if (chosen.length < 3 && type) shuffle([...((typedIndex[picked.b.category] || {})[type] || [])]).forEach(x => { if (chosen.length < 3 && ok(x) && !chosen.includes(x)) chosen.push(x); });
    shuffle(scopePool.concat(catPool)).forEach(x => { if (chosen.length < 3 && ok(x) && !chosen.includes(x)) chosen.push(x); });
    if (chosen.length < 3) continue;
    const choices = shuffle(chosen.concat(picked.a));
    round.push({ q, category: picked.b.category, subKey: picked.b.subKey, choices, correctIndex: choices.indexOf(picked.a) });
  }
  return round;
}

/* ---------- app state ---------- */
let view = "home";
let round = [], rIdx = 0, revealed = 0, paused = false, chosenIdx = -1, cursor = -1, roundResults = [];
let readerTimer = null, gamepadSeen = false, lastGamepadButtons = [];

function applyTheme() { document.body.classList.toggle("dark", settings.theme === "dark" || (settings.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)); }

/* ---------- views ---------- */
function navigate(v) { view = v; render(); }

function render() {
  applyTheme();
  if (view === "home") renderHome();
  else if (view === "quiz") renderQuiz();
  else if (view === "results") renderResults();
  else if (view === "stats") renderStats();
  else if (view === "keys") renderKeys();
}

function tile(label, color, selected, onClick, extra = "") {
  const el = document.createElement("div");
  el.className = "tile" + (selected ? " selected" : "") + (extra ? " " + extra : "");
  el.style.setProperty("--tile", color);
  el.style.setProperty("--on-tile", onCatColor(color));
  const size = label.length > 18 ? 11 : label.length > 12 ? 13 : 15;
  el.style.fontSize = size + "px";
  el.textContent = label;
  el.addEventListener("click", onClick);
  return el;
}
const grid3 = children => { const g = document.createElement("div"); g.className = "grid3"; children.forEach(c => g.appendChild(c)); return g; };
const sectionLabel = t => { const d = document.createElement("div"); d.className = "section-label"; d.textContent = t; return d; };

function renderHome() {
  const kbc = keysByCategory(), abc = alternatesByCategory();
  const order = c => { const i = CAT_ORDER.indexOf(c); return i === -1 ? 99 + c.length : i; };
  const cats = Object.keys(kbc).sort((a, b) => order(a) - order(b));

  const prevScroll = document.getElementById("pickerScroll")?.scrollTop || 0;
  const root = document.createElement("div");
  root.className = "home-root";
  root.innerHTML = `
    <div id="homeHead">
    <div class="row">
      <h1>QB Trainer</h1><span class="spacer"></span><span id="badges"></span>
      <button class="textbtn" id="btnKeys">Keybinds</button>
      <button class="textbtn" id="btnStats">Stats</button>
    </div>
    <div class="row slider-row" id="rowRound" style="margin-top:14px"><span id="lblRound">Round length: ${settings.roundLength}</span><input type="range" id="rngRound" min="5" max="40" value="${settings.roundLength}"></div>
    <div class="row slider-row" id="rowWpm"><span id="lblWpm">Reading: ${settings.wpm} wpm</span><input type="range" id="rngWpm" min="100" max="600" step="10" value="${settings.wpm}"></div>
    <div class="row slider-row" id="rowTopN"><span id="lblTopN">Top answers per subcategory: ${settings.topN}</span><input type="range" id="rngTopN" min="1" max="100" value="${settings.topN}"></div>
    <div class="row" style="margin-top:8px">
      <button class="textbtn" id="btnAll">Select all</button>
      <button class="textbtn" id="btnClear">Clear</button>
      <button class="textbtn" id="btnTheme">Theme: ${{ dark: "Dark", light: "Light", system: "Auto" }[settings.theme]}</button>
    </div>
    </div>
    <div id="pickerScroll"><div id="picker"></div></div>
    <button class="btn" id="btnStart" ${settings.selectedKeys.size ? "" : "disabled"}>${settings.selectedKeys.size ? "Start round" : "Select at least one category"}</button>
    <div class="progress" id="ctrlHint" style="text-align:center; display:${gamepadSeen ? "block" : "none"}">Controller detected — A select · B pause · Y reveal · D-pad move</div>
  `;
  $app().replaceChildren(root);

  const bc = badgeCounts();
  if (bc[0] || bc[1]) root.querySelector("#badges").innerHTML =
    `${bc[0] ? STAR_SVG(true) + `<b>${bc[0]}</b>&nbsp;&nbsp;` : ""}${bc[1] ? TROPHY_SVG(true) + `<b>${bc[1]}</b>` : ""}`;

  root.querySelector("#btnStats").onclick = () => navigate("stats");
  root.querySelector("#btnKeys").onclick = () => navigate("keys");
  root.querySelector("#btnAll").onclick = () => { cats.forEach(c => { settings.selectedCats.add(c); kbc[c].forEach(k => settings.selectedKeys.add(c + "|" + k)); }); saveSettings(); render(); };
  root.querySelector("#btnClear").onclick = () => { settings.selectedKeys.clear(); settings.selectedCats.clear(); saveSettings(); render(); };
  root.querySelector("#btnTheme").onclick = () => { settings.theme = { dark: "light", light: "system", system: "dark" }[settings.theme]; saveSettings(); render(); };
  const fill = el => el.style.setProperty("--fill", ((el.value - el.min) / (el.max - el.min) * 100) + "%");
  const rr = root.querySelector("#rngRound"), rw = root.querySelector("#rngWpm"), rt = root.querySelector("#rngTopN");
  fill(rr); fill(rw); fill(rt);
  rr.oninput = e => { settings.roundLength = +e.target.value; saveSettings(); root.querySelector("#lblRound").textContent = `Round length: ${settings.roundLength}`; fill(e.target); };
  rw.oninput = e => { settings.wpm = +e.target.value; saveSettings(); root.querySelector("#lblWpm").textContent = `Reading: ${settings.wpm} wpm`; fill(e.target); };
  rt.oninput = e => { settings.topN = +e.target.value; saveSettings(); root.querySelector("#lblTopN").textContent = `Top answers per subcategory: ${settings.topN}`; fill(e.target); };
  root.querySelector("#btnStart").onclick = () => {
    const items = buildRound(settings.selectedKeys, settings.roundLength);
    if (!items.length) return;
    startNewRound(items);
  };

  renderPicker(root, kbc, abc, cats);
  // restore scroll AFTER the picker has content — setting it on an empty
  // container clamps to 0 and the user gets yanked to the top
  root.querySelector("#pickerScroll").scrollTop = prevScroll;
  applyHomeCursor();
}

/* ---- keyboard navigation over the picker tiles ---- */
let homeTiles = [];   // {el, onClick} in visual order (cats, then subs)
let homeCursor = -1;
/* slider keyboard editing: -1 = tiles focused; 0..2 = slider row focused */
let sliderIdx = -1, sliderEditing = false;
const SLIDER_ROWS = ["rowRound", "rowWpm", "rowTopN"], SLIDER_INPUTS = ["rngRound", "rngWpm", "rngTopN"];
function applySliderFocus() {
  SLIDER_ROWS.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("kb-cursor", i === sliderIdx);
    el.classList.toggle("kb-editing", i === sliderIdx && sliderEditing);
  });
}
function enterSliders() {
  sliderIdx = SLIDER_ROWS.length - 1;   // land on the slider nearest the tiles
  sliderEditing = false;
  homeCursor = -1;
  applyHomeCursor();
  applySliderFocus();
}
function adjustSlider(dir) {
  const inp = document.getElementById(SLIDER_INPUTS[sliderIdx]);
  if (!inp) return;
  inp.value = +inp.value + dir * (+inp.step || 1);
  inp.dispatchEvent(new Event("input"));
}
function applyHomeCursor() {
  if (homeCursor < 0 || !homeTiles.length) {
    homeTiles.forEach(t => t.el.classList.remove("kb-cursor"));
    return;
  }
  homeCursor = Math.max(0, Math.min(homeCursor, homeTiles.length - 1));
  homeTiles.forEach((t, i) => t.el.classList.toggle("kb-cursor", i === homeCursor));
  homeTiles[homeCursor].el.scrollIntoView({ block: "nearest" });
}
function moveHomeCursor(d) {
  if (!homeTiles.length) return;
  mouseTravel = 0;   // keyboard just took over — ignore tiny mouse jitters
  if (homeCursor < 0) {
    homeCursor = 0;
  } else {
    const cols = matchMedia("(min-width: 720px)").matches ? 4 : 3;
    if (d === "left") homeCursor = Math.max(0, homeCursor - 1);
    else if (d === "right") homeCursor = Math.min(homeTiles.length - 1, homeCursor + 1);
    else if (d === "up") homeCursor = Math.max(0, homeCursor - cols);
    else homeCursor = Math.min(homeTiles.length - 1, homeCursor + cols);
  }
  applyHomeCursor();
}

/* start a fresh round from arbitrary UI paths (home Start, play again, study) */
function startNewRound(items) {
  round = items;
  rIdx = 0;
  roundResults = [];
  navigate("quiz");
  startQuestion();
}

function renderPicker(root, kbc, abc, cats) {
  const picker = root.querySelector("#picker");
  picker.innerHTML = "";
  homeTiles = [];

  const catTiles = cats.map(c => {
    const t = tile(c, catColor(c), settings.selectedCats.has(c), () => {
      const keys = kbc[c].map(k => c + "|" + k);
      if (settings.selectedCats.has(c)) { settings.selectedCats.delete(c); keys.forEach(k => settings.selectedKeys.delete(k)); }
      else { settings.selectedCats.add(c); keys.forEach(k => settings.selectedKeys.add(k)); }
      saveSettings(); render();
    });
    homeTiles.push({ el: t });
    return t;
  });
  picker.appendChild(Object.assign(sectionLabel("Categories")));
  picker.appendChild(grid3(catTiles));

  // one combined subcategory section: all selected categories' subcats flow continuously
  const active = cats.filter(c => settings.selectedCats.has(c) && kbc[c].some(k => k !== "(category)"));
  if (active.length) {
    const sec = document.createElement("div"); sec.className = "picker-section";
    sec.appendChild(sectionLabel("Subcategories"));
    sec.appendChild(grid3(active.flatMap(c =>
      kbc[c].filter(k => k !== "(category)").map(k => {
        const t = tile(k, catColor(c), settings.selectedKeys.has(c + "|" + k), () => { toggleKey(c, k); });
        homeTiles.push({ el: t });
        return t;
      })
    )));
    picker.appendChild(sec);
  }
}

function toggleKey(cat, sub) {
  const key = cat + "|" + sub;
  settings.selectedKeys.has(key) ? settings.selectedKeys.delete(key) : settings.selectedKeys.add(key);
  saveSettings(); render();
}

/* ---------- quiz ---------- */
function tokenize(text) { return text.replace(/\(\*\)/g, " \u00A7 ").split(/\s+/).filter(Boolean); }

function startQuestion() {
  revealed = 0; paused = false; chosenIdx = -1; cursor = -1;
  renderQuiz();
  scheduleReader();
}

function scheduleReader() {
  clearTimeout(readerTimer);
  if (paused || chosenIdx >= 0) return;
  readerTimer = setTimeout(() => {
    if (view !== "quiz" || paused || chosenIdx >= 0) return;
    revealed++;
    updateReveal();
    if (revealed < currentTokens().length) scheduleReader();
  }, 60000 / settings.wpm);
}

function currentTokens() { return tokenize(round[rIdx].q.question); }

function updateReveal() {
  const box = document.getElementById("question");
  if (!box) return;
  const tokens = currentTokens();
  let html = "";
  tokens.slice(0, revealed).forEach((tok, i) => {
    html += tok === "\u00A7" ? `<span class="power">(*)</span>` : esc(tok);
    if (i < revealed - 1) html += " ";
  });
  box.innerHTML = html;
  if (revealed > 0 && !paused && chosenIdx < 0) box.scrollTop = box.scrollHeight;
}

function renderQuiz() {
  if (!round.length) { navigate("home"); return; }
  if (rIdx >= round.length) { finishRound(); return; }
  const item = round[rIdx];
  const tokens = tokenize(item.q.question);
  const done = chosenIdx >= 0, isLast = rIdx === round.length - 1;
  const subLabel = item.subKey === "(category)" ? item.category : `${item.category} · ${item.subKey}`;

  const root = document.createElement("div");
  root.className = "quiz-root";
  root.innerHTML = `
    <div class="row">
      <button class="textbtn" id="btnExit">Exit</button><span class="spacer"></span>
      <b>Question ${rIdx + 1} / ${round.length}</b><span class="spacer"></span>
      <span class="muted">Score ${roundResults.filter(r => r.ok).length}</span>
    </div>
    <div class="row" style="margin:4px 0">
      <button class="chip" id="btnPause">${paused ? "Resume" : "Pause"}</button>
      <button class="chip" id="btnReveal">Reveal all</button>
      <button class="chip" id="subChip">${esc(subLabel)}</button>
    </div>
    <div id="question"></div>
    <div id="bottom">
      <div id="choices"></div>
      <div id="verdict"></div>
      <button class="btn" id="btnNext" style="display:none">${isLast ? "See results" : "Next question"}</button>
    </div>
  `;
  $app().replaceChildren(root);
  updateReveal();

  const choicesEl = root.querySelector("#choices");
  item.choices.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "choice" + (i === cursor ? " cursor" : "");
    let cls = "";
    if (done && i === item.correctIndex) cls = "correct";
    else if (done && i === chosenIdx) cls = "wrong";
    if (cls) b.classList.add(cls);
    b.innerHTML = `<span class="num">${i + 1}</span><span>${esc(c)}</span>`;
    b.onclick = () => done ? nextQuestion() : submit(i);
    choicesEl.appendChild(b);
  });

  if (done) {
    const ok = chosenIdx === item.correctIndex;
    const v = root.querySelector("#verdict");
    v.className = "verdict " + (ok ? "correct" : "wrong");
    v.textContent = (ok ? "Correct!  " : "Incorrect.  ") + item.q.answer;
    const nb = root.querySelector("#btnNext");
    nb.style.display = "block";
    nb.onclick = nextQuestion;
  }

  root.querySelector("#btnExit").onclick = () => { clearTimeout(readerTimer); navigate("home"); };
  root.querySelector("#btnPause").onclick = () => { paused = !paused; if (!paused) scheduleReader(); renderQuiz(); };
  root.querySelector("#btnReveal").onclick = () => { revealed = tokens.length; updateReveal(); };
}

function submit(i) {
  if (chosenIdx >= 0) return;
  chosenIdx = i;
  const item = round[rIdx];
  const ok = i === item.correctIndex;
  roundResults.push({ item, ok });
  statsRecord(item.category, item.subKey, answerKeyOf(item), ok);
  renderQuiz();
}
const answerKeyOf = item => item.choices[item.correctIndex];

function nextQuestion() {
  if (chosenIdx < 0) return;
  if (rIdx === round.length - 1) { finishRound(); }
  else { rIdx++; startQuestion(); }
}

function finishRound() { navigate("results"); }

function renderResults() {
  const score = roundResults.filter(r => r.ok).length;
  const byAnswer = {};
  roundResults.forEach(r => {
    const k = r.item.choices[r.item.correctIndex];
    byAnswer[k] = byAnswer[k] || { c: 0, n: 0 }; byAnswer[k].c += r.ok ? 1 : 0; byAnswer[k].n++;
  });
  const rows = Object.entries(byAnswer).sort((a, b) => (a[1].c / a[1].n) - (b[1].c / b[1].n));
  const weak = Object.entries(statsData).filter(([, v]) => v.w > 0).sort((a, b) => b[1].w - a[1].w).slice(0, 8);

  const root = document.createElement("div");
  root.className = "results-root";
  root.innerHTML = `
    <div>
      <h1>Round complete</h1>
      <div class="muted" style="font-size:18px">${score} / ${roundResults.length} correct (<b>${roundResults.length ? Math.round(score * 100 / roundResults.length) : 0}%</b>)</div>
      <div class="section-label">This round, by answer:</div>
      <div class="zebra">${rows.map(([ans, r]) => { const all = r.c === r.n; return `<div class="statrow"><span class="name answer-name" style="color:${all ? "var(--correct)" : "var(--wrong)"}">${esc(ans)}</span><b style="color:${all ? "var(--correct)" : "var(--wrong)"}">${r.c}/${r.n}</b></div>`; }).join("")}</div>
      ${weak.length ? `<div class="section-label">Weakest answers over time:</div>` : ""}
      <div class="zebra">${weak.map(([k, v]) => { const p = k.split("|"); const worse = v.w > v.c; return `<div class="statrow weakrow"><span class="name leftwrap"><span class="answer-name" style="color:${worse ? "var(--wrong)" : "inherit"}">${esc(p[2] || k)}</span> <span class="subname">${esc(p[1] || "")}</span></span><span class="counts" style="color:${worse ? "var(--wrong)" : "inherit"}">${v.c} right · ${v.w} wrong</span></div>`; }).join("")}</div>
    </div>
    <div id="resBottom">
      <button class="btn" id="btnAgain">Play another round</button>
      <button class="btn outline" id="btnDone">Done</button>
    </div>
  `;
  $app().replaceChildren(root);
  root.querySelector("#btnDone").onclick = () => navigate("home");
  root.querySelector("#btnAgain").onclick = () => startNewRound(buildRound(settings.selectedKeys, settings.roundLength));
}

/* ---------- stats ---------- */
function badgeCounts(minPct = 85, minAttempts = 10) {
  const earned = c => (c.c + c.w) >= minAttempts && c.c * 100 / (c.c + c.w) >= minPct;
  const bySub = {}, byCat = {};
  for (const [k, v] of Object.entries(statsData)) {
    const p = k.split("|");
    const sk = p[0] + "|" + p[1];
    bySub[sk] = bySub[sk] || { c: 0, w: 0 }; bySub[sk].c += v.c; bySub[sk].w += v.w;
    byCat[p[0]] = byCat[p[0]] || { c: 0, w: 0 }; byCat[p[0]].c += v.c; byCat[p[0]].w += v.w;
  }
  const subs = Object.entries(bySub).filter(([, v]) => earned(v)).length;
  const cats = Object.entries(byCat).filter(([, v]) => earned(v)).length;
  return [subs, cats, bySub, byCat];
}

function renderStats() {
  const zebra = rows => `<div class="zebra">${rows}</div>`;
  const totals = Object.values(statsData).reduce((a, v) => ({ c: a.c + v.c, w: a.w + v.w }), { c: 0, w: 0 });
  const bySub = {};
  for (const [k, v] of Object.entries(statsData)) {
    const sk = k.split("|").slice(0, 2).join("|");
    bySub[sk] = bySub[sk] || { c: 0, w: 0 }; bySub[sk].c += v.c; bySub[sk].w += v.w;
  }
  const subStats = Object.entries(bySub).map(([k, v]) => ({ key: k, ...v, pct: v.c + v.w ? v.c * 100 / (v.c + v.w) : 0 }));
  const recommended = subStats.filter(s => s.c + s.w >= 5).sort((a, b) => a.pct - b.pct || (b.c + b.w) - (a.c + a.w)).slice(0, 5);
  const [, , bySubAll, byCatAll] = badgeCounts();
  const earnedSubs = new Set(Object.entries(bySubAll).filter(([, v]) => (v.c + v.w) >= 10 && v.c * 100 / (v.c + v.w) >= 85).map(([k]) => k));
  const earnedCats = new Set(Object.entries(byCatAll).filter(([, v]) => (v.c + v.w) >= 10 && v.c * 100 / (v.c + v.w) >= 85).map(([k]) => k));
  const kbc = keysByCategory();
  const weakest = Object.entries(statsData).filter(([, v]) => v.w > 0).sort((a, b) => b[1].w - a[1].w).slice(0, 10);

  const recHtml = recommended.length ? `
    <div class="recommend">
      <div class="sec-title" style="margin:0 0 6px">Recommended to study</div>
      <div class="zebra">${recommended.map(s => { const p = s.key.split("|"); return `<div class="statrow"><span class="name"><b>${esc((p[1] || "").replace("(category)", "(whole category)"))}</b><br><span class="muted" style="font-size:11px">${esc(p[0] || "")}</span></span><b style="color:${s.pct >= 70 ? "var(--correct)" : "var(--wrong)"}">${Math.round(s.pct)}%</b><span class="muted"> (${s.c + s.w} q)</span></div>`; }).join("")}</div>
      <button class="btn" id="btnStudy" style="margin-top:8px">Study these →</button>
    </div>` : "";

  const badgeHtml = `<div class="zebra">` + CAT_ORDER.filter(c => byCatAll[c] && (byCatAll[c].c + byCatAll[c].w) > 0).map(c => {
    const subs = Object.keys(bySubAll).filter(k => k.startsWith(c + "|"));
    const catRec = byCatAll[c];
    const catEarned = earnedCats.has(c);
    const pct = catRec.c + catRec.w ? Math.round(catRec.c * 100 / (catRec.c + catRec.w)) : 0;
    const starRow = subs.length ? `<div class="stars">${subs.sort().map(k => STAR_SVG(earnedSubs.has(k))).join("")}</div>` : "";
    const cc = catColor(c);
    return `<div class="badgecat">
      <div class="row1"><span style="color:${cc};display:inline-flex">${TROPHY_SVG(catEarned)}</span><span class="name" style="color:${cc};font-weight:700">${esc(c)}</span><b style="font-size:12px">${pct}%</b></div>
      ${starRow ? `<div class="stars" style="color:${cc}">${subs.sort().map(k => STAR_SVG(earnedSubs.has(k))).join("")}</div>` : ""}
    </div>`;
  }).join("") + `</div>`;

  // grouped by category, color-coded headers, subcats nested under each
  const catGroups = CAT_ORDER.filter(c => subStats.some(s => s.key.startsWith(c + "|") && s.c + s.w > 0)).map(c => {
    const rows = subStats.filter(s => s.key.startsWith(c + "|") && s.c + s.w > 0)
      .sort((a, b) => (b.c + b.w) - (a.c + a.w)).map(s => {
        const p = s.key.split("|");
        const col = s.pct >= 70 ? "var(--correct)" : "var(--wrong)";
        return `<div class="statrow">
          <span class="name">${earnedSubs.has(s.key) ? STAR_SVG(true) + " " : ""}${esc((p[1] || "?").replace("(category)", "(whole)"))}</span>
          <div class="bar"><div style="width:${Math.round(s.pct)}%;background:${col}"></div></div>
          <span class="pctcol"><b style="color:${col}">${Math.round(s.pct)}%</b> <span class="muted">(${fmtCount(s.c + s.w)})</span></span>
        </div>`;
      }).join("");
    return `<div class="catgroup" style="border:2px solid ${catColor(c)}"><div class="cathead" style="color:${catColor(c)}">${esc(c)}</div>${rows}</div>`;
  }).join("");

  const weakestRows = weakest.map(([k, v]) => { const p = k.split("|"); const cc = catColor(p[0] || ""); return `<div class="statrow"><span class="name"><b style="color:${cc}">${esc(p[2] || k)}</b><br><span class="muted" style="font-size:10px">${esc((p[1] || "").replace("(category)", "(whole)")) + " · " + esc(p[0] || "")}</span></span><b style="color:${v.w > v.c ? "var(--wrong)" : "inherit"}; font-size:12px">${v.c} right · ${v.w} wrong</b></div>`; }).join("");

  const root = document.createElement("div");
  root.innerHTML = `
    <div class="row"><button class="textbtn" id="btnBack">← Back</button></div>
    <h1>Stats</h1>
    <div class="muted">${totals.c + totals.w ? `Overall: ${totals.c} / ${totals.c + totals.w} correct (${Math.round(totals.c * 100 / (totals.c + totals.w))}%)` : "No attempts yet — play a round!"}</div>
    <div class="stats-cols">
      <div>
        ${recHtml}
        <div class="sec-title">Badges</div>
        <div class="muted" style="font-size:11px">star = subcategory, trophy = category — 85%+ all-time accuracy over 10+ attempts</div>
        ${badgeHtml}
      </div>
      <div>
        <div class="sec-title" style="margin-top:0">Accuracy by subcategory</div>
        ${catGroups}
      </div>
      <div>
        ${weakest.length ? `<div class="sec-title weakest-title">Weakest answers</div><div class="zebra">${weakestRows}</div>` : ""}
      </div>
    </div>
  `;
  $app().replaceChildren(root);
  root.querySelector("#btnBack").onclick = () => navigate("home");
  const st = root.querySelector("#btnStudy");
  if (st) st.onclick = () => {
    // select exactly the recommended subcategories and immediately start a round
    settings.selectedKeys = new Set(recommended.map(s => s.key));
    settings.selectedCats = new Set(recommended.map(s => s.key.split("|")[0]));
    saveSettings();
    startNewRound(buildRound(settings.selectedKeys, settings.roundLength));
  };
}

/* ---------- keybinds page ---------- */
let keysRows = [];   // {el, id} for arrow-key navigation
let keysCursor = -1;
function applyKeysCursor() {
  if (keysCursor < 0 || !keysRows.length) {
    keysRows.forEach(r => r.el.classList.remove("kb-cursor"));
    return;
  }
  keysCursor = Math.max(0, Math.min(keysCursor, keysRows.length - 1));
  keysRows.forEach((r, i) => r.el.classList.toggle("kb-cursor", i === keysCursor));
  keysRows[keysCursor].el.scrollIntoView({ block: "nearest" });
}
function renderKeys() {
  const root = document.createElement("div");
  keysRows = [];
  const groups = KEY_GROUPS.map(g => `
    <div class="section-label" style="margin-top:18px">${g.title}</div>
    <div class="zebra">${g.items.map(([id, label]) => {
      const rowId = `keysrow-${id}`;
      return `
      <div class="statrow" id="${rowId}">
        <span class="name">${esc(label)}</span>
        <button class="chip keychip" data-key="${id}">${keyCapture === id ? "Press a key\u2026" : `<b>${esc(keyLabel(keyOf(id)))}</b>`}</button>
      </div>`;}).join("")}</div>`).join("");
  root.innerHTML = `
    <div class="row"><button class="textbtn" id="btnBack">Back</button><span class="spacer"></span>
      <button class="textbtn" id="btnReset">Reset defaults</button></div>
    <h1>Keybinds</h1>
    <div class="muted" style="font-size:13px">Click a binding, then press the new key. Esc cancels. Backspace returns.</div>
    ${groups}
  `;
  $app().replaceChildren(root);
  root.querySelector("#btnBack").onclick = () => navigate("home");
  root.querySelector("#btnReset").onclick = () => { settings.keys = {}; LS.set("keys", settings.keys); render(); };
  root.querySelectorAll(".keychip").forEach(btn => {
    btn.onclick = () => { keyCapture = btn.dataset.key; render(); };
  });
  keysRows = [...root.querySelectorAll(".statrow[id^='keysrow-']")].map(el => ({ el, id: el.querySelector(".keychip").dataset.key }));
  applyKeysCursor();
}

/* ---------- dialogs ---------- */
function modal(html) {
  const back = document.createElement("div"); back.className = "modal-backdrop";
  const m = document.createElement("div"); m.className = "modal"; m.innerHTML = html;
  back.appendChild(m); document.body.appendChild(back);
  back.addEventListener("click", e => { if (e.target === back) back.remove(); });
  return { back, m };
}

document.addEventListener("keydown", e => {
  // rebinding capture: take the next key for the action being edited
  if (keyCapture) {
    e.preventDefault();
    if (e.code === "Escape") { keyCapture = null; render(); return; }
    settings.keys[keyCapture] = e.code;
    // drop the same key from any other custom binding so it stays unique
    for (const k of Object.keys(settings.keys)) if (k !== keyCapture && settings.keys[k] === e.code) delete settings.keys[k];
    LS.set("keys", settings.keys);
    keyCapture = null;
    render();
    return;
  }
  if (view === "keys") {
    if (e.code === keyOf("back") || e.code === "Backspace") { e.preventDefault(); navigate("home"); }
    else if (e.code === keyOf("nav_up")) { e.preventDefault(); keysCursor = keysCursor < 0 ? 0 : Math.max(0, keysCursor - 1); applyKeysCursor(); }
    else if (e.code === keyOf("nav_down")) { e.preventDefault(); keysCursor = keysCursor < 0 ? 0 : Math.min(keysRows.length - 1, keysCursor + 1); applyKeysCursor(); }
    else if (e.code === keyOf("nav_toggle") || e.code === "Enter") {
      e.preventDefault();
      if (keysCursor >= 0 && keysRows[keysCursor]) keyCapture = keysRows[keysCursor].id;
      render();
    }
    return;
  }
  if (view === "home") {
    if (e.code === keyOf("home_start")) { e.preventDefault(); const b = document.getElementById("btnStart"); if (b && !b.disabled) b.click(); }
    else if (e.code === keyOf("home_stats")) navigate("stats");
    else if (e.code === keyOf("home_keys")) navigate("keys");
    else if (e.code === keyOf("home_selectAll")) document.getElementById("btnAll")?.click();
    else if (e.code === keyOf("home_clear")) document.getElementById("btnClear")?.click();
    else if (e.code === keyOf("home_theme")) document.getElementById("btnTheme")?.click();
    else if (e.code === keyOf("nav_left")) {
      e.preventDefault();
      if (sliderIdx >= 0 && sliderEditing) adjustSlider(-1);
      else if (sliderIdx < 0) moveHomeCursor("left");
    }
    else if (e.code === keyOf("nav_right")) {
      e.preventDefault();
      if (sliderIdx >= 0 && sliderEditing) adjustSlider(1);
      else if (sliderIdx < 0) moveHomeCursor("right");
    }
    else if (e.code === keyOf("nav_up")) {
      e.preventDefault();
      if (sliderIdx > 0) { sliderIdx--; sliderEditing = false; applySliderFocus(); }
      else if (sliderIdx === 0) { sliderIdx = -1; sliderEditing = false; applySliderFocus(); homeCursor = 0; applyHomeCursor(); }
      else if (homeCursor < 0) { homeCursor = 0; applyHomeCursor(); }
      else {
        const cols = matchMedia("(min-width: 720px)").matches ? 4 : 3;
        if (homeCursor < cols) enterSliders();   // up past the top row → sliders
        else moveHomeCursor("up");
      }
    }
    else if (e.code === keyOf("nav_down")) {
      e.preventDefault();
      if (sliderIdx >= 0) {
        if (sliderIdx < SLIDER_ROWS.length - 1) { sliderIdx++; sliderEditing = false; applySliderFocus(); }
        else { sliderIdx = -1; sliderEditing = false; applySliderFocus(); homeCursor = 0; applyHomeCursor(); }
      } else moveHomeCursor("down");
    }
    else if (e.code === keyOf("nav_toggle")) {
      e.preventDefault();
      if (sliderIdx >= 0) { sliderEditing = !sliderEditing; applySliderFocus(); }  // enter/confirm
      else if (homeCursor >= 0 && homeTiles[homeCursor]) homeTiles[homeCursor].el.click();
    }
    return;
  }
  if (view === "quiz") {
    const tokens = round[rIdx] ? currentTokens().length : 0;
    if (e.code === keyOf("quiz_pause")) { e.preventDefault(); paused = !paused; if (!paused) scheduleReader(); renderQuiz(); }
    else if (["Digit1", "Digit2", "Digit3", "Digit4"].includes(e.code)) submit(+e.code.slice(-1) - 1);
    else if (e.code === keyOf("quiz_reveal")) { revealed = tokens; updateReveal(); }
    else if (e.code === keyOf("back")) { clearTimeout(readerTimer); navigate("home"); }
    else if (e.code === "ArrowUp" || e.code === "ArrowDown") {
      e.preventDefault();
      cursor = e.code === "ArrowUp" ? (cursor <= 0 ? 3 : cursor - 1) : (cursor + 1) % 4;
      renderQuiz();
    } else if (e.code === "Enter") { if (chosenIdx >= 0) nextQuestion(); else if (cursor >= 0) submit(cursor); }
    return;
  }
  if (view === "results") {
    if (e.code === keyOf("result_again")) { e.preventDefault(); document.getElementById("btnAgain")?.click(); }
    else if (e.code === keyOf("result_done")) { e.preventDefault(); document.getElementById("btnDone")?.click(); }
    return;
  }
  if (view === "stats") {
    if (e.code === keyOf("back")) navigate("home");
    else if (e.code === keyOf("stats_study")) document.getElementById("btnStudy")?.click();
    return;
  }
});

// moving the mouse hands control back from the keyboard cursor
let lastMouse = null, mouseTravel = 0;
document.addEventListener("mousemove", e => {
  if (sliderIdx >= 0) { sliderIdx = -1; sliderEditing = false; applySliderFocus(); }
  if (view !== "home" || homeCursor < 0) { lastMouse = null; mouseTravel = 0; return; }
  if (lastMouse) mouseTravel += Math.abs(e.clientX - lastMouse.x) + Math.abs(e.clientY - lastMouse.y);
  lastMouse = { x: e.clientX, y: e.clientY };
  if (mouseTravel > 14) { homeCursor = -1; applyHomeCursor(); mouseTravel = 0; lastMouse = null; }
});

function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    const b = pad.buttons.map(x => x.pressed);
    const pressed = i => b[i] && !lastGamepadButtons[i];
    if (b.some(Boolean)) {
      gamepadSeen = true;
      const hint = document.getElementById("ctrlHint"); if (hint) hint.style.display = "block";
    }
    if (view === "quiz") {
      if (pressed(0)) { chosenIdx >= 0 ? nextQuestion() : (cursor >= 0 ? submit(cursor) : (paused = !paused, renderQuiz())); }
      if (pressed(1)) { paused = !paused; if (!paused) scheduleReader(); renderQuiz(); }
      if (pressed(3)) { revealed = currentTokens().length; updateReveal(); }
      if (pressed(12)) { cursor = cursor <= 0 ? 3 : cursor - 1; renderQuiz(); }
      if (pressed(13)) { cursor = (cursor + 1) % 4; renderQuiz(); }
    }
    lastGamepadButtons = b;
    break; // just the first connected pad
  }
  requestAnimationFrame(pollGamepad);
}

/* ---------- boot ---------- */
(async () => {
  applyTheme();
  await loadData();
  buckets.forEach(b => { if (!b.alternate && b.category !== "Literature") DEFAULT_SUB_SCOPED.add(b.category + "|" + b.subKey); });
  render();
  requestAnimationFrame(pollGamepad);
})();
