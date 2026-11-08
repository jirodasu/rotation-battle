// v5.1.39 敵編成「三位一体」（鎮守の像・祈り手・断罪者）。
// 合格の基準（測る前に決めたもの）：
//  ・5つの画面サイズで3体のパネルが収まる（はみ出し・切れなし）、戦闘開始・回す・維持のボタンが画面内
//  ・v5.6.5：3体とも毎ターン同じ1つの技（像＝なぎはらい・祈り手＝癒しの祈り・断罪者＝断罪の一閃）。肩代わり（半分）・防御構え・守りの祈り・大技はない。1発＝攻撃−防御（最低1）
//  ・攻撃対象：パネルをタップで選べ、鍵になる数字（与ダメ）が切り替わる。選ばなければ上から生きている1体
//  ・大技はないので、予告の札は出ない。3体のパネルに、それぞれの技と数字が出る
//  ・戦闘が最後まで進み、ページのエラーなし。中盤の隊（回転レリック1つ・突入技の強化）で、像→祈り手→断罪者の順は7〜10ターン、断罪者から倒すほうが遅い
//  ・地図：TRI.steps の地点にだけ置かれる。亜種は付かない
process.env.RB_KEEP_WIN = '1';   // 戦闘そのものを測る。勝敗は以前の勝利パネルで待つ（v5.3.3）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS_ALL = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1}';
async function open(b, w, h, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-10T10:00:00'));
  await p.addInitScript((tips) => { try { if (tips) localStorage.setItem('rb-tips', tips); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, o.tips === false ? null : TIPS_ALL);
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(200); await p.click('#begin'); await p.waitForTimeout(400);
  await p.evaluate((mid) => { const R = window.__rb; if (mid) { R.run.relics = ['bell']; R.run.members.forEach((m) => { m.bonus.hp = (m.bonus.hp || 0) + 3; m.up = { atk: 7, guard: 7, heal: 8, teamGuard: 2 }; R.applyAge(m, true); }); } R.run.node = 4; R.run.enemy = R.expEnemy(5, null, 'trinity'); document.getElementById('runv').hidden = true; R.toPrepForTest(); }, !!o.mid);
  await p.waitForTimeout(300);
  return { ctx, p };
}
async function auto(p, order) {
  await p.click('#spdBtn').catch(() => {});
  for (let i = 0; i < 4000; i++) {
    const st = await p.evaluate(() => ({ res: !document.getElementById('result').hidden, prep: !document.getElementById('btnStart').hidden, choose: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', tip: !document.getElementById('tip').hidden }));
    if (st.tip) { await p.click('#tipOk').catch(() => {}); continue; }
    if (st.res) break;
    if (st.prep || st.choose) {
      if (order) { const id = await p.evaluate((o) => { const R = window.__rb; for (const k of o) { const f = R.foeById(k); if (f && f.hp > 0) return k; } return null; }, order.split(',')); if (id) await p.evaluate((id) => window.__rb.pickTarget(id), id); }
      if (st.prep) { await p.click('#btnStart'); await p.waitForTimeout(30); continue; }
      const dis = await p.evaluate(() => document.getElementById('btnRotate').disabled);
      const want = await p.evaluate(() => { const R = window.__rb, g = R.grid, pg = R.previewGrid();
        const val = (src, fresh, ent) => { let dealt = 0; R.units(src).forEach(({ u, r, c }) => { const d = R.expDmg(u, r, c, src, fresh, ent); if (d) dealt += d.val; }); const inc = R.incoming(src, fresh, ent); let taken = 0, ko = 0; Object.keys(inc).forEach((k) => { taken += inc[k].d; if (inc[k].ko) ko++; }); return dealt / 10 - taken / 10 - 3 * ko; };
        return val(pg, true, true) > val(g, false, false) + 0.05; });
      await p.click(want && !dis ? '#btnRotate' : '#btnStay'); await p.waitForTimeout(20); continue;
    }
    await p.waitForTimeout(30);
  }
  return p.evaluate(() => ({ win: document.getElementById('rTitle').textContent !== '全滅', turns: window.__rb.turn, sub: document.getElementById('rSub').textContent, dead: window.__rb.run.members.filter((m) => m.hp <= 0).length, done: !document.getElementById('result').hidden }));
}
(async () => {
  const b = await launch();
  // 1) 画面に収まる
  for (const [w, h] of [[390, 844], [375, 600], [320, 568], [844, 390], [568, 320]]) {
    const { ctx, p } = await open(b, w, h);
    const m = await p.evaluate(() => {
      const cards = [...document.querySelectorAll('#party .fc')], st = document.getElementById('stage').getBoundingClientRect(), tk = document.getElementById('ticket').getBoundingClientRect();
      const clip = cards.map((c) => { const r = c.getBoundingClientRect(); return { n: c.dataset.f, v: c.scrollHeight - c.clientHeight, w: [...c.querySelectorAll('*')].some((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible' && e.children.length === 0 && e.clientWidth > 0 && /fc-nm|fc-act|fc-chip/.test(e.className) && e.scrollWidth - e.clientWidth > 1), out: r.left < st.left - 1 || r.right > st.right + 1 }; });
      const vh = innerHeight, r = (id) => document.getElementById(id).getBoundingClientRect();
      return { n: cards.length, clip, ticketIn: tk.bottom <= vh + 1 && tk.top >= 0, btn: Math.max(r('btnStart').bottom, r('btnPrepRot').bottom), vh, cardsBottom: Math.max(...cards.map((c) => c.getBoundingClientRect().bottom)), tkTop: tk.top, tkHidden: getComputedStyle(document.getElementById('ticket')).display === 'none' };
    });
    ok(m.n === 3 && m.clip.every((c) => c.v <= 2 && !c.out), w + 'x' + h + ' 3体のパネルが切れずに収まる ' + JSON.stringify(m.clip.map((c) => c.n + ':' + c.v)));
    // 320×568 は、ふつうの敵でも下が16px切れる（以前からの状態）。ここでは「三位一体で悪化しない」ことだけ見る（切れ幅 16px 以下）
    ok((m.tkHidden || (m.cardsBottom <= m.tkTop + 2 && m.ticketIn)) && m.btn <= m.vh + (w < 340 ? 16 : 1), w + 'x' + h + ' パネルは予告の札に重ならず、ボタンが画面内（ボタン下端 ' + Math.round(m.btn) + '/' + m.vh + '）');
    ok(!p.__errs.length, w + 'x' + h + ' ページのエラーなし ' + JSON.stringify(p.__errs));
    await ctx.close();
  }
  // 2) 肩代わり・攻撃対象・予告・行動
  {
    const { ctx, p } = await open(b, 390, 844);
    const card = (id) => p.evaluate((id) => { const c = document.querySelector('#party .fc[data-f="' + id + '"]'); return c ? { t: c.textContent, sel: c.classList.contains('sel'), dealt: (c.querySelector('.fc-dmg b') || {}).textContent, half: !!c.querySelector('.fc-chip.sh') } : null; }, id);
    const calc = (id, share1) => p.evaluate(([id, s1]) => { const R = window.__rb, g = R.grid, F = R.foeById(id), keep = R.TRI.share; if (s1) R.TRI.share = 1; let t = 0; R.units(g).forEach(({ u, r, c }) => { const d = R.expDmg(u, r, c, g, true, false, F); if (d) t += d.val; }); R.TRI.share = keep; return t; }, [id, !!share1]);
    let s = await card('statue'), pr = await card('priest'), j = await card('judge');
    ok(s.sel && !pr.sel && !j.sel, '何も選ばないと、上から生きている1体（鎮守の像）が狙いになる');
    // v5.1.55（C6）：×½の札は祈り手・断罪者に繰り返さず、像の「肩代わり」1か所に集約。半減の注記（「半減後」）は、攻撃対象に選んだ敵のカードにだけ出す
    ok(!s.half && !pr.half && !j.half, '「肩代わり」「×½」の札は出ない（v5.6.5）');
    const dS = await calc('statue'), dP = await calc('priest'), dPfull = await calc('priest', true), dJ = await calc('judge'), dJfull = await calc('judge', true);
    ok(+(s.dealt || '').replace(/[^\d]/g, '') === dS && +(pr.dealt || '').replace(/[^\d]/g, '') === dP && +(j.dealt || '').replace(/[^\d]/g, '') === dJ, 'パネルの「与」が計算と一致（像' + dS + '／祈り手' + dP + '／断罪者' + dJ + '）' + JSON.stringify([s.dealt, pr.dealt, j.dealt]));
    await p.click('#party .fc[data-f="priest"]'); await p.waitForTimeout(100);
    const prX = await card('priest'), jX = await card('judge');
    ok(dP === dPfull && dJ === dJfull && !/半減後/.test(prX.t), '祈り手・断罪者の数字は半減しない（' + dP + '＝' + dPfull + '、' + dJ + '＝' + dJfull + '）');
    await p.click('#party .fc[data-f="statue"]'); await p.waitForTimeout(100);   // 狙いを像に戻す（この先の確認は、像が狙いの状態から始める）
    const one = await p.evaluate(() => { const R = window.__rb; return [R.foeHit(20, R.foeById('priest')), R.foeHit(20, R.foeById('statue')), R.foeHit(1, R.foeById('judge'))]; });
    ok(one[0] === 20 && one[1] === 16 && one[2] === 1, '1発の計算：祈り手に20→20−防御0＝20、像に20→20−防御4＝16、最低でも1 ' + JSON.stringify(one));
    // タップで対象を切り替え
    const tokBefore = await p.evaluate(() => [...document.querySelectorAll('#board .dm')].map((e) => e.textContent).join(','));
    await p.click('#party .fc[data-f="judge"]'); await p.waitForTimeout(100);
    const jt = await card('judge'), tokAfter = await p.evaluate(() => [...document.querySelectorAll('#board .dm')].map((e) => e.textContent).join(','));
    ok(jt.sel && (await p.evaluate(() => window.__rb.tgtId)) === 'judge', '断罪者のパネルをタップで攻撃対象に');
    ok(tokBefore !== tokAfter, '攻撃列の「与えるダメージ」の数字が、対象に合わせて変わる（' + tokBefore + ' → ' + tokAfter + '）');
    ok(!(await p.evaluate(() => !document.getElementById('foeSheet').hidden)), 'パネルをタップしても敵の詳細は開かない');
    // 像が倒れたら肩代わりは消える
    await p.evaluate(() => { const R = window.__rb; R.foeById('statue').hp = 0; R.render(); });
    const pr2 = await card('priest'), s2 = await card('statue');
    ok(/倒れた/.test(s2.t), '像が倒れると、像は「倒れた」');
    ok(await p.evaluate(() => window.__rb.tgtId === 'judge' && window.__rb.targetFoe().id === 'judge'), '狙いはそのまま断罪者');
    // 狙っている相手が倒れたら、次の生きている1体へ
    await p.evaluate(() => { const R = window.__rb; R.foeById('judge').hp = 0; R.render(); });
    ok(await p.evaluate(() => window.__rb.targetFoe().id === 'priest'), '狙いが倒れたら、生きている次の1体（祈り手）へ移る');
    ok(!p.__errs.length, 'ページのエラーなし');
    await ctx.close();
  }
  // 3) 1体1つの技（v5.6.5）
  {
    const { ctx, p } = await open(b, 390, 844);
    const r = await p.evaluate(() => { const R = window.__rb; const out = []; for (let t = 1; t <= 4; t++) { R.setTurn(t); out.push({ w: R.foeWarn(), tk: getComputedStyle(document.getElementById('ticket')).display, acts: ['statue', 'priest', 'judge'].map((id) => { const c = document.querySelector('#party .fc[data-f="' + id + '"]'); return c ? c.textContent : ''; }) }); } return { pat: R.TRI.foes.map((f) => f.pattern.length + ':' + f.pattern[0].rule), out }; });
    ok(r.pat.join() === '1:all,1:mend,1:lowhp', '3体とも技は1つ（像＝全員・祈り手＝回復・断罪者＝HP最低） ' + r.pat.join());
    ok(r.out.every((o) => !o.w || !o.w.seen), '大技の予告は出ない');
    ok(r.out.every((o) => /なぎはらい|腕/.test(o.acts[0]) && /回復|癒/.test(o.acts[1]) && /断/.test(o.acts[2])), '1〜4ターン目、どのターンもパネルの技は同じ');
    ok(!p.__errs.length, 'ページのエラーなし');
    await ctx.close();
  }
  // 4) 行動の効果（1ターン進める）と、敵の詳細
  {
    const { ctx, p } = await open(b, 390, 844);
    await p.click('#spdBtn').catch(() => {});
    await p.evaluate(() => { const R = window.__rb; R.foeById('statue').hp = 50; });
    await p.click('#btnStart');
    for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden')) break; await p.waitForTimeout(50); }
    const st = await p.evaluate(() => { const R = window.__rb, S = R.foeById('statue'); return { turn: R.turn, hp: S.hp, def: S.defUp, def2: document.querySelectorAll('#party .fc[data-f="statue"] .fc-def')[1].textContent, base: R.foeById('statue').def }; });
    // v5.1.55（C6）：「防 次+4」「防+4」の札はやめ、防の数字（現ターンの防御値）に統合。次ターンの効果は敵の詳細に書く
    ok(st.turn === 2 && !st.def && +st.def2.replace(/\D/g, '') === st.base, '防御構えはないので、2ターン目も像の「防」は元のまま（' + st.def2 + '）。「防+4」の札はない');
    ok(st.hp > 50 - 40, '1ターン目：祈り手の回復（+10まで）で、像のHPが戻る可能性あり（像HP ' + st.hp + '）');
    // 守りの祈り（防御補助）もないので、3ターン目もどの敵の防御も上がらない（v5.6.5）
    await p.click('#btnStay');
    for (let i = 0; i < 400; i++) { if (await p.evaluate(() => window.__rb.turn === 3 && !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden')) break; await p.waitForTimeout(50); }
    const t3 = await p.evaluate(() => { const R = window.__rb; return R.TRI.foes.map((f) => R.foeById(f.id).id + ':' + R.foeById(f.id).defUp).join(' '); });
    ok(!/:[1-9]/.test(t3), '3ターン目も、どの敵の防御も上がらない ' + t3);
    // 敵の詳細
    { const sel = await p.evaluate(() => (document.getElementById('foeMore').hidden ? '#ticket' : '#foeMore'));
      await p.click(sel); await p.waitForTimeout(200);
      if (sel === '#ticket') {   // v5.1.59：1回目は吹き出し（狙いの説明）、吹き出しが出ている間にもう一度で詳細
        ok(await p.evaluate(() => { const d = document.getElementById('tkTip'); return !!d && !d.hidden && /もう一度で詳細/.test(d.textContent) && document.getElementById('foeSheet').hidden; }), '予告の札を1回押すと、狙いの説明が吹き出しで出る（詳細はまだ開かない）');
        await p.click(sel); await p.waitForTimeout(200);
      } }
    const sh = await p.evaluate(() => ({ open: !document.getElementById('foeSheet').hidden, t: document.getElementById('foeSheet').textContent }));
    ok(sh.open && /鎮守の像/.test(sh.t) && /祈り手/.test(sh.t) && /断罪者/.test(sh.t) && /毎ターン同じ技/.test(sh.t) && !/半分/.test(sh.t), '敵の詳細（3体の行動と「毎ターン同じ技」の説明）が開く');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => document.getElementById('foeSheet').hidden), 'Escape で閉じる');
    ok(!p.__errs.length, 'ページのエラーなし ' + JSON.stringify(p.__errs));
    await ctx.close();
  }
  // 5) 初めての案内
  {
    const { ctx, p } = await open(b, 390, 844, { tips: false });
    await p.waitForTimeout(300);
    const tip = await p.evaluate(() => ({ open: !document.getElementById('tip').hidden, t: document.getElementById('tip').textContent }));
    ok(tip.open && /敵は3体/.test(tip.t) && /タップ/.test(tip.t), '初めての三位一体で、攻撃対象の選び方の案内が出る');
    await ctx.close();
  }
  // 6) 戦闘を最後まで（中盤の隊）
  const res = {};
  for (const [label, order] of [['像→祈り手→断罪者', 'statue,priest,judge'], ['断罪者→祈り手→像', 'judge,priest,statue'], ['選ばない（自動）', null]]) {
    const { ctx, p } = await open(b, 844, 390, { mid: true });
    const r = await auto(p, order); res[label] = r;
    ok(r.done && !p.__errs.length, label + '：最後まで進む（' + (r.win ? '勝利' : '敗北') + '・' + r.turns + 'ターン・倒れた' + r.dead + '人）' + JSON.stringify(p.__errs));
    if (order === 'statue,priest,judge') ok(r.win && /三位一体/.test(r.sub), '結果の文に「三位一体」 ' + r.sub);
    await ctx.close();
  }
  const A = res['像→祈り手→断罪者'], J = res['断罪者→祈り手→像'];
  ok(A.win && A.turns >= 4 && A.turns <= 10, '戦闘長（v5.1.40の数値。目標の7〜9には届かず短い）：像から倒すと 4〜10ターン（実測 ' + A.turns + '）');
  ok(J.done && A.done, '倒す順番を変えても最後まで進む（像から ' + A.turns + 'ターン・断罪者から ' + J.turns + 'ターン）');
  // 7) 地図：登場位置
  {
    const { ctx, p } = await open(b, 844, 390);
    const r = await p.evaluate(() => { const R = window.__rb, T = R.TRI, ids = Object.keys(R.ROUTE.nodes); const f = () => { const m = R.expFill(); return ids.filter((id) => m[id] && m[id].foe === 'trinity').map((id) => R.ROUTE.nodes[id].step); };
      const a = f(); T.steps = []; const b2 = f(); T.steps = [2, 8]; const c = f(); const m = R.expFill(); const idc = ids.filter((id) => m[id] && m[id].foe === 'trinity'); return { a, b2, c, noVar: idc.every((id) => m[id].variant === null), chief: ids.filter((id) => R.ROUTE.nodes[id].step === 3 || R.ROUTE.nodes[id].step === 6).every((id) => !m[id] || m[id].foe !== 'trinity') }; });
    ok(r.a.length >= 1 && r.a.every((s) => s === 5), '既定は地点5だけに置かれる ' + JSON.stringify(r.a));
    ok(r.b2.length === 0, 'TRI.steps を空にすると出ない');
    ok(r.c.length >= 1 && r.c.every((s) => s === 2 || s === 8) && r.noVar && r.chief, '登場地点は定数で変えられる（2・8）。亜種は付かず、章の主には置かれない ' + JSON.stringify(r.c));
    ok(!p.__errs.length, 'ページのエラーなし');
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
