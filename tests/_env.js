// テスト共通：Playwright と Chromium の場所、テスト用ページ（中身を見るためのフックを足したコピー）を用意する
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const PW = process.env.PLAYWRIGHT_PATH || '/home/claude/.npm-global/lib/node_modules/playwright';
const { chromium, devices } = require(PW);
const CHROME = process.env.CHROME_PATH || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
// window.__rb から本番モードの状態に触れるようにしたコピー（ゲーム本体は書き換えない）
function testPage() {
  let s = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  s = s.replace('  function beginMain(sqId, legacy) {', "  window.__rb = { get run() { return run; }, get grid() { return grid; }, runShowMap, runAdvance, runEnd, runRecruit, runReward, runEvent, runInherit, resumeRun, runEnter, runSave, runSaved, ROUTE, routeValidate, routeCanMove, routeCur, routeNodeId, routePick, routeChoices, routeMigrate, routeFill, applyAge, showEnding, metaLoad, metaRecord, squadOpen, squadList, showSquads, startFlow, beginMain, newRun, SQUADS, ACHS, goTitle, showRecords, squadBuy, medals, SQUAD_PRICE, ROGUE, runShop, runRegion, chooseLegacy, fameLeft, legacyJoin, beginExp, resumeExp, expSaved, expEnemy, expFill, expEnd, expAfterBattle, expReward, expShowMap, get EXP() { return EXP; }, get enemy() { return enemy; }, get cols() { return COLS; }, get turn() { return turn; }, get gauge() { return gauge; }, setGauge: (g) => { gauge = g; render(); }, render: () => render(), get bus() { return bus; }, get SET() { return SET; }, lastWordOf, get JOB_LAST() { return JOB_LAST; }, toPrepForTest: () => toPrep(false), TRI, pickTarget, targetFoe, foeWarn, foeById, foeHit, foeShare, incoming, expDmg, previewGrid, units, setTurn: (t) => { turn = t; render(); }, get phase() { return phase; }, get tgtId() { return tgtId; }, get log() { return logLines; }, get previewOn() { return previewOn; }, get combo() { return combo; }, get SFX() { return SFX; }, setCombo: (v) => { combo = v; }, comboFull: () => comboFull(), get comboFire() { return comboFire; }, expCard, routeChoice, actHit, expIsChief: (s) => expIsChief(s), finishForTest: (r) => finish(r), enemyCardHTML: () => enemyCardHTML(), hitColumn: (c, d, p, b) => hitColumn(c, d, p, b), finisherFX: (e) => finisherFX(e), foeEl: (f) => foeEl(f), setPhase: (x) => { phase = x; }, incoming: (g, f, e) => incoming(g, f, e), actHit: (F, a) => actHit(F, a), setTgt: (id) => { tgtId = id; }, actOf: (F) => actOf(F), foeList: () => foeList(), foeWarn: () => foeWarn(), say: (t) => say(t), openLog: (on) => openLog(on), outlook: (g, f, e) => outlook(g, f, e) } ; window.__M = Music;\n  function beginMain(sqId, legacy) {");
  // RB_KEEP_WIN=1：遠征の途中の勝利でも、以前の勝利パネルを出す（v5.3.3）。戦闘そのものを測るテストが、勝敗をパネルで待てるように。
  //   勝利→報酬の新しい流れは tests/v533.js・expedition.js・battlesave.js などが本来の動きで確かめる
  if (process.env.RB_KEEP_WIN) s = s.replace('<head>', '<head><script>window.__rbKeepWinPanel = true;</script>');
  // 並べて流す（run-all の1段目）ときに、ほかのテストが書きかけのページを読まないよう、別名に書いてから置き換える（v5.5.6）。中身はどのテストでも同じ
  const p = path.join(OUT, process.env.RB_KEEP_WIN ? 'tk.html' : 't.html'), tmp = p + '.' + process.pid; fs.writeFileSync(tmp, s); fs.renameSync(tmp, p);
  try { const tj = path.join(OUT, 'tune.js'), tt = tj + '.' + process.pid; fs.copyFileSync(path.join(ROOT, 'tune.js'), tt); fs.renameSync(tt, tj); } catch (e) { /* 調整モードの道具（v5.3.4）。無ければ読まない */ }
  return 'file://' + p;
}
const indexURL = 'file://' + path.join(ROOT, 'index.html');
// 冒頭の物語（v5.5.8）は、初めて「環廊へ」を押したときに出る。ほかのテストは「もう見た」から始める（物語は tests/v558.js が確かめる）。
//   RB_STORY=1 のときだけ、まだ見ていない状態のまま開く
const SEEN_STORY = () => { try { for (const k of ['rb-story', 'rb-ending', 'rb-story2']) if (!localStorage.getItem(k)) localStorage.setItem(k, '1'); } catch (e) { /* 保存できない */ } };   // 冒頭の物語と踏破の結末は見たことにする
/* 読み込みの最初に保存へ書く addInitScript は、同じタブでは最初の1回だけ流す（v5.5.9）。
   file:// では、すでに保存があるページの読み込みの最初に localStorage へ書くと、保存が消えることがあった（v5.5.8 の調べ）。
   テストの種まき（ヒントの既読など）は1回入れれば残るので、読み込み直しのたびに書き直さない。読み込みのたびに要る関数の定義など（保存に書かないもの）はそのまま毎回流す。
   RB_INIT_EVERY=1 で以前と同じ（毎回流す） */
let initSeq = 0;
const onceInit = (orig) => async (script, arg) => {
  if (process.env.RB_INIT_EVERY || typeof script !== 'function' || !/localStorage\.(setItem|clear|removeItem)/.test(script.toString())) return orig(script, arg);
  const k = '__rbInit' + (++initSeq);
  return orig('(() => { try { if (sessionStorage.getItem(' + JSON.stringify(k) + ')) return; sessionStorage.setItem(' + JSON.stringify(k) + ', "1"); } catch (e) { /* */ } (' + script.toString() + ')(' + (arg === undefined ? '' : JSON.stringify(arg)) + '); })()');
};
const guardPage = (p) => { p.addInitScript = onceInit(p.addInitScript.bind(p)); return p; };
const guardCtx = (c) => { c.addInitScript = onceInit(c.addInitScript.bind(c)); const cnp = c.newPage.bind(c); c.newPage = async () => guardPage(await cnp()); return c; };
const launch = async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  { const nc0 = b.newContext.bind(b), np0 = b.newPage.bind(b); b.newContext = async (o) => guardCtx(await nc0(o)); b.newPage = async (o) => guardPage(await np0(o)); }
  if (process.env.RB_STORY) return b;
  // ページの読み込みが終わってから書く（goto・reload のあと）。読み込みの最初（addInitScript）で書くと、file:// では
  //   すでにある保存が消えることがあった（v5.5.8 の全テストで、読み込み直しのあとの「続きから」が3〜4本で消えた）
  const patch = (p) => { for (const m of ['goto', 'reload']) { const f = p[m].bind(p); p[m] = async (...a) => { const r = await f(...a); try { await p.evaluate(SEEN_STORY); } catch (e) { /* 閉じたページ */ } return r; }; } return p; };
  const nc = b.newContext.bind(b), np = b.newPage.bind(b);
  b.newContext = async (o) => { const c = await nc(o); const cnp = c.newPage.bind(c); c.newPage = async () => patch(await cnp()); return c; };
  b.newPage = async (o) => patch(await np(o));
  return b;
};
module.exports = { chromium, devices, launch, testPage, indexURL, OUT, ROOT };
