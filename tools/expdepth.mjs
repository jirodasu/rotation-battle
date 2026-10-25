// 遠征の「考えないと勝てないか」と「期待値の駆け引き」を測る（測るだけで、ゲームは変えない）。
//   node tools/expdepth.mjs [回数=200]
// 1) 戦い方：回さない／毎ターン回す／1ターンおき／でたらめ／標準(SMART)／名人(10手先まで全探索)
// 2) 1戦ごとの「勝てる手順の割合」：回す・維持の10手の組み合わせ1024通りのうち、勝てるもの（多いほど考えなくても勝てる）
// 3) 編成：初期の並びをでたらめにしたとき
// 4) 地点（戦う／休む）と報酬の選び方の期待値。標準と名人の両方で
import { playRun, battle, enemyAt, SMART, STAY, EXP } from './expsim.mjs';
import { JOBS } from './sim.mjs';
const N = +(process.argv[2] || 200), P = (v) => (v * 100).toFixed(1) + '%';
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const rate = (pol, strat = {}, over = {}, n = N) => { let c = 0, f = 0, nodes = 0; for (let i = 1; i <= n; i++) { const r = playRun(i * 7919, pol, strat, Object.assign({ size: 4 }, over)); if (r.clear) c++; f += r.fallen; nodes += r.reached; } return { clear: c / n, fallen: f / n }; };
const ALWAYS = () => true, ALT = (s) => s.turn % 2 === 1;
let rr = rng(12345); const RANDOM = () => rr() < 0.5;

console.log('== 1) 戦い方ごとの第1章の突破率（' + N + 'ラン）');
for (const [k, pol, n] of [['回さない', STAY], ['毎ターン回す', ALWAYS], ['1ターンおきに回す', ALT], ['でたらめ（半々）', RANDOM], ['標準（SMART）', SMART], ['名人（10手先まで全探索）', 'plan', Math.min(N, 120)]]) {
  rr = rng(12345); const r = rate(pol, {}, {}, n || N); console.log(`${k.padEnd(14, '　')} ${P(r.clear)}　倒れた仲間 ${r.fallen.toFixed(2)}人`);
}

console.log('\n== 2) 1戦ごとの「勝てる手順の割合」（新品の4人・亜種なし。10手の回す／維持1024通り、その後は標準）');
const party0 = () => EXP.party.map(([j, r, c], i) => { const J = JOBS.find((x) => x.id === j); return Object.assign({}, J, { uid: 'm' + i, name: 'u' + i, jname: J.name, r, c, max: J.hp, hp: J.hp, staMax: J.sta, entry: Object.assign({}, J.entry) }); });
for (const [step, foe] of [[1, 0], [1, 'binder'], [2, 0], [2, 'binder'], [3, 'chief']]) {
  const en = enemyAt(step, foe, EXP, null); let w = 0, noLoss = 0;
  for (let mk = 0; mk < 1024; mk++) { const r = battle(en, party0(), (st) => (st.turn <= 10 ? !!((mk >> (st.turn - 1)) & 1) : SMART(st)), { cols: 2, seed: 1, relics: [] }); if (r.win) { w++; if (!r.fallen) noLoss++; } }
  console.log(`地点${step} ${en.name.padEnd(10, '　')} 勝てる手順 ${P(w / 1024)}　誰も倒れずに勝てる手順 ${P(noLoss / 1024)}`);
}

console.log('\n== 3) 初期の並び（標準の戦い方）');
console.log('決まった並び       ' + P(rate(SMART).clear));
{ let c = 0; const R = rng(777); for (let i = 1; i <= N; i++) { const slots = [0, 1, 2, 3, 4, 5]; for (let a = 5; a > 0; a--) { const b = Math.floor(R() * (a + 1)); [slots[a], slots[b]] = [slots[b], slots[a]]; } const party = EXP.party.map(([j], k) => [j, Math.floor(slots[k] / 2), slots[k] % 2]); if (playRun(i * 7919, SMART, {}, { size: 4, party }).clear) c++; } console.log('でたらめな並び     ' + P(c / N)); }

console.log('\n== 4) 期待値：地点と報酬の選び方');
for (const [name, pol, n] of [['標準', SMART, N], ['名人', 'plan', Math.min(N, 120)]]) {
  const row = [];
  for (const [k, st] of [['戦闘を常に', { node: () => 'battle' }], ['休息を常に', { node: () => 'rest' }], ['報酬はレリック', { reward: () => 'relic' }], ['報酬は強化', { reward: () => 'up' }], ['報酬は手当て', { reward: () => 'heal' }]]) { const r = rate(pol, st, {}, n); row.push(`${k} ${P(r.clear)}（倒れ${r.fallen.toFixed(1)}）`); }
  console.log(name + '：' + row.join('　'));
}
console.log('\n== 5) レリックごとの価値（標準。報酬はいつもレリックで、そのレリックを最初に持たせる）');
for (const x of EXP.relics) { let c = 0; for (let i = 1; i <= N; i++) { const r = playRun(i * 7919, SMART, { reward: () => 'up' }, { size: 4, startRelics: [x.id] }); if (r.clear) c++; } console.log(`${x.name.padEnd(6, '　')} ${P(c / N)}`); }
{ let c = 0; for (let i = 1; i <= N; i++) if (playRun(i * 7919, SMART, { reward: () => 'up' }, { size: 4 }).clear) c++; console.log(`（レリックなし） ${P(c / N)}`); }
