// 深さ1〜5の構成案（2026-11-17）を自動対戦で回す。深さが上がるごとに新しい敵が章の候補に加わる（前の深さの敵も残る）。
//   深さ4・5の亜種の決まりは今の深さ3と同じ。深さ5は毒竜のあと必ず第4章へ（地点11・12・13）。
//   node tools/depthsim.mjs [回数=400]
import { playRun, SMART, STAY, EXP } from './expsim.mjs';
import { CANDS, SMART2 } from './enemysim.mjs';
import { CH4 } from './ch4sim.mjs';
const T = JSON.parse(JSON.stringify(CANDS));
// 採用10体の数値（案内翁・秤守は基礎値が強すぎたので下げた案）
T.A02.def.pattern = [{ name: '数え打ち', rule: 'lowhp', dmg: 6, perMid: 4 }, { name: '秤ゆらし', rule: 'all', dmg: 8 }, { name: '貝殻投げ', rule: 'all', dmg: 10 }, { name: '大数え', rule: 'lowhp', dmg: 12, perMid: 4 }];
const ADDS = {
  plan1: { 2: [['weight', 0], ['door', 1]], 3: [['hourglass', 2], ['A04', 2]], 4: [['A02', 1], ['lance', 2], ['twin', 2]], 5: [['thorns', 1], ['phase', 2]] },
  // 2026-11-17 昼：10体はすべて深さ4以降。深さ1〜3は今のまま
  d45: { 4: [['weight', 0], ['door', 1], ['A02', 1], ['hourglass', 2], ['A04', 2], ['twin', 2]], 5: [['thorns', 1], ['lance', 2], ['phase', 2]] }
};
const ADD = ADDS[process.env.ADDSET || 'plan1'];
export function cfgFor(depth) {
  const foes = EXP.foes.map((f) => f.slice()), M = (globalThis.__MAP || [0, 1, 2, 3, 3, 3])[depth], o = { size: 4, depth: Math.floor(M) };
  if (M % 1) o.pairRate = +(M % 1).toFixed(2);   // 2.4＝亜種1つ＋40%の戦闘で亜種2つ
  if (globalThis.__PR && globalThis.__PR[depth] != null) { o.depth = 3; o.pairRate = globalThis.__PR[depth]; }   // 深さ3の底上げ（deepMul）を残したまま、亜種2つの割合だけ変える
  for (let d = 2; d <= depth; d++) (ADD[d] || []).forEach(([k, ch]) => { foes[ch].push(k); o[k] = T[k].def; });
  o.foes = foes;
  if (depth >= 5) { const c4 = JSON.parse(JSON.stringify(CH4)); c4.foes = process.env.NOGUIDE ? ['shade', 'moth'] : ['shade', 'guide']; c4.defs.guide = T.A09b.def; o.ch4 = c4; }
  return o;
}
function run(n, pol, depth) {
  let clear = 0, c4 = 0, c4w = 0, turns = 0, fallen = 0;
  for (let i = 1; i <= n; i++) {
    const r = playRun(i * 7919, pol, {}, cfgFor(depth));
    const win = depth >= 5 ? !!(r.ch4 && r.ch4.win) : r.clear;
    if (win) clear++; if (r.ch4) { c4++; if (r.ch4.win) c4w++; } fallen += r.fallen;
  }
  return { clear: clear / n, c4: c4 ? c4w / c4 : null, fallen: fallen / n };
}
if (process.argv[1] && /depthsim\.mjs$/.test(process.argv[1])) {
  if (process.argv[3]) globalThis.__MAP = JSON.parse(process.argv[3]);
  if (process.env.PR) globalThis.__PR = JSON.parse(process.env.PR);   // 深さ→今の亜種の決まり（1〜3）の対応
  const n = +(process.argv[2] || 400), p = (v) => (v == null ? '  —  ' : (v * 100).toFixed(1).padStart(5) + '%');
  for (let d = 1; d <= 5; d++) {
    const a = run(n, SMART2, d), s = run(n, STAY, d), r = run(n, () => true, d), pl = run(Math.min(n, 80), 'plan', d);
    console.log(`深さ${d}：読む ${p(a.clear)}（倒れた ${a.fallen.toFixed(2)}人）｜毎ターン維持 ${p(s.clear)}｜毎ターン回す ${p(r.clear)}｜名人 ${p(pl.clear)}${d >= 5 ? '　第4章に入った隊の勝ち ' + p(a.c4) : ''}`);
  }
}
