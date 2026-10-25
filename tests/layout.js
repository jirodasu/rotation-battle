// 画面サイズごとのレイアウト検査。各画面を開いてスクリーンショットを撮り、合格基準を数値で判定する。
//   node tests/layout.js            → 結果を表示、tests/out/layout/ に画像
// 合格基準：主要ボタンが画面内・攻撃予告が画面内・盤面の名札が重ならない・横スクロールが出ない・主要ボタンの高さ44px以上
const { launch, testPage, OUT } = require('./_env');
const fs = require('fs'), path = require('path');
const SIZES = [
  ['phone-landscape', 844, 390, true], ['small-landscape', 667, 375, true], ['phone-portrait', 390, 844, true],
  ['se-portrait', 375, 667, true], ['pc-16x9', 1280, 720, false], ['pc-16x10', 1280, 800, false], ['window-800x600', 800, 600, false], ['pc-1920', 1920, 1080, false]
];
const dir = path.join(OUT, 'layout'); fs.mkdirSync(dir, { recursive: true });

async function measure(p, need) {
  return p.evaluate((need) => {
    const vw = innerWidth, vh = innerHeight, out = { fails: [], warns: [] };
    const vis = (el) => { if (!el) return false; const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || el.hidden) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const inside = (el) => { const r = el.getBoundingClientRect(); return r.left >= -3 && r.top >= -3 && r.right <= vw + 3 && r.bottom <= vh + 3; };
    need.forEach(([sel, kind]) => {
      const el = document.querySelector(sel);
      if (!vis(el)) { out.fails.push(sel + ' が表示されていない'); return; }
      if (!inside(el)) { const r = el.getBoundingClientRect(); (kind === 'warn' ? out.warns : out.fails).push(sel + ' が画面外 (' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + '×' + Math.round(r.height) + ')'); }
      if (kind === 'btn' && el.getBoundingClientRect().height < 44) out.warns.push(sel + ' の高さ ' + Math.round(el.getBoundingClientRect().height) + 'px（44px未満）');
    });
    if (document.documentElement.scrollWidth > vw + 1) out.fails.push('横スクロールが出る（' + document.documentElement.scrollWidth + 'px）');
    // 盤面の名札どうしの重なり（盤面が前に出ている画面だけ）
    const covered = ['cover', 'runv', 'result', 'ending', 'help'].some((id) => { const e = document.getElementById(id); return e && !e.hidden && !e.classList.contains('out'); });
    const nm = covered ? [] : [...document.querySelectorAll('#board .tok .nm')].filter(vis).map((e) => e.getBoundingClientRect());
    for (let i = 0; i < nm.length; i++) for (let j = i + 1; j < nm.length; j++) {
      const a = nm[i], b = nm[j], ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 2 && oy > 2) { out.fails.push('名札が重なる'); i = nm.length; break; }
    }
    const s0 = document.querySelector('#board .slot'); if (s0 && vis(document.getElementById('board'))) out.slot = Math.round(s0.getBoundingClientRect().width);
    return out;
  }, need);
}

