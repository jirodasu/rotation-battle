// 遠征（本番。4人・3列×2マス・第1章）。以前の騎士団の30年の保存は読まず消さない。戦闘の規則は自動対戦（tools/expsim.mjs）と一致すること
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const sleep = (p, ms) => p.waitForTimeout(ms);
// 戦闘を最後まで：seq[ターン-1] が true なら回す（縛られていれば維持になる）
// 標準的な遊び方：tools/expsim.mjs の SMART と同じ判断（前列が疲れた／次の攻撃で倒れる／前列のHPが半分未満なら回す）
const SM = () => { const R = window.__rb, g = R.grid, e = R.enemy, act = e.pattern[(R.turn - 1) % e.pattern.length];
  const front = []; for (let c = 0; c < R.cols; c++) if (g[0][c]) front.push(g[0][c]);
  if (!front.length) return true; if (front.some((u) => u.staMax > 0 && u.sta <= 0)) return true;
  if (act.dmg) { const d = act.dmg * (act.hits || 1); if (act.rule === 'all' && front.some((u) => u.hp <= act.dmg)) return true; const low = front.reduce((a, b) => (b.hp < a.hp ? b : a)); if (low.hp <= d) return true; }
  return front.reduce((s, u) => s + u.hp / u.max, 0) / front.length < 0.5; };
