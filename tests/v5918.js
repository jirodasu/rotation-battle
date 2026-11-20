// v5.9.18 待機の揺れの作り直し・タイトルの紋章の回転も「背景の動き」オフで止める（2026-11-20 「変えて」「背景の動きも止めて」）
// 合格の基準（測る前に決めたもの）：
//  1 敵の絵・仲間（ちびキャラ）の待機の揺れは、絵（svg）を包む枠（.eart・.tok.cb .disc）で動く。svg 自身には待機の揺れ（bob・cbIdle）が付いていない
//  2 揺れの幅・速さ・ずらし方は以前と同じ：敵は 4.8秒で上へ3px、仲間は 2.4秒で上へ1.5%・縦に1.02倍、仲間ごとのずらし（--cbd）もそのまま
//  3 見た目：揺れのいちばん上で、svg の位置と大きさが以前の作りの計算どおり（敵は上へ3px、仲間は上端が絵の高さの3.42%上・高さ1.02倍）
//  4 力を溜めた敵：光（chg）は svg、揺れは枠で、両方動く。敵が出てくるとき（enter）も揺れが一緒に付く
//  5 「動きを減らす」では、枠の揺れも付かない
//  6 タイトルの紋章の回転（spin・counter）は、背景の動きオンで動き、オフで止まる（paused）
//  7 ページのエラーなし
//  （重さそのものは環境で数字が大きく揺れるので、ここでは合否にしない。計測の結果は CHANGELOG・報告に書く）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"bench":1,"lamp":1,"stayed":1,"mid":1,"highhp":1,"gate":1,"doom":1,"rel":1,"einfo":1}';
async function open(b, q, rm, set) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: rm ? 'reduce' : 'no-preference' }); const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.addInitScript(([t, set]) => { if (localStorage.getItem('rb-tips')) return; localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-story', '1'); if (set) localStorage.setItem('rb-set', set); }, [TIPS, set || '']);
  await p.goto(testPage() + q); await p.waitForTimeout(1500);
  return { ctx, p };
}
const toBattle = async (p) => { await p.click('#btnStart'); for (let k = 0; k < 200; k++) { if (await p.evaluate(() => window.__rb.phase === 'choose')) break; await p.waitForTimeout(80); } await p.waitForTimeout(900); };
const IDLE = () => document.getAnimations().filter((a) => /^(bob|cbIdle|bobW|cbIdleW|chg|enter)$/.test(a.animationName)).map((a) => { const t = a.effect.target; return { n: a.animationName, tag: t.tagName.toLowerCase(), cls: (t.className && t.className.baseVal !== undefined ? t.className.baseVal : t.className) || '', dur: a.effect.getTiming().duration, delay: a.effect.getTiming().delay, kf: a.effect.getKeyframes().map((k) => [k.offset, k.translate || '', k.scale || '', k.transform || ''].join('|')), cbd: getComputedStyle(t).getPropertyValue('--cbd').trim(), s: a.playState }; });
(async () => {
  const b = await launch();
  {
    const { ctx, p } = await open(b, '?qa&ch=1&loc=2');
    await toBattle(p);
    const a = await p.evaluate(IDLE);
    const en = a.filter((x) => x.n === 'bobW'), cb = a.filter((x) => x.n === 'cbIdleW');
    ok(en.length >= 1 && en.every((x) => x.tag === 'div' && /\beart\b/.test(x.cls)) && cb.length >= 3 && cb.every((x) => /\bdisc\b/.test(x.cls)) && !a.some((x) => (x.n === 'bob' || x.n === 'cbIdle') && x.tag === 'svg'),
      '1 待機の揺れは枠（.eart・.disc）で動き、svg 自身には付いていない ' + JSON.stringify([...new Set(a.map((x) => x.n + '@' + x.tag + '.' + x.cls.split(' ')[0]))]));
    const okEn = en.every((x) => x.dur === 4800 && x.kf.join(',') === '0|0px||,0.5|0px -3px||,1|0px||');
    const okCb = cb.every((x) => x.dur === 2400 && x.kf.some((k) => k === '0.5|0px -1.5%|1 1.02|') && Math.abs(x.delay + (+x.cbd || 0) * 1000) < 1);
    ok(okEn && okCb && new Set(cb.map((x) => x.delay)).size >= 2, '2 揺れの幅・速さ・ずらしは以前と同じ ' + JSON.stringify({ en: en[0] && en[0].kf, cb: cb[0] && [cb[0].kf, cb.map((x) => x.delay)] }));
    // 3 揺れのいちばん上（半分の時点）と始まりで、svg の位置・大きさを比べる
    const geo = await p.evaluate(() => {
      const anims = document.getAnimations().filter((x) => x.animationName === 'bobW' || x.animationName === 'cbIdleW');
      anims.forEach((x) => x.pause());
      const rd = () => { const e = document.querySelector('#eart svg').getBoundingClientRect(), c = anims.find((x) => x.animationName === 'cbIdleW').effect.target.querySelector('svg').getBoundingClientRect(); return { et: e.top, eh: e.height, ct: c.top, ch: c.height, cb: c.bottom }; };
      const at = (x, t) => { const T = x.effect.getTiming(); x.currentTime = (((t + T.delay) % T.duration) + T.duration) % T.duration; };   // 遅れ（delay）は負：時刻0より前は「始まる前」扱いになるので、周期の中に折り返して置く
      anims.forEach((x) => at(x, 0)); const r0 = rd();
      anims.forEach((x) => at(x, x.effect.getTiming().duration / 2)); const r1 = rd();
      anims.forEach((x) => x.play());
      return { r0, r1 };
    });
    const { r0, r1 } = geo;
    const eUp = r1.et - r0.et, cUp = r1.ct - r0.ct, cExp = -0.0342 * r0.ch, cH = r1.ch / r0.ch;
    ok(Math.abs(eUp + 3) < 0.6 && Math.abs(r1.eh - r0.eh) < 0.5 && Math.abs(cUp - cExp) < 0.7 && Math.abs(cH - 1.02) < 0.004,
      '3 揺れのいちばん上の位置と大きさは以前の作りの計算どおり ' + JSON.stringify({ 敵上へ: +eUp.toFixed(2), 仲間上へ: +cUp.toFixed(2), 計算: +cExp.toFixed(2), 高さ比: +cH.toFixed(4) }));
    // 4 力を溜めた敵：光は svg、揺れは枠
    await p.evaluate(() => { document.querySelector('.stage').classList.add('charged'); });
    await p.waitForTimeout(200);
    const c = await p.evaluate(IDLE);
    ok(c.some((x) => x.n === 'chg' && x.tag === 'svg' && x.s === 'running') && c.some((x) => x.n === 'bobW' && /\beart\b/.test(x.cls) && x.s === 'running'), '4 力を溜めた敵：光（chg）は svg、揺れは枠で、両方動く ' + JSON.stringify(c.filter((x) => x.n === 'chg' || x.n === 'bobW').map((x) => x.n + '@' + x.tag)));
    await p.evaluate(() => { document.querySelector('.stage').classList.remove('charged'); const a = document.getElementById('eart'); a.classList.remove('enter'); void a.offsetWidth; a.classList.add('enter'); });
    await p.waitForTimeout(100);
    const e = await p.evaluate(IDLE);
    ok(e.some((x) => x.n === 'enter' && /\beart\b/.test(x.cls)) && e.some((x) => x.n === 'bobW' && /\beart\b/.test(x.cls)), '4 敵が出てくるとき（enter）も揺れが一緒に付く ' + JSON.stringify(e.filter((x) => /eart/.test(x.cls)).map((x) => x.n)));
    ok(!p.__errs.length, '7 ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }
  // 5 動きを減らす
  {
    const { ctx, p } = await open(b, '?qa&ch=1&loc=2', true);
    await toBattle(p);
    const a = await p.evaluate(IDLE);
    ok(!a.some((x) => /^(bob|cbIdle|bobW|cbIdleW)$/.test(x.n)) && !p.__errs.length, '5 動きを減らす：枠の揺れも付かない ' + JSON.stringify(a.map((x) => x.n)));
    await ctx.close();
  }
  // 6 タイトルの紋章の回転
  for (const [set, want] of [['', 'running'], [JSON.stringify({ bg: false }), 'paused']]) {
    const { ctx, p } = await open(b, '', false, set);
    const a = await p.evaluate(() => document.getAnimations().filter((x) => x.animationName === 'spin' || x.animationName === 'counter').map((x) => x.animationName + ':' + x.playState));
    ok(a.length >= 1 && a.every((x) => x.endsWith(':' + want)) && !p.__errs.length, '6 タイトルの紋章の回転：背景の動き' + (set ? 'オフ→止まる' : 'オン→動く') + ' ' + JSON.stringify([...new Set(a)]) + p.__errs.join(' / '));
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
