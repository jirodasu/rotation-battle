// v5.8.2（指示書の名前は v5.7.8「回すの手応え」）：回すの待ち時間を半分にする・待ち中のタップで飛ばす・振動できない端末では盤を沈ませる
// 合格の基準（測る前に決めたもの）：
//  A1 通常速度：「回す」を押してから敵のターン（runTurn。Music.set('resolve')）に進むまで 380〜650ms（以前は900ms以上。画面に出す作りの設定は約450msで、残りは描画の遅れ。遅れは機械しだいで100〜170msあった）
//  A2 2倍速（rb-fast）：150〜480ms（描画の遅れが大きく揺れる。速さの比は speed.js が見る）
//  A3 待ち中（100ms後）に盤をタップ：330ms未満で進む。そのタップは盤・敵の click として働かない（敵の詳細が開かない）
//     仲間は最終的に自分のマスにいる（ずれ2px以内）・回転アイコンが残らない・slot の z-index が戻る
//  A4 動きを減らす設定（RM）：回しても進む（300ms未満）
//  B1 振動できない端末：回すと盤が translate 0 2px で沈んで戻る（終わると translate なし・盤の位置の差0px）
//     「しのいだ！」では盤が 0 3px、救った仲間の札が scale 0.96 で沈んで戻る
//  B2 振動できる端末：沈む演出は出ず、vibrate が呼ばれる
//  B3 動きを減らす設定：振動できない端末でも沈む演出は出ない
//  すべて ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const med = (xs) => xs.slice().sort((x, y) => x - y)[Math.floor(xs.length / 2)];
async function open(b, o) {
  const ctx = await b.newContext({ viewport: o.vp || { width: 390, height: 844 }, reducedMotion: o.rm ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(([vib, fast]) => {
    try { localStorage.setItem('rb-fast', fast ? '1' : '0'); } catch (e) { /* */ }
    window.__tr = []; window.__vb = 0;
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (kf) {
      try {
        const k0 = Array.isArray(kf) ? kf[0] : null;
        if (k0 && ('translate' in k0 || 'scale' in k0) && (this.id === 'board' || (this.classList && this.classList.contains('tok')))) window.__tr.push({ id: this.id || 'tok', tr: 'translate' in k0 ? kf[1].translate : null, sc: 'scale' in k0 ? kf[1].scale : null });
      } catch (e) { /* */ }
      return orig.apply(this, arguments);
    };
    if (vib) navigator.vibrate = function () { window.__vb += 1; return true; };
    else { try { delete Navigator.prototype.vibrate; } catch (e) { /* */ } try { Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true }); } catch (e) { /* */ } }
  }, [!!o.vib, !!o.fast]);
  return { ctx, p, errs };
}
// 2ターン目の選ぶ場面まで進める。sturdy：回した先で誰も倒れない（「しのいだ！」が出る）状態にする
async function toChoosePhase(p, sturdy) {
  await p.goto(testPage() + '?qa&ch=1&loc=1&foe=0&v=none'); await p.waitForTimeout(900);
  const toChoose = async () => { for (let k = 0; k < 150; k++) { await p.waitForTimeout(80); if (await p.evaluate(() => window.__rb.phase === 'choose' || window.__rb.phase === 'over')) break; } };
  await p.click('#btnStart'); await toChoose(); await p.click('#btnStay'); await toChoose();
  await p.evaluate((st) => { const R = window.__rb; R.enemy.hp = 999; R.enemy.max = 999; if (st) { R.grid[0].forEach((u) => { if (u) u.hp = 1; }); R.grid[1].forEach((u) => { if (u) { u.max = 99; u.hp = 99; } }); } R.render(); }, !!sturdy);
  await p.evaluate(() => {
    const M = window.__M, f = M.set; window.__ev = null; window.__t0 = 0;
    M.set = function (k) {
      if (k === 'resolve' && window.__t0 && !window.__ev) {
        const off = [...document.querySelectorAll('#board .tok[data-id]')].map((t) => Math.abs(window.__offOf(t) - (window.__base[t.dataset.id] || 0)));
        window.__ev = { dt: performance.now() - window.__t0, off, z: [...document.querySelectorAll('#board .tok[data-id]')].filter((t) => t.parentElement.style.zIndex !== '').length, icon: document.querySelectorAll('#board .spinicon').length };
      }
      return f.apply(this, arguments);
    };
    window.__offOf = (t) => { const a = t.getBoundingClientRect(), s = t.parentElement.getBoundingClientRect(); return Math.round(Math.abs((a.left + a.width / 2) - (s.left + s.width / 2)) + Math.abs((a.top + a.height / 2) - (s.top + s.height / 2))); };
    window.__base = {}; document.querySelectorAll('#board .tok[data-id]').forEach((t) => { window.__base[t.dataset.id] = window.__offOf(t); });
    window.__ck = 0; document.getElementById('board').addEventListener('click', () => { window.__ck += 1; });
  });
  return toChoose;
}
const press = (p) => p.evaluate(() => { window.__t0 = performance.now(); document.getElementById('btnRotate').click(); });
const rect = (p, sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top }; }, sel);

