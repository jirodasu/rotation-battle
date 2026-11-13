// v5.8.7 初めての遠征：物語のあとすぐ初戦（地図の二択は出さない）。初戦の中で短く教える。アイコンを新しい題に合わせる
// 合格の基準（測る前に決めたもの）：
//  1 初めての人が「環廊へ」→物語→そのまま初戦の隊列（地図は出ない）。隊列で「上から攻撃・補助・回復の列。まずは「戦闘開始」」の案内（320・390px で画面の中）
//  2 最初に選ぶとき「ボタンに、押したあとのHPが出る。比べて選ぼう」。説明（tip）と同時には出さない（閉じてから出る）
//  3 初戦に勝ったあとの地図で、目標（goal）が開いている
//  4 初めてでない人（地図を一度飛ばした・遠征1回以上）は、地点1の地図が出る
//  5 アイコンの5枚があり、大きさが正しい
//  ページのエラーなし
process.env.RB_STORY = '1';   // 初めての人と同じ（物語を見たことにしない）
const fs = require('fs'), path = require('path');
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const ROOT = path.join(__dirname, '..');
const pngSize = (f) => { const b = fs.readFileSync(path.join(ROOT, f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
(async () => {
  for (const [f, n] of [['icon-512.png', 512], ['icon-192.png', 192], ['icon-maskable-512.png', 512], ['apple-touch-icon.png', 180], ['favicon-32.png', 32]]) { const [w, h] = pngSize(f); ok(w === n && h === n, '5 ' + f + ' ' + w + '×' + h); }
  const b = await launch();
  const start = async (w, h, seed) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    if (seed) await p.addInitScript((s) => { try { for (const k in s) localStorage.setItem(k, s[k]); } catch (e) { /* */ } }, seed);
    await p.goto(testPage()); await p.waitForTimeout(500); await p.click('#cover'); await p.waitForTimeout(400); await p.click('#begin'); await p.waitForTimeout(400);
    for (let i = 0; i < 6; i++) { if (await p.evaluate(() => { const g = document.getElementById('stGo'); return !!(g && g.getBoundingClientRect().width > 0); })) break; await p.mouse.click(w / 2, h * 0.6); await p.waitForTimeout(350); }
    await p.click('#stGo').catch(() => {}); await p.waitForTimeout(1500);
    return { ctx, p, errs };
  };
  const bub = (p) => p.evaluate(() => { const g = document.getElementById('firstGuide'); if (!g || g.hidden || !g.classList.contains('on')) return null; const r = g.getBoundingClientRect(); return { t: g.textContent, in: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }; });
  for (const [w, h] of [[390, 844], [320, 568]]) {
    const { ctx, p, errs } = await start(w, h);
    const s = await p.evaluate(() => ({ map: !document.getElementById('runv').hidden, prep: window.__rb.phase, skip: window.__rb.run && window.__rb.run.skip0, foe: window.__rb.enemy && window.__rb.enemy.name }));
    const g = await bub(p);
    ok(!s.map && s.prep === 'prep' && s.skip === 1, w + ' 1 物語のあとは地図を出さずに初戦の隊列 ' + JSON.stringify(s));
    ok(g && /^上から攻撃・補助・回復の列。\n?まずは「戦闘開始」$/.test(g.t) && g.in, w + ' 1 隊列の案内が画面の中に ' + JSON.stringify(g));
    await p.click('#btnStart');
    let seenTogether = false, guide = null, tipSeen = false;
    for (let k = 0; k < 160 && !guide; k++) {
      const st = await p.evaluate(() => ({ ph: window.__rb.phase, tip: !document.getElementById('tip').hidden }));
      const gg = await bub(p);
      if (st.tip) { tipSeen = true; if (gg) seenTogether = true; if (k % 8 === 7) await p.evaluate(() => document.getElementById('tipOk').click()); }
      else if (gg && st.ph === 'choose' && /比べて選ぼう/.test(gg.t)) guide = gg;
      await p.waitForTimeout(100);
    }
    ok(guide && guide.t === 'ボタンに、押したあとのHPが出る。比べて選ぼう' && guide.in, w + ' 2 最初に選ぶときの案内 ' + JSON.stringify(guide));
    ok(tipSeen && !seenTogether, w + ' 2 説明（tip）と同時には出ない（説明あり：' + tipSeen + '）');
    if (w === 390) {
      // 初戦を勝ちきる：維持で倒れる見込みなら回す
      for (let k = 0; k < 900; k++) {
        const st = await p.evaluate(() => ({ ph: window.__rb.phase, tip: !document.getElementById('tip').hidden, rv: !document.getElementById('runv').hidden }));
        if (st.rv) break;
        if (st.tip) { await p.evaluate(() => document.getElementById('tipOk').click()); continue; }
        if (st.ph === 'choose') { const rot = await p.evaluate(() => { const R = window.__rb; return R.outlook(R.grid, false, false).hurt.some((h) => h.ko) && !R.outlook(R.previewGrid(), true, true).hurt.some((h) => h.ko) && !document.getElementById('btnRotate').disabled; }); await p.click(rot ? '#btnRotate' : '#btnStay').catch(() => {}); await p.waitForTimeout(150); }
        await p.waitForTimeout(50);
      }
      // 報酬を選んで地図へ
      for (let k = 0; k < 10; k++) { const m = await p.evaluate(() => ({ map: document.getElementById('runv').classList.contains('map-a'), node: window.__rb.run.node })); if (m.map && m.node >= 1) break; await p.click('#rvCards .rv-card').catch(() => {}); await p.click('#rvGo').catch(() => {}); await p.waitForTimeout(900); }
      const m = await p.evaluate(() => ({ map: document.getElementById('runv').classList.contains('map-a'), goal: document.getElementById('runv').classList.contains('show-goal'), node: window.__rb.run.node }));
      ok(m.map && m.goal && m.node === 1, '3 初戦のあとの地図で目標が開いている ' + JSON.stringify(m));
    }
    ok(!errs.length, w + ' ページのエラーなし ' + errs.join(' / ')); await ctx.close();
  }
  for (const [tag, seed] of [['地図を一度飛ばした人', { 'rb-firstmap': '1' }], ['遠征1回以上の人', { 'rb-exp': JSON.stringify({ runs: 1 }) }]]) {
    const { ctx, p, errs } = await start(390, 844, seed);
    const s = await p.evaluate(() => ({ map: !document.getElementById('runv').hidden, node: window.__rb.run && window.__rb.run.node }));
    ok(s.map && s.node === 0, '4 ' + tag + 'は地点1の地図が出る ' + JSON.stringify(s));
    ok(!errs.length, '4 ' + tag + ' ページのエラーなし ' + errs.join(' / ')); await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
