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
  s = s.replace('  function beginMain(sqId, legacy) {', "  window.__rb = { get run() { return run; }, get grid() { return grid; }, runShowMap, runAdvance, runEnd, runRecruit, runReward, runEvent, runInherit, resumeRun, runEnter, runSave, runSaved, ROUTE, routeValidate, routeCanMove, routeCur, routeNodeId, routePick, routeChoices, routeMigrate, routeFill, applyAge, showEnding, metaLoad, metaRecord, squadOpen, squadList, showSquads, startFlow, beginMain, newRun, SQUADS, ACHS, goTitle, showRecords, squadBuy, medals, SQUAD_PRICE, ROGUE, runShop, runRegion, chooseLegacy, fameLeft, legacyJoin, beginExp, resumeExp, expSaved, expEnemy, expFill, expEnd, expReward, expShowMap, get EXP() { return EXP; }, get enemy() { return enemy; }, get cols() { return COLS; }, get turn() { return turn; }, get gauge() { return gauge; }, setGauge: (g) => { gauge = g; render(); }, render: () => render(), get bus() { return bus; }, get SET() { return SET; }, lastWordOf, get JOB_LAST() { return JOB_LAST; }, toPrepForTest: () => toPrep(false), TRI, pickTarget, targetFoe, foeWarn, foeById, foeHit, foeShare, incoming, expDmg, previewGrid, units, setTurn: (t) => { turn = t; render(); }, get phase() { return phase; }, get tgtId() { return tgtId; }, get log() { return logLines; }, get previewOn() { return previewOn; }, expCard, routeChoice, actHit, expIsChief: (s) => expIsChief(s), finishForTest: (r) => finish(r), enemyCardHTML: () => enemyCardHTML(), hitColumn: (c, d, p, b) => hitColumn(c, d, p, b), finisherFX: (e) => finisherFX(e), foeEl: (f) => foeEl(f), setPhase: (x) => { phase = x; } } ; window.__M = Music;\n  function beginMain(sqId, legacy) {");
  const p = path.join(OUT, 't.html'); fs.writeFileSync(p, s);
  return 'file://' + p;
}
const indexURL = 'file://' + path.join(ROOT, 'index.html');
const launch = () => chromium.launch({ executablePath: CHROME });
module.exports = { chromium, devices, launch, testPage, indexURL, OUT, ROOT };