(async () => {
  const b = await launch();
  // A1・A2：時間（3回ずつ測って真ん中の値）
  for (const [fast, lo, hi, tag] of [[false, 380, 650, 'A1 通常速度'], [true, 150, 480, 'A2 2倍速']]) {
    const xs = [], errsAll = []; let offs = [];
    for (let i = 0; i < 3; i++) {
      const { ctx, p, errs } = await open(b, { vib: true, fast }); await toChoosePhase(p, false);
      await press(p); await p.waitForFunction(() => window.__ev, null, { timeout: 5000 });
      const ev = await p.evaluate(() => window.__ev); xs.push(Math.round(ev.dt)); offs = offs.concat(ev.off); errsAll.push(...errs);
      if (i === 0) ok(ev.off.every((v) => v <= 2) && ev.z === 0 && ev.icon === 0, tag + '：進んだ時点で仲間は自分のマス・z-index と回転アイコンは元に戻っている（ずれ ' + ev.off.join(',') + '・z ' + ev.z + '・アイコン ' + ev.icon + '）');
      await ctx.close();
    }
    const m = med(xs); ok(m >= lo && m <= hi, tag + '：押してから敵のターンまで ' + xs.join('/') + 'ms（真ん中 ' + m + 'ms、基準 ' + lo + '〜' + hi + '）');
    ok(!errsAll.length, tag + '：ページのエラーなし ' + errsAll.join(' / '));
  }
  // A3：待ち中のタップ（盤・敵の上）
  for (const [sel, tag] of [['#board', 'A3 盤をタップ'], ['.stage', 'A3 敵のあたりをタップ']]) {
    const { ctx, p, errs } = await open(b, { vib: true }); await toChoosePhase(p, false);
    const turn0 = await p.evaluate(() => window.__rb.turn);
    await press(p); await p.waitForTimeout(100);
    const r = await rect(p, sel); await p.mouse.click(r.x, r.y);
    await p.waitForFunction(() => window.__ev, null, { timeout: 5000 });
    const ev = await p.evaluate(() => window.__ev); await p.waitForTimeout(500);
    const after = await p.evaluate(() => ({ ck: window.__ck, insp: !!document.querySelector('.stage.inspecting'), turn: window.__rb.turn, tip: !document.getElementById('tip').hidden }));
    ok(ev.dt < 330, tag + '：残りが飛ばされて ' + Math.round(ev.dt) + 'ms で敵のターンへ（基準 330ms 未満）');
    ok(ev.off.every((v) => v <= 2) && ev.z === 0 && ev.icon === 0, tag + '：飛ばしても仲間は自分のマス・z-index と回転アイコンは元に戻る（ずれ ' + ev.off.join(',') + '）');
    ok(after.ck === 0 && !after.insp, tag + '：そのタップは盤・敵の押下として働かない（盤の click ' + after.ck + '回・敵の詳細 ' + (after.insp ? '開いた' : '開かない') + '）');
    ok(!errs.length, tag + '：ページのエラーなし ' + errs.join(' / ')); await ctx.close();
  }
  // 飛ばさないとき、押下は止められない（待ちの外のタップは今までどおり働く）
  { const { ctx, p, errs } = await open(b, { vib: true }); await toChoosePhase(p, false);
    await press(p); await p.waitForFunction(() => window.__ev, null, { timeout: 5000 }); await p.waitForTimeout(150);
    const r = await rect(p, '#board'); await p.mouse.click(r.x, r.y); await p.waitForTimeout(100);
    ok((await p.evaluate(() => window.__ck)) >= 1, 'A3 待ちが終わったあとのタップは、今までどおり盤に届く'); ok(!errs.length, 'A3 ページのエラーなし'); await ctx.close(); }
  // A4・B3：動きを減らす設定（振動できない端末でも沈まない）
  { const { ctx, p, errs } = await open(b, { vib: false, rm: true }); await toChoosePhase(p, false);
    await press(p); await p.waitForFunction(() => window.__ev, null, { timeout: 5000 }); await p.waitForTimeout(300);
    const ev = await p.evaluate(() => window.__ev), tr = await p.evaluate(() => window.__tr);
    ok(ev.dt < 300, 'A4 動きを減らす設定：回しても ' + Math.round(ev.dt) + 'ms で進む');
    ok(tr.length === 0, 'B3 動きを減らす設定：振動できない端末でも沈む演出は出ない（' + JSON.stringify(tr) + '）'); ok(!errs.length, 'A4 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  // B2：振動できる端末
  { const { ctx, p, errs } = await open(b, { vib: true }); await toChoosePhase(p, true);
    await press(p); await p.waitForFunction(() => window.__ev, null, { timeout: 5000 }); await p.waitForTimeout(700);
    const tr = await p.evaluate(() => window.__tr), vb = await p.evaluate(() => window.__vb);
    ok(tr.length === 0 && vb > 0, 'B2 振動できる端末：沈む演出は出ず、vibrate が呼ばれる（沈む ' + tr.length + '回・vibrate ' + vb + '回）'); ok(!errs.length, 'B2 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  // B1：振動できない端末
  { const { ctx, p, errs } = await open(b, { vib: false }); const toChoose = await toChoosePhase(p, true);
    const has = await p.evaluate(() => typeof navigator.vibrate);
    const before = await rect(p, '#board');
    await press(p); await p.waitForFunction(() => window.__ev, null, { timeout: 5000 });
    await toChoose(); await p.waitForTimeout(700);
    const tr = await p.evaluate(() => window.__tr), st = await p.evaluate(() => ({ tr: getComputedStyle(document.getElementById('board')).translate, saves: document.querySelectorAll('#fx .save').length }));
    const after = await rect(p, '#board');
    ok(has !== 'function', 'B1 前提：この端末は navigator.vibrate が無い（' + has + '）');
    ok(tr.some((x) => x.id === 'board' && x.tr === '0 2px'), 'B1 回すと盤が 2px 沈む ' + JSON.stringify(tr));
    ok(tr.some((x) => x.id === 'board' && x.tr === '0 3px') && tr.some((x) => x.id === 'tok' && x.sc === 0.96), 'B1 「しのいだ！」で盤が 3px 沈み、救った仲間の札が 0.96 に縮む');
    ok(Math.abs(after.top - before.top) === 0 && (st.tr === 'none' || st.tr === '0px'), 'B1 沈んだあと盤は元の位置（差 ' + Math.abs(after.top - before.top) + 'px・translate ' + st.tr + '）'); ok(!errs.length, 'B1 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 小さい画面（320×568）でも、回して進み、案内・盤の重なりが崩れない（細かい重なり判定は v57tip・v562 が見る）
  { const { ctx, p, errs } = await open(b, { vib: false, vp: { width: 320, height: 568 } }); await toChoosePhase(p, false);
    await press(p); await p.waitForFunction(() => window.__ev, null, { timeout: 5000 }); await p.waitForTimeout(600);
    const ev = await p.evaluate(() => window.__ev); ok(ev.dt < 560 && ev.off.every((v) => v <= 2), '320×568：回して ' + Math.round(ev.dt) + 'ms で進み、仲間は自分のマスにいる'); ok(!errs.length, '320×568 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
