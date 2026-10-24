// 職業ごとの影響：標準の騎士団で、1つの職業を別の職業に置き換えたときのクリア率（回す判断あり）
// 測るだけで、ゲームは変えない。誤差は N=120 で約±4ポイント、N=300 で約±3ポイント（標準誤差）。
//   node tools/jobs.mjs [回数=120]
import { playRun, SMART, GAME } from './runsim.mjs';
import { JOBS, DEFAULT_FORM } from './sim.mjs';
const N = +(process.argv[2] || 120), pct = (v) => (v * 100).toFixed(1) + '%';
// index.html の RUN.start（職業ごとの開始年齢）と同じ値
const START = { warrior: 38, knight: 30, samurai: 24, witch: 33, cleric: 44, monk: 27, archer: 19 };
const rate = (form) => { let c = 0; for (let i = 1; i <= N; i++) if (playRun(i * 7919, SMART, {}, Object.assign({}, GAME, { form })).clear) c++; return c / N; };
const base = DEFAULT_FORM.map(([j, r, c]) => [j, r, c, START[j]]);
console.log('標準編成', pct(rate(base)));
for (const [j] of DEFAULT_FORM) {
  const row = [];
  for (const k of JOBS.map((x) => x.id)) { if (k === j) continue; const f = base.map((x) => (x[0] === j ? [k, x[1], x[2], START[k]] : x)); row.push(k + ' ' + pct(rate(f))); }
  console.log(j + ' を抜いて他職に置換 →', row.join('　'));
}
// 同一職を並べた編成（極端な編成の強さ）
for (const j of JOBS.map((x) => x.id)) { const f = base.map((x, i) => (i < 3 ? [j, x[1], x[2], START[j]] : x)); console.log('前列3人を全員 ' + j + ' →', pct(rate(f))); }
