// v5.6.3 修繕隊の7人の名前
// 合格の基準（測る前に決めたもの）：
//  1. 標準の隊で遠征を始めると、4人の名前がトワ（戦士）・サギリ（サムライ）・ネムリ（魔女）・オリ（神官）
//  2. 堅守・速攻の隊でも、職業の最初の1人は屋号の名（カスガイ・ツムギ・ニカワ など）。同じ職業の2人目はふつうの名前（屋号の名は1遠征に1人）
//  3. 遠征の途中、その職業の仲間がすでにいた（倒れた）あとに来る同じ職業の仲間は、ふつうの名前
//  4. 名札が名札の枠からはみ出さない（320×568）。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const HOUSE = { warrior: 'トワ', samurai: 'サギリ', witch: 'ネムリ', cleric: 'オリ', archer: 'ツムギ', knight: 'カスガイ', monk: 'ニカワ' };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('s')) { localStorage.setItem('rb-tips', '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1}'); localStorage.setItem('rb-swapdemo', '1'); sessionStorage.setItem('s', '1'); } } catch (e) { /* */ } });
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300);
  const start = (sq) => p.evaluate((sq) => { window.__rb.beginExp(sq, 1); return window.__rb.run.members.map((m) => ({ n: m.name, j: m.job })); }, sq);
  const std = await start('std');
  ok(std.map((m) => m.n + '/' + m.j).join() === 'トワ/warrior,サギリ/samurai,ネムリ/witch,オリ/cleric', '1 標準の隊の4人 ' + std.map((m) => m.n).join('・'));
  for (const sq of ['guard', 'fast', 'twin']) {
    const ms = await start(sq), seen = {};
    const good = ms.every((m) => { const first = !seen[m.j]; seen[m.j] = 1; return first ? m.n === HOUSE[m.j] : m.n !== HOUSE[m.j]; });
    ok(good, '2 ' + sq + '：職業の最初の1人だけ屋号の名 ' + ms.map((m) => m.n + '/' + m.j).join(' '));
  }
  await start('std');
  const late = await p.evaluate(() => { const r = window.__rb.run, m = r.members.shift(); m.fate = 'fallen'; r.gone.push(m); r.members.forEach((x) => { x.r = x.r; }); window.__rb.expReward([]); const nm = [...document.querySelectorAll('#rvCards .rv-card')].map((c) => c.textContent).find((t) => /仲間の(補充|入れ替え)/.test(t)) || ''; return { gone: m.name + '/' + m.job, nm }; });
  ok(/トワ\/warrior/.test(late.gone) && !/トワ（/.test(late.nm), '3 トワが倒れたあと、戦士はトワの名では来ない ' + late.nm.slice(0, 30));
  await p.evaluate(() => { document.getElementById('runv').hidden = true; window.__rb.beginExp('guard', 1); }); await p.waitForTimeout(400);
  await p.click('#rvCards .rv-card[data-i="0"]').catch(() => {}); await p.waitForTimeout(300); await p.click('#rvGo').catch(() => {}); await p.waitForTimeout(1200);
  const ov = await p.evaluate(() => [...document.querySelectorAll('#board .tok')].filter((t) => t.getBoundingClientRect().width > 0).map((t) => { const n = [...t.querySelectorAll('*')].find((e) => e.children.length === 0 && /カスガイ|ニカワ|ネムリ/.test(e.textContent)); if (!n) return null; const a = n.getBoundingClientRect(), pr = n.parentElement.getBoundingClientRect(); return { t: n.textContent, fit: n.scrollWidth <= n.clientWidth + 1 && a.right <= pr.right + 1 && a.left >= pr.left - 1 }; }).filter(Boolean));
  ok(ov.length >= 2 && ov.every((x) => x.fit), '4 名札がはみ出さない（320幅） ' + JSON.stringify(ov));
  ok(!errs.length, '4 ページのエラーなし ' + errs.join(' / '));
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
