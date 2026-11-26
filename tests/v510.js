// v5.10（試作）図鑑と会話パート（2026-11-26 承認：セーブに zk を足す・隊の条件あり・物語を一覧に・図鑑を足す）
//  1 図鑑：仲間7人・敵13体。会っていない敵は影と「？？？」。前の版の記録（zk なし・踏破あり）は第1〜3章の敵を「会った」にする
//  2 図鑑：1体の頁に名前・数値・技が出て、「一覧へ」で戻る
//  3 物語：一覧に冒頭の物語と深さ1〜4。開いていない会話は「？？？」で押せない
//  4 会話：タップで1枚ずつ進み、続けて押しても2枚進まない。「とばす」で一覧に戻り、読んだ印（2）が付く
//  5 勝ったあとの札（__rbTalk）：「見る」で会話→最後まで進むと次（報酬）へ。「あとで」はそのまま次へ
const { chromium } = require('playwright'); const path = require('path');
let ng = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) ng++; };
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch();
  const page = async (meta, w = 390, h = 844) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
    await ctx.addInitScript((m) => { try { localStorage.setItem('rb-story', '1'); localStorage.setItem('rb-exp', JSON.stringify(m)); } catch (e) { /* */ } }, meta);
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(URL); await p.waitForTimeout(400); await p.click('#press').catch(() => {}); await p.waitForTimeout(1200);
    return { p, errs, ctx };
  };
  { // 1・2
    const { p, errs, ctx } = await page({ runs: 3, clears: 1, ach: { first: 1 }, won: { 'std:1': 1 } });
    await p.click('#zukanBtn'); await p.waitForTimeout(300);
    const party = await p.$$eval('#zkGrid .zk-card', (a) => a.length);
    await p.click('#zkT1'); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ n: document.querySelectorAll('#zkGrid .zk-card').length, unk: [...document.querySelectorAll('#zkGrid .zk-card.unk b')].map((x) => x.textContent), cnt: document.getElementById('zkCount').textContent }));
    ok(party === 7, '1 仲間は7人 ' + party);
    ok(r.n === 13 && r.unk.length === 3 && r.unk.every((t) => t === '？？？') && /10/.test(r.cnt), '1 敵は13体、前の版の踏破ありは10体が会った・深さ4の3体は影 ' + JSON.stringify(r));
    const i = await p.$eval('#zkGrid .zk-card:not(.unk)', (c) => c.dataset.i); await p.click('#zkGrid .zk-card[data-i="' + i + '"]'); await p.waitForTimeout(500);
    const d = await p.evaluate(() => ({ grid: document.getElementById('zkGrid').hidden, name: document.querySelector('.zk-name').textContent, sk: document.querySelectorAll('.zk-sk li').length, svg: !!document.querySelector('#zkBig svg.mimu') }));
    ok(d.grid && d.name && d.name !== '？？？' && d.sk >= 3 && d.svg, '2 1体の頁：名前・技・絵 ' + JSON.stringify(d));
    await p.click('#zkBack'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !document.getElementById('zkGrid').hidden && document.getElementById('zkDetail').hidden), '2 「一覧へ」で一覧に戻る');
    await p.click('#zkX'); ok(await p.evaluate(() => document.getElementById('zukan').hidden), '2 閉じるとタイトル');
    ok(!errs.length, '1・2 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  { // 3・4
    const { p, errs, ctx } = await page({ runs: 3, clears: 1, ach: { first: 1 }, won: { 'std:1': 1 }, zk: { seen: {}, kill: {}, talk: { 1: 1 } } });
    await p.click('#storyBtn'); await p.waitForTimeout(300);
    const L = await p.evaluate(() => [...document.querySelectorAll('#slList .sl-item')].map((x) => (x.classList.contains('lock') ? 'L:' : '') + x.querySelector('b').textContent));
    ok(L.length === 5 && L[0] === '環廊の物語' && !/^L:/.test(L[1]) && L.slice(2).every((t) => /^L:.*？？？/.test(t)), '3 一覧：冒頭の物語＋深さ1が開いて、2〜4は「？？？」 ' + JSON.stringify(L));
    await p.click('#slList .sl-item[data-k="3"]', { force: true }); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.getElementById('talkView').hidden), '3 開いていない会話は押しても始まらない');
    await p.click('#slList .sl-item[data-k="1"]'); await p.waitForTimeout(500);
    const n1 = await p.textContent('#tkN'); await p.mouse.click(195, 400); await p.mouse.click(195, 400); await p.waitForTimeout(300); const n2 = await p.textContent('#tkN');
    ok(n1 === '1 / 8' && n2 === '2 / 8', '4 タップで1枚ずつ進み、続けて押しても2枚進まない ' + n1 + ' → ' + n2);
    const two = await p.evaluate(() => { const t = document.getElementById('tkTxt'); const lh = parseFloat(getComputedStyle(t).lineHeight); return Math.round(t.getBoundingClientRect().height / lh); });
    ok(two <= 2, '4 文は2行まで ' + two);
    await p.click('#tkSkip'); await p.waitForTimeout(300);
    const after = await p.evaluate(() => ({ tk: document.getElementById('talkView').hidden, list: !document.getElementById('storyList').hidden, talk: JSON.parse(localStorage.getItem('rb-exp')).zk.talk }));
    ok(after.tk && after.list && after.talk[1] === 2, '4 「とばす」で一覧に戻り、読んだ印 ' + JSON.stringify(after));
    ok(!errs.length, '3・4 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  { // 全部の会話の文が、どの画面幅でも2行に収まる
    for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932]]) {
      const { p, ctx } = await page({ runs: 3, clears: 1, ach: { first: 1 }, won: { 'std:1': 1 }, zk: { talk: { 1: 2, 2: 2, 3: 2, 4: 2 } } }, w, h);
      let worst = 0, at = '';
      for (const d of [1, 2, 3, 4]) {
        await p.click('#storyBtn'); await p.waitForTimeout(200); await p.click('#slList .sl-item[data-k="' + d + '"]'); await p.waitForTimeout(300);
        for (;;) {
          const r = await p.evaluate(() => { const t = document.getElementById('tkTxt'); const lh = parseFloat(getComputedStyle(t).lineHeight); return { n: Math.round(t.getBoundingClientRect().height / lh), pg: document.getElementById('tkN').textContent }; });
          if (r.n > worst) { worst = r.n; at = d + ':' + r.pg; }
          const [a, z] = r.pg.split(' / ').map(Number); if (a >= z) break;
          await p.mouse.click(w / 2, h / 2); await p.waitForTimeout(240);
        }
        await p.click('#tkSkip'); await p.waitForTimeout(200); await p.click('#slX'); await p.waitForTimeout(200);
      }
      ok(worst <= 2, '4 ' + w + '×' + h + '：全部の会話の文が2行まで（いちばん多い ' + worst + '行 ' + at + '）');
      await ctx.close();
    }
  }
  { // 5
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const fs = require('fs'); let s = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
    s = s.replace('  function beginMain(sqId, legacy) {', "  window.__tg = (d) => new Promise((res) => { run = run || { mode: 'exp' }; run.talkNew = TALKS.find((t) => t.d === d); talkGate(() => res('next')); });\n  function beginMain(sqId, legacy) {");
    const tmp = path.resolve(__dirname, 'out', 'v510-tg.html'); fs.mkdirSync(path.dirname(tmp), { recursive: true }); fs.writeFileSync(tmp, s);
    await p.addInitScript(() => { window.__rbTalk = true; });
    await p.goto('file://' + tmp.replace(/\\/g, '/')); await p.waitForTimeout(600);
    await p.evaluate(() => { window.__r = null; window.__tg(1).then((r) => { window.__r = r; }); }); await p.waitForTimeout(300);
    const card = await p.evaluate(() => !document.getElementById('talkCard').hidden && document.getElementById('tcTitle').textContent);
    await p.click('#tcGo'); await p.waitForTimeout(300);
    for (let i = 0; i < 8; i++) { await p.mouse.click(195, 400); await p.waitForTimeout(260); }
    const r1 = await p.evaluate(() => ({ r: window.__r, tk: document.getElementById('talkView').hidden }));
    ok(card === '深さ1「灯を継ぐ理由」' && r1.r === 'next' && r1.tk, '5 札「見る」→会話を最後まで→次へ ' + JSON.stringify([card, r1]));
    await p.evaluate(() => { window.__r = null; window.__tg(2).then((r) => { window.__r = r; }); }); await p.waitForTimeout(300);
    await p.click('#tcLater'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => window.__r === 'next' && document.getElementById('talkView').hidden), '5 札「あとで」→そのまま次へ');
    ok(!errs.length, '5 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(ng ? '不合格 ' + ng + ' 件' : '全て合格'); process.exit(ng ? 1 : 0);
})();
