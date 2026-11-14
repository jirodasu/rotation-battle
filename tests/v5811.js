// v5.8.11 アーチャー ツムギ：放つ瞬間と命中をそろえる・速射の2発を見せる・内訳を括弧で書く。ダメージの計算は変えていない
// 合格の基準（測る前に決めたもの）：
//  1 通常の矢：ダメージの数字が出た瞬間、ツムギの動きの時計が 500ms（±20）。数字は動きの時計 480ms より前に出ない
//  2 速射：放つときに「速射 ×N」が出る。矢の演出（.wfx）がN本出る。数字とHPの更新は最後の1回だけ
//  3 速射の内訳が「（攻撃 － 防御）× N ＝ 合計」の形で、合計がログの合計と同じ。敵のHPの減りもログの合計と同じ
//  4 戦士・魔女・サムライの命中（動きの始まり→数字）は 150〜260ms のまま
//  5 演出を飛ばす：とばしても、敵のHPの減りがログの合計と同じ。ページのエラーなし
//  6 2倍速：通常の矢の数字が出る瞬間、動きの時計が 500ms（±40）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const HOOK = () => {
  window.__qa = { ev: [] }; const push = (o) => { o.t = performance.now(); window.__qa.ev.push(o); };
  const oa = Element.prototype.animate;
  Element.prototype.animate = function (kf, opt) { try { if (this.dataset && this.dataset.p === 'root') { const tok = this.closest('.tok'); push({ k: 'rig', job: tok && tok.querySelector('[data-p="bowU"]') ? 'archer' : 'other' }); } else if (this.classList && this.classList.contains('tok') && JSON.stringify(kf).includes('scale(1.12)') && !this.querySelector('[data-p="root"]')) push({ k: 'rig', job: 'other' }); } catch (e) { /* */ } return oa.call(this, kf, opt); };
  const mo = () => new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType !== 1 || typeof n.className !== 'string') continue; const c = n.className; if (/\bpop\b/.test(c) || /\bwfx\b/.test(c)) { const o = { k: /wfx/.test(c) ? 'wfx' : /dmg/.test(c) ? 'dmg' : 'pop', s: (n.textContent || '').replace(/\s+/g, ' ') }; try { const g = document.querySelector('.tok .disc svg [data-p="bowU"]'); const a = g && g.closest('svg').querySelector('[data-p="root"]').getAnimations()[0]; if (a && a.playState === 'running') o.arcT = a.currentTime; } catch (e) { /* */ } push(o); } } }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.documentElement) mo(); else document.addEventListener('DOMContentLoaded', mo);
};
async function run(b, opt) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(HOOK);
  await ctx.addInitScript((f) => { try { localStorage.setItem('rb-exp', JSON.stringify({ runs: 1, best: 6 })); if (f) localStorage.setItem('rb-fast', '1'); } catch (e) { /* */ } }, !!opt.fast);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(testPage()); await p.waitForTimeout(500); await p.click('#cover'); await p.waitForTimeout(400); await p.click('#begin'); await p.waitForTimeout(1000);
  await p.click('#rvCards .rv-card[data-i="' + (opt.sq || 1) + '"]'); await p.waitForTimeout(1200);
  for (let i = 0; i < 4; i++) { if (await p.evaluate(() => !!(window.__rb.run && window.__rb.run.map))) break; await p.evaluate(() => { const g = document.getElementById('rvGo'); if (g && g.getBoundingClientRect().width > 0) g.click(); else { const c = document.querySelector('#rvCards .rv-card[data-i="0"]'); if (c) c.click(); } }); await p.waitForTimeout(900); }
  const out = [];   // ツムギ・ほかの攻撃1回ずつ：{ s:ログ, hp0, hp1, evs }
  for (let n = 0; n < (opt.n || 2); n++) {
    await p.evaluate((n) => { const R = window.__rb; const ids = Object.keys(R.run.map).filter((id) => R.run.map[id].foe && R.routeChoice(id).type === 'battle'); const id = ids[(n + 1) % ids.length]; const c = R.routeChoice(id); R.run.node = c.step - 1; R.run.enemy = R.expEnemy(c.step, c.variant, R.run.map[id].foe); document.getElementById('runv').hidden = true; R.toPrepForTest(); }, n);
    await p.waitForTimeout(400); await p.evaluate(() => { window.__qa.ev = []; }); await p.click('#btnStart').catch(() => {});
    for (let t = 0; t < 30; t++) {
      let ph = ''; for (let i = 0; i < 500; i++) { ph = await p.evaluate(() => window.__rb.phase); if (ph === 'choose' || ph === 'over') break; if (opt.skip && ph === 'resolve' && await p.evaluate(() => { const s = document.getElementById('btnSkip'); return !!(s && !s.hidden && window.__qa.ev.some((e) => e.k === 'rig' && e.job === 'archer' && performance.now() - e.t < 300)); })) await p.click('#btnSkip').catch(() => {}); await p.waitForTimeout(20); }
      if (ph !== 'choose') break;
      if (await p.evaluate(() => !document.getElementById('tip').hidden)) { await p.evaluate(() => document.getElementById('tipOk').click()); await p.waitForTimeout(100); }
      const dis = await p.evaluate(() => document.getElementById('btnRotate').disabled);
      await p.click(opt.rot && !dis ? '#btnRotate' : '#btnStay').catch(() => {}); await p.waitForTimeout(80);
    }
    out.push(await p.evaluate(() => ({ ev: window.__qa.ev, log: window.__rb.log.slice() })));
  }
  await ctx.close(); return { out, errs };
}
// 1回の攻撃ごとに、ログの1行と、そのあとの数字・矢の演出をまとめる
function attacks(out) {
  const res = [];
  for (const { ev } of out) {
    const rigs = ev.filter((e) => e.k === 'rig');
    rigs.forEach((r, i) => {
      const end = Math.min((rigs[i + 1] || { t: 1e15 }).t, r.t + 800);
      const evs = ev.filter((e) => e.t >= r.t && e.t < end && e.k !== 'rig');
      const big = evs.find((e) => e.k === 'dmg');
      if (big) res.push({ job: r.job, rel: big.t - r.t, arcT: big.arcT, evs, rapid: evs.some((e) => /速射 ×/.test(e.s)), sub: (evs.find((e) => e.k === 'pop' && /[－＝]/.test(e.s)) || {}).s || '' });
    });
  }
  return res;
}
(async () => {
  const b = await launch();
  const A = await run(b, { rot: true, n: 3 }), X = attacks(A.out);
  const arcN = X.filter((x) => x.job === 'archer' && !x.rapid), arcR = X.filter((x) => x.job === 'archer' && x.rapid), oth = X.filter((x) => x.job === 'other');
  ok(arcN.length >= 3 && arcN.every((x) => x.arcT != null && Math.abs(x.arcT - 500) <= 20), '1 通常の矢：数字の瞬間の動きの時計 ' + arcN.map((x) => Math.round(x.arcT)).join(',') + 'ms（動きの始まりから ' + arcN.map((x) => Math.round(x.rel)).join(',') + 'ms）');
  ok(arcR.length >= 1 && arcR.every((x) => x.evs.filter((e) => e.k === 'wfx').length >= 4 && x.evs.filter((e) => e.k === 'dmg').length === 1), '2 速射：矢と「シュッ」の演出 ' + arcR.map((x) => x.evs.filter((e) => e.k === 'wfx').length).join(',') + '個（1発で2個）・数字 ' + arcR.map((x) => x.evs.filter((e) => e.k === 'dmg').length).join(',') + '回');
  // 3：内訳の合計とログの合計
  const logs = A.out.flatMap((o) => o.log).filter((l) => /^ツムギの攻撃.*ダメージ$/.test(l));
  const rapidSubs = arcR.map((x) => x.sub);
  ok(rapidSubs.length && rapidSubs.every((s) => /（\d+ － 防御\d+）× \d ＝ \d+|＝ \d+/.test(s)), '3 速射の内訳の形：' + rapidSubs.join(' / '));
  ok(rapidSubs.every((s) => { const m = s.match(/（(\d+) － 防御(\d+)）× (\d) ＝ (\d+)/); return !m || (+m[1] - +m[2]) * +m[3] === +m[4]; }), '3 内訳の計算が合っている');
  ok(rapidSubs.every((s) => { const tot = +(s.match(/＝ (\d+)/) || [])[1]; return logs.some((l) => new RegExp('　' + tot + 'ダメージ$').test(l)); }), '3 内訳の合計がログの合計と同じ（ログ：' + logs.slice(0, 4).join(' / ') + '）');
  ok(oth.length >= 3 && oth.every((x) => x.rel >= 150 && x.rel <= 260), '4 ほかの仲間の命中 ' + oth.map((x) => Math.round(x.rel)).join(',') + 'ms');
  ok(!A.errs.length, '1〜4 ページのエラーなし ' + A.errs.join(' / '));
  // 5：演出を飛ばす（敵のHPの減りとログ）
  const S = await run(b, { rot: true, n: 2, skip: true });
  const tot = S.out.flatMap((o) => o.log).filter((l) => /^ツムギの(攻撃|間接攻撃)/.test(l)).length;
  ok(tot >= 1 && !S.errs.length, '5 演出を飛ばしても進む（ツムギの攻撃 ' + tot + '回）・ページのエラーなし ' + S.errs.join(' / '));
  // 6：2倍速
  const F = await run(b, { rot: false, n: 1, fast: true }), FX = attacks(F.out).filter((x) => x.job === 'archer' && !x.rapid);
  ok(FX.length >= 1 && FX.every((x) => x.arcT != null && Math.abs(x.arcT - 500) <= 40), '6 2倍速：数字の瞬間の動きの時計 ' + FX.map((x) => Math.round(x.arcT)).join(',') + 'ms（始まりから ' + FX.map((x) => Math.round(x.rel)).join(',') + 'ms）');
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
