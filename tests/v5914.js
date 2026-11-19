// v5.9.14 muse の実プレイの指摘（2026-11-19）から。補助の線（C1）は v5.9.13（別の作業）で入ったので、ここは残りの2つ
// 合格の基準（測る前に決めたもの）：
//  3 初めての仕掛けの案内（ヒント札）は、回す・維持の欄（dock）・盤・予告の札に重ならない（390・375・320・852×393・1024×768・1280×720）
//  4 チュートリアル最初の手順の文は「ふだん、戦うのも狙われるのも、いちばん上の攻撃列。」（「だけ」と言い切らない）。あそびかたの補助列の説明から点線と金・青の矢印が消え、「回して入り直すと戻る」がある
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
    ok(!help.includes('点線') && !help.includes('金の矢印') && help.includes('回して入り直すと戻る'), '4 あそびかたの補助列の説明 ' + help);
    ok(!errs.length, '5 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
