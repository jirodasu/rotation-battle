// v5.3.7 UIチェック（v5.3.6）の指摘を直す
// 合格の基準（測る前に決めたもの）：
//  1. あそびかた：開いている間は吹き出しが出ない。下の帯（わかった）の下に本文がはみ出さない（帯が枠の下まで覆う）
//  2. はじめての仕掛け：敵の名前・i・HP・予告の札・盤に重ならない。演出の数字が残っている間は出ない
//  3. 縦の並びの呼び名：盤の上の札は「左・右」。あそびかた・仲間の詳細に「一の列」「同じ列」の言い方が残らない
//  4. 仲間を選んだとき：仲間の詳細は盤に重ならない。「入れ替え先をタップ」は詳細の中に出る（盤の下を隠す吹き出しは出さない）
//  5. 提灯は1列に1つ
//  6. ページのエラーなし（393×852・320×568）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const ov = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
async function toPrep(p, n) {
  await p.addInitScript((n) => { try { localStorage.setItem('rb-order-n', String(n)); } catch (e) { /* */ } }, n);
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
  await p.click('#begin'); await p.waitForTimeout(700);
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1500);
}
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 852], [320, 568]]) {
    const tag = w + '×' + h;
    // --- 2. 案内（はじめの戦闘） ---
    { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await toPrep(p, 0);
      await p.waitForTimeout(600);
      // 案内を必ず出す：いま出ている案内を閉じ、敵の技を「防無効」にする。演出の数字を1つ置いてから描き直す
      const k0 = await p.evaluate(() => { const t = document.getElementById('tip'), k = t.hidden ? '' : t.dataset.k; if (!t.hidden) document.getElementById('tipOk').click(); localStorage.setItem('rb-tips', '{}'); return k; });
      await p.waitForTimeout(300);
      // この遊びでまだ出ていない種類の案内を使う（同じ案内は1回の遊びで1度しか出ないため）
      const held = await p.evaluate(async (k0) => { const R = window.__rb, a = R.actOf(R.enemy); if (k0 === 'pierce') { a.pierce = false; a.rule = 'charge'; } else { a.pierce = true; a.rule = a.rule === 'charge' || a.rule === 'bind' ? 'job' : a.rule; }
        const fx = document.getElementById('fx'), s = document.createElement('span'); s.className = 'pop'; fx.appendChild(s); R.render();
        await new Promise((r) => setTimeout(r, 200)); const during = !document.getElementById('tip').hidden; s.remove(); await new Promise((r) => setTimeout(r, 1000)); return { during, after: !document.getElementById('tip').hidden, k: document.getElementById('tip').dataset.k }; }, k0);
      ok(!held.during && held.after, tag + ' 2 演出の数字が残っている間は出さず、消えたら出す ' + JSON.stringify(held));
      await p.waitForTimeout(500);
      const t = await p.evaluate(() => { const tip = document.getElementById('tip'); if (tip.hidden) return null; const R = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
        return { tip: R('#tip'), plate: R('.plate'), ehp: R('.ehp'), ticket: R('#ticket'), board: R('#board') }; });
      ok(!!t && ['plate', 'ehp', 'ticket', 'board'].every((k) => !t[k] || ov(t.tip, t[k]) < 2), tag + ' 2 案内は名前・HP・予告・盤に重ならない ' + (t ? JSON.stringify(['plate', 'ehp', 'ticket', 'board'].map((k) => t[k] ? Math.round(ov(t.tip, t[k])) : 0)) : '（出ていない）'));
      // --- 3. 呼び名 ---
      const nm = await p.evaluate(() => ({ tags: [...document.querySelectorAll('.ctag')].map((e) => e.textContent).join(''), help: document.getElementById('help').textContent }));
      ok(nm.tags === '左右' && /左・右/.test(nm.help) && !/一の列|二の列|縦の列/.test(nm.help), tag + ' 3 縦の並びは「左・右」（' + nm.tags + '）');
      // --- 1. あそびかた ---
      await p.evaluate(() => { const d = document.createElement('div'); d.className = 'rb-bubble on'; d.id = 'testBubble'; d.textContent = 'テスト'; d.style.top = '400px'; d.style.left = '20px'; document.body.appendChild(d); });
      await p.evaluate(() => document.getElementById('tipOk') && !document.getElementById('tip').hidden && document.getElementById('tipOk').click());
      await p.click('#helpBtn'); await p.waitForTimeout(400);
      const hp = await p.evaluate(() => { const card = document.querySelector('#help .h-card'), foot = document.querySelector('#help .h-foot'); card.scrollTop = card.scrollHeight; return new Promise((r) => requestAnimationFrame(() => { const c = card.getBoundingClientRect(), f = foot.getBoundingClientRect(); r({ bubble: getComputedStyle(document.getElementById('testBubble')).display, gap: Math.round(c.bottom - f.bottom) }); })); });
      ok(hp.bubble === 'none', tag + ' 1 あそびかたを開いている間は吹き出しを出さない');
      ok(hp.gap <= 2, tag + ' 1 あそびかたの下の帯が枠の下まで覆う（すき間 ' + hp.gap + 'px）');
      await p.click('#helpClose'); await p.waitForTimeout(300);
      ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
      await ctx.close(); }
    // --- 4・5. 枠の無い戦闘で仲間を選ぶ ---
    { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await p.addInitScript(() => { try { localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1 })); } catch (e) { /* */ } });
      await toPrep(p, 5);
      await p.click('.slot[data-r="1"][data-c="0"]'); await p.waitForTimeout(400);
      const s = await p.evaluate(() => { const pk = document.getElementById('peek').getBoundingClientRect(), bd = document.querySelector('#board .strip.r0') ? document.querySelector('#board .strip.r0').getBoundingClientRect() : document.getElementById('board').getBoundingClientRect(), sel = document.getElementById('selTip');
        return { over: Math.round(pk.bottom - bd.top), hint: (document.querySelector('#peek .pk-hint') || {}).textContent || '', bubble: !!(sel && !sel.hidden && getComputedStyle(sel).display !== 'none'), sup: document.getElementById('peek').textContent };
      });
      ok(s.over <= 2, tag + ' 4 仲間の詳細が盤（攻撃列）に重ならない（' + s.over + 'px）');
      ok(/入れ替え先をタップ/.test(s.hint) && !s.bubble, tag + ' 4 「入れ替え先をタップ」は詳細の中に：' + s.hint);
      ok(!/同じ列/.test(s.sup), tag + ' 3 仲間の詳細に「同じ列」が残らない');
      const lamps = await p.evaluate(() => [...document.querySelectorAll('#board .strip')].map((st) => [...st.querySelectorAll('.lamp')].filter((l) => getComputedStyle(l).display !== 'none').length));
      ok(lamps.length >= 3 && lamps.every((n) => n === 1), tag + ' 5 提灯は1列に1つ ' + JSON.stringify(lamps));
      ok(!errs.length, 'ページのエラーなし ' + errs.join('/'));
      await ctx.close(); }
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
