// v5.6.7 深さ3（亜種を2つ重ねる）と、深さ3だけの亜種（灯喰いの・飢えた・重ね鎧の）
// 合格の基準（測る前に決めたもの）：
//  1. 深さ3は、どれかの隊で深さ2を踏破するまで選べない（選んでも深さ1で始まる）。踏破していれば深さ3で始まる
//  2. 深さ3の地図：ふつうの戦闘の敵は亜種が2つ（「a+b」）。鎧の＋重ね鎧の・群れの＋飢えた の組み合わせは出ない。深さ1・2には深さ3だけの亜種が出ない
//  3. 飢えた：HPが半分を切ると、「ちからをためる」の手番が大技になる（半分以上なら、ためる）
//  4. 重ね鎧の：入ったばかりの仲間の攻撃は防御を無視、ほかは防御を引く
//  5. 灯喰いの：仲間を倒すと、敵のHPが最大の15%回復し、技のダメージが+2
//  6. 亜種が2つの敵は、名前の上に亜種名が小さく出て、320幅で名前がはみ出さない。ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1}';
const DEEP = ['eater', 'starve', 'layer'];
(async () => {
  const b = await launch();
  const open = async (won) => { const ctx = await b.newContext({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
    await p.addInitScript(([t, won]) => { try { if (!sessionStorage.getItem('s')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); if (won) localStorage.setItem('rb-exp', JSON.stringify({ clears: 1, won: { 'std:2': 1 } })); sessionStorage.setItem('s', '1'); } } catch (e) { /* */ } }, [TIPS, won]);
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(200); return { ctx, p }; };
  const mapV = (p) => p.evaluate(() => Object.values(window.__rb.run.map || {}).map((m) => m.variant).filter(Boolean));
  // 1・2（解禁前）
  { const { ctx, p } = await open(false);
    const d = await p.evaluate(() => { window.__rb.beginExp('std', 3); return window.__rb.run.depth; });
    const v1 = await mapV(p);
    await p.evaluate(() => { document.getElementById('runv').hidden = true; window.__rb.beginExp('std', 2); }); const v2 = await mapV(p);
    ok(d === 1, '1 深さ2を踏破していないと、深さ3を選んでも深さ1 (' + d + ')');
    ok(v1.concat(v2).every((k) => !k.includes('+') && !DEEP.includes(k)), '2 深さ1・2には重ねた亜種・深さ3だけの亜種が出ない ' + JSON.stringify(v1.concat(v2)));
    await ctx.close(); }
  // 1・2（解禁後）
  { const { ctx, p } = await open(true);
    let all = [];
    for (let i = 0; i < 6; i++) { const d = await p.evaluate(() => { document.getElementById('runv').hidden = true; window.__rb.beginExp('std', 3); return window.__rb.run.depth; }); if (d !== 3) { all = null; break; } all = all.concat(await mapV(p)); }
    ok(all && all.length > 0, '1 深さ2を踏破していれば深さ3で始まる');
    const ng = ['armor+layer', 'layer+armor', 'swarm+starve', 'starve+swarm'];
    ok(all && all.every((k) => k.split('+').length === 2 && k.split('+')[0] !== k.split('+')[1] && !ng.includes(k)) && all.some((k) => DEEP.some((x) => k.includes(x))), '2 深さ3の敵は亜種が2つ（NGの組み合わせなし） ' + (all || []).slice(0, 6).join(' '));
    // 3 飢えた
    const st = await p.evaluate(() => { const R = window.__rb; R.run.node = 6; const e = R.expEnemy(7, 'starve+poison', 1); R.run.enemy = e; document.getElementById('runv').hidden = true; R.toPrepForTest(); const E = R.enemy, i = E.pattern.findIndex((a) => a.rule === 'charge'); if (i < 0) return { none: true }; R.setTurn(i + 1); const full = R.actOf(E).rule; E.hp = Math.floor(E.max / 2) - 1; const half = R.actOf(E);   /* フックの actOf はいまの手番 */ return { full, half: half.rule, big: !!half.big, dmg: half.dmg }; });
    ok(!st.none && st.full === 'charge' && st.half !== 'charge' && st.big && st.dmg > 0, '3 飢えた：半分を切ると、ためる手番が大技 ' + JSON.stringify(st));
    // 4 重ね鎧の
    const ly = await p.evaluate(() => { const R = window.__rb; const F = { def: 6, layer: true, hp: 10, max: 10 }; return [R.foeHit(20, F, true), R.foeHit(20, F, false), R.foeHit(20, { def: 6, hp: 1, max: 1 }, true)]; });
    ok(ly[0] === 20 && ly[1] === 14 && ly[2] === 14, '4 重ね鎧の：入ったばかりは防御無視（20）、ほかは引く（14）。重ね鎧でなければ引く ' + JSON.stringify(ly));
    // 5 灯喰いの
    const ea = await p.evaluate(async () => { const R = window.__rb; R.run.enemy = R.expEnemy(7, 'eater+armor', 1); R.toPrepForTest(); const E = R.enemy; E.hp = Math.floor(E.max / 2); const hp0 = E.hp, d0 = E.pattern.find((a) => a.dmg).dmg; const u = R.grid[0].find(Boolean); u.hp = 1; const c = R.grid[0].indexOf(u); await R.hitColumn(c, 99); return { hp0, hp1: E.hp, max: E.max, d0, d1: E.pattern.find((a) => a.dmg).dmg, gone: !R.grid[0][c] }; });
    ok(ea.gone && ea.hp1 - ea.hp0 === Math.round(ea.max * 0.15) && ea.d1 === ea.d0 + 2, '5 灯喰いの：仲間を倒すと HP +' + (ea.hp1 - ea.hp0) + '（最大 ' + ea.max + ' の15%）・技 ' + ea.d0 + '→' + ea.d1);
    // 6 名前
    await p.evaluate(() => { const R = window.__rb; R.run.enemy = R.expEnemy(7, 'eater+layer', 1); R.toPrepForTest(); }); await p.waitForTimeout(300);
    const nm = await p.evaluate(() => { const e = document.getElementById('ename'), s = e.querySelector('.e-pre'); const r = s && s.getBoundingClientRect(); return { pre: s ? s.textContent : '', h: r ? r.height : 0, sw: e.scrollWidth, cw: e.clientWidth, top: r ? r.top : -1 }; });
    ok(nm.pre === '灯喰いの重ね鎧の' && nm.h > 0 && nm.top >= 0 && nm.sw <= nm.cw + 1, '6 亜種名が名前の上に小さく出て、名前ははみ出さない ' + JSON.stringify(nm));
    ok(!p.__errs.length, '6 ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
