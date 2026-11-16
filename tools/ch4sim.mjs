// 第4章（ステージ4設計書 2026-11-16）の数値を決めるための自動対戦。ゲーム本体は変えない。
//   node tools/ch4sim.mjs [回数=400] [上書きJSON]
// 地点1〜10は標準の遊び方（SMART）で進め、踏破した隊だけが第4章に入る。第4章だけ戦い方を変えて比べる。
// 目標（設計書7節）：第4章に入った隊が主に勝つ割合 標準 40〜55%・毎ターン維持するだけ ≦15%
import { playRun, SMART, STAY, EXP } from './expsim.mjs';
// 敵と倍率は、ゲーム本体の EXP（shade・moth・lightless・deep4）をそのまま使う（数値の出どころを1つにする）
export const CH4 = { foes: ['shade', 'moth'], chief: 'lightless', hp: EXP.deep4.hp.slice(), dmg: EXP.deep4.dmg.slice(), defs: { shade: EXP.shade, moth: EXP.moth, lightless: EXP.lightless } };
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
export function report4(n, over) {
  const run = (pol4, N = n, depth = 1) => {
    let entered = 0, win = 0, p11 = 0, p12 = 0; const rr = rng(4242);
    const pol = pol4 === 'random' ? () => rr() < 0.5 : pol4;
    for (let i = 1; i <= N; i++) {
      const r = playRun(i * 7919, SMART, { pol4: pol }, Object.assign({ size: 4, depth }, over));
      if (!r.ch4) continue; entered++; if (r.ch4.win) win++;
      if (r.ch4.win || r.ch4.reached > 11) p11++; if (r.ch4.win || r.ch4.reached > 12) p12++;
    }
    return { entered, win: entered ? win / entered : 0, p11: entered ? p11 / entered : 0, p12: entered ? p12 / entered : 0 };
  };
  return { smart: run(SMART), stay: run(STAY), always: run(() => true), random: run('random'), plan: run('plan', Math.min(n, 120)), d2: run(SMART, n, 2), d3: run(SMART, n, 3) };
}
if (process.argv[1] && /(^|[\\/])ch4sim\.mjs$/.test(process.argv[1])) {
  const n = +(process.argv[2] || 400), extra = process.argv[3] ? JSON.parse(process.argv[3]) : {};
  const ch4 = JSON.parse(JSON.stringify(CH4)); if (extra.ch4) { Object.assign(ch4, extra.ch4, { defs: Object.assign(ch4.defs, (extra.ch4 || {}).defs || {}) }); }
  const o = report4(n, { ch4 }), p = (v) => (v * 100).toFixed(1) + '%';
  const line = (k, x) => console.log(`${k}：第4章に入った ${x.entered}隊　主に勝つ ${p(x.win)}（地点11を越える ${p(x.p11)}・地点12を越える ${p(x.p12)}）`);
  line('標準（深さ1）', o.smart); line('毎ターン維持', o.stay); line('毎ターン回す', o.always); line('でたらめ', o.random); line('名人', o.plan); line('標準（深さ2）', o.d2); line('標準（深さ3）', o.d3);
  console.log((o.smart.win >= 0.4 && o.smart.win <= 0.55 ? '  OK  ' : '  NG  ') + '標準 40〜55%');
  console.log((o.stay.win <= 0.15 ? '  OK  ' : '  NG  ') + '毎ターン維持 ≦15%');
}
