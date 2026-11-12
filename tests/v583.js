// v5.8.3 戦士トワの攻撃モーション（動きの見本「トワの攻撃モーション試作」）
// 合格の基準（測る前に決めたもの）：
//  1 盤のトワ（ちびキャラ）は部品の骨組み（root・torso・head・両腕・剣・脚・影・斬撃の軌跡）を持つ。ほかの職業は持たない
//  2 トワが攻撃すると、部品ごとの動き（swU・swL・sword・torso・head・shU・legL・slashA など）が 0.42秒で動き、札も 0.42秒で跳び出す
//  3 動きのあと、部品はすべて元の形に戻る（動いているアニメーションが残らない・札の位置が元と同じ）
//  4 敵に出るトワの斬撃は、左上から右下（rotate(50deg)）
//  5 動きを減らす設定では、部品も札も動かない（ほかの演出と同じ）
//  ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
async function open(b, rm) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: rm ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => {
    window.__parts = []; window.__arcs = []; window.__tokA = [];
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (kf, opt) {
      try {
        if (this.dataset && this.dataset.p) window.__parts.push({ p: this.dataset.p, d: opt && opt.duration });
        else if (this.classList && this.classList.contains('arc')) window.__arcs.push(String(kf[0].transform));
        else if (this.classList && this.classList.contains('tok') && this.querySelector('[data-p="root"]')) window.__tokA.push(opt && opt.duration);
      } catch (e) { /* */ }
      return orig.apply(this, arguments);
    };
  });
  await p.goto(testPage() + '?qa&ch=1&loc=1&foe=0&v=none'); await p.waitForTimeout(900);
  return { ctx, p, errs };
}
const toChoose = async (p) => { for (let k = 0; k < 200; k++) { await p.waitForTimeout(80); if (await p.evaluate(() => window.__rb.phase === 'choose' || window.__rb.phase === 'over')) break; } };
(async () => {
  const b = await launch();
  { const { ctx, p, errs } = await open(b, false);
    const rig = await p.evaluate(() => [...document.querySelectorAll('#board .tok.cb')].map((t) => ({ id: (t.dataset.id || ''), job: (window.__rb.units().find((x) => x.u.uid === t.dataset.id) || { u: {} }).u.id, parts: [...t.querySelectorAll('[data-p]')].map((g) => g.dataset.p) })));
    const w = rig.find((x) => x.job === 'warrior'), others = rig.filter((x) => x.job !== 'warrior');
    const need = ['root', 'torso', 'head', 'shU', 'shL', 'swU', 'swL', 'sword', 'legL', 'legR', 'shadow', 'slashA', 'slashB'];
    ok(w && need.every((n) => w.parts.includes(n)), '1 盤のトワは骨組みを持つ（' + (w ? w.parts.join(',') : 'トワがいない') + '）');
    ok(others.length > 0 && others.every((x) => x.parts.length === 0), '1 ほかの職業は骨組みを持たない（' + others.map((x) => x.job + ':' + x.parts.length).join(' ') + '）');
    const pos0 = await p.evaluate(() => { const t = [...document.querySelectorAll('#board .tok.cb')].find((x) => x.querySelector('[data-p="root"]')); const r = t.getBoundingClientRect(), q = t.parentElement.getBoundingClientRect(); return [Math.round(r.left - q.left), Math.round(r.top - q.top)]; });
    await p.click('#btnStart');
    for (let k = 0; k < 120; k++) { await p.waitForTimeout(80); if (await p.evaluate(() => window.__parts.some((x) => x.p === 'swU'))) break; }
    const parts = await p.evaluate(() => window.__parts), tokA = await p.evaluate(() => window.__tokA);
    const moved = [...new Set(parts.map((x) => x.p))];
    ok(['swU', 'swL', 'sword', 'torso', 'head', 'shU', 'legL', 'slashA', 'root'].every((n) => moved.includes(n)) && parts.every((x) => x.d === 420), '2 トワの攻撃で部品が 0.42秒で動く（' + moved.join(',') + '）');
    ok(tokA.includes(420), '2 札も 0.42秒で跳び出す（' + tokA.join(',') + '）');
    await toChoose(p); await p.waitForTimeout(400);
    const after = await p.evaluate(() => { const t = [...document.querySelectorAll('#board .tok.cb')].find((x) => x.querySelector('[data-p="root"]')); const r = t.getBoundingClientRect(), q = t.parentElement.getBoundingClientRect(); return { pos: [Math.round(r.left - q.left), Math.round(r.top - q.top)], run: [...t.querySelectorAll('[data-p]')].reduce((n, g) => n + g.getAnimations().filter((a) => a.playState === 'running').length, 0), tf: [...t.querySelectorAll('[data-p]')].filter((g) => g.dataset.p !== 'slashB' && !/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(getComputedStyle(g).transform)).map((g) => g.dataset.p + ':' + getComputedStyle(g).transform) }; });
    ok(after.run === 0 && after.tf.length === 0, '3 動きのあと、部品は元の形に戻る（動き ' + after.run + '・形が違う ' + after.tf.join(' ') + '）');
    ok(Math.abs(after.pos[0] - pos0[0]) <= 4 && Math.abs(after.pos[1] - pos0[1]) <= 4, '3 札のマスの中の位置は元と同じ（' + pos0 + ' → ' + after.pos + '）');
    const arcs = await p.evaluate(() => window.__arcs);
    ok(arcs.some((t) => /rotate\(50deg\)/.test(t)), '4 敵に出るトワの斬撃は左上から右下（' + arcs.join(' / ') + '）');
    ok(!errs.length, 'ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  { const { ctx, p, errs } = await open(b, true);
    await p.click('#btnStart'); await toChoose(p); await p.waitForTimeout(300);
    const n = await p.evaluate(() => window.__parts.length + window.__tokA.length);
    ok(n === 0, '5 動きを減らす設定では部品も札も動かない（' + n + '回）');
    ok(!errs.length, '5 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
