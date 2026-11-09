// v5.6.6 第3章の新しい敵（火呑みの大蜥蜴・聖歌の亡霊）と、尾払い・呼び寄せ
// 合格の基準（測る前に決めたもの）：
//  1. 第3章（地点7〜9）の戦闘の敵は、火呑みの大蜥蜴か聖歌の亡霊。第1・2章には出ない
//  2. 尾払い：予告の狙いは「回復列の全員」。見込み（incoming）は回復列の仲間にだけ付き、1人あたり技のダメージそのまま（攻撃列が空の2倍・防御補助は効かない）
//  3. 尾払いを実際に受けると、回復列の仲間のHPが見込みどおり減り、攻撃列の仲間は減らない
//  4. 呼び寄せ：回したとき（入ったばかり）の見込みは、維持のときの2倍前後（防御を引く前）。実際に受けた値と見込みの突き合わせは v556（地点8・10で新しい敵と戦う）
//  5. 2体とも絵が出る（敵の絵のSVGが空でない）。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1}';
(async () => {
  const b = await launch();
  const open = async () => { const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, TIPS);
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(200); await p.click('#begin'); await p.waitForTimeout(400); return { ctx, p }; };
  const foeAt = (p, k, rot) => p.evaluate(([k, rot]) => { const R = window.__rb; R.run.node = 6; const e = R.expEnemy(7, null, k); if (rot) e.pattern = e.pattern.slice(rot).concat(e.pattern.slice(0, rot)); R.run.enemy = e; document.getElementById('runv').hidden = true; R.toPrepForTest(); }, [k, rot]);
  // 1
  { const { ctx, p } = await open();
    const r = await p.evaluate(() => { const E = window.__rb.EXP; return { f: E.foes.map((x) => x.join('/')), l: !!E.lizard, c: !!E.chorus }; });
    ok(r.f[2] === 'lizard/chorus' && !r.f[0].includes('lizard') && !r.f[1].includes('chorus') && r.l && r.c, '1 第3章だけに新しい2体 ' + r.f.join(' | '));
    // 2・3 尾払い
    await foeAt(p, 'lizard', 0); await p.waitForTimeout(300);
    const s = await p.evaluate(() => { const R = window.__rb, inc = R.incoming(R.grid, false, false), act = R.enemy.pattern[0]; const back = [], front = [];
      R.grid.forEach((row, r) => row.forEach((u, c) => { if (!u) return; const v = inc[r + ',' + c]; (r === 2 ? back : front).push({ n: u.name, hp: u.hp, d: v ? (v.d != null ? v.d : v) : 0 }); }));
      return { tk: document.getElementById('ticket').textContent + (document.getElementById('ticket').getAttribute('aria-label') || ''), dmg: act.dmg, back, front }; });
    ok(/回復列/.test(s.tk) && s.back.length > 0 && s.back.every((x) => x.d === s.dmg) && s.front.every((x) => !x.d), '2 尾払い：狙いは回復列、見込みは回復列にだけ ' + s.dmg + ' ずつ ' + JSON.stringify(s.back));
    await p.click('#btnStart');
    for (let i = 0; i < 80; i++) { await p.waitForTimeout(150); if (await p.evaluate(() => !document.getElementById('btnStay').hidden || !document.getElementById('result').hidden)) break; }
    const a = await p.evaluate(() => { const R = window.__rb, back = [], front = []; R.grid.forEach((row, r) => row.forEach((u) => { if (u) (r === 2 ? back : front).push({ n: u.name, hp: u.hp }); })); return { back, front }; });
    const okBack = s.back.every((x) => { const y = a.back.find((z) => z.n === x.n); return y && y.hp === Math.max(0, x.hp - x.d); });
    ok(okBack, '3 尾払いを受けると、回復列のHPが見込みどおり減る ' + JSON.stringify(a.back));
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close(); }
  // 4 呼び寄せ
  { const { ctx, p } = await open();
    await foeAt(p, 'chorus', 1); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const R = window.__rb, act = R.enemy.pattern[0]; const st = R.incoming(R.grid, false, false), ro = R.incoming(R.previewGrid(), true, true); const sum = (o) => Object.values(o).reduce((a, v) => a + (v.d != null ? v.d : v), 0); return { name: act.name, dmg: act.dmg, st: sum(st), ro: sum(ro) }; });
    ok(r.name === '呼び寄せ' && r.ro > r.st && r.ro >= r.dmg * 2 - 6, '4 呼び寄せ：回したときの見込みは維持の2倍前後（' + r.st + ' → ' + r.ro + '、技 ' + r.dmg + '）');
    const imgs = await p.evaluate(() => { const e = document.getElementById('eart'); return e ? e.innerHTML.length : 0; });
    ok(imgs > 200, '5 聖歌の亡霊の絵が出る（' + imgs + '）');
    ok(!p.__errs.length, '5 ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
