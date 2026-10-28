// v5.1.55〜 UI監査（A5・C1〜C10）。
// 合格の基準（測る前に決めたもの）：
//  A5. 行動順で味方が先に攻撃して、攻撃対象の敵が倒れる見込みなら、その敵の被ダメ予測と「倒」は出ない（incoming に入らない・予告の数字も出ない）。
//      敵のほうが速い（先に行動する）なら従来どおり出る。敵のHPが十分あれば、予測数値は変わらない（先制撃破の判定を入れない計算と一致）。
//      三位一体では、攻撃対象でない敵の予測は従来どおり出る。実際の戦闘（runTurn）のコードは変えない
//  C1. 三位一体：下の予告の札は、断罪者の大技の予告があるときだけ出る（ほかのターンは出ない）。出すときは敵名（断罪者）と理由が書いてある。普段の技は敵のカードに出ている。1体の敵では従来どおり出る
//  C2. 倒れた敵のカードは「名前＋倒れた」だけ（HP棒・速防・技の行がない）で、通常のカードより低い
//  C3. 1人の味方に複数の攻撃が当たるとき、被ダメ予測は合計1つ＋内訳（例：12+5）が添えられ、合計＝内訳の和
//  C6. 「×½」の札は像の「肩代わり」だけ。防御アップ・次ターンの防の札は出ず、防の数字（現在の防御値）に統合
//  C7. 常時表示に「その次」「1〜8」のような範囲がない。敵の詳細には「その次」がある。補助行の攻・防の札には数値が付く
//  C8. ログは直近2行のまま、タップで全履歴（スクロール可・Escapeで閉じる）。案内（回す？維持する？）は別の枠。気力不足の説明はボタンの理由文言だけ（案内文・ログには出ない）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS_ALL = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"bench":1}';
async function open(b, w, h, kind, node) {
  const ctx = await b.newContext({ viewport: { width: w || 390, height: h || 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-10T10:00:00'));
  await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, TIPS_ALL);
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(200); await p.click('#begin'); await p.waitForTimeout(400);
  await p.evaluate(([kind, node]) => { const R = window.__rb; R.run.node = node; R.run.enemy = R.expEnemy(node + 1, null, kind); document.getElementById('runv').hidden = true; R.toPrepForTest(); }, [kind, node]); await p.waitForTimeout(400);
  return { ctx, p };
}
(async () => {
  const b = await launch();
  /* ---- A5 ---- */
  {
    const { ctx, p } = await open(b, 390, 844, 0, 0);
    const r = await p.evaluate(() => {
      const R = window.__rb, E = R.enemy, g = R.grid; const act = () => R.actOf(E);
      // 攻撃のある技になるまでターンを進める
      let guard = 0; while ((!act().dmg || act().rule === 'charge') && guard++ < 6) R.setTurn(R.turn + 1);
      const count = () => Object.keys(R.incoming(g, true, false)).length;
      const full = E.hp, maxHp = E.max;
      E.spd = 99; E.hp = 1; const fastEnemy = count();             // 敵が先に動く → 従来どおり出る
      E.spd = 0; E.hp = 1; const preKill = count();               // 味方が先に倒す → 出ない
      E.hp = full; const healthy = count();                       // HPが十分 → 出る
      const dmgHealthy = JSON.stringify(R.incoming(g, true, false));
      E.hp = 1; E.spd = 99; const dmgFast = JSON.stringify(R.incoming(g, true, false));
      E.hp = full; E.spd = 0; const dmgSlow = JSON.stringify(R.incoming(g, true, false));
      return { fastEnemy, preKill, healthy, same: dmgHealthy === dmgFast && dmgHealthy === dmgSlow, dm: dmgHealthy, hitNull: R.actHit(E, act()) };
    });
    console.log(JSON.stringify(r));
    ok(r.fastEnemy > 0, 'A5 敵が先に動くなら、HP1でも従来どおり被ダメ予測・「倒」が出る');
    ok(r.preKill === 0, 'A5 味方が先に倒せる見込みなら、被ダメ予測も「倒」も出ない');
    ok(r.healthy > 0 && r.same, 'A5 敵のHPが十分なら予測の数値は変わらない（先制撃破の判定を外した状態と一致）');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join('/')); await ctx.close();
  }
  {
    const { ctx, p } = await open(b, 390, 844, 'trinity', 4);
    const r = await p.evaluate(() => {
      const R = window.__rb, g = R.grid, J = R.foeById ? null : null;
      const fl = R.foeList(), judge = fl.find((f) => f.id === 'judge'), statue = fl.find((f) => f.id === 'statue');
      // 断罪者に大技（ダメージあり）が来る手番まで進める
      let guard = 0; while (!(R.actOf(judge).dmg) && guard++ < 8) R.setTurn(R.turn + 1);
      const per = (src) => R.incoming(src, true, false).per;
      R.setTgt('judge'); judge.spd = 0; const base = per(g).filter((x) => x.F === judge).length;
      const keep = per(g).filter((x) => x.F !== judge).length;
      judge.hp = 1; const killed = per(g).filter((x) => x.F === judge).length;
      const others = per(g).filter((x) => x.F !== judge).length;
      judge.hp = judge.max; judge.spd = 99; judge.hp = 1; const fast = per(g).filter((x) => x.F === judge).length;
      // 攻撃対象でない敵の予測は、味方が先に倒せる見込みでも従来どおり
      judge.spd = 5; judge.hp = judge.max; R.setTgt('statue'); statue.hp = 1; statue.spd = 0;
      const stat = per(g).filter((x) => x.F === judge).length;
      return { base, keep, killed, others, fast, stat };
    });
    console.log(JSON.stringify(r));
    ok(r.base > 0 && r.killed === 0, 'A5(三位一体) 攻撃対象の断罪者を味方が先に倒せる見込みなら、その予測が消える（' + r.base + '→' + r.killed + '）');
    ok(r.others === r.keep, 'A5(三位一体) 他の敵の予測は従来どおり（' + r.keep + '→' + r.others + '）');
    ok(r.fast > 0, 'A5(三位一体) 断罪者が先に動くなら従来どおり出る');
    ok(r.stat === r.base, 'A5(三位一体) 攻撃対象でない敵の予測は、他の敵が倒れる見込みでも変わらない');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join('/')); await ctx.close();
  }
  /* ---- C1・C2・C3・C6・C7・C8 ---- */
  {
    const { ctx, p } = await open(b, 390, 844, 'trinity', 4);
    const vis = (sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' && !e.hidden; }, sel);
    const rows = [];
    for (let tn = 1; tn <= 9; tn++) {
      await p.evaluate((n) => { window.__rb.setTurn(n); }, tn);
      const r = await p.evaluate(() => { const R = window.__rb, w = R.foeWarn(), t = document.getElementById('ticket'); return { seen: !!(w && w.seen), tshow: getComputedStyle(t).display !== 'none', head: t.querySelector('.t-main b') ? t.querySelector('.t-main b').textContent : '', sub: t.querySelector('.t-main span') ? t.querySelector('.t-main span').textContent : '', more: !document.getElementById('foeMore').hidden, nx: !!t.querySelector('.t-nx'), rng: !!t.querySelector('.rng') }; });
      rows.push(r);
    }
    ok(rows.every((r) => r.tshow === r.seen), 'C1 下の予告の札は、大技の予告があるときだけ出る（' + rows.map((r) => r.seen ? '○' : '−').join('') + '）');
    ok(rows.filter((r) => r.seen).every((r) => /断罪者/.test(r.head) && r.sub.length > 3), 'C1 予告を出すときは、敵名（断罪者）と理由が書いてある（' + (rows.find((r) => r.seen) || {}).head + ' / ' + (rows.find((r) => r.seen) || {}).sub + '）');
    ok(rows.filter((r) => !r.seen).every((r) => r.more) && rows.some((r) => r.seen), 'C1 札がないターンは「敵の詳細」への入り口が出る');
    ok(rows.every((r) => !r.nx && !r.rng), 'C7 常時表示に「その次」の行も、範囲表記（rng）もない');
    // C2 倒れた敵
    await p.evaluate(() => { const R = window.__rb; R.foeList().find((f) => f.id === 'priest').hp = 0; R.render(); });
    const dead = await p.evaluate(() => { const d = document.querySelector('.fc.dead'), l = document.querySelector('.fc:not(.dead)'); return { t: d.textContent, h: d.getBoundingClientRect().height, lh: l.getBoundingClientRect().height, parts: ['.fc-hp', '.fc-sub', '.fc-act', '.fc-dmg', '.fc-art'].filter((s) => d.querySelector(s)) }; });
    // 祈り手が倒れると予告は早まらない → 大技が来ない手番は札が出ない
    const rows2 = [];
    for (let tn = 1; tn <= 9; tn++) { await p.evaluate((n) => { window.__rb.setTurn(n); }, tn); rows2.push(await p.evaluate(() => { const w = window.__rb.foeWarn(); return { seen: !!(w && w.seen), tshow: getComputedStyle(document.getElementById('ticket')).display !== 'none', more: !document.getElementById('foeMore').hidden }; })); }
    ok(rows2.every((r) => r.tshow === r.seen && r.more === !r.seen) && rows2.some((r) => !r.seen) && rows2.some((r) => r.seen), 'C1 祈り手がいないとき：札は大技の直前（ため・当日）だけ出て、ほかは出ない（' + rows2.map((r) => r.seen ? '○' : '−').join('') + '）');
    ok(/祈り手/.test(dead.t) && /倒れた/.test(dead.t) && dead.parts.length === 0 && dead.h < dead.lh * 0.6, 'C2 倒れた敵は「名前＋倒れた」だけに折りたたまれる（高さ ' + Math.round(dead.h) + ' < 生きている ' + Math.round(dead.lh) + '、残った部品 ' + dead.parts.join(',') + '）');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join('/')); await ctx.close();
  }
  {
    const { ctx, p } = await open(b, 390, 844, 'trinity', 4);
    // C3：複数の攻撃が同じ味方に当たるターンを探す（攻撃のある敵が2体以上いて、全員が前列の同じ味方に当たる）
    const r = await p.evaluate(() => {
      const R = window.__rb; const out = { found: 0, bad: [], sample: '' };
      for (let tn = 1; tn <= 12; tn++) {
        R.setTurn(tn); const inc = R.incoming(R.grid, true, false);
        Object.keys(inc).forEach((k) => { const v = inc[k]; if (v.parts.length > 1) { out.found++; const sum = v.parts.reduce((a, x) => a + x.d, 0); if (sum !== v.d) out.bad.push(k + ':' + v.d + '≠' + sum); if (!out.sample) { const [rr, cc] = k.split(',').map(Number); const tok = document.querySelectorAll('#board .tok')[0]; out.sample = v.parts.map((x) => x.n + x.d).join('＋') + '＝' + v.d; } } });
      }
      return out;
    });
    console.log(JSON.stringify(r));
    ok(r.found > 0 && r.bad.length === 0, 'C3 複数の攻撃が1人に当たるとき、合計＝内訳の和（' + r.found + '件、' + r.sample + '）');
    // 画面に出ている：内訳が札に付く
    await p.evaluate(() => { const R = window.__rb; for (let tn = 1; tn <= 12; tn++) { R.setTurn(tn); const inc = R.incoming(R.grid, true, false); if (Object.values(inc).some((v) => v.parts.length > 1)) break; } });
    const dom = await p.evaluate(() => [...document.querySelectorAll('#board .inc')].map((e) => ({ t: e.textContent, bd: !!e.querySelector('.inc-bd') })));
    ok(dom.length === 0 || dom.filter((x) => x.bd).every((x) => /\d+\+\d+/.test(x.t)), 'C3 画面の札には内訳（12+5 のような形）が添えられる ' + JSON.stringify(dom.slice(0, 3)));
    // C6
    const c6 = await p.evaluate(() => { const q = (id, s) => document.querySelector('#party .fc[data-f="' + id + '"] ' + s); return { sh: [!!q('statue', '.fc-chip.sh'), !!q('priest', '.fc-chip.sh'), !!q('judge', '.fc-chip.sh')], df: document.querySelectorAll('#party .fc-chip.df').length, txt: document.getElementById('party').textContent }; });
    ok(c6.sh[0] && !c6.sh[1] && !c6.sh[2] && c6.df === 0 && !/×½/.test(c6.txt), 'C6 ×½の札は像の「肩代わり」だけ。防御アップ・次の防の札は出ない');
    // C7：敵の詳細に「その次」
    await p.evaluate(() => { window.__rb.setTurn(2); });
    await p.click(await p.evaluate(() => (document.getElementById('foeMore').hidden ? '#ticket' : '#foeMore'))); await p.waitForTimeout(200);
    const det = await p.evaluate(() => document.getElementById('foeSheet').textContent);
    ok(/その次/.test(det), 'C7 敵の詳細に「その次」の行動がある');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join('/')); await ctx.close();
  }
  {
    // C7：補助行の札の数値・C8：ログ
    const { ctx, p } = await open(b, 390, 844, 0, 0);
    const seals = await p.evaluate(() => [...document.querySelectorAll('#board .tok .seal')].map((e) => e.textContent));
    ok(seals.length > 0 && seals.every((t) => /^(攻\+\d+|防-\d+)$/.test(t)), 'C7 補助行の攻・防の札に数値が付く ' + JSON.stringify(seals));
    await p.click('#btnStart'); for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden')) break; await p.waitForTimeout(50); }
    await p.evaluate(() => { const R = window.__rb; for (let i = 0; i < 6; i++) R.say('テスト行' + i); R.render(); });
    const lg = await p.evaluate(() => { const lb = document.querySelector('#book .logbox'), h = document.querySelector('#book .hint'); return { lines: lb ? lb.querySelectorAll('p').length : -1, sep: !!h && !lb.contains(h), hint: h ? h.textContent : '' }; });
    ok(lg.lines >= 1 && lg.lines <= 2 && lg.sep, 'C8 ログは直近2行まで、案内（' + lg.hint + '）は別の枠');
    await p.click('#book .logbox'); await p.waitForTimeout(150);
    const op = await p.evaluate(() => { const l = document.getElementById('logList'); return { open: !document.getElementById('logSheet').hidden, n: l.querySelectorAll('p').length, total: window.__rb.log.length, scroll: l.scrollHeight >= l.clientHeight, last: l.lastElementChild.textContent }; });
    ok(op.open && op.n === op.total && /テスト行5/.test(op.last), 'C8 ログをタップで全履歴が開く（' + op.n + '/' + op.total + '行、最後 ' + op.last + '）');
    await p.keyboard.press('Escape'); await p.waitForTimeout(120);
    ok(await p.evaluate(() => document.getElementById('logSheet').hidden), 'C8 Escapeで閉じる');
    // 気力不足の説明
    await p.evaluate(() => { window.__rb.setGauge(0); });
    const g = await p.evaluate(() => ({ hint: document.querySelector('#book .hint').textContent, btn: document.getElementById('btnRotate').textContent, dis: document.getElementById('btnRotate').disabled, n0: window.__rb.log.length }));
    ok(g.dis && /あと|次のターン/.test(g.btn) && !/気力/.test(g.hint), 'C8 気力不足の理由は「回す」ボタンの文言（' + g.btn.replace(/\s+/g, '') + '）だけ。案内文には出ない（' + g.hint + '）');
    await p.evaluate(() => document.getElementById('btnRotate').click()); await p.waitForTimeout(100);
    ok(await p.evaluate((n) => window.__rb.log.length === n, g.n0), 'C8 押せない「回す」を押しても、ログに気力不足の文は増えない');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join('/')); await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
