// v5.5.2 一巡りの灯（回転コンボの改名と見た目。数値・発動の規則は変えない）
// 合格の基準（測る前に決めたもの）：
//  1. 第1章の戦闘：ランタンは従来どおり（数えない＝data-hm なし）。炎の印は出ない
//  2. 第2章に初めて着いた地図で、扉「一巡りの灯」が一度だけ出る。閉じて読み込み直しても、もう出ない
//  3. 第2章の陣立て：炎の印は攻撃列の仲間だけ。ランタンは0
//  4. 回すたびに、ランタンの灯る数＝回した回数。炎の印は、陣立てで攻撃列にいた2人に付いたまま回復列→補助列と巡る。
//     2回回すと攻撃列のランタンが脈打つ（hm-next）。3回目で発動し、2人は攻撃列に戻り、ランタンは0に戻る
//  5. 画面の文字に「回転コンボ」が残っていない。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"trinity":1,"bench":1,"combo":1}';
const st = () => { const b = document.getElementById('board'), R = window.__rb;
  const torch = [...document.querySelectorAll('#board .slot')].filter((s) => s.querySelector('.tok .torch')).map((s) => { const u = R.grid[+s.dataset.r][+s.dataset.c]; return s.dataset.r + ':' + (u ? u.uid : ''); }).sort();
  return { hm: b.getAttribute('data-hm'), next: b.classList.contains('hm-next'), torch, combo: R.combo, phase: R.phase }; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 852], [320, 568]]) {
    const tag = w + '×' + h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } }, TIPS);
    const ch = async () => { for (let k = 0; k < 300; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose')) break; await p.waitForTimeout(40); } await p.waitForTimeout(250); await p.evaluate(() => { const t = document.getElementById('tip'); if (t && !t.hidden) document.getElementById('tipOk').click(); }); };
    const enter = async () => { const i = await p.evaluate(() => Math.max(0, window.__rb.run.choices.findIndex((x) => x.type === 'battle'))); await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(1300); await p.evaluate(() => { const R = window.__rb; R.enemy.hp = R.enemy.max = 999; R.render(); }); };
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300);
    await p.click('#begin'); await p.waitForTimeout(700);
    // 1 第1章
    await enter();
    const s1 = await p.evaluate(st);
    ok(s1.hm === null && s1.torch.length === 0, tag + ' 1 第1章は数えない・炎の印なし ' + JSON.stringify(s1));
    // 2 第2章の扉（保存の地点を第2章にして、続きから）
    await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('rb-exp-save')); o.run.node = 3; delete o.battle; localStorage.setItem('rb-exp-save', JSON.stringify(o)); });
    const resume = async () => { await p.reload(); await p.waitForTimeout(500); if (await p.evaluate(() => !document.getElementById('cover').classList.contains('revealed'))) await p.click('#cover'); await p.waitForTimeout(300); await p.click('#resume'); await p.waitForTimeout(900); };
    await resume();
    const d = await p.evaluate(() => { const e = document.getElementById('hmIntro'), r = e.querySelector('.r-card').getBoundingClientRect(), g = document.getElementById('hmGo').getBoundingClientRect(); return { shown: !e.hidden, title: document.getElementById('hmTitle').textContent, small: document.getElementById('hmSmall').textContent, fit: r.top >= -1 && g.bottom <= innerHeight + 1 }; });
    ok(d.shown && d.title === '一巡りの灯' && /第2章/.test(d.small) && d.fit, tag + ' 2 第2章の地図で扉が出て、画面に収まる ' + JSON.stringify(d));
    await p.click('#hmGo'); await p.waitForTimeout(200);
    await resume();
    ok(await p.evaluate(() => document.getElementById('hmIntro').hidden), tag + ' 2 一度見たら、もう出ない');
    // 3 陣立て
    await enter();
    const s3 = await p.evaluate(st), front = await p.evaluate(() => window.__rb.grid[0].filter(Boolean).map((u) => u.uid).sort());
    ok(s3.hm === '0' && s3.torch.length === front.length && s3.torch.every((x) => x.startsWith('0:')), tag + ' 3 陣立て：炎の印は攻撃列だけ、ランタン0 ' + JSON.stringify(s3));
    // 4 回す
    await p.click('#btnStart'); await ch();
    const rows = [];
    for (let n = 1; n <= 3; n++) {
      await p.evaluate(() => { const R = window.__rb; R.setGauge(3); R.enemy.bound = false; R.render(); });
      if (n === 3) rows.push(await p.evaluate(st));
      await p.click('#btnRotate'); await ch();
      rows.push(await p.evaluate(st));
    }
    const ids = (s) => s.torch.map((x) => x.split(':')[1]).sort().join();
    const want = front.join();
    ok(rows[0].hm === '1' && rows[0].torch.every((x) => x.startsWith('2:')) && ids(rows[0]) === want, tag + ' 4 1回目：ランタン1つ、炎の2人は回復列 ' + JSON.stringify(rows[0]));
    ok(rows[1].hm === '2' && rows[1].torch.every((x) => x.startsWith('1:')) && ids(rows[1]) === want && rows[1].next, tag + ' 4 2回目：ランタン2つ、炎の2人は補助列、攻撃列のランタンが脈打つ ' + JSON.stringify(rows[1]));
    ok(rows[3].hm === '0' && rows[3].combo === 0 && rows[3].torch.every((x) => x.startsWith('0:')) && ids(rows[3]) === want && !rows[3].next, tag + ' 4 3回目：発動して2人は攻撃列へ、ランタンは0 ' + JSON.stringify(rows[3]));
    const log = await p.evaluate(() => window.__rb.log.join('\n'));
    ok(/一巡りの灯！/.test(log), tag + ' 4 履歴に「一巡りの灯！」');
    // 5
    const txt = await p.evaluate(() => { const c = document.documentElement.cloneNode(true); c.querySelectorAll('script,style').forEach((e) => e.remove()); return /回転コンボ/.test(c.textContent) || [...document.querySelectorAll('[aria-label],[title]')].some((e) => /回転コンボ/.test((e.getAttribute('aria-label') || '') + (e.getAttribute('title') || ''))); });
    ok(!txt, tag + ' 5 画面の文字に「回転コンボ」が残っていない');
    ok(!errs.length, tag + ' 5 ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
