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
//  C5. 地図の戦闘カードに、本文と同じ内容のピル（章・HP・防・戦闘あり）が付かない（ピル0個）
//  C9. 回す＝常に金の主要（primary）、維持＝常に副次（気力が足りなくても入れ替わらない）。設定のダイアログの閉じる手段は1つ（×なし・「閉じる」）。
//      新規開始の確認は「記録を消して始める」が金（進む）で、やめるが副次。ただし最初にフォーカスが当たるのは「やめる」のまま。詳細（敵・ログ）は右の側面シート
//  C10. 地図のノードに分類の文字ラベルがなく、漢字のアイコンだけ。全快のとき休息カードに「いまのHP」のピルがない。遠征の勝利パネルに「戦果★」の文字がない（大きな★だけ）。
//       突入技の強化カードの本文に仲間の名前が繰り返されない。間接のない味方の詳細に「間接」の行がない。タイトルのチュートリアルに重なるピルがなく、副文に統合
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
  /* ---- C5・C9・C10 ---- */
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
    await p.clock.setFixedTime(new Date('2026-11-10T10:00:00'));
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, TIPS_ALL);
    await p.goto(testPage()); await p.waitForTimeout(300);
    await p.click('#cover'); await p.waitForTimeout(250);
    const tt = await p.evaluate(() => ({ tag: !!document.getElementById('tutTag'), sub: document.getElementById('beginTut').querySelector('small').textContent, pill: !!document.querySelector('#beginTut .tag') }));
    ok(!tt.tag && !tt.pill && /はじめての方/.test(tt.sub), 'C10 タイトルのチュートリアルに重なるピルはなく、副文に統合（' + tt.sub + '）');
    // 設定
    await p.click('#setBtn'); await p.waitForTimeout(200);
    const st = await p.evaluate(() => { const d = document.getElementById('settings'); return { x: !!document.getElementById('setX'), closers: [...d.querySelectorAll('button')].filter((x) => /閉じる/.test(x.textContent + (x.getAttribute('aria-label') || ''))).length }; });
    ok(!st.x && st.closers === 1, 'C9 設定の閉じる手段は1つ（×なし・「閉じる」' + st.closers + '個）');
    await p.click('#setClose'); await p.waitForTimeout(150);
    // 地図
    await p.click('#begin'); await p.waitForTimeout(600);
    const mp = await p.evaluate(() => ({ lb: document.querySelectorAll('#rvTrack text.lb').length, gl: document.querySelectorAll('#rvTrack text.g').length, tags: [...document.querySelectorAll('#rvCards .rv-card')].map((c) => [c.querySelector('b').textContent, [...c.querySelectorAll('.rv-tags em')].map((e) => e.textContent)]) }));
    ok(mp.lb === 0 && mp.gl > 3, 'C10 地図のノードは漢字アイコンのみ（文字ラベル ' + mp.lb + '、アイコン ' + mp.gl + '）');
    const bt = mp.tags.filter((x) => /戦闘/.test(x[0])), rest = mp.tags.filter((x) => /休息/.test(x[0]));
    ok(bt.length > 0 && bt.every((x) => x[1].length === 0), 'C5 戦闘カードにピルがない（' + JSON.stringify(bt.map((x) => x[1])) + '）');
    ok(rest.every((x) => x[1].every((s) => !/いまの.*HP/.test(s))), 'C10 全快のとき休息カードに「いまのHP」のピルがない（' + JSON.stringify(rest.map((x) => x[1])) + '）');
    // v5.1.57：休息カードは、ピルを出さず、本文の一文にまとめる（傷ついているときも）
    const rc = await p.evaluate(() => { const R = window.__rb; const sv = R.run.choices.slice(); R.run.members.forEach((m) => { m.hp = Math.max(1, Math.floor(m.max * 0.89)); }); R.run.choices = [{ type: 'rest', step: R.run.node + 1 }]; R.expShowMap(); const c = document.querySelector('#rvCards .rv-card'); const o = { tags: c.querySelectorAll('.rv-tags em').length, txt: c.textContent }; R.run.members.forEach((m) => { m.hp = m.max; }); R.expShowMap(); const c2 = document.querySelector('#rvCards .rv-card'); o.full = c2.textContent; R.run.choices = sv; R.expShowMap(); return o; });
    ok(rc.tags === 0 && /いまの平均HP 8\d%/.test(rc.txt) && /戦闘も報酬もなく/.test(rc.txt) && !/いまの平均HP/.test(rc.full), '休息カード：ピル0個。傷ついているときは本文に「いまの平均HP」、全快のときは出さない（' + rc.txt.replace(/\s+/g, '') + '）');
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1200);
    // 味方の詳細：間接のない味方
    await p.click('#board .slot[data-r="0"][data-c="0"]'); await p.waitForTimeout(250);
    const pk = await p.evaluate(() => document.getElementById('peek').textContent);
    ok(!/間接/.test(pk) && /素早さ/.test(pk), 'C10 間接のない味方の詳細に「間接」の行がない');
    await p.keyboard.press('Escape');
    // 敵の詳細は右の側面シート
    await p.evaluate(() => document.getElementById('stage').click()); await p.waitForTimeout(350);
    const sh = await p.evaluate(() => { const s = getComputedStyle(document.getElementById('foeSheet')), r = document.getElementById('foeSheet').getBoundingClientRect(); return { pos: s.position, right: Math.round(innerWidth - r.right), top: Math.round(r.top), h: Math.round(r.height), vh: innerHeight, w: Math.round(r.width) }; });
    ok(sh.pos === 'fixed' && sh.right === 0 && sh.top === 0 && sh.h === sh.vh && sh.w <= 440, 'C9 敵の詳細は右から出る側面シート（幅 ' + sh.w + '、高さ ' + sh.h + '）');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    // 回す・維持
    await p.click('#btnStart'); for (let i = 0; i < 400; i++) { if (await p.evaluate(() => !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden')) break; await p.waitForTimeout(50); }
    const bt1 = await p.evaluate(() => ({ r: document.getElementById('btnRotate').className, s: document.getElementById('btnStay').className }));
    await p.evaluate(() => { window.__rb.setGauge(0); });
    const bt2 = await p.evaluate(() => ({ r: document.getElementById('btnRotate').className, s: document.getElementById('btnStay').className, dis: document.getElementById('btnRotate').disabled }));
    ok(/primary/.test(bt1.r) && !/primary|only/.test(bt1.s) && /primary/.test(bt2.r) && !/primary|only/.test(bt2.s) && bt2.dis, 'C9 気力があってもなくても、回す＝主要（金）・維持＝副次。足りないときは「回す」が無効表示（' + bt2.r + ' / ' + bt2.s + '）');
    const gl = await p.evaluate(() => { const b = document.getElementById('btnRotate'), s = getComputedStyle(b), chip = document.getElementById('chipTurn'), gz = chip.querySelector('.gz'); return { bg: s.backgroundImage, dis: b.disabled, why: b.querySelector('.rot-meter small') ? b.querySelector('.rot-meter small').textContent : '', chipTxt: chip.textContent, aria: chip.getAttribute('aria-label'), gzColor: getComputedStyle(gz.querySelector('b')).color, chipColor: s && getComputedStyle(chip).color }; });
    ok(gl.dis && /repeating-linear-gradient/.test(gl.bg) && /rgb\(236, 211, 140\)/.test(gl.bg) && /あと|次/.test(gl.why), '気力不足の回す：金のまま（金の地＋斜線）、理由文言つき（' + gl.why + '）');
    ok(!/回すには/.test(gl.chipTxt + gl.aria) && gl.gzColor === gl.chipColor, 'ヘッダーには気力不足の説明も色の変化もない（' + gl.chipTxt + ' / ' + gl.aria + '）');
    // 報酬：突入技の強化に名前が繰り返されない
    await p.evaluate(() => { const R = window.__rb; R.enemy.hp = 1; R.run.members.forEach((m) => { m.atk = 99; }); });
    await p.click('#btnStay'); for (let i = 0; i < 80; i++) { if (await p.evaluate(() => !document.getElementById('result').hidden)) break; await p.waitForTimeout(150); }
    const wp = await p.evaluate(() => document.querySelector('#result .r-best') ? document.querySelector('#result .r-best').textContent : '');
    ok(!/戦果★/.test(wp) && /受けたダメージ/.test(wp), 'C10 勝利パネルに「戦果★」の文字がない（' + wp + '）');
    await p.click('#next'); await p.waitForTimeout(600);
    let rw = null;
    for (let k = 0; k < 8 && !rw; k++) { rw = await p.evaluate(() => { const c = [...document.querySelectorAll('#rvCards .rv-card')].find((x) => /突入技の強化/.test(x.textContent)); return c ? { t: c.querySelector('b').textContent, d: c.querySelector('.rv-txt > span').textContent, names: window.__rb.run.members.map((m) => m.name) } : null; }); if (!rw) { await p.evaluate(() => { const R = window.__rb; R.expReward([]); }); await p.waitForTimeout(300); } }
    ok(rw && rw.names.some((n) => rw.t.includes(n)) && !rw.names.some((n) => rw.d.includes(n)), 'C10 突入技の強化カード：名前は題だけで、本文に繰り返さない（' + (rw ? rw.t + ' / ' + rw.d : 'カードなし') + '）');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join('/')); await ctx.close();
  }
  {
    // 新規開始の確認
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); p.__errs = [];
    await p.clock.setFixedTime(new Date('2026-11-10T10:00:00'));
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, TIPS_ALL);
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(250); await p.click('#begin'); await p.waitForTimeout(600);
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1200);
    await p.evaluate(() => window.__rb.goTitle()); await p.waitForTimeout(600);
    await p.click('#begin'); await p.waitForTimeout(500);
    const nc = await p.evaluate(() => ({ open: !document.getElementById('newConf').hidden, go: document.getElementById('ncGo').className, no: document.getElementById('ncNo').className, focus: document.activeElement && document.activeElement.id }));
    ok(nc.open && /primary/.test(nc.go) && !/primary/.test(nc.no) && nc.focus === 'ncNo', 'C9 新規確認：「記録を消して始める」が金（進む）、「やめる」が副次。最初のフォーカスは「やめる」のまま（' + nc.go + ' / ' + nc.no + ' / ' + nc.focus + '）');
    await p.close(); await ctx.close();
  }
  /* ---- v5.1.56 石のレーン：隊列の枠は横いっぱい、石の飾り（ひび・四隅・ランタン）つき。マス・操作は変わらない ---- */
  for (const [w, h] of [[390, 844], [320, 568], [844, 390]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
    await p.clock.setFixedTime(new Date('2026-11-10T10:00:00'));
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, TIPS_ALL);
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(250); await p.click('#begin'); await p.waitForTimeout(600);
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1500);
    const L = await p.evaluate(() => {
      const bd = document.getElementById('board'), br = bd.getBoundingClientRect();
      const st = [...bd.querySelectorAll('.strip')].map((s) => { const r = s.getBoundingClientRect(); return { l: r.left, r: r.right, lamps: [...s.querySelectorAll('.lamp')].filter((x) => getComputedStyle(x).display !== 'none').length, cn: s.querySelectorAll('.cn').length, ck: s.querySelectorAll('.ck path').length }; });
      const sl = [...bd.querySelectorAll('.slot')].map((s) => { const r = s.getBoundingClientRect(); return r.left >= st[0].l && r.right <= st[0].r; });
      return { st, sl, bl: br.left, sw: document.documentElement.scrollWidth, iw: innerWidth };
    });
    ok(L.st.length === 3 && L.st.every((s) => s.cn === 4 && s.ck > 5 && s.lamps === 2) && L.sl.every(Boolean) && L.sw <= L.iw, '石のレーン ' + w + '×' + h + '：3本・四隅4つ・ひび・ランタン2つ。マスはレーンの内側で、横にはみ出さない ' + JSON.stringify(L.st[0]));
    const ex = await p.evaluate(() => { const pr = document.getElementById('stage').getBoundingClientRect(), s = document.querySelector('#board .strip').getBoundingClientRect(); return [Math.round(pr.left), Math.round(pr.right), Math.round(s.left), Math.round(s.right)]; });
    ok(Math.abs(ex[2] - ex[0]) <= 8 && Math.abs(ex[3] - ex[1]) <= 8 || w > 600, 'レーンは上の敵パネルとほぼ同じ幅（敵パネル ' + ex[0] + '〜' + ex[1] + '、レーン ' + ex[2] + '〜' + ex[3] + '）');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join('/')); await ctx.close();
  }
  /* ---- v5.1.57 画面のゆれ：戦闘中（編成タイム以外）は、ログの行数や案内の有無で敵パネル・盤の大きさと位置が変わらない ---- */
  for (const foe of ['trinity', 1]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, TIPS_ALL);
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(250); await p.click('#begin'); await p.waitForTimeout(600);
    await p.evaluate((foe) => { const R = window.__rb, c = R.run.choices.find((x) => x.type === 'battle'); R.run.map[c.rid] = { foe, variant: null }; }, foe);
    const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
    await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(1200);
    await p.evaluate(() => { window.__lay = new Set(); setInterval(() => { if (!document.getElementById('btnStart').hidden || !document.getElementById('result').hidden) return; const s = document.querySelector('#board .slot').getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect(); window.__lay.add([Math.round(s.width), Math.round(st.height), Math.round(document.getElementById('book').getBoundingClientRect().height)].join(',')); }, 40); });
    await p.click('#btnStart');
    for (let t = 0; t < 4; t++) { for (let k = 0; k < 300; k++) { if (await p.evaluate(() => !document.getElementById('result').hidden || (!document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden'))) break; await p.waitForTimeout(50); } await p.waitForTimeout(300); if (await p.evaluate(() => !document.getElementById('result').hidden)) break; await p.evaluate((t) => { const b = document.getElementById(t % 2 || document.getElementById('btnRotate').disabled ? 'btnStay' : 'btnRotate'); b.click(); }, t); await p.waitForTimeout(300); }
    const lay = await p.evaluate(() => [...window.__lay]);
    // 最初の1回（編成タイム→戦闘の切り替わり）だけは盤の大きさを合わせ直すので、2種類まで
    ok(lay.length <= 2, 'ゆれ（' + foe + '）：戦闘中の［マスの幅, 敵パネルの高さ, 記録の高さ］が変わらない ' + JSON.stringify(lay));
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join('/')); await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
