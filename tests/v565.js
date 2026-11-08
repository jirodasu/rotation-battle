// v5.6.4 QA指摘の直し（見込み・大技の狙い・数字の位置・運しだい・回せない理由・倒れる念押し）
// 合格の基準（測る前に決めたもの）：
//  1. 大技を「ためている」ターンの予告に「狙い」が出る（HPがいちばん低い仲間／一番前の列の全員 など）
//  2. 戦闘中に出る味方の回復・被弾の数字（.pop.dmg/.pop.heal）は、出た瞬間、その仲間の肖像の上の縁より上（肖像の上から12%より上）にある
//  3. 見込みの札に「?」の文字が出ない（運しだいはサイコロの印と「運」）
//  4. 気力が足りずに回せないとき、理由に「気力」が入る
//  5. 遠征で「倒れる」見込みが出たら、一度だけ「倒れた仲間は、この遠征のあいだ戻らない」の吹き出しが出る（2回目は出ない）
//  6. ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1}';
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript((t) => { try { if (!sessionStorage.getItem('s')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); sessionStorage.setItem('s', '1'); } } catch (e) { /* */ } }, TIPS);
  await p.addInitScript(() => { window.__pops = []; const mo = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (!n.classList || !n.classList.contains('pop') || !/\b(dmg|heal)\b/.test(n.className) || /sub/.test(n.className)) return;
    const y = parseFloat(n.style.top), x = parseFloat(n.style.left); const d = [...document.querySelectorAll('#board .tok .disc')].map((e) => e.getBoundingClientRect()).find((r) => x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 30 && y <= r.bottom);
    if (d) window.__pops.push({ t: n.textContent, top: Math.round(y - d.top), h: Math.round(d.height) }); }))); window.__popMo = mo; });
  await p.goto(testPage()); await p.evaluate(() => window.__popMo.observe(document.getElementById('fx'), { childList: true })); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__rb.beginExp('std', 1); }); await p.waitForTimeout(500);
  // 1 ためのターン：ためる技が来るまで敵の並びをずらして予告を見る
  await p.click('#rvCards .rv-card[data-i="0"]').catch(() => {}); await p.waitForTimeout(300); await p.click('#rvGo').catch(() => {}); await p.waitForTimeout(1000);
  const aim = await p.evaluate(() => { const R = window.__rb; const e = R.expEnemy(3, null, 0); const i = e.pattern.findIndex((a) => a.rule === 'charge'); if (i < 0) return { none: true }; e.pattern = e.pattern.slice(i).concat(e.pattern.slice(0, i)); R.run.enemy = e; document.getElementById('runv').hidden = true; R.toPrepForTest(); return { txt: document.getElementById('ticket') ? document.getElementById('ticket').textContent : '' }; });
  await p.waitForTimeout(400);
  const tk = await p.evaluate(() => (document.getElementById('ticket') || {}).textContent || '');
  ok(aim.none || /狙い/.test(tk), '1 ためのターンの予告に狙い：' + tk);
  // 2〜5 戦う
  let rotDeny = '', sawQ = false, warns = 0;
  for (let i = 0; i < 400; i++) {
    const st = await p.evaluate(() => ({ res: !document.getElementById('result').hidden || !document.getElementById('runv').hidden, prep: !document.getElementById('btnStart').hidden, choose: !document.getElementById('btnStay').hidden && !document.getElementById('btnStay').disabled, dis: document.getElementById('btnRotate').disabled || document.getElementById('btnRotate').hidden || !document.getElementById('btnRotate').offsetParent, why: document.getElementById('btnRotate').dataset.why || '', tip: !document.getElementById('tip').hidden,
      q: [...document.querySelectorAll('#ocStay b, #ocRot b, #ocStart b')].some((b) => b.textContent.includes('?')), warn: !!document.querySelector('#koWarn.on') }));
    if (st.q) sawQ = true; if (st.warn) warns++;
    if (st.tip) { await p.click('#tipOk').catch(() => {}); continue; }
    if (st.res) break;
    if (st.prep) { await p.click('#btnStart'); await p.waitForTimeout(80); continue; }
    if (st.choose) { if (st.dis && st.why && /回せる/.test(st.why)) rotDeny = st.why; await p.evaluate((id) => document.getElementById(id).click(), !st.dis && Math.random() < 0.6 ? 'btnRotate' : 'btnStay'); await p.waitForTimeout(60); continue; }
    await p.waitForTimeout(60);
  }
  const pops = await p.evaluate(() => window.__pops);
  ok(pops.length > 0 && pops.every((x) => x.top <= x.h * 0.12), '2 味方の数字は肖像の上の縁から（' + pops.length + '個） ' + JSON.stringify(pops.filter((x) => x.top > x.h * 0.12).slice(0, 4)));
  ok(!sawQ, '3 見込みの札に「?」の文字が出ない');
  ok(!rotDeny || /気力/.test(rotDeny), '4 回せない理由に「気力」：' + (rotDeny || '（気力不足のターンなし）'));
  // 5 倒れる念押し：その場で「倒れる」見込みを作って確かめる
  const w = await p.evaluate(async () => { const R = window.__rb; document.getElementById('result').hidden = true; document.getElementById('runv').hidden = true; R.beginExp('std', 1); return true; });
  await p.waitForTimeout(500); await p.click('#rvCards .rv-card[data-i="0"]').catch(() => {}); await p.waitForTimeout(300); await p.click('#rvGo').catch(() => {}); await p.waitForTimeout(900);
  const k1 = await p.evaluate(async () => { const R = window.__rb; const b0 = document.getElementById('koWarn'); if (b0) b0.classList.remove('on'); R.grid.flat().filter(Boolean).forEach((u) => { u.hp = 1; }); R.toPrepForTest(); for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 100)); const b = document.getElementById('koWarn'); if (b && b.classList.contains('on')) return { on: true, t: b.textContent }; } const b = document.getElementById('koWarn'); return { on: false, t: b ? b.textContent : '', ko: !!document.querySelector('#ocStart b.ko'), start: !document.getElementById('btnStart').hidden }; });
  const k2 = await p.evaluate(async () => { const b = document.getElementById('koWarn'); if (b) b.classList.remove('on'); const R = window.__rb; R.toPrepForTest(); await new Promise((r) => setTimeout(r, 900)); return { on: !!(b && b.classList.contains('on')) }; });
  ok(k1.on && /戻らない/.test(k1.t) && !k2.on, '5 倒れる見込みで一度だけ念押し ' + JSON.stringify([k1, k2]));
  ok(!errs.length, '6 ページのエラーなし ' + errs.join(' / '));
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
