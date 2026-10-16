// Smoke test for webapp/app.js core logic with stubbed DOM
const fs = require("fs");
const vm = require("vm");

function makeEl() {
  return {
    style: { setProperty() {} },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [], dataset: {},
    appendChild(c) { this.children.push(c); },
    replaceChildren() { this.children = []; },
    addEventListener() {}, remove() {},
    querySelector() { return makeEl(); }, querySelectorAll() { return []; },
    scrollTop: 0, scrollHeight: 100,
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html || ""; },
  };
}
const store = new Map();
global.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
global.document = {
  addEventListener() {},
  getElementById: () => makeEl(),
  createElement: () => makeEl(),
  body: makeEl(),
};
global.matchMedia = () => ({ matches: true });
global.navigator = { getGamepads: () => [] };
global.requestAnimationFrame = () => {};
global.window = global;

global.fetch = async () => ({ json: async () => JSON.parse(fs.readFileSync("webapp/questions.json", "utf8")) });
const code = fs.readFileSync("webapp/app.js", "utf8");
const ctx = vm.createContext(global);
vm.runInContext(code, ctx);

(async () => {
  await vm.runInContext("loadData()", ctx);
  const tests = [];
  const t = (name, cond) => { tests.push([name, cond]); };

  const sel = new Set(["Science|Biology", "Science|Math", "Science|Physics", "Geography|(category)", "Literature|American Literature"]);
  let failed = 0;
  for (let iter = 0; iter < 5; iter++) {
    const round = vm.runInContext("buildRound", ctx)(sel, 25);
    t("round non-empty", round.length > 0);
    for (const item of round) {
      const correct = item.choices[item.correctIndex];
      t("no correct-in-distractors dup", item.choices.filter(c => c === correct).length === 1);
      t("4 choices", item.choices.length === 4);
      t("has question text", item.q.question.length > 50);
      // all choices must come from the same category's pools
      const cat = item.category;
      const allowed = new Set([...(vm.runInContext("distractorsByCat", ctx)[cat] || [])]);
      for (const b of vm.runInContext("buckets", ctx).filter(b => b.category === cat))
        (vm.runInContext("distractorsBySub", ctx)[b.category + "|" + b.subKey] || []).forEach(a => allowed.add(a));
      const tIdx = vm.runInContext("typedIndex", ctx)[cat] || {};
      Object.values(tIdx).forEach(set => set.forEach(a => allowed.add(a)));
      // hand-authored close distractors are a legitimate curated source
      for (const b of vm.runInContext("buckets", ctx).filter(b => b.category === cat))
        Object.values(vm.runInContext("closeBySub", ctx)[b.category + "|" + b.subKey] || {}).forEach(list => list.forEach(a => allowed.add(a)));
      for (const b of vm.runInContext("buckets", ctx).filter(b => b.category === cat)) {
        b.topAnswers.forEach(a => allowed.add(a));
        Object.keys(b.questionsByAnswer).forEach(a => allowed.add(a));
      }
      t(`choices within category ${cat}`, item.choices.every(c => allowed.has(c)));
      t(`no trick variants of correct answer (${correct})`,
        item.choices.filter(c => c !== correct).every(c => !vm.runInContext("tooSimilar", ctx)(correct, c)));
    }
  }
  for (const [name, ok] of tests) if (!ok) { console.log("FAIL:", name); failed++; }
  console.log(failed === 0 ? "ALL PASSED (" + tests.length + " checks)" : failed + " failures");
  process.exit(failed ? 1 : 0);
})();
