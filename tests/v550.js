// v5.5.0 スタミナ制度の全廃
// 合格の基準（測る前に決めたもの）：
//  1. 画面（隠れている説明・ヒント・あそびかたを含む全文）に「スタミナ」「疲労」「疲れ」の文字が無い。
//     戦闘の盤に、スタミナの点（.sta）も疲れの表示（.tired）も出ない
//  2. 仲間・遠征の団員のデータに sta／staMax が無い。年齢の区分にも sta が無い。「軽い鎧」の装備が無い
//  3. 前列に居座り続けても（維持を何度も選んでも）ログに疲労の文言が出ない。仲間の詳細にスタミナの行が出ず、レイアウトが崩れない
//  4. 以前の保存（団員に sta／staMax、戦闘中の保存の units に sta）で再開しても、エラーなく同じ場面に戻り、sta は取り込まれない
//  5. ページのエラーなし（393×852・320×568）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"combo":1}';   // 旧版で付いた "stamina" の既読印が残っていても困らない
const BAD = /スタミナ|疲労|疲れ/;
// 画面の全文（隠れている説明も含む。script・style の中身は除く）
const TXT = () => { const c = document.documentElement.cloneNode(true); c.querySelectorAll('script,style').forEach((e) => e.remove()); return c.textContent.match(/スタミナ|疲労|疲れ/g); };
const SRC = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
async function page(b, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.addInitScript('window.__txt = ' + TXT.toString());
  await p.addInitScript((t) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } }, TIPS);
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300);
  return { ctx, p };
}
const toChoose = async (p) => { for (let k = 0; k < 400; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose' && !document.getElementById('btnRotate').hidden)) return true; if (await p.evaluate(() => !document.getElementById('tip').hidden)) await p.click('#tipOk').catch(() => {}); await p.waitForTimeout(50); } return false; };
async function enter(p) {
  await p.click('#begin'); await p.waitForTimeout(500);
  if (await p.evaluate(() => !document.getElementById('newConf').hidden)) { await p.waitForTimeout(500); await p.click('#ncGo'); await p.waitForTimeout(500); }
  const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
  await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(600);
}
(async () => {
  ok(!/軽い鎧/.test(SRC) && SRC.split('\n').every((l) => !/\bstaMax\b|\bsta:/.test(l) || /delete m\.sta/.test(l)), '2 本体のソースに、軽い鎧・staMax・sta: が残っていない（旧セーブを読み捨てる1行を除く）');
  const b = await launch();
  for (const [w, h] of [[393, 852], [320, 568]]) {
    const tag = w + '×' + h;
    const { ctx, p } = await page(b, w, h);
    await enter(p);
    // 陣立て
    const a = await p.evaluate(() => ({ text: window.__txt(), sta: document.querySelectorAll('.sta, .tired').length }));
    ok(!a.text && a.sta === 0, tag + ' 1 全文にスタミナ・疲労の文字が無く、盤にも出ない ' + JSON.stringify(a));
    // 2
    const d = await p.evaluate(() => { const R = window.__rb, ms = R.run.members; return { mem: ms.filter((m) => 'sta' in m || 'staMax' in m || (m.base && 'sta' in m.base)).length, n: ms.length, grid: R.grid.flat().filter((u) => u && ('sta' in u || 'staMax' in u)).length, eq: false }; });
    ok(d.n > 0 && d.mem === 0 && d.grid === 0 && !d.eq, tag + ' 2 団員・盤の仲間に sta／staMax が無い ' + JSON.stringify(d));
    // 3 居座る
    await p.click('#btnStart');
    let stays = 0;
    for (let k = 0; k < 8; k++) {
      if (!(await toChoose(p))) break;
      if (await p.evaluate(() => !document.getElementById('result').hidden || !document.getElementById('runv').hidden)) break;
      await p.click('#btnStay'); stays++;
    }
    const lg = await p.evaluate(() => ({ log: (window.__rb.log || []).join('\n'), text: window.__txt(), sta: document.querySelectorAll('.sta, .tired').length }));
    ok(stays >= 2 && !BAD.test(lg.log) && !lg.text && lg.sta === 0, tag + ' 3 居座っても疲労の文言・表示が出ない（維持 ' + stays + ' 回）');
    ok(!p.__errs.length, tag + ' 5 ページのエラーなし ' + p.__errs.join('/'));
    await ctx.close();
  }
  // 仲間の詳細（バトル中の仲間をタップ）
  {
    const { ctx, p } = await page(b, 393, 852);
    await enter(p); await p.click('#btnStart'); await toChoose(p);
    await p.click('.slot[data-r="0"] .tok').catch(() => {}); await p.waitForTimeout(300);
    const t = await p.evaluate(() => { const tip = document.querySelector('.peek'); const box = tip && !tip.hidden ? tip.getBoundingClientRect() : null; return { shown: !!box, text: tip ? tip.textContent : '', inView: box ? box.left >= -1 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1 : true }; });
    ok(!BAD.test(t.text) && t.inView, '3 仲間の詳細にスタミナの行が無く、画面に収まる ' + (t.shown ? '' : '（詳細は開かなかった）'));
    await ctx.close();
  }
  // 4 以前の保存
  {
    const { ctx, p } = await page(b, 393, 852);
    await enter(p); await p.click('#btnStart'); await toChoose(p);
    const before = await p.evaluate(() => { const R = window.__rb; return { turn: R.turn, hp: R.run.members.map((m) => m.name + m.hp).join(',') }; });
    const saved = await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('rb-exp-save') || 'null'); if (!o) return false;
      o.run.members.forEach((m) => { m.sta = 0; m.staMax = 3; if (m.base) m.base.sta = 3; });
      if (o.battle && o.battle.units) Object.keys(o.battle.units).forEach((k) => { o.battle.units[k].sta = 0; });
      localStorage.setItem('rb-exp-save', JSON.stringify(o)); return !!(o.battle && o.battle.units); });
    ok(saved, '4 戦闘中の保存に、旧版の sta を書き足せた');
    await p.reload(); await p.waitForTimeout(300); if (await p.evaluate(() => !document.getElementById('cover').classList.contains('revealed'))) await p.click('#cover'); await p.waitForTimeout(300);
    const has = await p.evaluate(() => !document.getElementById('resume').hidden);
    ok(has, '4 「続きから」が出る');
    if (has) {
      await p.click('#resume'); await p.waitForTimeout(500);
      const ok2 = await toChoose(p);
      const after = await p.evaluate(() => { const R = window.__rb; return { turn: R.turn, hp: R.run.members.map((m) => m.name + m.hp).join(','), taken: R.run.members.concat(R.grid.flat().filter(Boolean)).filter((u) => 'sta' in u || 'staMax' in u || (u.base && 'sta' in u.base)).length, text: !!window.__txt(), dots: document.querySelectorAll('.sta, .tired').length }; });
      ok(ok2 && after.turn === before.turn && after.hp === before.hp, '4 同じ場面（ターン・HP）に戻る ' + JSON.stringify(before) + ' → ' + JSON.stringify(after));
      ok(after.taken === 0 && !after.text && after.dots === 0, '4 旧版の sta は盤の仲間に取り込まれず、表示にも出ない');
    }
    ok(!p.__errs.length, '4 5 ページのエラーなし ' + p.__errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
