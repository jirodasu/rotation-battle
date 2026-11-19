// v5.9.12 結果・報酬・地図の画面で、一番上の行が iPhone の時刻の帯（安全な余白）の下に隠れない
// 合格の基準（測る前に決めたもの）：
//  1 安全な余白（上 --sat・下 --sab）を iPhone の値にしたとき、報酬画面の札（.r-card）の上端が --sat 以上、下端が「画面の高さ − --sab」以下
//  2 その画面で一番上の文字（章と地点の行）の上端が --sat 以上で、札の中で切れていない（札の上端より下）
//  3 地図の画面でも 1 と同じ
//  4 安全な余白が 0 の画面（PCのブラウザ）では、今までと同じ 16px の余白
//  5 ページのエラーなし。320・375・390・393px で撮る（tests/out/v5912/）
const { launch, testPage, OUT } = require('./_env');
const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const DIR = path.join(OUT, 'v5912'); fs.mkdirSync(DIR, { recursive: true });
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1,"lamp":1,"stayed":1,"mid":1,"rel":1}';
const MEASURE = () => {
  const v = document.getElementById('runv'), c = v.querySelector('.r-card'), cr = c.getBoundingClientRect();
  const txt = [...c.querySelectorAll('*')].filter((e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0 && [...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim()))
    .map((e) => ({ t: e.textContent.trim().slice(0, 16), top: e.getBoundingClientRect().top })).sort((a, b) => a.top - b.top)[0];
  return { cardTop: cr.top, cardBottom: cr.bottom, first: txt, h: innerHeight, pad: getComputedStyle(v).paddingTop };
};
(async () => {
  const b = await launch();
  for (const [w, h, sat, sab] of [[393, 852, 59, 34], [390, 844, 47, 34], [375, 667, 20, 0], [320, 568, 20, 0], [390, 844, 0, 0]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1'); localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-ending', '1'); localStorage.setItem('rb-story', '1'); localStorage.setItem('rb-firstmap', '1'); localStorage.setItem('rb-teach-inc', '3'); localStorage.setItem('rb-teach-hold', '1'); localStorage.setItem('rb-teach-num', '{"dm":1,"n":1}'); localStorage.setItem('rb-teach-empty', '2'); localStorage.setItem('rb-exp', '{"runs":2}'); }, TIPS);
    await p.goto(testPage()); await p.waitForTimeout(400);
    // iPhone のホーム画面から開いたときの安全な余白を、変数で再現する
    await p.evaluate(([a, z]) => { document.documentElement.style.setProperty('--sat', a + 'px'); document.documentElement.style.setProperty('--sab', z + 'px'); }, [sat, sab]);
    await p.click('#cover').catch(() => {}); await p.waitForTimeout(300);
    await p.click('#begin'); await p.waitForTimeout(700);
    if (await p.evaluate(() => !document.getElementById('runv').classList.contains('is-map'))) { await p.evaluate(() => { const c = document.querySelector('#rvCards .rv-card'); if (c) c.click(); }); await p.waitForTimeout(700); }
    const tag = w + 'x' + h + '_sat' + sat;
    const m = await p.evaluate(MEASURE);
    ok(m.cardTop >= sat - 0.5 && m.cardBottom <= h - sab + 0.5 && m.first && m.first.top >= sat && m.first.top >= m.cardTop, '3 ' + tag + ' 地図：札 ' + Math.round(m.cardTop) + '〜' + Math.round(m.cardBottom) + '、一番上の文字「' + (m.first && m.first.t) + '」' + Math.round(m.first && m.first.top));
    await p.screenshot({ path: path.join(DIR, 'map_' + tag + '.png') });
    const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
    await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(900);
    await p.click('#btnStart').catch(() => {}); await p.waitForTimeout(800);
    await p.evaluate(() => window.__rb.finishForTest('win')); await p.waitForTimeout(2500);
    for (let k = 0; k < 4; k++) { if (await p.evaluate(() => !!document.querySelector('#runv:not([hidden]) .rv-card'))) break; await p.mouse.click(w / 2, h / 2); await p.waitForTimeout(700); }
    const r = await p.evaluate(MEASURE);
    ok(r.cardTop >= sat - 0.5 && r.cardBottom <= h - sab + 0.5, '1 ' + tag + ' 報酬：札が安全な余白の内側 ' + Math.round(r.cardTop) + '〜' + Math.round(r.cardBottom) + '（画面 ' + h + '）');
    ok(r.first && r.first.top >= sat && r.first.top >= r.cardTop, '2 ' + tag + ' 報酬：一番上の文字「' + (r.first && r.first.t) + '」が隠れない ' + Math.round(r.first && r.first.top));
    if (sat === 0) ok(r.pad === '16px', '4 安全な余白なし：上の余白は 16px のまま（' + r.pad + '）');
    await p.screenshot({ path: path.join(DIR, 'reward_' + tag + '.png') });
    ok(!errs.length, '5 ' + tag + ' ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
