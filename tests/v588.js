// v5.8.8 騎士カスガイの攻撃モーション（動きの見本「騎士 — 盾越しの直線突き」）
// 盤は「堅守の隊」（騎士2人・魔女・僧侶）。標準の隊に騎士はいない
// 合格の基準（測る前に決めたもの）：
//  1 盤のカスガイ（ちびキャラ）は部品の骨組み（root・torso・head・face・spU・spL・spear・shU・shL・shield・脚・影・突きの軌跡）を持つ。トワの骨組みは今までどおり
//  2 カスガイが攻撃すると、部品ごとの動き（spU・spL・spear・shU・shL・shield・torso・head・root・thrust など）が 0.42秒で動き、札も 0.42秒で跳び出す
//  3 命中の瞬間（0.40＝0.168秒）、槍の穂先は盾より右上（盾の中心より右、体の中心より上）にある。待機中は体の左で上を向いている
//  4 動きのあと、部品はすべて元の形に戻る（動いているアニメーションが残らない・札の位置が元と同じ・軌跡は見えない）
//  5 敵に出るカスガイの突きは、右上がりの細い線（rotate(-18deg)）
//  6 動きを減らす設定では、部品も札も動かない（ほかの演出と同じ）
//  ページのエラーなし
const { launch, testPage, OUT } = require('./_env');
const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
// 測る札：攻撃した騎士（まだ誰も攻撃していなければ、盤の最初の騎士）
const KN = `[...document.querySelectorAll('#board .tok.cb')].find((x) => x.querySelector('[data-p="spear"]') && (!window.__knId || x.dataset.id === window.__knId))`;
async function open(b, rm) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: rm ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => {
    window.__parts = []; window.__arcs = []; window.__tokA = []; window.__kn = [];
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (kf, opt) {
      const a = orig.apply(this, arguments);
      try {
        const kn = this.closest && this.closest('.tok') && this.closest('.tok').querySelector('[data-p="spear"]');
        if (this.dataset && this.dataset.p && kn) { window.__parts.push({ p: this.dataset.p, d: opt && opt.duration, e: opt && opt.easing }); window.__kn.push(a); if (!window.__knId) window.__knId = this.closest('.tok').dataset.id; }
        else if (this.classList && this.classList.contains('arc')) window.__arcs.push({ t: String(kf[0].transform), kn: !!window.__knNow });
        else if (this.classList && this.classList.contains('tok') && this.querySelector('[data-p="spear"]')) { window.__tokA.push(opt && opt.duration); window.__knNow = true; setTimeout(() => { window.__knNow = false; }, 300); }
        else if (this.classList && this.classList.contains('tok')) window.__knNow = false;
      } catch (e) { /* */ }
      return a;
    };
  });
  await p.goto(testPage() + '?qa&ch=1&loc=1&foe=0&v=none&sq=guard'); await p.waitForTimeout(900);
  return { ctx, p, errs };
}
const toChoose = async (p) => { for (let k = 0; k < 200; k++) { await p.waitForTimeout(80); if (await p.evaluate(() => window.__rb.phase === 'choose' || window.__rb.phase === 'over')) break; } };
// 穂先・盾の中心・体の中心を、足もと（動いても変わらない点）からの向きと距離で測る。単位は絵の座標（待機の穂先は 15,20、足もとは 50,118）。右が＋、上が−
const probe = (p) => p.evaluate((KN) => { const t = eval(KN); const at = (sel, x, y) => { const g = t.querySelector('[data-p="' + sel + '"]'), m = g.getScreenCTM(), q = g.ownerSVGElement.createSVGPoint(); q.x = x; q.y = y; const r = q.matrixTransform(m); return [r.x, r.y]; }; const f0 = at('root', 50, 118), u = t.querySelector('.disc svg').getScreenCTM().a, rel = (q) => [Math.round((q[0] - f0[0]) / u * 10) / 10, Math.round((q[1] - f0[1]) / u * 10) / 10];
  return { tip: rel(at('spear', 15, 20)), shield: rel(at('shield', 73, 96)), body: rel(at('root', 50, 86)), thrust: +getComputedStyle(t.querySelector('[data-p="thrust"]')).opacity }; }, KN);
