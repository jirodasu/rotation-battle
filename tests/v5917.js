// v5.9.17 「しのいだ」「とどめ」の文字を出さない（2026-11-20 Jiro さん）＋ v5.9.14 実プレイ検証の3件（ほえるの予報・2行の表示・数字のはみ出し）
// 合格の基準（測る前に決めたもの）：
//  1 大技を誰も倒れずに受けても「しのいだ」の判（#stampOk）は出ない。回して救っても仲間の上に「しのいだ！」は出ない。敵を倒しても「とどめ！」は出ない
//    （判を出す条件の不具合（倒れたターンに出る）は、判そのものを出さなくしたので起きない）
//  2 第2章・地点6（角面の書守）の2ターン目の「ほえる」（全員・防無効）：維持の予報の「いちばん受ける仲間」のHPの行き先が、維持したあとの実際のHPと一致する。予報の被害（incoming）に攻撃列の2人とも入る
//  3 320・375・390px で、敵と味方に出るダメージの数字（.pop.dmg）が、出だしの拡大のときも画面の左右の端からはみ出さない（数字の左端 ≥ 0、右端 ≤ 画面の幅）
//  4 どれもページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"bench":1,"lamp":1,"stayed":1,"mid":1,"highhp":1,"gate":1,"doom":1,"rel":1,"einfo":1}';
async function open(b, w, h, q) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: true, reducedMotion: 'no-preference' }); const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.addInitScript((t) => { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-story', '1');
    // 浮かぶ数字と文字を記録する（数字は出だしの拡大がいちばん大きい頃＝0.17秒後に、文字の実際の幅を測る）
    window.__pops = []; window.__stamp = 0;
    const go = () => new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
      if (!n.classList) return;
      if (n.id === 'stampOk') window.__stamp += 1;
      if (n.classList.contains('pop')) { const rec = { cls: n.className, txt: n.textContent }; window.__pops.push(rec);
        if (n.classList.contains('dmg')) setTimeout(() => { const t = n.querySelector('text') || n; const r = t.getBoundingClientRect(); rec.l = Math.round(r.left); rec.r = Math.round(r.right); rec.vw = document.documentElement.clientWidth; }, 170); }
    }))).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', go);   // 読み込み前は document.documentElement が無い
  }, TIPS);
  await p.goto(testPage() + (q || '')); await p.waitForTimeout(1200);
  return { ctx, p };
}
const toChoose = async (p) => { for (let k = 0; k < 250; k++) { await p.waitForTimeout(80); const s = await p.evaluate(() => ({ ph: window.__rb.phase, tip: !document.getElementById('tip').hidden, rv: !document.getElementById('runv').hidden })); if (s.tip) await p.click('#tipOk').catch(() => {}); if (s.ph === 'choose' || s.ph === 'over' || s.rv) return s.ph; } return null; };
(async () => {
  const b = await launch();
  // 2 ほえるの予報（第2章・地点6・亜種なし／群れ）
  for (const q of ['?qa&ch=2&loc=6&v=none', '?qa&ch=2&loc=6&v=armor']) {
    const { ctx, p } = await open(b, 390, 844, q);
    await p.click('#btnStart'); await toChoose(p);
    let res = null;
    for (let t = 0; t < 4 && !res; t++) {
      const pre = await p.evaluate(() => { const R = window.__rb, a = R.enemy.pattern[(R.turn - 1) % R.enemy.pattern.length]; const inc = R.incoming(R.grid, false, false); const L = R.outlook(R.grid, false, false);
        const h = L.hurt[0]; return { act: a && a.name, pierce: !!(a && a.pierce), rule: a && a.rule, front: R.grid[0].filter(Boolean).length, inc: Object.keys(inc).length, who: h ? h.u.uid : null, aft: h ? Math.max(0, h.u.hp - h.d) : null, hp: R.grid[0].map((u) => u && u.hp) }; });
      await p.click('#btnStay'); await toChoose(p);
      if (pre.act === 'ほえる') { const act = await p.evaluate((uid) => { const u = window.__rb.units().map((x) => x.u).find((x) => x.uid === uid); return u ? u.hp : 0; }, pre.who); res = Object.assign(pre, { actual: act }); }
    }
    ok(res && res.pierce && res.rule === 'all' && res.inc === res.front && res.front >= 1 && res.aft === res.actual, q + ' 2 「ほえる」の予報：攻撃列の全員が被害に入り、いちばん受ける仲間の行き先＝実際 ' + JSON.stringify(res));
    ok(!p.__errs.length, q + ' 4 ページのエラーなし ' + p.__errs.join(' / ')); await ctx.close();
  }
  // 1・3 文字は出ない・数字は画面の中（3ターン維持して大技を受け、敵を倒す）
  for (const [w, h] of [[320, 568], [375, 667], [390, 844]]) {
    const tag = w + '×' + h;
    const { ctx, p } = await open(b, w, h, '?qa&ch=3&loc=9&foe=hourglass&v=armor');
    await p.evaluate(() => { const R = window.__rb; R.units().forEach(({ u }) => { u.max = 999; u.hp = 999; }); R.render(); });
    await p.click('#btnStart'); await toChoose(p);
    for (let t = 0; t < 4; t++) { if (!await p.evaluate(() => window.__rb.phase === 'choose')) break; await p.click('#btnStay'); await toChoose(p); }
    // 倒す
    if (await p.evaluate(() => window.__rb.phase === 'choose')) { await p.evaluate(() => { const R = window.__rb; (R.enemy.party || [R.enemy]).forEach((f) => { f.hp = 1; }); R.render(); }); await p.click('#btnStay'); await toChoose(p); }
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({ stamp: window.__stamp, words: window.__pops.filter((x) => /しのいだ|とどめ/.test(x.txt)).map((x) => x.txt), dmg: window.__pops.filter((x) => /\bdmg\b/.test(x.cls) && x.l != null), won: !document.getElementById('runv').hidden || window.__rb.phase === 'over' }));
    const out = r.dmg.filter((x) => x.l < 0 || x.r > x.vw);
    ok(r.won && r.stamp === 0 && !r.words.length, tag + ' 1 「しのいだ」の判・「しのいだ！」「とどめ！」の文字は出ない ' + JSON.stringify({ won: r.won, stamp: r.stamp, words: r.words }));
    ok(r.dmg.length >= 4 && !out.length, tag + ' 3 ダメージの数字は画面の左右からはみ出さない（数字 ' + r.dmg.length + ' 個・はみ出し ' + out.length + ' 個） ' + JSON.stringify(out.slice(0, 3)));
    ok(!p.__errs.length, tag + ' 4 ページのエラーなし ' + p.__errs.join(' / ')); await ctx.close();
  }
  // 1 回して救っても「しのいだ！」は出ない（初めての遠征の地点1：3ターン目に回して救う）
  {
    const { ctx, p } = await open(b, 390, 844, '?qa&ch=1&loc=1&v=none');
    await p.click('#btnStart'); await toChoose(p);
    let saved = false;
    for (let t = 0; t < 5; t++) {
      if (!await p.evaluate(() => window.__rb.phase === 'choose')) break;
      const o = await p.evaluate(() => { const R = window.__rb; return { sk: R.outlook(R.grid, false, false).hurt.some((x) => x.ko), rk: R.outlook(R.previewGrid(), true, true).hurt.some((x) => x.ko), dis: document.getElementById('btnRotate').disabled }; });
      if (o.sk && !o.rk && !o.dis) { await p.click('#btnRotate'); saved = true; } else await p.click('#btnStay');
      await toChoose(p);
    }
    await p.waitForTimeout(800);
    const r = await p.evaluate(() => ({ words: window.__pops.filter((x) => /しのいだ/.test(x.txt)).length, log: window.__rb.log.filter((l) => /回したおかげで倒れずにすんだ/.test(l)).length }));
    ok(!saved || (r.words === 0), '1 回して救っても「しのいだ！」の文字は出ない（履歴には残る） ' + JSON.stringify(Object.assign({ saved }, r)));
    ok(!p.__errs.length, '4 ページのエラーなし ' + p.__errs.join(' / ')); await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
