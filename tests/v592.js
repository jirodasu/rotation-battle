// v5.9.2 表紙の絵：7人の仲間が描かれた背景（縦・横）に差し替え、表紙の紋（丸い3つの顔）を隠す（2026-11-18 ユーザー承認）
// 合格の基準（測る前に決めたもの）：
//  1 縦の画面は bg_tall、横の画面は bg_wide を読み込めている（幅 1024 / 1536）
//  2 紋は見えない（visibility: hidden）。場所は残るので、題字・キャッチコピー・ボタンの縦の並びは重ならない
//  3 縦に長い画面（390×844・430×932）だけ絵を 7vh 下げる。375×667・320×568 は下げない
//  4 横持ちのスマホ（844×390）は縦 25% の位置、タブレットの横持ち（1024×768）は左寄せで 16vh 下げる
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
      return { url, loaded, pos: cs.backgroundPosition.split(',')[ui].trim(), orbit: getComputedStyle(document.querySelector('.orbit')).visibility, title: box('.c-title'), tag: box('.c-tag'), btns: box('.c-btns'), vh: innerHeight };
    });
    const tag = w + '×' + h;
    const land = w > h;
    ok((land ? /bg_wide\.webp$/ : /bg_tall\.webp$/).test(r.url) && r.loaded === (land ? 1536 : 1024), tag + ' 1 背景の絵（' + r.url.split('/').pop() + '・幅' + r.loaded + '）');
    const stacked = !land ? (r.title && r.btns && r.title.b <= r.btns.t + 1 && (!r.tag || r.tag.b <= r.btns.t + 1)) : (r.title && r.btns && r.title.r <= r.btns.l + 1);
    ok(r.orbit === 'hidden' && stacked, tag + ' 2 紋は見えず、題字とボタンは重ならない（' + r.orbit + '）');
    const last = r.pos;   // 絵（url の層）の位置。上を暗くつなぐグラデーションの層は見ない
    const want = { tall7: (s) => /^50% /.test(s) && Math.abs(parseFloat(s.split(' ')[1]) - r.vh * 0.07) < 1.5, top: (s) => s === '50% 0%', phoneL: (s) => s === '50% 25%', tabL: (s) => /^0% /.test(s) && Math.abs(parseFloat(s.split(' ')[1]) - r.vh * 0.16) < 1.5 }[kind];
    ok(want(last), tag + ' ' + (kind === 'tall7' || kind === 'top' ? '3' : '4') + ' 絵の位置（' + kind + '）：' + last);
    ok(!errs.length, tag + ' 5 ページのエラーなし ' + errs.join(' / '));
    await p.screenshot({ path: path.join(DIR, 'v592_' + w + 'x' + h + '.png') });
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