(async () => {
  const b = await launch();
  { const { ctx, p, errs } = await open(b, false);
    const rig = await p.evaluate(() => [...document.querySelectorAll('#board .tok.cb')].map((t) => ({ job: (window.__rb.units().find((x) => x.u.uid === t.dataset.id) || { u: {} }).u.id, parts: [...t.querySelectorAll('[data-p]')].map((g) => g.dataset.p) })));
    const kn = rig.find((x) => x.job === 'knight'), w = rig.find((x) => x.job === 'warrior');
    const need = ['root', 'torso', 'head', 'face', 'spU', 'spL', 'spear', 'shU', 'shL', 'shield', 'legL', 'legR', 'footL', 'footR', 'shadow', 'thrust'];
    ok(kn && need.every((n) => kn.parts.includes(n)) && kn.parts.length === need.length, '1 盤のカスガイは骨組みを持つ（' + (kn ? kn.parts.join(',') : 'カスガイがいない') + '）');
    ok(!w || (w.parts.includes('sword') && !w.parts.includes('spear')), '1 トワの骨組みは今までどおり（' + (w ? w.parts.length + '部品' : 'この盤にトワはいない') + '）');
        // 待機の形は、盤の登場の動きが落ち着いてから測る（並べて流すと遅れて、1回目は 1.3 ずれた）
    let idle = await probe(p); for (let k = 0; k < 20; k++) { await p.waitForTimeout(150); const n = await probe(p); const same = n.tip[0] === idle.tip[0] && n.tip[1] === idle.tip[1]; idle = n; if (same) break; }
    ok(idle.tip[0] < idle.body[0] && idle.tip[1] < idle.body[1] && idle.thrust === 0, '3 待機中、槍は体の左で上を向き、軌跡は見えない（穂先 ' + idle.tip + '・体 ' + idle.body + '）');
    await p.screenshot({ path: path.join(OUT, 'v588-idle.png') });
    await p.click('#btnStart');
    for (let k = 0; k < 400; k++) { await p.waitForTimeout(20); if (await p.evaluate(() => window.__parts.some((x) => x.p === 'spU'))) break; }
    // 命中の瞬間（0.40）で止めて測る
    await p.evaluate(() => { for (const a of window.__kn) { a.pause(); a.currentTime = 168; } });
    const hit = await probe(p);
    await p.screenshot({ path: path.join(OUT, 'v588-hit.png') });
    const parts = await p.evaluate(() => window.__parts), tokA = await p.evaluate(() => window.__tokA);
    const moved = [...new Set(parts.map((x) => x.p))];
    ok(['spU', 'spL', 'spear', 'shU', 'shL', 'shield', 'torso', 'head', 'face', 'legL', 'legR', 'root', 'shadow', 'thrust'].every((n) => moved.includes(n)) && parts.every((x) => x.d === 420 && !x.e), '2 カスガイの攻撃で部品が 0.42秒で動く・全体に別の緩急を掛けていない（' + moved.join(',') + '）');
    ok(tokA.includes(420), '2 札も 0.42秒で跳び出す（' + tokA.join(',') + '）');
    ok(hit.tip[0] > hit.shield[0] && hit.tip[1] < hit.body[1] && hit.tip[0] - idle.tip[0] > 60 && hit.thrust > 0.8, '3 命中の瞬間、穂先は盾より右・体の中心より上にあり、軌跡が見える（穂先 ' + hit.tip + '・盾 ' + hit.shield + '・体 ' + hit.body + '・軌跡の濃さ ' + hit.thrust + '）');
    await p.evaluate(() => { for (const a of window.__kn) a.play(); });
    await toChoose(p); await p.waitForTimeout(500);
    const after = await p.evaluate((KN) => { const t = eval(KN); const r = t.getBoundingClientRect(), q = t.parentElement.getBoundingClientRect(); return { pos: [Math.round(r.left - q.left), Math.round(r.top - q.top)], run: [...t.querySelectorAll('[data-p]')].reduce((n, g) => n + g.getAnimations().filter((a) => a.playState === 'running').length, 0), tf: [...t.querySelectorAll('[data-p]')].filter((g) => !/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(getComputedStyle(g).transform)).map((g) => g.dataset.p + ':' + getComputedStyle(g).transform) }; }, KN);
    const end = await probe(p);
    ok(after.run === 0 && after.tf.length === 0 && end.thrust === 0, '4 動きのあと、部品は元の形に戻り、軌跡は見えない（動き ' + after.run + '・形が違う ' + after.tf.join(' ') + '）');
    ok(Math.abs(after.pos[0]) <= 4 && Math.abs(after.pos[1]) <= 4 && Math.abs(end.tip[0] - idle.tip[0]) <= 2 && Math.abs(end.tip[1] - idle.tip[1]) <= 2, '4 札はマスの元の位置に戻り、穂先も待機と同じ（札 ' + after.pos + '・穂先 ' + idle.tip + ' → ' + end.tip + '）');
    const arcs = await p.evaluate(() => window.__arcs);
    ok(arcs.some((a) => /rotate\(-18deg\)/.test(a.t)) && !arcs.some((a) => /rotate\(22deg\)/.test(a.t)), '5 敵に出るカスガイの突きは右上がりの細い線（' + arcs.map((a) => a.t).join(' / ') + '）');
    ok(!errs.length, 'ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  { const { ctx, p, errs } = await open(b, true);
    await p.click('#btnStart'); await toChoose(p); await p.waitForTimeout(300);
    const n = await p.evaluate(() => window.__parts.length + window.__tokA.length);
    ok(n === 0, '6 動きを減らす設定では部品も札も動かない（' + n + '回）');
    ok(!errs.length, '6 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
