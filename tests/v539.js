// v5.3.9 あそびかたを3段に分ける
// 合格の基準（測る前に決めたもの）：
//  1. 開くと「はじめに」の段だけが出る。項目は4つ以下で、スクロールせずに全部見える（393×852・320×568）
//  2. 「はじめに」には、やること（回す・維持）・結果の見比べ・赤い数字が入る
//  3. 段は「はじめに・しくみ・くわしく」の3つ。押すと、その段だけが出る。「しくみ」には列と回す・気力、「くわしく」には突入技・★・遠征
//  4. 段の終わりの「次へ」で、次の段へ進める
//  5. 閉じてまた開くと、前に見ていた段が出る
//  6. これまでの説明は1つも消えない（14項目＋新しい2項目が、どこかの段にある）
//  7. 下の帯（わかった）の下に本文がはみ出さない。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const OLD = ['攻撃列', '補助列', '回復列', '回す（ローテーション）', '敵をタップ', '赤い数字', '赤く光る仲間', '遠征', '気力', '突入技', '予兆', 'ちからをためる', '防無効（防御補助を無視）', '★の条件'];
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 852], [320, 568], [852, 393]]) {
    const tag = w + '×' + h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, bench: 1, charge: 1, pierce: 1, entry: 1, trinity: 1, stamina: 1, combo: 1, hmIntro: 1 })); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(400);
    await p.click('#begin'); await p.waitForTimeout(700);
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(1400);
    await p.click('#helpBtn'); await p.waitForTimeout(400);
    const st = () => p.evaluate(() => { const shown = [...document.querySelectorAll('#help .steps')].filter((u) => getComputedStyle(u).display !== 'none');
      const items = shown.length === 1 ? [...shown[0].querySelectorAll('li:not(.h-more) b')].map((x) => x.textContent) : [];
      const card = document.querySelector('#help .h-card'), foot = document.querySelector('#help .h-foot'), last = shown[0] && [...shown[0].querySelectorAll('li:not(.h-more)')].pop();
      return { n: shown.length, id: shown[0] && shown[0].id, items, tabs: [...document.querySelectorAll('#help .h-tabs button')].map((x) => x.textContent + (x.getAttribute('aria-selected') === 'true' ? '*' : '')),
        fits: last ? last.getBoundingClientRect().bottom <= foot.getBoundingClientRect().top + 2 && card.scrollHeight <= card.clientHeight + 2 : false };
    });
    // 1・2
    const s0 = await st();
    ok(s0.n === 1 && s0.id === 'hTier0' && s0.items.length <= 4, tag + ' 1 はじめは「はじめに」だけ（' + s0.items.length + '項目）' + JSON.stringify(s0.items));
    if (h >= 568 && w < 800) ok(s0.fits, tag + ' 1 「はじめに」はスクロールせずに全部見える');
    ok(s0.items.includes('やること') && s0.items.includes('「回す」「維持」の結果を比べる') && s0.items.includes('赤い数字'), tag + ' 2 はじめに：やること・下の札・赤い数字');
    ok(s0.tabs.join() === 'はじめに*,しくみ,くわしく', tag + ' 3 段は3つ ' + s0.tabs.join());
    // 3
    await p.click('#hTab1'); await p.waitForTimeout(200); const s1 = await st();
    ok(s1.n === 1 && s1.id === 'hTier1' && ['攻撃列', '補助列', '回復列', '回す（ローテーション）', '気力'].every((k) => s1.items.includes(k)), tag + ' 3 しくみ ' + JSON.stringify(s1.items));
    await p.click('#hTab2'); await p.waitForTimeout(200); const s2 = await st();
    ok(s2.n === 1 && s2.id === 'hTier2' && ['突入技', '★の条件', '遠征'].every((k) => s2.items.includes(k)), tag + ' 3 くわしく ' + JSON.stringify(s2.items));
    // 6
    const all = await p.evaluate(() => [...document.querySelectorAll('#help .steps li:not(.h-more) b')].map((x) => x.textContent));
    ok(OLD.every((k) => all.includes(k)) && new Set(all).size === all.length, tag + ' 6 これまでの説明が全部ある（' + all.length + '項目・重複なし）');
    // 7
    const gap = await p.evaluate(() => { const card = document.querySelector('#help .h-card'), foot = document.querySelector('#help .h-foot'); card.scrollTop = card.scrollHeight; return new Promise((r) => requestAnimationFrame(() => r(Math.round(card.getBoundingClientRect().bottom - foot.getBoundingClientRect().bottom)))); });
    ok(gap <= 2, tag + ' 7 下の帯が枠の下まで覆う（すき間 ' + gap + 'px）');
    // 4
    await p.click('#hTab0'); await p.waitForTimeout(200);
    await p.evaluate(() => { const card = document.querySelector('#help .h-card'); card.scrollTop = card.scrollHeight; });
    await p.click('#hTier0 .h-next'); await p.waitForTimeout(200);
    const s3 = await st();
    ok(s3.id === 'hTier1' && s3.tabs[1] === 'しくみ*', tag + ' 4 「次へ」で「しくみ」へ');
    ok(await p.evaluate(() => document.querySelector('#help .h-card').scrollTop === 0), tag + ' 4 段を変えると一番上から');
    // 5
    await p.click('#helpClose'); await p.waitForTimeout(300); await p.click('#helpBtn'); await p.waitForTimeout(300);
    const s4 = await st();
    ok(s4.id === 'hTier1', tag + ' 5 また開くと前の段（' + s4.id + '）');
    await p.click('#helpClose'); await p.waitForTimeout(200);
    ok(!errs.length, tag + ' ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