async function fightSmart(p) {
  for (let i = 0; i < 800; i++) {
    const st = await p.evaluate(() => ({ res: !document.getElementById('result').hidden, prep: !document.getElementById('btnStart').hidden, choose: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', tip: !document.getElementById('tip').hidden, ko: document.querySelectorAll('.inc.ko').length, tired: document.querySelectorAll('#board .slot[data-r="0"] .tok.tired').length, dis: document.getElementById('btnRotate').disabled }));
    if (st.tip) { await p.click('#tipOk').catch(() => {}); continue; }
    if (st.res) return;
    if (st.prep) { await p.click('#btnStart'); await p.waitForTimeout(50); continue; }
    if (st.choose) { const rot = await p.evaluate(SM); await p.click(rot && !st.dis ? '#btnRotate' : '#btnStay'); await p.waitForTimeout(30); continue; }
    await p.waitForTimeout(40);
  }
}
async function fight(p, seq) {
  for (let i = 0; i < 600; i++) {
    const st = await p.evaluate(() => ({ res: !document.getElementById('result').hidden, prep: !document.getElementById('btnStart').hidden, choose: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', tip: !document.getElementById('tip').hidden, turn: window.__rb.run ? 0 : 0 }));
    if (st.tip) { await p.click('#tipOk').catch(() => {}); continue; }
    if (st.res) return;
    if (st.prep) { await p.click('#btnStart'); await sleep(p, 60); continue; }
    if (st.choose) {
      const t = await p.evaluate(() => document.getElementById('chipTurn').textContent.match(/ターン(\d+)/)[1]);
      const rot = !!seq[(+t - 2) % seq.length];
      const dis = await p.evaluate(() => document.getElementById('btnRotate').disabled);
      await p.click(rot && !dis ? '#btnRotate' : '#btnStay'); await sleep(p, 40); continue;
    }
    await sleep(p, 50);
  }
}
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  // 30年モードの途中保存と記録を置いておき、遠征が触らないことを確かめる
  const RUNSAVE = '{"v":"x","rseed":5,"uidSeq":7,"run":{"node":2,"year":7,"members":[{"uid":"m1","name":"A"}]}}', META = '{"runs":3,"clears":1,"won":{"std":1},"ach":{"clear":1},"bought":{},"spent":0,"hist":[]}';
  await p.addInitScript(([a, m]) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('rb-run-save', a); localStorage.setItem('rb-meta', m); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } }, [RUNSAVE, META]);
  await p.goto(testPage()); await sleep(p, 500);
  await p.click('#cover'); await sleep(p, 300);
  const vis = await p.evaluate(() => { const e = document.getElementById('begin'), r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width > 0 && r.bottom <= innerHeight + 2; });
  ok(vis && /遠征/.test(await p.evaluate(() => document.getElementById('beginSub').textContent)), '表紙の「本番モード」が遠征になっている');
  await p.click('#begin'); await sleep(p, 600);
  const s0 = await p.evaluate(() => ({ mode: window.__rb.run.mode, n: window.__rb.run.members.length, cols: window.__rb.cols, slots: document.querySelectorAll('#board .slot').length, title: document.getElementById('rvTitle').textContent, cards: document.querySelectorAll('#rvCards .rv-card').length, ages: [...document.querySelectorAll('#rvRoster small')].map((e) => e.textContent).join(',') }));
  ok(s0.mode === 'exp' && s0.n === 4 && s0.cols === 2 && s0.slots === 6, '遠征は4人・3列×2マスの盤で始まる ' + JSON.stringify([s0.n, s0.cols, s0.slots]));
  ok(/どちらへ/.test(s0.title) && s0.cards === 2, '地図で2つの道（戦闘・休息）から選べる');
  ok(!/歳/.test(s0.ages), '名簿に年齢が出ない（' + s0.ages + '）');
  // 道の1つ目の戦闘を「しばりネズミ」にして進む
  await p.evaluate(() => { const R = window.__rb, c = R.run.choices.find((x) => x.type === 'battle'); R.run.map[c.rid] = { foe: 'binder', variant: null }; });
  await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle')).then((i) => p.click('#rvCards .rv-card[data-i="' + i + '"]'));
  await p.click('#rvGo'); await sleep(p, 700);
  const e1 = await p.evaluate(() => ({ name: window.__rb.enemy.name, binds: window.__rb.enemy.pattern.some((a) => a.rule === 'bind') }));
  ok(/しばりネズミ/.test(e1.name) && e1.binds, '「縛る」敵と戦える（' + e1.name + '）');
  // 縛りのターン：回すボタンが押せない
  await p.click('#btnStart'); let boundSeen = false, tries = 0;
  while (tries++ < 200) {
    const st = await p.evaluate(() => ({ choose: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', bound: !!window.__rb.enemy.bound, dis: document.getElementById('btnRotate').disabled, res: !document.getElementById('result').hidden, tip: !document.getElementById('tip').hidden }));
    if (st.tip) { await p.click('#tipOk').catch(() => {}); continue; }
    if (st.res) break;
    if (st.choose) { if (st.bound) { boundSeen = st.dis; break; } await p.click('#btnStay'); }
    await sleep(p, 50);
  }
  ok(boundSeen, '縛られたターンは「回す」が押せない');
  await fight(p, [false, true]);
  const r1 = await p.evaluate(() => document.getElementById('rTitle').textContent);
  await p.click('#next'); await sleep(p, 500);
  const after = await p.evaluate(() => ({ title: document.getElementById('rvTitle').textContent, cards: [...document.querySelectorAll('#rvCards .rv-card b')].map((e) => e.textContent) }));
  if (/勝利/.test(r1)) {
    ok(/報酬/.test(after.title) && after.cards.length === 3 && after.cards.some((t) => /回転レリック/.test(t)) && after.cards.some((t) => /突入技の強化/.test(t)) && after.cards.some((t) => /手当て/.test(t)), '勝つと報酬が3つ（回転レリック・突入技の強化・手当て）' + JSON.stringify(after.cards));
    await p.click('#rvCards .rv-card[data-i="0"]'); await sleep(p, 500);
    const rl = await p.evaluate(() => window.__rb.run.relics.slice());
    ok(rl.length === 1, '回転レリックを手に入れると持ち物に入る ' + JSON.stringify(rl));
    // 途中保存：別の保存で、30年モードの保存と記録は変わらない
    const sv = await p.evaluate(() => ({ exp: !!localStorage.getItem('rb-exp-save'), main: localStorage.getItem('rb-run-save'), meta: localStorage.getItem('rb-meta') }));
    ok(sv.exp && sv.main === RUNSAVE && JSON.parse(sv.meta).runs === 3, '遠征の途中保存は別の項目で、以前の騎士団の30年の保存・記録は消えない');
    await p.reload(); await sleep(p, 500); await p.click('#cover'); await sleep(p, 300);
    const sub = await p.evaluate(() => (document.getElementById('resume').hidden ? '' : document.getElementById('resumeSub').textContent));
    ok(/遠征/.test(sub), '表紙に遠征の「続きから」が出る（' + sub + '）');
    await p.click('#resume'); await sleep(p, 600);
    const rs = await p.evaluate(() => ({ node: window.__rb.run.node, relics: window.__rb.run.relics.length, cols: window.__rb.cols, slots: document.querySelectorAll('#board .slot').length }));
    ok(rs.node === 1 && rs.relics === 1 && rs.cols === 2 && rs.slots === 6, '再開すると地点・レリック・盤の幅が保たれる ' + JSON.stringify(rs));
  } else ok(false, '1戦目に勝てなかったため、報酬と保存の確認ができない（' + r1 + '）');
  // 第1章を最後まで（3回）：道・報酬はでたらめ。終わりの画面まで止まらずに進み、表示に NaN/undefined が出ない
  let cleared = false;
  for (let k = 0; k < 6 && !(k >= 3 && cleared); k++) {
    await p.evaluate(() => { localStorage.removeItem('rb-exp-save'); window.__rb.goTitle(); }); await sleep(p, 200);
    if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) { await p.click('#cover'); await sleep(p, 200); }
    await p.click('#begin'); await sleep(p, 500);
    let end = '', bad = '';
    for (let i = 0; i < 60 && !end; i++) {
      const st = await p.evaluate(() => ({ rv: !document.getElementById('runv').hidden, title: document.getElementById('rvTitle').textContent, n: document.querySelectorAll('#rvCards .rv-card').length, txt: document.body.innerText }));
      if (/NaN|undefined/.test(st.txt)) { bad = (st.txt.match(/.{0,20}(NaN|undefined).{0,20}/) || [''])[0]; break; }
      if (st.rv && /突破|ここまで/.test(st.title)) { end = st.title; break; }
      if (st.rv) {
        await p.click('#rvCards .rv-card[data-i="' + Math.floor(Math.random() * st.n) + '"]').catch(() => {});
        if (await p.evaluate(() => !!document.getElementById('rvGo'))) await p.click('#rvGo').catch(() => {});
        await sleep(p, 300); continue;
      }
      if (await p.evaluate(() => !document.getElementById('result').hidden)) { await p.click('#next'); await sleep(p, 300); continue; }
      if (k < 2) await fight(p, [Math.random() < 0.5, true, false]); else await fightSmart(p);
    }
    if (/突破/.test(end)) cleared = true;
    ok(!!end && !bad, '第1章を最後まで遊べる（' + (end || '止まった') + (bad ? '　表示に ' + bad : '') + '）');
  }
  ok(cleared, '標準的な遊び方で第1章を突破できる（最大6回のうち）');
  const xm = await p.evaluate(() => JSON.parse(localStorage.getItem('rb-exp') || '{}'));
  ok(xm.runs >= 3, '遠征の回数が別の記録（rb-exp）に残る ' + JSON.stringify(xm));
  // チュートリアルは従来の3列×4マス
  await p.evaluate(() => window.__rb.goTitle()); await sleep(p, 300);
  await p.click('#beginTut'); await sleep(p, 900);
  const m4 = await p.evaluate(() => ({ cols: window.__rb.cols, slots: document.querySelectorAll('#board .slot').length }));
  ok(m4.cols === 4 && m4.slots === 12, '遠征のあとチュートリアルを開くと3列×4マスに戻る ' + JSON.stringify(m4));
  const tel = await p.evaluate(() => JSON.parse(localStorage.getItem('rb-exp') || '{}'));
  ok(Array.isArray(tel.hist) && tel.hist.length >= 3 && tel.hist.every((h) => typeof h.ms === 'number' && h.node >= 1), '遠征ごとに遊んだ時間と到達地点が端末内に残る（' + (tel.hist || []).map((h) => h.node + '地点/' + Math.round(h.ms / 1000) + '秒').join(' ') + '）');
  ok(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs));
  await ctx.close(); await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
