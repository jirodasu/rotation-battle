// v5.8.9 魔女ネムリの攻撃モーション（指示書「魔女（witch）攻撃アニメーション」）
// 盤は標準の隊（ネムリは補助列から間接攻撃）
// 合格の基準（測る前に決めたもの）：
//  1 盤のネムリ（ちびキャラ）は部品の骨組み（root・torso・head・face・shU・shL・stU・stL・staff・glow・脚・つま先・影・軌跡 arcA・arcB）を持つ
//  2 ネムリが攻撃すると、部品ごとの動きが 0.42秒で動き（全体に別の緩急を掛けない）、札も 0.42秒で跳び出す
//  3 ため（0.24＝約0.10秒）で玉が光る（glow の濃さ 0.7 以上）。待機中は光らない
//  4 命中の瞬間（0.40＝0.168秒）、杖の玉は待機より右下（右へ15以上・下へ20以上）にあり、白い弧が見える
//  5 動きのあと、部品はすべて元の形に戻る（動きが残らない・札はマスの元の位置・玉も待機と同じ・光と弧は見えない）
//  6 動きを減らす設定では、部品も札も動かない
//  ページのエラーなし
const { launch, testPage, OUT } = require('./_env');
const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const WT = `[...document.querySelectorAll('#board .tok.cb')].find((x) => x.querySelector('[data-p="staff"]') && (!window.__wId || x.dataset.id === window.__wId))`;
async function open(b, rm) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: rm ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => {
    window.__parts = []; window.__tokA = []; window.__w = [];
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (kf, opt) {
      const a = orig.apply(this, arguments);
      try {
        const tok = this.closest && this.closest('.tok'), w = tok && tok.querySelector('[data-p="staff"]');
        if (this.dataset && this.dataset.p && w) { window.__parts.push({ p: this.dataset.p, d: opt && opt.duration, e: opt && opt.easing }); window.__w.push(a); if (!window.__wId) window.__wId = tok.dataset.id; }
        else if (this.classList && this.classList.contains('tok') && this.querySelector('[data-p="staff"]')) window.__tokA.push(opt && opt.duration);
      } catch (e) { /* */ }
      return a;
    };
  });
  await p.goto(testPage() + '?qa&ch=1&loc=1&foe=0&v=none'); await p.waitForTimeout(900);
  return { ctx, p, errs };
}
// ネムリは攻撃列でだけ攻撃する（標準の隊では補助列から始まる）。攻撃するまで、選ぶ場面では「回す」（押せなければ「維持」）、陣立てでは「戦闘開始」を押す
const untilAttack = async (p, maxMs) => { const t0 = Date.now(); while (Date.now() - t0 < maxMs) {
  const st = await p.evaluate(() => ({ hit: window.__parts.some((x) => x.p === 'stU'), ph: window.__rb.phase, start: !document.getElementById('btnStart').hidden && !document.getElementById('btnStart').disabled, rot: !document.getElementById('btnRotate').hidden, rdis: document.getElementById('btnRotate').disabled, tip: !document.getElementById('tip').hidden }));
  if (st.hit || st.ph === 'over') return st.hit;
  if (st.tip) await p.click('#tipOk').catch(() => {});
  else if (st.ph === 'choose' && st.rot) await p.click(st.rdis ? '#btnStay' : '#btnRotate').catch(() => {});
  else if (st.start) await p.click('#btnStart').catch(() => {});
  await p.waitForTimeout(20); } return false; };
const toChoose = async (p) => { for (let k = 0; k < 200; k++) { await p.waitForTimeout(80); if (await p.evaluate(() => window.__rb.phase === 'choose' || window.__rb.phase === 'over')) break; } };
// 玉の中心を、足もと（動いても変わらない点）からの向きと距離で測る。単位は絵の座標（待機の玉は 82,40、足もとは 50,118）。右が＋、下が＋
const probe = (p) => p.evaluate((WT) => { const t = eval(WT); const at = (sel, x, y) => { const g = t.querySelector('[data-p="' + sel + '"]'), m = g.getScreenCTM(), q = g.ownerSVGElement.createSVGPoint(); q.x = x; q.y = y; const r = q.matrixTransform(m); return [r.x, r.y]; };
  const f0 = at('root', 50, 118), u = t.querySelector('.disc svg').getScreenCTM().a, rel = (q) => [Math.round((q[0] - f0[0]) / u * 10) / 10, Math.round((q[1] - f0[1]) / u * 10) / 10];
  const op = (n) => +getComputedStyle(t.querySelector('[data-p="' + n + '"]')).opacity;
  return { orb: rel(at('staff', 82, 40)), glow: op('glow'), arc: op('arcA') }; }, WT);
