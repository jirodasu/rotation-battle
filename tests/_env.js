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
  s = s.replace('  function beginMain() {', "  window.__rb = { get run() { return run; }, get grid() { return grid; }, runShowMap, runAdvance, runEnd, runRecruit, runReward, runEvent, runInherit, resumeRun, applyAge, showEnding }; window.__M = Music;\n  function beginMain() {");
  const p = path.join(OUT, 't.html'); fs.writeFileSync(p, s);
  return 'file://' + p;
}
const indexURL = 'file://' + path.join(ROOT, 'index.html');
const launch = () => chromium.launch({ executablePath: CHROME });
module.exports = { chromium, devices, launch, testPage, indexURL, OUT, ROOT };
