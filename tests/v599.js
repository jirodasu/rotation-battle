// v5.9.9 チュートリアルを短く（2026-11-19 通しプレイの指摘 4）・勢いの鐘は2本撃つ突入技では1本目だけ
// 合格の基準（測る前に決めたもの）：
//  1 チュートリアルで「押して進む」解説（コーチ）は11画面以内。どの解説の本文も40字以内。「解説」（途中で押す説明）は1回も出ない
//  2 戦闘中の気づきは帯で出て、押さなくても3.2秒以内に消える。帯は1行（高さ 60px 以内）で40字以内
//  3 「戦闘開始」の手順では攻撃列に出たサムライの剣の数字が光る。「回す」の手順では点線の矢印が3本出る。手順が終わると両方消える
//  4 チュートリアルを最後（基本はここまで）まで進められる。320・375・390px で撮る（tests/out/v599_*.png）。ページのエラーなし
//  5 勢いの鐘：攻撃列に入る仲間（1人目は2本撃つ突入技、2人目がいれば攻撃+の突入技）で、鐘ありと鐘なしの与えたダメージの差は 入る人数×4（2本とも乗ると、1人目の分が8になる）
const { launch, testPage } = require('./_env');
const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const OUT = path.join(__dirname, 'out');
const ACT = { '仲間を動かす ①': '.slot[data-r="2"][data-c="1"]', '仲間を動かす ②': '.slot[data-r="0"][data-c="1"]', '戦闘開始': '#btnStart', 'まず「維持」': '#btnStay', '回す': '#btnRotate', '敵を調べる': '#ename', '技の一覧': '#cardClose' };
(async () => {
  const b = await launch();
  for (const [w, h] of [[390, 844], [375, 667], [320, 568]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#beginTut'); await p.waitForTimeout(1300);
    const tag = w + '×' + h;
    const coach = [], bands = [], longText = [], noteSeen = []; let glow = null, arrows = null, lastT = '', bandCur = null, finished = false, shotA = false;
    for (let i = 0; i < 700 && !finished; i++) {
      const st = await p.evaluate(() => { const c = document.getElementById('coach'), bd = document.getElementById('tutBand'), sv = document.getElementById('tutArrows');
        const dm = document.querySelector('.slot[data-r="0"][data-c="1"] .dm');
        return { vis: !c.hidden, label: document.getElementById('coStep').textContent, t: document.getElementById('coTitle').textContent, x: document.getElementById('coText').textContent, nx: !document.getElementById('coNext').hidden,
          band: !bd.hidden && bd.classList.contains('on') ? { x: bd.textContent, h: bd.getBoundingClientRect().height } : null,
          glow: document.body.classList.contains('tut-glow') && !!dm && getComputedStyle(dm).filter !== 'none', arrows: !sv.hasAttribute('hidden') && getComputedStyle(sv).display !== 'none' ? sv.querySelectorAll('path[marker-end]').length : 0, ph: window.__rb.phase };
      });
      const now = Date.now();
      if (st.band) { if (!bandCur || bandCur.x !== st.band.x) { bandCur = { x: st.band.x, h: st.band.h, t0: now }; bands.push(bandCur); } bandCur.t1 = now; }
      else if (bandCur) { bandCur.gone = now; bandCur = null; }
      if (st.vis && st.t !== lastT) { lastT = st.t; if (st.label === '解説') noteSeen.push(st.t); else coach.push(st.t); if (st.x.length > 40) longText.push(st.t + ' ' + st.x.length + '字'); }
      if (st.vis && st.t === '戦闘開始' && glow === null) { await p.waitForTimeout(950); glow = await p.evaluate(() => { const dm = document.querySelector('.slot[data-r="0"][data-c="1"] .dm'); return document.body.classList.contains('tut-glow') && !!dm; }); }
      if (st.vis && st.t === '回す' && arrows === null) { await p.waitForTimeout(400); arrows = await p.evaluate(() => { const v = document.getElementById('tutArrows'); return getComputedStyle(v).display === 'none' ? 0 : v.querySelectorAll('path[marker-end]').length; }); /* 見えているときだけ数える（svg は .hidden が効かない） */ await p.screenshot({ path: path.join(OUT, 'v599_' + w + '_rotate.png') }); }
      if (st.band && !shotA) { shotA = true; await p.screenshot({ path: path.join(OUT, 'v599_' + w + '_band.png') }); }
      if (st.vis) {   // 帯は押さない（押さなくても消えることを確かめる）
        if (st.t === '基本はここまで') { await p.screenshot({ path: path.join(OUT, 'v599_' + w + '_end.png') }); await p.click('#coNext').catch(() => {}); finished = true; break; }
        if (ACT[st.t]) await p.click(ACT[st.t]).catch(() => {}); else if (st.nx) await p.click('#coNext').catch(() => {});
      }
      await p.waitForTimeout(100);
    }
    await p.waitForTimeout(400);
    const after = await p.evaluate(() => ({ glow: document.body.classList.contains('tut-glow'), arrows: getComputedStyle(document.getElementById('tutArrows')).display !== 'none', band: !document.getElementById('tutBand').hidden }));
    ok(coach.length <= 11 && !noteSeen.length, tag + ' 1 押して進む解説 ' + coach.length + '画面（11以内）・途中の解説 ' + noteSeen.length + '回 ' + JSON.stringify(coach));
    ok(!longText.length, tag + ' 1 解説の本文は40字以内 ' + JSON.stringify(longText));
    const slow = bands.filter((x) => !x.gone || x.gone - x.t0 > 3200), big = bands.filter((x) => x.h > 60 || x.x.length > 40);
    ok(bands.length >= 3 && !slow.length && !big.length, tag + ' 2 帯 ' + bands.length + '本、押さずに消える ' + JSON.stringify(bands.map((x) => x.x + ' ' + (x.gone ? x.gone - x.t0 : '?') + 'ms')));
    ok(glow === true, tag + ' 3 「戦闘開始」で剣の数字が光る');
    ok(arrows === 3, tag + ' 3 「回す」で点線の矢印が3本（' + arrows + '）');
    ok(finished && !after.glow && !after.arrows && !after.band, tag + ' 4 最後まで進み、光・矢印・帯が残らない ' + JSON.stringify(after));
    ok(!errs.length, tag + ' 4 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  // 5 勢いの鐘
  const dealt = async (relics) => {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('rb-tips', JSON.stringify({ stars: 1, gauge: 1, bind: 1, entry: 1, charge: 1, pierce: 1, stamina: 1, trinity: 1, bench: 1, combo: 1, hmIntro: 1, lamp: 1, stayed: 1, mid: 1, highhp: 1, gate: 1, doom: 1, rel: 1, einfo: 1 })); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } });
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(200); await p.click('#begin'); await p.waitForTimeout(600);
    const bi = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
    for (let k = 0; k < 4 && await p.evaluate(() => !!document.querySelector('#runv .ph-wait')); k++) { await p.mouse.click(422, 120); await p.waitForTimeout(250); }
    await p.click('#rvCards .rv-card[data-i="' + bi + '"]'); await p.click('#rvGo'); await p.waitForTimeout(600);
    const who = await p.evaluate((rel) => { const R = window.__rb; R.run.relics = rel.slice(); R.enemy.hp = R.enemy.max = 9999; R.enemy.def = 0;
      const mid = R.grid[1].filter(Boolean); mid[0].entry = { name: '速射', hits: 1, desc: '' }; if (mid[1]) mid[1].entry = { name: '雷撃', atk: 5, desc: '' };
      R.render(); return mid.map((u) => u.name); }, relics);
    await p.click('#btnStart');
    let hp0 = null, hp1 = null;
    for (let i = 0; i < 400; i++) {
      const st = await p.evaluate(() => ({ choose: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', hp: window.__rb.enemy.hp, tip: !document.getElementById('tip').hidden }));
      if (st.tip) { await p.click('#tipOk').catch(() => {}); continue; }
      if (st.choose) { if (hp0 === null) { hp0 = st.hp; await p.evaluate(() => window.__rb.setGauge(3)); await p.click('#btnRotate'); await p.waitForTimeout(50); continue; } hp1 = st.hp; break; }
      await p.waitForTimeout(40);
    }
    await ctx.close();
    return { who, d: hp0 !== null && hp1 !== null ? hp0 - hp1 : null, errs };
  };
  const a = await dealt([]), c = await dealt(['bell']);
  ok(a.d !== null && c.d !== null && c.d - a.d === 4 * a.who.length, '5 鐘ありと鐘なしの差 ' + (c.d - a.d) + '（入る' + a.who.length + '人×4＝' + 4 * a.who.length + '。1人目は2本撃つ突入技）：入る ' + a.who.join('・') + '／鐘なし ' + a.d + '・鐘あり ' + c.d);
  ok(!a.errs.length && !c.errs.length, '5 ページのエラーなし ' + a.errs.concat(c.errs).join(' / '));
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
