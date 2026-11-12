// v5.8.4 タイトルを「灯を継ぐ隊列 -LAST ROTATION-」に。表紙を地の底の大聖堂の絵・金の題字・羊皮紙と革の板のボタンに
// 合格の基準（測る前に決めたもの）：
//  1 名前：ページの題・ホーム画面の名前・manifest・設定の版表示が新しい名前。古い名前「ローテーションバトル」は画面に出ない
//  2 表紙の背景は img/bg_tall.webp（縦）・img/bg_wide.webp（横）で、画像が読み込めている（ゴシック調の見た目の背景より優先される）
//  3 ボタンは板の画像（続きから・環廊へ＝金、ほかは革。続きからがあるときは環廊へも革）
//  4 390×844・320×568・844×390 で、表紙のボタンと題字が画面の横にはみ出さない。横向きでは紋が画面の下に切れない
//  5 sw.js が img/ の4枚をオフライン用に持ち、そのファイルがある
//  ページのエラーなし
const fs = require('fs'), path = require('path');
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const ROOT = path.join(__dirname, '..');
(async () => {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  ok(man.name === '灯を継ぐ隊列 -LAST ROTATION-' && man.short_name === '灯を継ぐ隊列', '1 manifest の名前（' + man.name + '／' + man.short_name + '）');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), imgs = ['bg_tall', 'bg_wide', 'btn_gold', 'btn_dark'];
  ok(imgs.every((n) => sw.includes("'./img/" + n + ".webp'") && fs.existsSync(path.join(ROOT, 'img', n + '.webp'))), '5 sw.js が img/ の4枚を持ち、ファイルがある');
  const b = await launch();
  for (const [w, h, skin] of [[390, 844, 'goth'], [320, 568, 'goth'], [844, 390, 'goth']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((sk) => { try { localStorage.setItem('rb-skin', sk); } catch (e) { /* */ } }, skin);
    await p.goto(testPage()); await p.waitForTimeout(700); await p.click('#cover'); await p.waitForTimeout(700);
    const r = await p.evaluate(async () => {
      const cv = document.getElementById('cover'), bg = getComputedStyle(cv).backgroundImage;
      const m = bg.match(/url\("?([^")]+)"?\)/), url = m ? m[1] : '';
      const loaded = await new Promise((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth); im.onerror = () => res(0); im.src = url; });
      const btn = (id) => { const e = document.getElementById(id); return getComputedStyle(e).borderImageSource; };
      const vis = [...document.querySelectorAll('.c-btns .btn, .c-title, .c-kicker')].filter((e) => e.offsetParent);
      const over = vis.filter((e) => { const q = e.getBoundingClientRect(); return q.left < -1 || q.right > innerWidth + 1; }).map((e) => e.id || e.className);
      const orb = document.querySelector('.orbit').getBoundingClientRect();
      return { title: document.title, apple: document.querySelector('meta[name="apple-mobile-web-app-title"]').content, h2: document.querySelector('.c-title').textContent, kick: document.querySelector('.c-kicker').textContent,
        old: /ローテーションバトル/.test(cv.innerText), url, loaded, begin: btn('begin'), set: btn('setBtn'), over, orbBottom: Math.round(orb.bottom), ih: innerHeight, skin: document.documentElement.dataset.skin };
    });
    const tag = w + '×' + h + '（' + r.skin + '）';
    ok(r.title === '灯を継ぐ隊列 -LAST ROTATION-' && r.apple === '灯を継ぐ隊列' && r.h2 === '灯を継ぐ隊列' && r.kick === '-LAST ROTATION-' && !r.old, tag + ' 1 新しい名前（' + r.title + '・' + r.h2 + r.kick + '）');
    ok(/img\/bg_(tall|wide)\.webp$/.test(r.url) && r.loaded > 0 && (w > h ? /bg_wide/.test(r.url) : /bg_tall/.test(r.url)), tag + ' 2 背景の絵が読み込めている（' + r.url.split('/').pop() + '・幅' + r.loaded + '）');
    ok(/btn_gold\.webp/.test(r.begin) && /btn_dark\.webp/.test(r.set), tag + ' 3 環廊へは金の板、設定は革の板');
    ok(r.over.length === 0, tag + ' 4 ボタンと題字が横にはみ出さない ' + r.over.join(','));
    ok(r.orbBottom <= r.ih + 1, tag + ' 4 紋が画面の下に切れない（下端 ' + r.orbBottom + '／' + r.ih + '）');
    if (w === 390 && skin === 'goth') {
      await p.evaluate(() => { document.getElementById('cover').classList.add('has-save'); document.getElementById('resume').hidden = false; });
      const sv = await p.evaluate(() => [getComputedStyle(document.getElementById('resume')).borderImageSource, getComputedStyle(document.getElementById('begin')).borderImageSource]);
      ok(/btn_gold/.test(sv[0]) && /btn_dark/.test(sv[1]), tag + ' 3 続きからがあるときは、続きからが金・環廊へが革');
      await p.click('#setBtn'); await p.waitForTimeout(500);
      const ver = await p.evaluate(() => document.getElementById('setVer').textContent);
      ok(/^灯を継ぐ隊列 -LAST ROTATION-　ver /.test(ver), tag + ' 1 設定の版表示（' + ver + '）');
    }
    ok(!errs.length, tag + ' ページのエラーなし ' + errs.join(' / ')); await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
