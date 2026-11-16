// v5.8.16 回復を見届けてから報酬を出す（表示だけ。ルール・セーブの形は変えない）
// 合格の基準（測る前に決めたもの）：
//  1 戦闘に勝って回復した仲間がいるとき：報酬の画面が出た直後（0.3秒）は、下の報酬の札が見えない（場所は取っている）
//  2 回復の演出が終わったころ（1.6秒）も札は隠れたまま（v5.8.17 からタップ式）。「タップで次へ」が出る。タップすると札が出て、そのあと押して選べる
//  3 待っているあいだに画面をタップすると、札がすぐ出る。そのタップで札が選ばれてしまわない
//  4 札が出ても、上の題・名簿の位置は動かない
//  5 動きを減らす設定では待たずに出る。地図の画面では待たない
//  6 どれもページのエラーなし
process.env.RB_PHASE_HOLD = '1';   // 段階的開示の本来の動きで確かめる
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const tipsOff = () => { try { localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1, combo: 1, hmIntro: 1 })); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } };
const st = (p) => p.evaluate(() => { const c = document.getElementById('rvCards'), s = getComputedStyle(c), card = document.querySelector('#rvCards .rv-card');
  return { vis: s.visibility, map: document.getElementById('runv').classList.contains('is-map'), title: document.getElementById('rvTitle').textContent, h: card ? Math.round(card.getBoundingClientRect().height) : 0, rosterY: Math.round(document.getElementById('rvRoster').getBoundingClientRect().top) }; });
async function toWin(b, rm, w, h) {
  const ctx = await b.newContext({ viewport: { width: w || 393, height: h || 852 }, isMobile: true, hasTouch: true, reducedMotion: rm ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(tipsOff);
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
  await p.click('#begin'); await p.waitForTimeout(700);
  const m0 = await st(p);
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1300);
  await p.evaluate(() => { const R = window.__rb; R.enemy.hp = 1; R.run.members.forEach((m) => { m.atk = 99; m.hp = Math.max(1, m.max - 10); }); });
  await p.click('#btnStart');
  for (let i = 0; i < 150; i++) { if (await p.evaluate(() => !document.getElementById('runv').hidden && document.getElementById('rvTitle').textContent === '勝利')) break; await p.waitForTimeout(50); }
  return { ctx, p, errs, m0 };
}
(async () => {
  const b = await launch();
  { const { ctx, p, errs, m0 } = await toWin(b);
    ok(m0.map && m0.vis === 'visible', '5 地図の画面は待たずに出る：' + m0.vis);
    await p.waitForTimeout(300); const a = await st(p);
    const heal = await p.evaluate(() => document.querySelectorAll('#rvRoster .rv-heal').length);
    ok(a.title === '勝利' && heal > 0 && a.vis === 'hidden' && a.h > 0, '1 出た直後は札が見えない（回復 ' + heal + '人・札の高さ ' + a.h + '）：' + a.vis);
    await p.waitForTimeout(1300); const c0 = await st(p);
    const hint = await p.evaluate(() => { const t = document.getElementById('rvTap'); return !!t && t.classList.contains('on') && /タップ/.test(t.textContent); });
    ok(c0.vis === 'hidden' && hint, '2 回復のあとも自動では出ず、「タップで次へ」が出る：' + c0.vis + '・案内 ' + hint);
    await p.touchscreen.tap(195, 40); await p.waitForTimeout(400); const c = await st(p);
    ok(c.vis === 'visible', '2 タップで札が見える：' + c.vis);
    ok(c.rosterY === a.rosterY, '4 名簿の位置は動かない：' + a.rosterY + '→' + c.rosterY);
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(600);
    ok(await p.evaluate(() => document.getElementById('runv').hidden || document.getElementById('rvTitle').textContent !== '勝利'), '2 押して選べる');
    ok(!errs.length, '6 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  { const { ctx, p, errs } = await toWin(b, false, 320, 568);
    await p.waitForTimeout(200);
    const box = await p.evaluate(() => { const r = document.querySelector('#rvCards .rv-card').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await p.touchscreen.tap(box[0], box[1]); await p.waitForTimeout(150);
    const a = await st(p);
    ok(a.vis === 'visible' && a.title === '勝利', '3 タップですぐ出て、札は選ばれていない：' + a.vis + '・' + a.title);
    ok(!errs.length, '6 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  { const { ctx, p, errs } = await toWin(b, true);
    await p.waitForTimeout(100); const a = await st(p);
    ok(a.title === '勝利' && a.vis === 'visible', '5 動きを減らす設定では待たない：' + a.vis);
    ok(!errs.length, '6 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