(async () => {
  const b = await launch();
  const url = testPage();
  const report = [];
  let failCount = 0;
  for (const [name, w, h, mob] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mob ? 2 : 1, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const check = async (screen, need) => {
      await p.screenshot({ path: path.join(dir, name + '-' + screen + '.png') });
      const m = await measure(p, need);
      failCount += m.fails.length;
      report.push({ size: name, screen, ...m });
    };
    const closeTip = async () => { if (await p.evaluate(() => !document.getElementById('tip').hidden)) await p.click('#tipOk').catch(() => {}); };
    await p.goto(url); await p.waitForTimeout(600);
    await p.click('#cover'); await p.waitForTimeout(700);
    await check('title', [['#begin', 'btn'], ['#beginTut', 'btn']]);
    await p.click('#begin'); await p.waitForTimeout(900);
    await check('map', [['#rvCards .rv-card[data-i="0"]', 'btn'], ['#rvCards .rv-card[data-i="1"]', 'warn'], ['#rvGo', 'warn']]);
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(2600); await closeTip();
    await check('prep', [['#btnStart', 'btn'], ['#btnPrepRot', 'btn'], ['#ticket'], ['#board']]);
    await p.click('#stage'); await p.waitForTimeout(500);
    await check('foe-sheet', [['#foeSheet', 'warn']]);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await p.click('#btnStart'); await p.waitForTimeout(400);
    for (let k = 0; k < 40; k++) { if (await p.evaluate(() => !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden')) break; await p.waitForTimeout(300); }
    await closeTip();
    await check('choose', [['#btnRotate', 'btn'], ['#btnStay', 'btn'], ['#btnPreview', 'btn'], ['#ticket'], ['#board']]);
    // 戦闘を最後まで
    for (let k = 0; k < 120; k++) {
      if (await p.evaluate(() => !document.getElementById('result').hidden)) break;
      await closeTip();
      if (await p.evaluate(() => !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden')) await p.click(await p.evaluate(() => document.getElementById('btnRotate').disabled) ? '#btnStay' : '#btnRotate', { timeout: 3000 }).catch(() => {});   // 縛られたターンは「回す」が押せない
      await p.waitForTimeout(300);
    }
    await p.waitForTimeout(800);
    await check('result', [['#next', 'btn']]);
    // 遠征（本番）：報酬・全滅・突破の画面
    await p.evaluate(() => { document.getElementById('result').hidden = true; window.__rb.expReward([]); }); await p.waitForTimeout(700);
    await check('reward', [['#rvCards .rv-card[data-i="0"]', 'btn'], ['#rvCards .rv-card[data-i="2"]', 'warn']]);
    await p.evaluate(() => { const R = window.__rb; R.run.events.push('地点2　テスト（戦士）が倒れた「あとは……頼んだ」'); R.expEnd(false, []); }); await p.waitForTimeout(700);
    await check('defeat', [['#rvCards .rv-card[data-i="0"]', 'btn'], ['#rvCards .rv-skip', 'btn']]);
    await p.evaluate(() => { window.__rb.expEnd(true, ['章の主を倒した。']); }); await p.waitForTimeout(700);
    await check('ending', [['#rvCards .rv-card[data-i="0"]', 'btn'], ['#rvCards .rv-skip', 'btn']]);
    // あそびかた・チュートリアル
    const p2 = await ctx.newPage(); p2.on('pageerror', (e) => errs.push(e.message));
    await p2.goto(url); await p2.waitForTimeout(600); await p2.click('#cover'); await p2.waitForTimeout(400);
    await p2.click('#beginTut'); await p2.waitForTimeout(1500);
    for (let k = 0; k < 3; k++) { await p2.click('#coNext').catch(() => {}); await p2.waitForTimeout(450); }
    const tutShot = async (screen, need) => { await p2.screenshot({ path: path.join(dir, name + '-' + screen + '.png') }); const m = await measure(p2, need); failCount += m.fails.length; report.push({ size: name, screen, ...m }); };
    // 解説と光っている所が重ならないか
    const overlap = await p2.evaluate(() => { const a = document.getElementById('coach').getBoundingClientRect(), s = document.getElementById('spot'); if (s.hidden) return 0; const b = s.getBoundingClientRect(); return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) / Math.max(1, b.width * b.height); });
    await tutShot('tutorial', [['#coNext', 'btn']]);
    if (overlap > 0.25) { failCount++; report.at(-1).fails.push('解説が光っている所の ' + Math.round(overlap * 100) + '% を隠す'); }
    await p2.click('#helpBtn'); await p2.waitForTimeout(500);
    await tutShot('help', [['#helpClose', 'btn']]);
    report.push({ size: name, screen: 'errors', fails: errs.map((e) => 'ページエラー: ' + e), warns: [] }); failCount += errs.length;
    await ctx.close();
  }
  await b.close();
  let cur = '';
  report.forEach((r) => {
    if (r.size !== cur) { cur = r.size; console.log('\n[' + cur + ']'); }
    if (r.screen === 'errors' && !r.fails.length) return;
    console.log('  ' + (r.fails.length ? 'NG ' : 'OK ') + r.screen.padEnd(10) + (r.slot ? ' 枠' + r.slot + 'px' : '') + (r.fails.length ? '  ✗ ' + r.fails.join(' / ') : '') + (r.warns.length ? '  △ ' + r.warns.join(' / ') : ''));
  });
  console.log('\n不合格 ' + failCount + ' 件');
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 1));
  process.exit(failCount ? 1 : 0);
})();
