// 第4章（ステージ4設計書 2026-11-16）の数値を決めるための自動対戦。ゲーム本体は変えない。
//   node tools/ch4sim.mjs [回数=400] [上書きJSON]
// 地点1〜10は標準の遊び方（SMART）で進め、踏破した隊だけが第4章に入る。第4章だけ戦い方を変えて比べる。
// 目標（設計書7節）：第4章に入った隊が主に勝つ割合 標準 40〜55%・毎ターン維持するだけ ≦15%
import { playRun, SMART, STAY } from './expsim.mjs';
export const CH4 = {
  foes: ['shade', 'moth'], chief: 'lightless', hp: [0.506, 0.506, 0.529], dmg: [0.77, 0.77, 0.726],   // 案B（2026-11-16 の400回で、標準45%・毎ターン維持0%・毎ターン回す13%・名人88%）
  defs: {
    shade: { name: '影縫いの番人', hp: 300, def: 2, spd: 5, pattern: [
      { name: '影縫い', rule: 'lowhp', dmg: 16, vsStayed: 2 }, { name: '影縫い', rule: 'lowhp', dmg: 16, vsStayed: 2 }, { name: 'ちからをためる', rule: 'charge' }, { name: '闇の波', rule: 'all', dmg: 22, vsStayed: 2 }] },
    moth: { name: '燭喰いの蛾', hp: 250, def: 0, spd: 7, pattern: [
      { name: '鱗粉', rule: 'mid', dmg: 12 }, { name: '体当たり', rule: 'lowhp', dmg: 20 }, { name: '鱗粉', rule: 'mid', dmg: 12 }, { name: '羽ばたき', rule: 'all', dmg: 22 }] },
    lightless: { name: '灯を知らぬもの', hp: 340, def: 3, spd: 6, pattern: [
      { name: '影縫い', rule: 'lowhp', dmg: 18, vsStayed: 2 }, { name: '黒い鱗粉', rule: 'mid', dmg: 14 }, { name: 'ちからをためる', rule: 'charge' }, { name: '灯消し', rule: 'all', dmg: 24, pierce: true, vsStayed: 2 }] }
  }
};
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
