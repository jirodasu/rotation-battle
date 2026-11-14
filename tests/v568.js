// v5.6.8 設定の「記録をリセット」と、QAジャンプの追加の指定
// 合格の基準（測る前に決めたもの）：
//  1. 設定の中に「記録をリセット」のボタンがある。押すと確認が出て、既定のフォーカスは「やめる」。「すべて消す」は出てすぐは押せない
//  2. 確認には、消えるもの（遠征の続き・遠征と踏破の回数・解放・既読）と、設定は残ることが書いてある
//  3. 「やめる」・Esc では何も消えない（Esc で設定の画面も閉じない＝確認だけ閉じる）
//  4. 「すべて消す」で rb- の記録（設定以外）がすべて消え、設定（rb-set・rb-snd・rb-fast）と rb- 以外のキーは残る。開き直したタイトルに「続きから」が出ない
//  5. QAジャンプの中ではボタンが押せない（本物の保存は消えない）
//  6. QAの追加の指定：depth・sq・foe・v・rests・hp が効く。正しくない指定はその項目だけ無視してジャンプは続く。主の地点では foe は効かない
//  7. 320×568 で確認の画面が画面に収まる。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1}';
const DUMP = () => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; };
(async () => {
  const b = await launch();
  const base = testPage();
  const ctx = await b.newContext({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript((t) => { try { if (!localStorage.getItem('v568-seeded')) { localStorage.setItem('v568-seeded', '1'); localStorage.setItem('rb-tips', t);   // 種まきは1回だけ（v5.8.8）。以前は「rb-tips が無ければ入れる」で、リセットのあとの開き直しでまた入ることがあった（5回に1回ほど基準4が落ちた。リセットで消えない印で見分ける）
    localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); } } catch (e) { /* */ } }, TIPS);
  await p.goto(base); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(800);
  await p.evaluate(() => { localStorage.setItem('rb-stars', '[3,2,1]'); localStorage.setItem('rb-run-best', '4'); localStorage.setItem('rb-set', '{"bgm":0.5,"sfx":0.4,"vib":true,"text":1}'); localStorage.setItem('rb-snd', '0'); localStorage.setItem('rb-fast', '1'); localStorage.setItem('other-key', 'keep');
    const m = JSON.parse(localStorage.getItem('rb-exp') || '{}'); m.runs = 3; m.won = { 'std:1': 2 }; localStorage.setItem('rb-exp', JSON.stringify(m)); });
  await p.reload(); await p.waitForTimeout(500);
  const before = await p.evaluate(DUMP);
  ok(before['rb-exp-save'] && before['rb-exp'] && before['rb-tips'] && before['rb-story'], '準備：遠征の続き・記録・既読がある');
  // 1 ボタンと確認
  await p.evaluate(() => document.getElementById('setBtn').click()); await p.waitForTimeout(200);
  const btn = await p.evaluate(() => { const e = document.getElementById('setReset'); return e && !e.disabled && e.offsetParent !== null; });
  ok(btn, '1 設定の中に「記録をリセット」のボタンがある');
  await p.evaluate(() => document.getElementById('setReset').click()); await p.waitForTimeout(100);
  const c1 = await p.evaluate(() => ({ open: !document.getElementById('rstConf').hidden, foc: document.activeElement && document.activeElement.id, dis: document.getElementById('rcGo').disabled, body: document.getElementById('rcBody').textContent }));
  ok(c1.open && c1.foc === 'rcNo' && c1.dis, '1 確認が出て、既定は「やめる」、「すべて消す」はすぐには押せない ' + JSON.stringify({ open: c1.open, foc: c1.foc, dis: c1.dis }));
  ok(/遠征の続き/.test(c1.body) && /遠征 3回・踏破 2回/.test(c1.body) && /解放/.test(c1.body) && /既読/.test(c1.body) && /設定は、そのまま残ります/.test(c1.body) && /元に戻せません/.test(c1.body), '2 消えるもの・残るものが書いてある：' + c1.body);
  // 7 収まり
  const fit = await p.evaluate(() => { const r = document.querySelector('#rstConf .r-card').getBoundingClientRect(); return { t: r.top, bt: r.bottom, l: r.left, rt: r.right, sw: document.documentElement.scrollWidth }; });
  ok(fit.t >= 0 && fit.bt <= 568 && fit.l >= 0 && fit.rt <= 320 && fit.sw <= 320, '7 320×568 で確認の画面が収まる ' + JSON.stringify(fit));
  // 3 やめる・Esc
  await p.click('#rcNo'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.getElementById('rstConf').hidden && !document.getElementById('settings').hidden), '3 「やめる」で確認だけ閉じる');
  await p.evaluate(() => document.getElementById('setReset').click()); await p.waitForTimeout(100);
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.getElementById('rstConf').hidden && !document.getElementById('settings').hidden), '3 Esc で確認だけ閉じる（設定は開いたまま）');
  const mid = await p.evaluate(DUMP);
  ok(JSON.stringify(mid) === JSON.stringify(before), '3 やめた後、何も消えていない');
  // 4 すべて消す
  await p.evaluate(() => document.getElementById('setReset').click()); await p.waitForTimeout(800);
  await Promise.all([p.waitForNavigation({ timeout: 8000 }).catch(() => null), p.click('#rcGo')]);
  await p.waitForTimeout(600);
  const after = await p.evaluate(DUMP);
  const left = Object.keys(after).filter((k) => /^rb-/.test(k));
  ok(left.every((k) => /^rb-(set|snd|fast|skin|tune|tune-css)$/.test(k)) && after['rb-set'] === before['rb-set'] && after['rb-snd'] === '0' && after['rb-fast'] === '1' && after['other-key'] === 'keep', '4 記録は消え、設定と rb- 以外のキーは残る（残り：' + left.join(',') + '）');
  const cov = await p.evaluate(() => ({ cover: !document.getElementById('cover').hidden, resume: (() => { const e = document.getElementById('resume'); return !!e && !e.hidden && e.offsetParent !== null; })(), q: location.search }));
  ok(cov.cover && !cov.resume && cov.q === '', '4 開き直したタイトルに「続きから」は出ない ' + JSON.stringify(cov));
  ok(!errs.length, '7 ページのエラーなし ' + errs.join(' / '));
  await ctx.close();
  // 5・6 QA
  const c2 = await b.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
  const q = await c2.newPage(); const qerrs = [], logs = []; q.on('pageerror', (e) => qerrs.push(e.message)); q.on('console', (m) => logs.push(m.text()));
  await q.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); localStorage.setItem('rb-stars', '[1]'); } catch (e) { /* */ } }, TIPS);
  const jump = async (s) => { logs.length = 0; await q.goto(base + '?qa&' + s); await q.waitForTimeout(900); return q.evaluate(() => { const R = window.__rb, run = R.run, E = R.enemy; return { phase: R.phase, node: run && run.node, depth: run && run.depth, sq: run && run.sq, name: E && E.name, variant: E && E.variant, party: !!(E && E.party), restUp: E && E.restUp, hp: run ? run.members.map((m) => m.hp / m.max) : [], ids: run ? run.members.map((m) => m.job || m.id) : [] }; }); };
  let s = await jump('ch=3&loc=8&depth=3&foe=lizard&v=eater+starve&hp=60');
  ok(s.phase === 'prep' && s.node === 7 && s.depth === 3 && s.variant === 'eater+starve' && /灯喰いの飢えた/.test(s.name) && s.hp.every((r) => Math.abs(r - 0.6) < 0.05), '6 depth=3・foe=lizard・v=eater+starve・hp=60 が効く ' + JSON.stringify({ phase: s.phase, depth: s.depth, name: s.name, variant: s.variant, hp: s.hp }));
  ok(await q.evaluate(() => document.getElementById('setReset').disabled), '5 QAの中ではリセットのボタンが押せない');
  s = await jump('ch=2&loc=5&foe=chorus&v=none&sq=guard');
  ok(s.node === 4 && !s.party && !s.variant && s.sq === 'guard' && /聖歌の亡霊/.test(s.name + '') , '6 三位一体の地点でも foe=chorus・v=none・sq=guard が効く ' + JSON.stringify({ name: s.name, variant: s.variant, sq: s.sq }));
  s = await jump('ch=1&loc=3&rests=3&foe=lizard');
  ok(s.node === 2 && s.restUp === 3 && !/リザ|lizard/i.test(s.name) && logs.some((l) => /使えない指定.*foe=lizard/.test(l)), '6 主の地点：rests=3 は効き、foe は無視して console に出す ' + JSON.stringify({ name: s.name, restUp: s.restUp }));
  s = await jump('ch=1&loc=2&depth=9&v=armor+layer&hp=0&sq=zzz');
  ok(s.phase === 'prep' && s.node === 1 && s.depth === 1 && s.sq === 'std' && s.hp.every((r) => r === 1) && ['depth=9', 'v=armor+layer', 'hp=0', 'sq=zzz'].every((k) => logs.some((l) => l.includes(k))), '6 正しくない指定は無視してジャンプは続く ' + JSON.stringify({ depth: s.depth, sq: s.sq, variant: s.variant }));
  ok(!qerrs.length, '7 QA：ページのエラーなし ' + qerrs.join(' / '));
  await c2.close();
  // 5 本物は消えていない（QAのページのボタンを無理に押しても）
  const c3 = await b.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' });
  const r = await c3.newPage();
  await r.goto(base); await r.evaluate(() => localStorage.setItem('rb-stars', '[9]'));
  await r.goto(base + '?qa&ch=1&loc=1'); await r.waitForTimeout(700);
  await r.evaluate(() => { const e = document.getElementById('setReset'); e.disabled = false; e.click(); const g = document.getElementById('rcGo'); if (g) { g.disabled = false; g.click(); } }); await r.waitForTimeout(400);
  await r.goto(base); await r.waitForTimeout(200);
  ok(await r.evaluate(() => localStorage.getItem('rb-stars') === '[9]'), '5 QAの中では、ボタンを無理に押しても本物の保存は消えない');
  await c3.close();
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
