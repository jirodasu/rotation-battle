// v5.1.48〜 品質改善（更新1・2…）。
// 合格の基準（測る前に決めたもの）：
//  更新1. 戦闘の判断画面で「タイトルへ戻る」→ タイトルに着いたとき「戦闘の途中まで保存しました（ターンn）」が出て、数秒で消える。
//         nは保存のターンと一致。戦闘の途中でない保存（地図など）・チュートリアルからは出ない。
//         「続きから」で再開すると「中断したところから再開しました（ターンn）」が出る
//  更新2. 保存があるとき、再読み込みしてもスプラッシュ（画面をタップしてはじめる）を出さず、メニューがすぐ押せる。
//         戦闘の再開までのタップ数は、今まで（スプラッシュ1回＋続きから1回＝2回）より増えない（1回）。
//         押した時点で音の準備（AudioContext）ができる。保存がない初回起動は従来どおりスプラッシュ
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS_ALL = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"bench":1}';
async function page(b, opt) {
  opt = opt || {};
  const ctx = await b.newContext({ viewport: { width: opt.w || 390, height: opt.h || 844 }, reducedMotion: opt.rm === false ? 'no-preference' : 'reduce' });
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-10T10:00:00'));
  await p.addInitScript((t) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* 保存できない */ } }, TIPS_ALL);
  await p.goto(testPage() + '?audiodebug'); await p.waitForTimeout(300);
  return { ctx, p };
}
const vis = (p, id) => p.evaluate((id) => !document.getElementById(id).hidden, id);
const toastOn = (p) => p.evaluate(() => { const t = document.getElementById('toast'); return !t.hidden && t.classList.contains('on') ? t.textContent : ''; });
async function toChoose(p) {
  await p.click('#begin'); await p.waitForTimeout(400);
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1200);
  await p.click('#btnStart');
  for (let i = 0; i < 100; i++) { if (await p.evaluate(() => !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden')) break; await p.waitForTimeout(100); }
}
(async () => {
  const b = await launch();

  /* ---- 更新2（保存がない初回）：従来どおりスプラッシュ ---- */
  {
    const { ctx, p } = await page(b);
    ok(await p.evaluate(() => document.getElementById('cover').classList.contains('gate')), '保存がない初回起動は、スプラッシュ（タップしてはじめる）が出る');
    await p.click('#cover'); await p.waitForTimeout(300);
    ok(!(await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) && await vis(p, 'begin'), 'タップするとメニューが出る');
    ok(await p.evaluate(() => !!window.__rbAudio().ctx), 'そのタップで音の準備ができる');
    await ctx.close();
  }

  /* ---- 更新1：戻るときの保存通知 → 更新2：再読み込み後の再開 ---- */
  {
    const { ctx, p } = await page(b);
    await p.click('#cover'); await p.waitForTimeout(250);
    await toChoose(p);
    const turn = await p.evaluate(() => window.__rb.turn);
    ok(!(await toastOn(p)), '戦闘の途中では通知は出ていない');
    await p.click('#homeBtn'); await p.waitForTimeout(500);
    const t1 = await toastOn(p);
    ok(t1 === '戦闘の途中まで保存しました（ターン' + turn + '）', '戻ると保存通知が出る：「' + t1 + '」');
    ok(await p.evaluate(() => { const r = document.getElementById('toast').getBoundingClientRect(), c = document.getElementById('cover').getBoundingClientRect(); return r.top >= 0 && r.bottom < c.bottom && getComputedStyle(document.getElementById('toast')).zIndex > getComputedStyle(document.getElementById('cover')).zIndex; }), '通知はタイトルの上に見えている');
    await p.waitForTimeout(3900);
    ok(!(await toastOn(p)) && !(await vis(p, 'toast')), '数秒で消える');

    // 再読み込み：スプラッシュなしで、1タップで戦闘へ
    await p.reload(); await p.waitForTimeout(500);
    const st = await p.evaluate(() => ({ gate: document.getElementById('cover').classList.contains('gate'), resume: !document.getElementById('resume').hidden, begin: !document.getElementById('begin').hidden, sub: document.getElementById('resumeSub').textContent, audio: !!window.__rbAudio().ctx }));
    ok(!st.gate && st.resume && st.begin, '保存があると、再読み込み後もスプラッシュなしでメニューが出る（' + st.sub + '）');
    await p.click('#resume'); await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({ phase: window.__rb.phase, turn: window.__rb.turn, audio: !!window.__rbAudio().ctx, cover: document.getElementById('cover').hidden || document.body.classList.contains('is-cover') === false }));
    ok(r.phase === 'choose' && r.turn === turn, '1タップで、同じ戦闘の同じ場面（ターン' + r.turn + '）に戻る（従来は2タップ）');
    ok(r.audio, '押した時点で音の準備ができる');
    const t2 = await toastOn(p);
    ok(t2 === '中断したところから再開しました（ターン' + turn + '）', '再開の通知：「' + t2 + '」');
    // 戦闘の途中でない保存（地図など）では、戻っても通知なし
    await p.evaluate(() => { document.getElementById('runv').hidden = true; window.__rb.finishForTest && 0; });
    await p.waitForTimeout(3800);
    await ctx.close();
  }
  {
    const { ctx, p } = await page(b);
    await p.click('#cover'); await p.waitForTimeout(250);
    await p.click('#begin'); await p.waitForTimeout(500);   // 地図（戦闘の保存なし）
    await p.evaluate(() => window.__rb.goTitle()); await p.waitForTimeout(400);
    ok(!(await toastOn(p)), '地図（戦闘の途中でない保存）から戻っても保存通知は出ない');
    await ctx.close();
  }
  {
    const { ctx, p } = await page(b);
    await p.click('#cover'); await p.waitForTimeout(250);
    await p.click('#beginTut'); await p.waitForTimeout(1500);
    await p.evaluate(() => window.__rb.goTitle()); await p.waitForTimeout(400);
    ok(!(await toastOn(p)), 'チュートリアルから戻っても保存通知は出ない');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }

  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
