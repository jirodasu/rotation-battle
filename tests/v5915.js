// v5.9.15 戦闘画面の見直し（2026-11-20 Jiro さん承認：案1・2・3）＋予定していた 320px の札の名前・結果画面のHP
// 合格の基準（測る前に決めたもの）：
//  1 判断の場面の案内の吹き出し（incTip・numTip・emptyTip・holdTip・saveHint・koWarn・firstGuide）は、同時に1つだけ（初めての人の最初の3ターン、0.1秒ごとに見る）。
//    出ている吹き出しは、剣の数字・赤い数字・予告の札・回す/維持の欄に重ならない。あとから来た吹き出しは捨てずに順に出る（3ターンで2種類以上出る）
//  2 はじめの数戦は、行動順の帯を出さず（#book に .order が無い）、攻撃列の仲間の名前の札に番号、敵のHPの横に「行動順」と番号。番号は 1〜N が1つずつ。
//    解決中はいま動く人の番号が光る（.now）。数戦のあと（rb-order-n=3）は番号も「行動順」も出ない。チュートリアルは今までどおり帯
//  3 判断の場面と結果の画面で、12px 未満の文字が無い（結果の名簿の職業名と、予告の札の丸の中の「大技まで」は除く）。320・375・390 の「回す」「維持」の札に、いちばん受ける仲間の名前（または「味方」）が出て、札からはみ出さない。
//    結果の画面に、生きている仲間のHPの数字（今/最大）が 12px 以上で出る
//  4 どれもページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const ALL = { stars: 1, gauge: 1, bind: 1, entry: 1, charge: 1, pierce: 1, stamina: 1, trinity: 1, bench: 1, combo: 1, hmIntro: 1, lamp: 1, stayed: 1, mid: 1, highhp: 1, gate: 1, doom: 1, rel: 1, einfo: 1 };
const COACH = ['incTip', 'numTip', 'emptyTip', 'holdTip', 'saveHint', 'koWarn', 'firstGuide'];
async function toBattle(p, w, extra) {
  await p.addInitScript(([t, x]) => { try { localStorage.setItem('rb-tips', JSON.stringify(t)); localStorage.setItem('rb-swapdemo', '1'); Object.keys(x || {}).forEach((k) => localStorage.setItem(k, x[k])); } catch (e) { /* */ } }, [ALL, extra || {}]);
  await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(200); await p.click('#begin'); await p.waitForTimeout(700);
  for (let k = 0; k < 6 && await p.evaluate(() => !!document.querySelector('#runv .ph-wait')); k++) { await p.mouse.click(w / 2, 120); await p.waitForTimeout(300); }
  const bi = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
  await p.click('#rvCards .rv-card[data-i="' + bi + '"]'); await p.click('#rvGo'); await p.waitForTimeout(1300);
}
const isChoose = (p) => p.evaluate(() => window.__rb.phase === 'choose' && !document.getElementById('btnStay').hidden && !document.getElementById('btnStay').disabled);
async function waitChoose(p) { for (let i = 0; i < 300; i++) { if (await isChoose(p)) return true; await p.waitForTimeout(80); } return false; }
const SAMPLE = (ids) => {
  const R = (e) => e.getBoundingClientRect();
  const on = ids.map((id) => document.getElementById(id)).filter((d) => d && !d.hidden && d.classList.contains('on'));
  const hard = [...document.querySelectorAll('#board .tok .dm, #board .tok .inc, #ticket, #dock')].map(R).filter((q) => q.width > 0);
  const ov = (a, q) => Math.max(0, Math.min(a.right, q.right) - Math.max(a.left, q.left)) * Math.max(0, Math.min(a.bottom, q.bottom) - Math.max(a.top, q.top));
  return { n: on.length, ids: on.map((d) => d.id), hit: Math.round(on.reduce((s, d) => s + hard.reduce((t, q) => t + ov(R(d), q), 0), 0)) };
};
const SMALL = (skip) => [...document.querySelectorAll('body *')].filter((e) => e.offsetParent && getComputedStyle(e).visibility !== 'hidden' && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 12 && !(skip && e.matches(skip)) && !e.closest('.rb-bubble, #tip')).map((e) => e.className + ' ' + getComputedStyle(e).fontSize + '「' + e.textContent.trim().slice(0, 10) + '」');
(async () => {
  const b = await launch();
  for (const [w, h] of [[320, 568], [375, 667], [390, 844]]) {
    const tag = w + '×' + h;
    // 1 吹き出しは1つずつ・判断材料に重ねない（初めての人：案内の数え札は空）
    {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await toBattle(p, w);
      await p.click('#btnStart');
      let maxN = 0, hit = 0, worst = null; const seen = new Set();
      for (let t = 0; t < 3; t++) {
        if (!await waitChoose(p)) break;
        for (let i = 0; i < 70; i++) { const s = await p.evaluate(SAMPLE, COACH); s.ids.forEach((x) => seen.add(x)); if (s.n > maxN) maxN = s.n; if (s.hit > hit) { hit = s.hit; worst = s; } await p.waitForTimeout(100); }
        if (!await isChoose(p)) break;
        await p.click('#btnStay').catch(() => {});
        await p.waitForTimeout(300);
      }
      ok(maxN <= 1 && seen.size >= 2, tag + ' 1 案内の吹き出しは同時に1つだけ・順に出る（同時に最大 ' + maxN + '・出た種類 ' + [...seen].join(',') + '）');
      ok(hit === 0, tag + ' 1 吹き出しは剣・赤い数字・予告・回す/維持に重ならない（重なり ' + hit + 'px² ' + JSON.stringify(worst) + '）');
      ok(!errs.length, tag + ' 4 ページのエラーなし ' + errs.join(' / '));
      await ctx.close();
    }
    // 2・3 行動順の番号・小さな文字・札の名前・結果のHP
    {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await toBattle(p, w, { 'rb-teach-inc': '3', 'rb-teach-num': '{"dm":1,"n":1}', 'rb-teach-hold': '1', 'rb-teach-empty': '2' });
      await p.evaluate(() => { const R = window.__rb; R.enemy.hp = R.enemy.max = 9999; });
      await p.click('#btnStart');
      // 解決中に光る番号
      let now = false; for (let i = 0; i < 80 && !now; i++) { now = await p.evaluate(() => !!document.querySelector('#board .odn.now, #eOrd .odn.now')); if (!now) await p.waitForTimeout(50); }
      await waitChoose(p); await p.waitForTimeout(600);
      const o = await p.evaluate(() => {
        const mine = [...document.querySelectorAll('#board .tok .odn')].filter((e) => !e.hidden).map((e) => +e.textContent);
        const eo = document.getElementById('eOrd'), foe = eo && !eo.hidden ? [...eo.querySelectorAll('.odn')].map((e) => +e.textContent) : [];
        const all = mine.concat(foe).sort((a, b) => a - b);
        return { order: !!document.querySelector('#book .order'), mine, foe, lbl: eo ? eo.textContent : '', contiguous: all.length > 1 && all.every((x, i) => x === i + 1), size: eo && !eo.hidden ? parseFloat(getComputedStyle(eo.querySelector('small')).fontSize) : 0 };
      });
      ok(!o.order && o.mine.length >= 1 && o.foe.length >= 1 && o.contiguous && o.lbl.includes('行動順') && o.size >= 12, tag + ' 2 行動順は帯でなく名前の札と敵の横の番号（1〜Nが1つずつ） ' + JSON.stringify(o));
      ok(now, tag + ' 2 解決中はいま動く人の番号が光る');
      const sm = await p.evaluate(SMALL, '.t-cd small');   // 予告の札の丸の中の「大技まで」（9px）は丸に収まらないので除く（報告に残す）
      ok(!sm.length, tag + ' 3 判断の場面に12px未満の文字なし ' + JSON.stringify(sm));
      const oc = await p.evaluate(() => ['ocRot', 'ocStay'].map((id) => { const r = document.querySelector('#' + id + ' .oc-r[data-k="hurt"]'); if (!r) return { id, none: true }; const i = r.querySelector('i'), b = r.querySelector('b'), btn = document.getElementById(id).closest('.btn'), bb = btn.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return { id, lbl: i && getComputedStyle(i).display !== 'none' ? i.textContent : '', fs: i ? parseFloat(getComputedStyle(i).fontSize) : 0, inBtn: rb.right <= bb.right + 1 && rb.left >= bb.left - 1, over: r.scrollWidth > r.clientWidth + 1 }; }));
      ok(oc.every((x) => x.lbl && x.fs >= 12 && x.inBtn && !x.over), tag + ' 3 回す・維持の札に、いちばん受ける仲間の名前が出て、はみ出さない ' + JSON.stringify(oc));
      // 結果の画面
      await p.evaluate(() => { const R = window.__rb; R.enemy.hp = 1; R.render(); });
      await p.click('#btnStay');
      for (let i = 0; i < 300; i++) { if (await p.evaluate(() => !document.getElementById('runv').hidden && document.querySelectorAll('#rvRoster .rv-m').length > 0)) break; await p.waitForTimeout(100); }
      for (let k = 0; k < 8 && await p.evaluate(() => !!document.querySelector('#runv .ph-wait')); k++) { await p.mouse.click(w / 2, 60); await p.waitForTimeout(400); }
      await p.waitForTimeout(600);
      const rs = await p.evaluate(() => [...document.querySelectorAll('#rvRoster .rv-m:not(.gone)')].map((m) => { const u = m.querySelector('.rv-hp'); return u ? { t: u.textContent, fs: parseFloat(getComputedStyle(u).fontSize), vis: u.getBoundingClientRect().height > 0 } : null; }));
      ok(rs.length >= 1 && rs.every((x) => x && /^\d+\/\d+$/.test(x.t) && x.fs >= 12 && x.vis), tag + ' 3 結果の画面に仲間のHPの数字（12px以上） ' + JSON.stringify(rs));
      const sm2 = await p.evaluate(SMALL, '.rv-m small');
      ok(!sm2.length, tag + ' 3 結果の画面に12px未満の文字なし（職業名を除く） ' + JSON.stringify(sm2));
      ok(!errs.length, tag + ' 4 ページのエラーなし ' + errs.join(' / '));
      await ctx.close();
    }
  }
  // 2 数戦のあとは番号も「行動順」も出ない・チュートリアルは帯
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await toBattle(p, 390, { 'rb-order-n': '3', 'rb-teach-inc': '3', 'rb-teach-num': '{"dm":1,"n":1}', 'rb-teach-hold': '1' });
    await p.click('#btnStart'); await waitChoose(p); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ odn: [...document.querySelectorAll('#board .odn')].filter((e) => !e.hidden).length, eo: !document.getElementById('eOrd').hidden, order: !!document.querySelector('#book .order') }));
    ok(r.odn === 0 && !r.eo && !r.order, '2 数戦のあとは番号も行動順も出ない ' + JSON.stringify(r));
    ok(!errs.length, '4 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#beginTut'); await p.waitForTimeout(1500);
    let has = false; for (let i = 0; i < 40 && !has; i++) { has = await p.evaluate(() => !!document.querySelector('#book .order')); if (!has) await p.waitForTimeout(100); }
    ok(has, '2 チュートリアルは今までどおり行動順の帯');
    ok(!errs.length, '4 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
