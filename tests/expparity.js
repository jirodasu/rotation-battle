// 遠征の戦闘が、自動対戦 tools/expsim.mjs と同じ結果になること（回転レリック4種・突入技の強化・縛り・気力を含む）。
// 同じ4人・同じ敵・同じ「回す／維持」の順で、ゲーム本体と自動対戦を戦わせ、勝敗・ターン数・全員の残りHP・敵の残りHPを比べる。
// 乱数を使う攻撃（ランダム）を含まない敵だけで比べる（乱数の並びはゲームと自動対戦で違うため）。
process.env.RB_KEEP_WIN = '1';   // 戦闘そのものを測る。勝敗は以前の勝利パネルで待つ（v5.3.3）
const { launch, testPage } = require('./_env');
const path = require('path'), { pathToFileURL } = require('url');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const CASES = [
  { foe: 0, step: 1, relics: [], seq: [false, true] },
  { foe: 'binder', step: 1, relics: ['shield', 'incense'], seq: [true] },
  { foe: 'binder', step: 2, relics: ['bell', 'stance'], seq: [false, false, true] },
  { foe: 0, step: 2, relics: ['shield', 'incense', 'bell', 'stance'], seq: [true, false], up: true },
  { foe: 'chief', step: 3, relics: ['stance', 'bell'], seq: [false, true, true], up: true }
];
async function fight(p, seq) {
  for (let i = 0; i < 800; i++) {
    const st = await p.evaluate(() => ({ res: !document.getElementById('result').hidden, prep: !document.getElementById('btnStart').hidden, choose: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', tip: !document.getElementById('tip').hidden }));
    if (st.tip) { await p.click('#tipOk').catch(() => {}); continue; }
    if (st.res) return;
    if (st.prep) { await p.click('#btnStart'); await p.waitForTimeout(50); continue; }
    if (st.choose) {
      const t = await p.evaluate(() => +document.getElementById('chipTurn').textContent.match(/ターン(\d+)/)[1]);
      const rot = !!seq[(t - 2) % seq.length], dis = await p.evaluate(() => document.getElementById('btnRotate').disabled);
      await p.click(rot && !dis ? '#btnRotate' : '#btnStay'); await p.waitForTimeout(30); continue;
    }
    await p.waitForTimeout(40);
  }
}
(async () => {
  const sim = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'expsim.mjs')).href);
  const b = await launch();
  for (const [i, k] of CASES.entries()) {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(testPage()); await p.waitForTimeout(400);
    await p.click('#cover'); await p.waitForTimeout(200);
    await p.click('#begin'); await p.waitForTimeout(500);
    // 地図の戦闘地点を、このケースの敵（亜種なし）にして入る
    const party = await p.evaluate((k) => {
      const R = window.__rb, run = R.run;
      run.relics = k.relics.slice();
      if (k.up) run.members.forEach((m, j) => { if (j % 2 === 0) { m.up = { atk: 3 }; } });
      const c = run.choices.find((x) => x.type === 'battle');
      run.map[c.rid] = { foe: k.foe === 'chief' ? 0 : k.foe, variant: null };
      return null;
    }, k);
    const bi = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
    await p.click('#rvCards .rv-card[data-i="' + bi + '"]'); await p.click('#rvGo'); await p.waitForTimeout(500);
    // 戦う敵をケースの地点・敵に差し替える（地図の地点1で、地点2・3の強さを確かめるため）
    const setup = await p.evaluate((k) => {
      const R = window.__rb, run = R.run;
      if (k.up) run.members.forEach((m) => { if (m.up) R.applyAge(m, false); });
      const e = R.expEnemy(k.step, null, k.foe === 'chief' ? 0 : k.foe);
      run.enemy = e;
      return { e, members: run.members.map((m) => ({ uid: m.uid, name: m.name, jname: m.jname, r: m.r, c: m.c, hp: m.hp, max: m.max, atk: m.atk, ranged: m.ranged, atkSup: m.atkSup, defSup: m.defSup, heal: m.heal, rest: m.rest, staMax: m.staMax, spd: m.spd, hits: m.hits, entry: m.entry })) };
    }, k);
    await p.evaluate(() => window.__rb.toPrepForTest && window.__rb.toPrepForTest());
    await fight(p, k.seq);
    const game = await p.evaluate(() => { const R = window.__rb; return { win: document.getElementById('rTitle').textContent !== '全滅', turns: R.turn, ehp: R.enemy.hp, hp: Object.fromEntries(R.run.members.map((m) => [m.uid, m.hp])) }; });
    // 自動対戦（同じ並び・同じ敵・同じ順）
    const pol = (st) => !!k.seq[(st.turn - 1) % k.seq.length];
    const party0 = setup.members.map((m) => Object.assign({}, m, { entry: Object.assign({}, m.entry) }));
    const res = sim.battle(setup.e, party0, pol, { cols: 2, seed: 1, relics: k.relics, rot: sim.EXP.rot });   // 気力も同じ規則
    const shp = Object.fromEntries(setup.members.map((m) => [m.uid, res.hp[m.uid] != null ? res.hp[m.uid] : 0]));
    const same = game.win === res.win && game.turns === res.turns && JSON.stringify(game.hp) === JSON.stringify(shp);
    ok(same, `ケース${i + 1}（${setup.e.name}・レリック ${k.relics.join(',') || 'なし'}${k.up ? '・強化あり' : ''}）ゲーム ${game.win ? '勝ち' : '負け'}${game.turns}T ${JSON.stringify(Object.values(game.hp))} ／ 自動対戦 ${res.win ? '勝ち' : '負け'}${res.turns}T ${JSON.stringify(Object.values(shp))}`);
    ok(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
