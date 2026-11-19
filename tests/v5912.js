// v5.9.12 muse の実プレイの指摘（2026-11-19）から、採点で上位だった3つ
// 合格の基準（測る前に決めたもの）：
//  1 使い切った補助（2ターン目）：線（点線も）を描かない。印は暗く（off used）残る。長押しの先読み（回したあと）では使い切りの印は1つも無い＝回すと戻る
//  2 このターン効かない補助の線は1本も無い（.ds が無い）。効く補助は今までどおり矢印（on）
//  3 初めての仕掛けの案内（ヒント札）は、回す・維持の欄（dock）・盤・予告の札に重ならない（390・375・320・852×393・1024×768・1280×720）
//  4 チュートリアル最初の手順の文は「ふだん、戦うのも狙われるのも、いちばん上の攻撃列。」（「だけ」と言い切らない）。あそびかたから点線の説明が消え、「回すと戻る」がある
//  5 ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const ALL = { stars: 1, gauge: 1, bind: 1, entry: 1, charge: 1, pierce: 1, stamina: 1, trinity: 1, bench: 1, combo: 1, hmIntro: 1, lamp: 1, stayed: 1, mid: 1, highhp: 1, gate: 1, doom: 1, rel: 1, einfo: 1 };
async function toBattle(p, w, tips) {
  await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', JSON.stringify(t)); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, tips);
  await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(200); await p.click('#begin'); await p.waitForTimeout(700);
  for (let k = 0; k < 5 && await p.evaluate(() => !!document.querySelector('#runv .ph-wait')); k++) { await p.mouse.click(w / 2, 120); await p.waitForTimeout(300); }
  const bi = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
  await p.click('#rvCards .rv-card[data-i="' + bi + '"]'); await p.click('#rvGo'); await p.waitForTimeout(900);
  await p.evaluate(() => { const R = window.__rb; R.enemy.hp = R.enemy.max = 9999; });
}
const SA = () => [...document.querySelectorAll('#supAr .sa')].map((g) => ({ k: g.classList.contains('a') ? 'a' : 'd', on: g.classList.contains('on'), used: g.classList.contains('used'), lines: g.querySelectorAll('line').length, ds: g.querySelectorAll('.ds').length, lb: g.querySelectorAll('.lb').length }));
(async () => {
  const b = await launch();
  // 1・2 補助の線
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await toBattle(p, 390, ALL);
    const s0 = await p.evaluate(SA);
    await p.click('#btnStart');
    for (let i = 0; i < 300; i++) { if (await p.evaluate(() => window.__rb.phase === 'choose' && !document.getElementById('btnStay').hidden)) break; await p.waitForTimeout(80); }
    await p.waitForTimeout(800);
    const s1 = await p.evaluate(SA);
    const used = s1.filter((x) => x.used);
    ok(used.length >= 1 && used.every((x) => !x.on && x.lines === 0 && x.lb === 1), '1 使い切った補助は線なし・暗い印だけ ' + JSON.stringify({ before: s0, after: s1 }));
    ok(s1.every((x) => x.ds === 0) && s1.every((x) => x.on || x.used), '2 効かない補助の点線は1本も無い・残るのは「効く」か「使い切り」だけ ' + JSON.stringify(s1));
    // 長押しの先読み：回すと戻るので、明るい矢印になる
    const box = await p.evaluate(() => { const r = document.getElementById('btnRotate').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.move(box.x, box.y); await p.evaluate(({ x, y }) => { const el = document.getElementById('btnRotate'); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, button: 0, pointerType: 'touch' })); }, box);
    await p.waitForTimeout(600);
    const pv = await p.evaluate(() => ({ on: window.__rb.previewOn, sa: [...document.querySelectorAll('#supAr .sa')].map((g) => (g.classList.contains('on') ? 'on' : g.classList.contains('used') ? 'used' : 'off')) }));
    await p.evaluate(() => document.getElementById('btnRotate').dispatchEvent(new PointerEvent('pointercancel', { bubbles: true })));
    ok(pv.on && !pv.sa.includes('used'), '1 長押しの先読み（回したあと）には使い切りの印が無い（回すと戻る） ' + JSON.stringify(pv));
    ok(!errs.length, '5 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  // 3 ヒント札が回す・維持・盤・予告に重ならない
  for (const [w, h] of [[390, 844], [375, 667], [320, 568], [852, 393], [1024, 768], [1280, 720]]) {
    const tag = w + '×' + h;
    const T = Object.assign({}, ALL); delete T.gauge;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 800, hasTouch: true, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await toBattle(p, w, T);
    await p.click('#btnStart');
    let shown = false;
    for (let i = 0; i < 200 && !shown; i++) { shown = await p.evaluate(() => !document.getElementById('tip').hidden); if (!shown) await p.waitForTimeout(80); }
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const R = (e) => e.getBoundingClientRect(), t = R(document.getElementById('tip'));
      const hit = (q) => Math.max(0, Math.min(t.right, q.right) - Math.max(t.left, q.left)) * Math.max(0, Math.min(t.bottom, q.bottom) - Math.max(t.top, q.top));
      return { k: document.getElementById('tip').dataset.k, dock: Math.round(hit(R(document.getElementById('dock')))), board: Math.round(hit(R(document.getElementById('board')))), ticket: Math.round(hit(R(document.getElementById('ticket')))), inView: t.top >= 0 && t.bottom <= innerHeight + 1 && t.left >= 0 && t.right <= innerWidth + 1 };
    });
    ok(shown && r.dock === 0 && r.board === 0 && r.ticket === 0 && r.inView, tag + ' 3 ヒント札が回す・維持・盤・予告に重ならない ' + JSON.stringify(r));
    ok(!errs.length, tag + ' 5 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  // 4 チュートリアルの文・あそびかた
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#beginTut'); await p.waitForTimeout(1300);
    let txt = '';
    for (let i = 0; i < 60 && !txt; i++) { txt = await p.evaluate(() => (!document.getElementById('coach').hidden && document.getElementById('coTitle').textContent === '攻撃列が最前線') ? document.getElementById('coach').textContent : ''); if (!txt) await p.waitForTimeout(100); }
    ok(txt.includes('ふだん、戦うのも狙われるのも、いちばん上の攻撃列。') && !txt.includes('攻撃列だけ'), '4 チュートリアル最初の文 ' + txt.slice(0, 60));
    const help = await p.evaluate(() => document.body.innerHTML.match(/<b>補助列<\/b>[^<]*/)[0]);
    ok(!help.includes('点線') && help.includes('回すと戻る'), '4 あそびかたの補助列の説明 ' + help);
    ok(!errs.length, '5 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