(async () => {
  const b = await launch();
  { const { ctx, p, errs } = await open(b, false);
    const rig = await p.evaluate(() => [...document.querySelectorAll('#board .tok.cb')].map((t) => ({ job: (window.__rb.units().find((x) => x.u.uid === t.dataset.id) || { u: {} }).u.id, parts: [...t.querySelectorAll('[data-p]')].map((g) => g.dataset.p) })));
    const w = rig.find((x) => x.job === 'witch');
    const need = ['shadow', 'root', 'legL', 'footL', 'legR', 'footR', 'torso', 'head', 'face', 'shU', 'shL', 'stU', 'stL', 'staff', 'glow', 'arcA', 'arcB'];
    ok(w && need.every((n) => w.parts.includes(n)) && w.parts.length === need.length, '1 盤のネムリは骨組みを持つ（' + (w ? w.parts.join(',') : 'ネムリがいない') + '）');
    let idle = await probe(p); for (let k = 0; k < 20; k++) { await p.waitForTimeout(150); const n = await probe(p); const same = n.orb[0] === idle.orb[0] && n.orb[1] === idle.orb[1]; idle = n; if (same) break; }
    ok(idle.glow === 0 && idle.arc === 0, '3 待機中、玉は光らず弧も見えない（玉 ' + idle.orb + '）');
    const went = await untilAttack(p, 60000);
    ok(went, '準備：ネムリが攻撃列に入って攻撃した');
    await p.evaluate(() => { for (const a of window.__w) { a.pause(); a.currentTime = 101; } });
    const charge = await probe(p);
    await p.screenshot({ path: path.join(OUT, 'v589-charge.png') });
    await p.evaluate(() => { for (const a of window.__w) a.currentTime = 168; });
    const hit = await probe(p);
    await p.screenshot({ path: path.join(OUT, 'v589-hit.png') });
    const parts = await p.evaluate(() => window.__parts), tokA = await p.evaluate(() => window.__tokA);
    const moved = [...new Set(parts.map((x) => x.p))];
    ok(need.every((n) => moved.includes(n)) && parts.every((x) => x.d === 420 && !x.e), '2 ネムリの攻撃で部品が 0.42秒で動く・全体に別の緩急を掛けていない（' + moved.join(',') + '）');
    ok(tokA.includes(420), '2 札も 0.42秒で跳び出す（' + tokA.join(',') + '）');
    ok(charge.glow >= 0.7, '3 ためで玉が光る（濃さ ' + charge.glow + '）');
    ok(hit.orb[0] - idle.orb[0] >= 15 && hit.orb[1] - idle.orb[1] >= 20 && hit.arc > 0.8, '4 命中の瞬間、玉は待機より右下にあり、白い弧が見える（玉 ' + idle.orb + ' → ' + hit.orb + '・弧の濃さ ' + hit.arc + '）');
    await p.evaluate(() => { for (const a of window.__w) a.play(); });
    await toChoose(p); await p.waitForTimeout(500);
    const after = await p.evaluate((WT) => { const t = eval(WT); const r = t.getBoundingClientRect(), q = t.parentElement.getBoundingClientRect(); return { pos: [Math.round(r.left - q.left), Math.round(r.top - q.top)], run: [...t.querySelectorAll('[data-p]')].reduce((n, g) => n + g.getAnimations().filter((a) => a.playState === 'running').length, 0), tf: [...t.querySelectorAll('[data-p]')].filter((g) => !/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(getComputedStyle(g).transform) && g.dataset.p !== 'arcB').map((g) => g.dataset.p + ':' + getComputedStyle(g).transform) }; }, WT);
    const end = await probe(p);
    ok(after.run === 0 && after.tf.length === 0 && end.glow === 0 && end.arc === 0, '5 動きのあと、部品は元の形に戻り、光と弧は見えない（動き ' + after.run + '・形が違う ' + after.tf.join(' ') + '）');
    ok(Math.abs(after.pos[0]) <= 4 && Math.abs(after.pos[1]) <= 4 && Math.abs(end.orb[0] - idle.orb[0]) <= 2 && Math.abs(end.orb[1] - idle.orb[1]) <= 2, '5 札はマスの元の位置に戻り、玉も待機と同じ（札 ' + after.pos + '・玉 ' + idle.orb + ' → ' + end.orb + '）');
    ok(!errs.length, 'ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  { const { ctx, p, errs } = await open(b, true);
    await untilAttack(p, 25000); await p.waitForTimeout(600);   // 動きを減らす設定では部品が動かないので、攻撃の有無は分からない。回して数ターン進める
    const n = await p.evaluate(() => window.__parts.length + window.__tokA.length);
    ok(n === 0, '6 動きを減らす設定では部品も札も動かない（' + n + '回）');
    ok(!errs.length, '6 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
