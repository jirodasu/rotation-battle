// v5.9.2 表紙の絵：7人の仲間が描かれた背景（縦・横）に差し替え、表紙の紋（丸い3つの顔）を隠す（2026-11-18 ユーザー承認）
// 合格の基準（測る前に決めたもの）：
//  （v5.10.2 で表紙を bg_title.webp の1枚と MiMU の仲間に差し替え。1・3・4 を新しい表紙の基準に置き換え）
//  1 どの画面も bg_title を読み込めている（幅 1024）
//  2 紋は見えない（visibility: hidden）。場所は残るので、題字・キャッチコピー・ボタンの縦の並びは重ならない
//  3・4 絵の中の前列の足もと（y=778）が、隠した紋の下端とそろう（±1.5px）
//  5 どの画面もページのエラーなし
const { launch, testPage } = require('./_env');
const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const DIR = path.join(__dirname, 'out');
(async () => {
  const b = await launch();
  const cases = [[390, 844, 'tall7'], [430, 932, 'tall7'], [375, 667, 'top'], [320, 568, 'top'], [844, 390, 'phoneL'], [1024, 768, 'tabL']];
  for (const [w, h, kind] of cases) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(testPage()); await p.waitForTimeout(700); await p.click('#cover').catch(() => {}); await p.waitForTimeout(600);
    const r = await p.evaluate(async () => {
      const cv = document.getElementById('cover'), cs = getComputedStyle(cv);
      const m = cs.backgroundImage.match(/url\("?([^")]+)"?\)/), url = m ? m[1] : '';
      const loaded = await new Promise((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth); im.onerror = () => res(0); im.src = url; });
      const box = (s) => { const e = document.querySelector(s); if (!e || getComputedStyle(e).display === 'none' || !e.offsetParent) return null; const q = e.getBoundingClientRect(); return { t: q.top, b: q.bottom, l: q.left, r: q.right }; };
      const layers = cs.backgroundImage.split(/,\s*(?=linear-gradient|radial-gradient|url|none)/), ui = layers.findIndex((x) => /^url/.test(x));
      const sz = parseFloat(cs.backgroundSize.split(',')[ui]); const orbB = document.querySelector('.orbit').getBoundingClientRect().bottom;
      return { sz, orbB, url, loaded, pos: cs.backgroundPosition.split(',')[ui].trim(), orbit: getComputedStyle(document.querySelector('.orbit')).visibility, title: box('.c-title'), tag: box('.c-tag'), btns: box('.c-btns'), vh: innerHeight };
    });
    const tag = w + '×' + h;
    const land = w > h;
    ok(/bg_title\.webp$/.test(r.url) && r.loaded === 1024, tag + ' 1 背景の絵（' + r.url.split('/').pop() + '・幅' + r.loaded + '）');
    const stacked = !land ? (r.title && r.btns && r.title.b <= r.btns.t + 1 && (!r.tag || r.tag.b <= r.btns.t + 1)) : (r.title && r.btns && r.title.r <= r.btns.l + 1);
    ok(r.orbit === 'hidden' && stacked, tag + ' 2 紋は見えず、題字とボタンは重ならない（' + r.orbit + '）');
    const last = r.pos;   // 絵（url の層）の位置。上を暗くつなぐグラデーションの層は見ない
    const foot = parseFloat(last.split(' ')[1]) + 778 * r.sz / 1024;
    const want = () => Math.abs(foot - r.orbB) < 1.5;
    ok(want(last), tag + ' ' + (kind === 'tall7' || kind === 'top' ? '3' : '4') + ' 絵の足もとが紋の下端にそろう（' + foot.toFixed(1) + '／' + r.orbB.toFixed(1) + '）');
    ok(!errs.length, tag + ' 5 ページのエラーなし ' + errs.join(' / '));
    await p.screenshot({ path: path.join(DIR, 'v592_' + w + 'x' + h + '.png') });
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
