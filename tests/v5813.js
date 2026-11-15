// v5.8.13 灯の見た目（試作 ?lamp・段階4）：盤の炎と段の点・回すボタンの倍率・受け渡しで飛ぶ炎・初めて2段になったときの説明・遊び方の文
// 合格の基準（測る前に決めたもの）：
//  1 選ぶ場面で、盤の data-lp が今の段と同じ。攻撃列の炎が見えていて、点の数＝最大段、灯った点＝今の段
//  2 回すボタンの倍率：段1は出ない、段2は「突入×1.5」、段3は「突入×2」
//  3 段2以上で回すと、飛ぶ炎（.lampfly）が攻撃列に入った仲間の数だけ出て、1.2秒以内に消える。回した直後に盤の段は1に戻る
//  4 初めて2段になったとき、説明「灯」が出る（同じ遠征で二度は出ない）
//  5 動きを減らす設定：飛ぶ炎は出ない。盤の段は変わる
//  6 ?lamp なし：盤に data-lp が無く、炎も見えない。遊び方は「一巡りの灯」。?lamp ありは遊び方が「灯」
//  7 どれもページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const HOOK = () => { window.__fly = []; const go = () => new MutationObserver((ms) => { for (const m of ms) { for (const n of m.addedNodes) if (n.classList && n.classList.contains('lampfly')) window.__fly.push({ t: performance.now(), gone: 0, n }); for (const n of m.removedNodes) { const f = window.__fly.find((x) => x.n === n); if (f) f.gone = performance.now(); } } }).observe(document.documentElement, { childList: true, subtree: true }); if (document.documentElement) go(); else document.addEventListener('DOMContentLoaded', go); };
async function open(b, q, rm) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: rm ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(HOOK);
  await ctx.addInitScript(() => { try { localStorage.setItem('rb-exp', JSON.stringify({ runs: 3, best: 6 })); localStorage.setItem('rb-teach-inc', '3'); } catch (e) { /* */ } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(testPage() + q); await p.waitForTimeout(500); await p.click('#cover'); await p.waitForTimeout(400); await p.click('#begin'); await p.waitForTimeout(1000);
  await p.click('#rvCards .rv-card[data-i="1"]'); await p.waitForTimeout(1200);
  for (let i = 0; i < 4; i++) { if (await p.evaluate(() => !!(window.__rb.run && window.__rb.run.map))) break; await p.evaluate(() => { const g = document.getElementById('rvGo'); if (g && g.getBoundingClientRect().width > 0) g.click(); else { const c = document.querySelector('#rvCards .rv-card[data-i="0"]'); if (c) c.click(); } }); await p.waitForTimeout(900); }
  await p.evaluate(() => { const R = window.__rb; const ids = Object.keys(R.run.map).filter((id) => R.run.map[id].foe && R.routeChoice(id).type === 'battle'); const c = R.routeChoice(ids[0]); R.run.node = c.step - 1; R.run.enemy = R.expEnemy(9, null, 1); document.getElementById('runv').hidden = true; R.toPrepForTest(); });
  await p.waitForTimeout(500); await p.click('#btnStart').catch(() => {});
  return { ctx, p, errs };
}
const waitChoose = async (p) => { for (let i = 0; i < 700; i++) { const ph = await p.evaluate(() => window.__rb.phase); if (ph === 'choose' || ph === 'over') return ph; await p.waitForTimeout(20); } return ''; };
const look = (p) => p.evaluate(() => {
  const b = document.getElementById('board'), lf = b.querySelector('.strip.r0 .lampf .lf'), r = lf && lf.getBoundingClientRect();
  const m = document.querySelector('#btnRotate .lmul');
  return { lamp: window.__rb.lamp, lp: b.dataset.lp, dots: b.querySelectorAll('.strip.r0 .lampf .ld i').length, on: b.querySelectorAll('.strip.r0 .lampf .ld i.on').length, vis: !!(r && r.width > 0 && getComputedStyle(b.querySelector('.strip.r0 .lampf')).display !== 'none'), mul: m ? m.textContent : '', tip: document.getElementById('tip').hidden ? '' : document.getElementById('tipT').textContent };
});
(async () => {
  const b = await launch();
  { const { ctx, p, errs } = await open(b, '?lamp', false);
    const seen = [], tips = []; let rot = null;
    if ((await waitChoose(p)) === 'choose') for (let t = 0; t < 8; t++) {
      await p.waitForTimeout(900);
      const s = await look(p); seen.push(s); if (s.tip) tips.push(s.tip + '@' + s.lamp);
      if (s.tip) { await p.evaluate(() => document.getElementById('tipOk').click()); await p.waitForTimeout(150); }
      const dis = await p.evaluate(() => document.getElementById('btnRotate').disabled);
      const go = !rot && s.lamp >= 2 && !dis && (s.lamp >= 3 || t >= 4);
      if (go) {
        await p.evaluate(() => { window.__fly = []; }); await p.click('#btnRotate');
        await p.waitForTimeout(60); const lp = await p.evaluate(() => document.getElementById('board').dataset.lp);
        await p.waitForTimeout(1300);
        rot = await p.evaluate(() => ({ n: window.__fly.length, life: window.__fly.map((f) => (f.gone ? Math.round(f.gone - f.t) : -1)), ent: window.__rb.units ? 0 : 0 }));
        rot.lp = lp; rot.from = s.lamp;
      } else await p.click('#btnStay');
      await p.waitForTimeout(100); if ((await waitChoose(p)) !== 'choose') break;
    }
    ok(seen.length >= 2 && seen.every((s) => s.vis && s.lp === String(s.lamp) && s.on === s.lamp && s.dots >= 3), '1 盤の炎と点：' + seen.map((s) => '段' + s.lamp + '/lp' + s.lp + '/点' + s.on + '／' + s.dots).join(' '));
    ok(seen.every((s) => s.mul === (s.lamp >= 3 ? '突入×2' : s.lamp === 2 ? '突入×1.5' : '')), '2 回すボタンの倍率：' + seen.map((s) => s.lamp + ':' + (s.mul || 'なし')).join(' '));
    ok(rot && rot.n === 2 && rot.life.every((x) => x > 0 && x <= 1200) && rot.lp === '1', '3 受け渡し（' + (rot ? rot.from : '-') + '段）：飛ぶ炎 ' + (rot ? rot.n : '-') + '個・消えるまで ' + (rot ? rot.life.join(',') : '-') + 'ms・直後の段 ' + (rot ? rot.lp : '-'));
    ok(tips.filter((x) => /^灯@/.test(x)).length === 1 && /^灯@2/.test(tips.find((x) => /^灯@/.test(x)) || ''), '4 説明「灯」：' + tips.join(' / '));
    ok(!errs.length, '1〜4 ページのエラーなし ' + errs.join(' / '));
    await ctx.close(); }
  { const { ctx, p, errs } = await open(b, '?lamp', true);
    const lps = []; let fly = 0;
    if ((await waitChoose(p)) === 'choose') for (let t = 0; t < 5; t++) {
      await p.waitForTimeout(400); const s = await look(p); lps.push(s.lamp + '/' + s.lp);
      if (s.tip) { await p.evaluate(() => document.getElementById('tipOk').click()); await p.waitForTimeout(100); }
      const dis = await p.evaluate(() => document.getElementById('btnRotate').disabled);
      await p.click(s.lamp >= 2 && !dis ? '#btnRotate' : '#btnStay'); await p.waitForTimeout(100);
      if ((await waitChoose(p)) !== 'choose') break;
    }
    fly = await p.evaluate(() => window.__fly.length);
    ok(fly === 0 && lps.length >= 2 && lps.every((x) => x.split('/')[0] === x.split('/')[1]), '5 動きを減らす設定：飛ぶ炎 ' + fly + '個・段と盤 ' + lps.join(' '));
    ok(!errs.length, '5 ページのエラーなし ' + errs.join(' / '));
    await ctx.close(); }
  { const { ctx, p, errs } = await open(b, '', false); await waitChoose(p); await p.waitForTimeout(300);
    const s = await p.evaluate(() => { const b = document.getElementById('board'), f = b.querySelector('.strip.r0 .lampf'); return { lp: b.dataset.lp == null ? 'なし' : b.dataset.lp, vis: !!(f && getComputedStyle(f).display !== 'none'), help: document.querySelector('#hCombo b').textContent }; });
    const { ctx: c2, p: p2, errs: e2 } = await open(b, '?lamp', true); await waitChoose(p2);
    const h2 = await p2.evaluate(() => document.querySelector('#hCombo b').textContent);
    ok(s.lp === 'なし' && !s.vis && s.help === '一巡りの灯' && h2 === '灯', '6 ?lamp なし：data-lp ' + s.lp + '・炎 ' + (s.vis ? '見える' : '見えない') + '・遊び方「' + s.help + '」／?lamp あり：遊び方「' + h2 + '」');
    ok(!errs.length && !e2.length, '6 ページのエラーなし ' + errs.concat(e2).join(' / '));
    await ctx.close(); await c2.close(); }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
