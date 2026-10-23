// ローグライク要素（語り継がれる者・名声と店・地方選び）が、ラン全体の難しさをどれだけ動かすかを測る。
//   node tools/rogue.mjs [回数]
// 基準は「回す判断あり（SMART）」と「先読みの名人（plan）」のクリア率。要素なし（RUN）と、ゲームと同じ設定（GAME）を比べる。
import { playRun, SMART, RUN, GAME, ROGUE } from './runsim.mjs';
const n = +(process.argv[2] || 200), nPlan = Math.max(20, Math.round(n / 4));
const rate = (cfg, pol = SMART, N = n) => { let c = 0; for (let i = 1; i <= N; i++) if (playRun(i * 7919, pol, {}, cfg).clear) c++; return c / N; };
const pct = (v) => (v * 100).toFixed(1) + '%';
const row = (name, cfg) => console.log(name.padEnd(16, '　'), '判断あり', pct(rate(cfg)), '　名人', pct(rate(cfg, 'plan', nPlan)));
row('要素なし', RUN);
row('章末の店だけ', Object.assign({}, RUN, { shop: ROGUE.shop }));
for (const rg of [['swarm', 'poison'], ['swarm', 'armor'], ['poison', 'swarm'], ['poison', 'armor'], ['armor', 'swarm'], ['armor', 'poison']])
  row('地方 ' + rg.map((k) => ROGUE.regions[k].name).join('→'), Object.assign({}, RUN, { regions: rg }));
row('店＋地方（ゲーム）', GAME);
// 語り継がれる者：前の代（別の乱数）で残った・引退した団員から、いちばん強い1人を次の代へ（ゲームと同じ年齢）
const power = (m) => m.max * (m.atk + m.heal * 2 + m.defSup + 4);
for (const pol of [SMART, 'plan']) {
  const N = pol === 'plan' ? nPlan : n; let w = 0, w0 = 0;
  for (let i = 1; i <= N; i++) {
    const a = playRun(i * 104729, pol, {}, GAME), L = a.members.concat(a.retiredList).sort((x, y) => power(y) - power(x))[0];
    if (playRun(i * 7919, pol, {}, Object.assign({}, GAME, L ? { legacy: { job: L.job, trait: L.trait, bonus: L.bonus, equips: L.equips, inherit: L.inherit }, legacyAge: ROGUE.legacyAge } : {})).clear) w++;
    if (playRun(i * 7919, pol, {}, GAME).clear) w0++;
  }
  console.log('語り継がれる者（' + (pol === 'plan' ? '名人' : '判断あり') + '）ゲーム設定で なし', pct(w0 / N), '→ あり', pct(w / N));
}
