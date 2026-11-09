// v5.7.3 勝利の画面に「しのいだ」の回数
// 合格の基準（測る前に決めたもの）：
//  1. 戦闘中に「しのいだ！」が1回出て勝つと、報酬の画面の説明に「・しのいだ1回」が入る
//  2. 「しのいだ！」が無い戦闘の勝利では入らない（次の戦闘で数え直す）。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"bench":1}';
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '9'); localStorage.setItem('rb-teach-inc', '1'); localStorage.setItem('rb-teach-hold', '1'); } catch (e) { /* */ } }, TIPS);
  await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
  const toChoose = async (t) => { for (let k = 0; k < 200; k++) { await p.waitForTimeout(80); const s = await p.evaluate(() => ({ ph: window.__rb.phase, t: window.__rb.turn, tip: !document.getElementById('tip').hidden, rv: !document.getElementById('runv').hidden })); if (s.tip) await p.evaluate(() => document.getElementById('tipOk').click()); if (s.rv) return 'rv'; if (s.ph === 'choose' && (!t || s.t === t)) return 'choose'; } return ''; };
  const enter = async () => { const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle')); await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(900);
    await p.evaluate(() => { const R = window.__rb; R.run.enemy = R.expEnemy(1, null, 0); R.toPrepForTest(); }); await p.waitForTimeout(300); };
  // 1つ目の戦闘：3ターン目に「しのいだ！」を起こしてから勝つ
  await enter();
  await p.evaluate(() => { const R = window.__rb; R.enemy.hp = 999; R.enemy.max = 999; R.render(); });
  await p.click('#btnStart'); await toChoose(2); await p.click('#btnStay'); await toChoose(3);
  await p.evaluate(() => { const R = window.__rb; R.grid[0].forEach((u) => { if (u) u.hp = 1; }); R.grid[1].forEach((u) => { if (u) { u.max = 99; u.hp = 99; } }); R.render(); });
  await p.click('#btnRotate'); await toChoose(4);
  const n1 = await p.evaluate(() => window.__rb.log.filter((l) => /回したおかげ/.test(l)).length);
  await p.evaluate(() => { const R = window.__rb; R.enemy.hp = 1; R.render(); }); await p.click('#btnStay');
  const r1 = await toChoose(99);
  const sub1 = await p.evaluate(() => document.getElementById('runv').innerText.replace(/\s+/g, ''));
  ok(n1 === 1 && r1 === 'rv' && /3?\d*ターンで撃破・しのいだ1回/.test(sub1), '1 しのいだ1回の戦闘の勝利：' + (sub1.match(/\d+ターンで撃破[^。]*。/) || [''])[0]);
  // 2つ目の戦闘：すぐ勝つ（しのいだ無し）
  await p.evaluate(() => { const c = document.querySelector('#rvCards .rv-card'); if (c) c.click(); }); await p.waitForTimeout(200);
  await p.evaluate(() => { const g = document.getElementById('rvGo'); if (g && !g.disabled) g.click(); }); await p.waitForTimeout(900);
  await enter(); await p.evaluate(() => { const R = window.__rb; R.enemy.hp = 1; R.render(); }); await p.click('#btnStart');
  const r2 = await toChoose(99);
  const sub2 = await p.evaluate(() => document.getElementById('runv').innerText.replace(/\s+/g, ''));
  ok(r2 === 'rv' && /ターンで撃破/.test(sub2) && !/しのいだ\d回/.test(sub2), '2 しのいだ無しの勝利：' + (sub2.match(/\d+ターンで撃破[^。]*。/) || [''])[0]);
  ok(!errs.length, '2 ページのエラーなし ' + errs.join(' / '));
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
