// v5.8.15 結果の画面：次の挑戦のボタンと、勲章の使い道（表示だけ。ルール・セーブの形は変えない）
// 合格の基準（測る前に決めたもの）：
//  1 初めての踏破（標準・深さ1）：大きい札が「深さ2へ挑む」になり、説明に「標準・深さ2」。押すと標準・深さ2で始まる
//  2 速攻・深さ2を初めて踏破（深さ3が開く）：札が「深さ3へ挑む」、説明に「速攻・深さ3」。押すと速攻・深さ3で始まる
//  3 地点7まで進んで負け（速攻の隊が開く）：札が「速攻の隊で挑む」、説明に「速攻・深さ1」。押すと速攻・深さ1で始まる
//  4 何も開かない回：札は今までどおり「もう一度、環廊へ」。押すと同じ隊・深さで始まる
//  5 勲章：実績の行に「いま3枚。「双魔の隊」を開ける」（3枚以上）／「いま1枚・あと2枚で「双魔の隊」」（足りない）。双魔が開いていれば添えない
//  6 320×568・390×844 で、札と下の2つのボタンが画面の中に収まる。どれもページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1}';
async function open(b, meta, w, h) {
  const ctx = await b.newContext({ viewport: { width: w || 390, height: h || 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(([t, m]) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-ending', '1'); if (m && !sessionStorage.getItem('seeded')) { localStorage.setItem('rb-exp', m); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } }, [TIPS, meta ? JSON.stringify(meta) : null]);
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover').catch(() => {}); await p.waitForTimeout(400); await p.click('#begin'); await p.waitForTimeout(600);
  return { ctx, p, errs };
}
const end = (p, sq, d, clear, node) => p.evaluate(([sq, d, clear, node]) => { const R = window.__rb; if (sq) { document.getElementById('runv').hidden = true; R.beginExp(sq, d); } if (node != null) R.run.node = node; R.expEnd(clear, []); }, [sq, d, clear, node]);
const view = (p) => p.evaluate(() => { const c = document.querySelector('#rvCards .rv-card'); return { t: c.querySelector('b').textContent, d: c.querySelector('.rv-d').textContent, ev: document.getElementById('rvEvents').innerText.replace(/\s+/g, ' '), n: document.querySelectorAll('#rvCards .rv-card').length }; });
const go = async (p) => { await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(700); return p.evaluate(() => [window.__rb.run.sq, window.__rb.run.depth]); };
(async () => {
  const b = await launch();
  { const { ctx, p, errs } = await open(b, null);
    await end(p, null, 0, true); const v = await view(p);
    ok(v.n === 1 && v.t === '深さ2へ挑む' && /標準・深さ2/.test(v.d), '1 初めての踏破：「' + v.t + '」' + v.d);
    ok(/勲章\+3 いま3枚。「双魔の隊」を開ける/.test(v.ev), '5 勲章3枚：' + v.ev);
    const s = await go(p); ok(s[0] === 'std' && s[1] === 2, '1 押すと標準・深さ2 ' + s);
    ok(!errs.length, '1 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  { const { ctx, p, errs } = await open(b, { runs: 1, clears: 1, best: 10, ach: { first: 1, mid: 1, tri: 1 }, won: { 'std:1': 1 } });
    await end(p, 'fast', 2, true); const v = await view(p);
    ok(v.t === '深さ3へ挑む' && /速攻・深さ3/.test(v.d), '2 速攻・深さ2の初踏破：「' + v.t + '」' + v.d);
    ok(/いま4枚。「双魔の隊」を開ける/.test(v.ev), '5 勲章4枚：' + v.ev);
    const s = await go(p); ok(s[0] === 'fast' && s[1] === 3, '2 押すと速攻・深さ3 ' + s);
    ok(!errs.length, '2 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  { const { ctx, p, errs } = await open(b, null);
    await end(p, null, 0, false, 6); const v = await view(p);
    ok(v.t === '速攻の隊で挑む' && /速攻・深さ1/.test(v.d), '3 地点7で負け：「' + v.t + '」' + v.d);
    ok(/いま1枚・あと2枚で「双魔の隊」/.test(v.ev), '5 勲章1枚：' + v.ev);
    const s = await go(p); ok(s[0] === 'fast' && s[1] === 1, '3 押すと速攻・深さ1 ' + s);
    ok(!errs.length, '3 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  { const { ctx, p, errs } = await open(b, { runs: 2, clears: 2, best: 10, ach: { first: 1, mid: 1, tri: 1, nofall: 1 }, won: { 'std:1': 1, 'fast:2': 1 } });
    await end(p, 'fast', 2, true); const v = await view(p);
    ok(v.t === 'もう一度、環廊へ' && /速攻・深さ2/.test(v.d) && !/いま\d+枚/.test(v.ev), '4 何も開かない回：「' + v.t + '」' + v.d);
    const s = await go(p); ok(s[0] === 'fast' && s[1] === 2, '4 押すと同じ速攻・深さ2 ' + s);
    ok(!errs.length, '4 エラーなし ' + errs.join(' / ')); await ctx.close(); }
  { const { ctx, p } = await open(b, { runs: 1, clears: 0, best: 3, bought: { twin: 1 }, spent: 3, ach: { tri: 1, first: 1, mid: 1 } });
    await end(p, 'twin', 1, true); const v = await view(p);
    ok(/勲章\+1/.test(v.ev) && !/いま\d+枚/.test(v.ev), '5 双魔が開いていれば添えない：' + v.ev); await ctx.close(); }
  for (const [w, h] of [[320, 568], [390, 844]]) {
    const { ctx, p, errs } = await open(b, null, w, h);
    await end(p, null, 0, true); await p.waitForTimeout(300);
    const r = await p.evaluate(() => [...document.querySelectorAll('#rvCards .rv-card, .rv-skip, .rv-aux')].map((e) => { const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.right), Math.round(q.bottom)]; }).concat([[innerWidth, innerHeight]]));
    const vp = r.pop();
    ok(r.length === 3 && r.every((x) => x[0] >= 0 && x[1] <= vp[0] && x[2] <= vp[1]), '6 ' + w + '×' + h + '：札とボタンが画面の中 ' + JSON.stringify(r));
    ok(!errs.length, '6 エラーなし ' + errs.join(' / ')); await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
