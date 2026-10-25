// スマホの縦画面で、遠征の戦闘画面の下（回す・維持のボタン）が切れないこと。
// iPhone のホーム画面から開いた場合（上下の安全領域を除いた高さ）を含め、名前が長い敵（亜種＋章の主）で確かめる。
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
// [幅, 高さ, 説明]。高さは「画面の高さ − 上の安全領域 − 下の安全領域」の目安
const SIZES = [[430, 839, 'iPhone Pro Max・ホーム画面'], [393, 759, 'iPhone Pro・ホーム画面'], [390, 750, 'iPhone・ホーム画面'], [375, 600, 'iPhone SE（Safari）'], [360, 740, 'Android 小'], [430, 932, 'iPhone Pro Max（安全領域なし）']];
const FOES = [[3, 'poison', 0, 'ハロウィン・章の主（毒）'], [2, 'swarm', 'binder', '群れのしばりネズミ']];
(async () => {
  const b = await launch();
  for (const [w, h, label] of SIZES) for (const [step, vk, foe, fl] of FOES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.clock.setFixedTime(new Date('2026-10-25T12:00:00+09:00'));
    await p.addInitScript(() => { try { localStorage.setItem('rb-skin', 'hw'); localStorage.setItem('rb-tips', '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1}'); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300);
    await p.click('#begin'); await p.waitForTimeout(500);
    await p.evaluate(([step, vk, foe]) => { const R = window.__rb; R.run.node = step - 1; R.run.enemy = R.expEnemy(step, vk, foe); document.getElementById('runv').hidden = true; R.toPrepForTest(); }, [step, vk, foe]);
    await p.waitForTimeout(300);
    await p.click('#btnStart');
    for (let k = 0; k < 80; k++) { if (await p.evaluate(() => !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden')) break; await p.waitForTimeout(150); }
    const m = await p.evaluate(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(); return { vh: innerHeight, rot: Math.round(r('btnRotate').bottom), stay: Math.round(r('btnStay').bottom), name: document.getElementById('ename').textContent }; });
    ok(m.rot <= m.vh && m.stay <= m.vh && !errs.length, `${w}x${h} ${label}・${m.name}：回す・維持のボタンが画面内（下端 ${Math.max(m.rot, m.stay)} / ${m.vh}）`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
