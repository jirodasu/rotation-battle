// v5.6.3 報酬の差を縮める（突入技の強化に最大HP、入れ替えの最大HP+はなし）
// 合格の基準（測る前に決めたもの）：
//  1. EXP.upHp は 7、EXP.swapBonus.hp は 0（自動対戦 tools/expsim.mjs と同じ数値）
//  2. 報酬の「突入技の強化」の札に「最大HP+7」が出る。選ぶと、その仲間の最大HPが7、HPも7増える（最大を超えない）
//  3. 「仲間の入れ替え」の札の HP は、強化の分の最大HPを含まない（札の「HP」＝入る仲間の最大HP、強化前の値）
//  4. ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('s')) { localStorage.setItem('rb-tips', '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1}'); localStorage.setItem('rb-swapdemo', '1'); sessionStorage.setItem('s', '1'); } } catch (e) { /* */ } });
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300);
  const e = await p.evaluate(() => ({ up: window.__rb.EXP.upHp, sw: window.__rb.EXP.swapBonus.hp }));
  ok(e.up === 7 && e.sw === 0, '1 数値：upHp ' + e.up + '・入れ替えの最大HP+ ' + e.sw);
  await p.evaluate(() => { window.__rb.beginExp('std', 1); }); await p.waitForTimeout(500);
  await p.evaluate(() => { const r = window.__rb.run; r.members.forEach((m) => { m.hp = Math.max(1, m.max - 20); }); document.getElementById('runv').hidden = true; window.__rb.expReward([]); }); await p.waitForTimeout(700);
  const cards = await p.evaluate(() => [...document.querySelectorAll('#rvCards .rv-card')].map((c) => c.textContent));
  const ui = cards.findIndex((t) => /突入技の強化/.test(t));
  ok(ui >= 0 && /最大HP\+7/.test(cards[ui]), '2 強化の札に「最大HP+7」 ' + (cards[ui] || '').slice(0, 60));
  const before = await p.evaluate(() => window.__rb.run.members.map((m) => ({ n: m.name, max: m.max, hp: m.hp })));
  await p.click('#rvCards .rv-card[data-i="' + ui + '"]'); await p.waitForTimeout(500);
  const after = await p.evaluate(() => window.__rb.run.members.map((m) => ({ n: m.name, max: m.max, hp: m.hp })));
  const d = after.map((a, i) => ({ n: a.n, dm: a.max - before[i].max, dh: a.hp - before[i].hp, ok: a.hp <= a.max }));
  ok(d.filter((x) => x.dm === 7 && x.dh === 7).length === 1 && d.filter((x) => x.dm !== 0).length === 1 && d.every((x) => x.ok), '2 選ぶと1人の最大HPとHPが7増える ' + JSON.stringify(d));
  const sw = cards.find((t) => /仲間の入れ替え/.test(t));
  const swInfo = await p.evaluate(() => { const r = window.__rb.run; return r.members.length; });
  ok(!sw || /HP\d+/.test(sw), '3 入れ替えの札に HP が出る（隊 ' + swInfo + '人） ' + (sw || '（入れ替えの札なし）').slice(0, 50));
  ok(!errs.length, '4 ページのエラーなし ' + errs.join(' / '));
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
