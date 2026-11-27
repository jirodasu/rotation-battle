// v5.9.1 冒頭の物語を、小学生にも分かる言葉に（2026-11-18 ユーザー承認の文）
// 合格の基準（測る前に決めたもの）：
//  1 物語は初めの4枚・続きの3枚のまま。承認した文になり、前の難しい言い回し（尽きぬ富・ほつれた・あまたの・喰らった）は残っていない
//  2 320×568・375×667・390×844 で、7枚とも文が画面からはみ出さない（横にも縦にもスクロールしない）
//  3 ページのエラーなし
const fs = require('fs'), path = require('path');
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const want = ['その名は<em>「環廊」</em>。', 'ずっとなくならない宝を', 'こわれた道をなおしながら、', 'さあ、灯を手に取れ！', '有名になりたい者。', 'こぼれた灯を食べたけものたちが、', 'それでも、灯は消えずに残った。'];
  const old = ['尽きぬ富', 'ほつれた道', 'あまたの冒険者', '喰らった獣'];
  ok(want.every((w) => src.includes(w)) && old.every((w) => !src.includes(w)), '1 承認した文になり、前の言い回しは残っていない');
  const b = await launch();
  for (const [w, h] of [[320, 568], [375, 667], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-story', '1'); localStorage.setItem('rb-story2', '1'); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover').catch(() => {}); await p.waitForTimeout(300);
    await p.evaluate(() => document.getElementById('storyBtn').click()); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('#slList .sl-item[data-k="open"]').click()); await p.waitForTimeout(300);   // v5.10：物語は一覧から開く
    const bad = []; let n = 0;
    for (let i = 0; i < 7; i++) {
      const m = await p.evaluate(() => { const t = document.getElementById('stTxt'), r = t.getBoundingClientRect(), s = document.getElementById('story'); return { sw: s.scrollWidth > s.clientWidth, sh: s.scrollHeight > s.clientHeight + 1, l: r.left, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight, dots: document.querySelectorAll('#stDots i').length }; });
      n = m.dots; if (m.sw || m.sh || m.l < 0 || m.r > m.w || m.b > m.h) bad.push(i + 1);
      if (i < 6) { await p.mouse.click(w / 2, h / 2); await p.waitForTimeout(150); }
    }
    ok(n === 7 && !bad.length, '2 ' + w + '×' + h + '：7枚とも収まる' + (bad.length ? '（はみ出し ' + bad.join(',') + '枚目）' : ''));
    ok(!errs.length, '3 ' + w + ' エラーなし ' + errs.join(' / ')); await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
