// 深さ4の構成案を比べる（2026-11-18）
import { playRun, STAY } from './expsim.mjs';
import { SMART2 } from './enemysim.mjs';
import { cfgFor } from './depthsim.mjs';
globalThis.__MAP = [0, 1, 2, 2.35, 2.5, 2.5];   // 今のゲーム：深さ4は亜種1つ＋50%で亜種2つ、底上げなし
const N = +(process.argv[2] || 400);
const NEW = { 0: ['weight'], 1: ['door', 'A02'], 2: ['hourglass', 'A04', 'twin'] };
const plans = {
  'A まぜる（今の敵＋新しい敵から毎回くじ）': (c) => c,
  'B 章の最初の戦闘は必ず新しい敵': (c) => { c.newFoes = NEW; return c; },
  'C 新しい敵だけ': (c) => { c.foes = c.foes.map((f, ch) => (NEW[ch] && NEW[ch].length ? NEW[ch].slice() : f)); return c; }
};
const p = (v) => (v * 100).toFixed(1) + '%';
for (const [name, f] of Object.entries(plans)) {
  let a = 0, s = 0, pl = 0; const M = Math.min(N, 80);
  for (let i = 1; i <= N; i++) { if (playRun(i * 7919, SMART2, {}, f(cfgFor(4))).clear) a++; if (playRun(i * 7919, STAY, {}, f(cfgFor(4))).clear) s++; }
  for (let i = 1; i <= M; i++) if (playRun(i * 7919, 'plan', {}, f(cfgFor(4))).clear) pl++;
  console.log(`${name}：読む ${p(a / N)}｜毎ターン維持 ${p(s / N)}｜名人 ${p(pl / M)}`);
}
