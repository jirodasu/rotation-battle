// v5.8.22 検証・実装指示書（2026-11-17 23:59）の自動トラック。戦闘の数値・行動順・戦闘後の回復・セーブの鍵は変えていない
// 合格の基準（測る前に決めたもの）：
//  1 予告と実際（項目2・9）：深さ3・深さ4・?deep4・?lamp で、決断パネルの予告（受ける・倒れる・敵の残りHP）と、選んだあとの実際が全ターン一致（運しだいの技・三位一体のターンは除く）。比べたターンは各70以上
//  1b 灯喰いの亜種：仲間が倒れる見込みのターンも、予告の敵の残りHPが実際と一致する（倒れた仲間の灯を喰らう回復を含む）
//  2 地図の札と戦闘（項目12）：深さ1〜4・?lamp・?deep4、休んだ回数0/2、祝福（ward）あり/なしで、地図の札のHPと戦闘のHPが全て一致。画面の札の文字と、入った戦闘の敵パネルの数字も一致
//  3 タイトル横持ち（項目4・6）：844×390・854×384・667×375 で、題字・「-LAST ROTATION-」・キャッチコピーの3つが表示され、互いにも紋とも重ならない。320×568 でチュートリアルの説明が「…」で切れない
//  4 地図の横持ち（項目4）：目標の吹き出しが右の札（道の選択）に重ならない。「？」は札より手前で押せる
//  5 タイトルの導線（項目7・8）：保存なしは「環廊へ」が金（主）、保存ありは「続きから」が金・「環廊へ」は暗い板。設定・物語を開いて閉じるとタイトルに戻り、ボタンが押せる
//  6 戦闘前の「並びを回す」（項目10）：ボタンに「気力いらず」。回しても戦闘開始の気力は同じ
//  7 空列の注意（項目13）：回すと攻撃列が空になる場面で、押す前に「受けるダメージは2倍」の吹き出し（最初の2回）と、読み上げのラベル
//  8 札の数字（項目11）：赤い数字の説明のあと、剣の数字・「あと○発」の説明が1回ずつ、1ターンに1つだけ出る
//  9 どれもページのエラーなし。変えた画面を 320・375・390px で撮る（tests/out/v5822/）
const { launch, testPage, OUT } = require('./_env');
const fs = require('fs'), path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const DIR = path.join(OUT, 'v5822'); fs.mkdirSync(DIR, { recursive: true });
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1,"lamp":1,"rel":1,"stayed":1,"mid":1}';
const W4 = { runs: 5, clears: 4, best: 13, ach: { first: 1, mid: 1 }, won: { 'std:1': 1, 'std:2': 1, 'std:3': 1 } };
async function open(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: o.w || 390, height: o.h || 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  const seed = Object.assign({ 'rb-tips': TIPS, 'rb-swapdemo': '1', 'rb-ending': '1', 'rb-story': '1', 'rb-firstmap': '1', 'rb-teach-inc': '3', 'rb-teach-hold': '1', 'rb-teach-num': '{"dm":1,"n":1}', 'rb-teach-empty': '2' }, o.seed || {});
  await p.addInitScript((s) => { try { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); Object.keys(s).forEach((k) => { if (s[k] == null) localStorage.removeItem(k); else localStorage.setItem(k, s[k]); }); } catch (e) { /* */ } }, seed);
  await p.goto(testPage() + (o.q || '')); await p.waitForTimeout(350); await p.click('#cover').catch(() => {}); await p.waitForTimeout(400);
  return { ctx, p };
}
// 2回目からの遠征は、最初に灯の祝福（1つ選ぶ）が出る。選んで地図へ
const toMap = async (p) => { await p.click('#begin'); await p.waitForTimeout(700); if (await p.evaluate(() => !document.getElementById('runv').classList.contains('is-map'))) { await p.evaluate(() => { const c = document.querySelector('#rvCards .rv-card'); if (c) c.click(); }); await p.waitForTimeout(700); } };
const phaseIs = async (p, list, n) => { for (let i = 0; i < (n || 400); i++) { const x = await p.evaluate(() => window.__rb.phase); if (list.includes(x)) return x; await p.waitForTimeout(30); } return null; };
(async () => {
  const b = await launch();

  /* ---- 1 予告と実際 ---- */
  for (const [cfg, q, depth] of [['深さ3', '', 3], ['深さ4', '', 4], ['?deep4', '?deep4', 1], ['?lamp', '?lamp', 1]]) {
    const { ctx, p } = await open(b, { q, seed: { 'rb-exp': JSON.stringify(W4) } });
    await p.evaluate((d) => { document.getElementById('runv').hidden = true; window.__rb.beginExp('std', d); }, depth); await p.waitForTimeout(300);
    const bad = [], stat = { battles: 0, turns: 0, cmp: 0, ko: 0 };
    for (let n = 0; n < 9; n++) {
      await p.evaluate((n) => { const R = window.__rb; R.run.map = R.expFill(); const ids = Object.keys(R.run.map).filter((id) => R.run.map[id].foe != null && R.routeChoice(id).type === 'battle'); const id = ids[(n * 3) % ids.length]; const c = R.routeChoice(id);
        R.run.members.forEach((m) => { m.hp = m.max; }); R.run.node = c.step - 1; R.run.enemy = R.expEnemy(c.step, c.variant, R.run.map[id].foe); document.getElementById('runv').hidden = true; R.toPrepForTest(); }, n);
      stat.battles++; await p.waitForTimeout(200); await p.click('#btnStart').catch(() => {});
      for (let t = 0; t < 30; t++) {
        if (await phaseIs(p, ['choose', 'over']) !== 'choose') break;
        if (await p.evaluate(() => !document.getElementById('tip').hidden)) { await p.evaluate(() => document.getElementById('tipOk').click()); await p.waitForTimeout(100); continue; }
        const snap = await p.evaluate((rot) => { const R = window.__rb; const useRot = rot && !document.getElementById('btnRotate').disabled;
          const L = useRot ? R.outlook(R.previewGrid(), true, true) : R.outlook(R.grid, false, false);
          const us = R.units().map((x) => x.u); window.__snap = { us };
          return { useRot, skip: L.o.maybe || L.foeMaybe || !!R.enemy.party, hurt: L.hurt.map((h) => ({ n: h.n, d: h.d, heal: h.heal, ko: h.ko, hp: h.u.hp, max: h.u.max })), left: L.left, foe0: R.enemy.hp, hp0: us.map((u) => u.hp), names: us.map((u) => u.name), turn: R.turn }; }, Math.random() < 0.5);
        await p.click(snap.useRot ? '#btnRotate' : '#btnStay').catch(() => {});
        await phaseIs(p, ['choose', 'over'], 600);
        const af = await p.evaluate(() => ({ hp1: window.__snap.us.map((u) => u.hp), foe1: window.__rb.enemy.party ? null : window.__rb.enemy.hp, ph: window.__rb.phase, turn: window.__rb.turn, tip: !document.getElementById('tip').hidden }));
        // 押したときにヒントが開いていて、手が届かなかった（ターンが進んでいない）ときは照合しない（display と同じ。v5.8.17 の学び）
        if (af.ph === 'choose' && af.turn === snap.turn) { stat.noAct = (stat.noAct || 0) + 1; if (af.tip) await p.evaluate(() => document.getElementById('tipOk').click()); continue; }
        stat.turns++;
        if (snap.skip) { if (af.ph === 'over') break; continue; }
        stat.cmp++;
        const won = af.ph === 'over';   // 勝った回は戦闘後の回復が入るので、仲間のHPは比べない（敵の残りHPは比べる）
        snap.hurt.forEach((h) => { const i = snap.names.indexOf(h.n); if (i < 0 || won) return; const pred = Math.max(0, Math.min(h.max, h.hp + (h.heal || 0)) - h.d); if (h.ko) stat.ko++; if (af.hp1[i] !== pred && !(h.ko && af.hp1[i] <= 0)) bad.push(['味方', h.n, '予告' + pred, '実際' + af.hp1[i], 'T' + snap.turn]); });
        snap.names.forEach((nm, i) => { if (!won && !snap.hurt.some((h) => h.n === nm) && af.hp1[i] < snap.hp0[i]) bad.push(['予告なしで減った', nm, snap.hp0[i], af.hp1[i]]); });
        if (af.foe1 != null && af.foe1 !== snap.left) bad.push(['敵', '前' + snap.foe0, '予告' + snap.left, '実際' + af.foe1, 'T' + snap.turn + '→' + af.turn, snap.useRot ? '回す' : '維持']);
        if (won) break;
      }
    }
    ok(bad.length === 0 && stat.cmp >= 70, '1 予告と実際が一致（' + cfg + '）' + JSON.stringify(stat) + (bad.length ? ' 不一致 ' + JSON.stringify(bad.slice(0, 4)) : ''));
    ok(!p.__errs.length, '1 ページのエラーなし（' + cfg + '）' + p.__errs.join(' / ')); await ctx.close();
  }

  /* ---- 1b 灯喰いの：仲間が倒れるターンの「敵 HP」（全テストで見つかった不一致。回復の15%を予告に入れた） ---- */
  { const { ctx, p } = await open(b, { seed: { 'rb-exp': JSON.stringify(W4) } });
    await p.evaluate(() => { document.getElementById('runv').hidden = true; window.__rb.beginExp('std', 3); }); await p.waitForTimeout(300);
    const res = [];
    for (let k = 0; k < 6 && res.length < 3; k++) {
      await p.evaluate((k) => { const R = window.__rb; R.run.map = R.expFill(); const ids = Object.keys(R.run.map).filter((id) => typeof R.run.map[id].foe === 'number' && R.routeChoice(id).type === 'battle'); const id = ids[k % ids.length], c = R.routeChoice(id);
        R.run.members.forEach((m) => { m.hp = m.max; }); R.run.node = c.step - 1; R.run.enemy = R.expEnemy(c.step, 'eater', R.run.map[id].foe); document.getElementById('runv').hidden = true; R.toPrepForTest(); }, k);
      await p.waitForTimeout(200); await p.click('#btnStart').catch(() => {});
      for (let t = 0; t < 12 && res.length < 3; t++) {
        if (await phaseIs(p, ['choose', 'over']) !== 'choose') break;
        if (await p.evaluate(() => !document.getElementById('tip').hidden)) { await p.evaluate(() => document.getElementById('tipOk').click()); await p.waitForTimeout(100); continue; }
        // 狙われる仲間のHPを、このターンで倒れる値まで下げる（数値の計算は変えない。状態だけ作る）
        const s = await p.evaluate(() => { const R = window.__rb; let L = R.outlook(R.grid, false, false); const h = L.hurt.find((x) => x.d > 0 && !x.ko);
          if (h && !L.o.maybe) { h.u.hp = Math.max(1, Math.min(h.u.hp, h.d - 1)); R.render(); L = R.outlook(R.grid, false, false); }
          return { ko: L.hurt.some((x) => x.ko), skip: L.o.maybe || L.foeMaybe, left: L.left, foe0: R.enemy.hp, turn: R.turn, max: R.enemy.max }; });
        await p.click('#btnStay').catch(() => {});
        await phaseIs(p, ['choose', 'over'], 600);
        const a = await p.evaluate(() => ({ hp: window.__rb.enemy.hp, turn: window.__rb.turn, ph: window.__rb.phase, ate: window.__rb.log.some((l) => /灯を喰らった/.test(l)) }));
        if (a.turn === s.turn && a.ph === 'choose') continue;
        if (s.ko && !s.skip) res.push({ foe0: s.foe0, pred: s.left, real: a.hp, ate: a.ate });
        if (a.ph === 'over') break;
      }
    }
    ok(res.length >= 2 && res.every((r) => r.pred === r.real) && res.some((r) => r.ate), '1b 灯喰いの：仲間が倒れるターンも、予告の敵HP＝実際 ' + JSON.stringify(res));
    ok(!p.__errs.length, '1b ページのエラーなし ' + p.__errs.join(' / ')); await ctx.close(); }

  /* ---- 2 地図の札と戦闘のHP ---- */
  for (const [cfg, q, depth] of [['深さ1', '', 1], ['深さ2', '', 2], ['深さ3', '', 3], ['深さ4', '', 4], ['?lamp', '?lamp', 1], ['?deep4', '?deep4', 1]]) {
    const { ctx, p } = await open(b, { q, seed: { 'rb-exp': JSON.stringify(W4) } });
    const r = await p.evaluate((d) => {
      const R = window.__rb, bad = []; let n = 0;
      document.getElementById('runv').hidden = true; R.beginExp('std', d);
      for (let seed = 0; seed < 5; seed++) {
        R.run.map = R.expFill();
        for (const rests of [0, 2]) for (const ward of [false, true]) {
          R.run.chRests = rests; R.run.ward = ward;
          for (const id of Object.keys(R.run.map)) {
            const m = R.run.map[id]; if (m.foe == null) continue;
            const c = R.routeChoice(id); if (c.type !== 'battle') continue;
            const card = R.expCard(c), hp = (card.k.find((x) => x[0] === 'HP') || [])[1];
            R.run.node = c.step - 1; R.run.enemy = R.expEnemy(c.step, c.variant, m.foe); R.toPrepForTest(); n++;
            if (hp !== R.enemy.hp) bad.push([c.step, c.variant, hp, R.enemy.hp, rests, ward]);
          }
        }
      }
      return { n, bad };
    }, depth);
    ok(r.n >= 100 && !r.bad.length, '2 地図の札のHP＝戦闘のHP（' + cfg + '・' + r.n + '件）' + (r.bad.length ? JSON.stringify(r.bad.slice(0, 3)) : ''));
    await ctx.close();
  }
  { // 画面の文字どうし：地図の札の「HP 数字」と、入った戦闘の敵パネルの数字
    const { ctx, p } = await open(b, { seed: { 'rb-exp': JSON.stringify({ runs: 2 }) } });
    await toMap(p);
    const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
    const cardHp = await p.evaluate((i) => { const k = document.querySelector('#rvCards .rv-card[data-i="' + i + '"] .rv-k'); const m = k && k.textContent.match(/HP(\d+)/); return m ? +m[1] : null; }, i);
    await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(900);
    const panel = await p.evaluate(() => ({ hp: window.__rb.enemy.hp, txt: [...document.querySelectorAll('#stage *')].map((e) => e.childNodes.length === 1 && e.childNodes[0].nodeType === 3 ? e.textContent.trim() : '').filter((t) => /^\d+$/.test(t)).map(Number) }));
    ok(cardHp != null && cardHp === panel.hp && panel.txt.includes(cardHp), '2 画面の札のHP ' + cardHp + ' ＝ 戦闘の敵パネル ' + panel.hp);
    ok(!p.__errs.length, '2 ページのエラーなし ' + p.__errs.join(' / ')); await ctx.close();
  }

  /* ---- 3 タイトル（横持ち・狭い画面） ---- */
  for (const [w, h] of [[844, 390], [854, 384], [667, 375]]) {
    const { ctx, p } = await open(b, { w, h });
    const r = await p.evaluate(() => { const g = (s) => { const e = document.querySelector(s); if (!e || getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
      return { title: g('.c-title'), kicker: g('.c-kicker'), tag: g('.c-tag'), o1: g('.o-1 .o-art'), btns: g('.c-btns'), vh: innerHeight }; });
    const sep = (a, c) => a && c && a.b <= c.t + 1;
    ok(r.title && r.kicker && r.tag && sep(r.title, r.kicker) && sep(r.kicker, r.tag) && sep(r.tag, r.o1) && r.tag.r <= r.btns.l, '3 ' + w + '×' + h + ' 題字・副題・キャッチコピーが出て、重ならない ' + JSON.stringify({ k: r.kicker && Math.round(r.kicker.b), tag: r.tag && [Math.round(r.tag.t), Math.round(r.tag.b)], o1: r.o1 && Math.round(r.o1.t) }));
    await p.screenshot({ path: path.join(DIR, 'title_' + w + 'x' + h + '.png') });
    await ctx.close();
  }
  for (const [w, h] of [[320, 568], [375, 667], [390, 844]]) {
    const { ctx, p } = await open(b, { w, h, seed: { 'rb-tut': null } });
    const r = await p.evaluate(() => { const s = document.getElementById('tutSub'); return { cut: s.scrollWidth > s.clientWidth + 1, txt: s.textContent }; });
    ok(!r.cut, '3 ' + w + '×' + h + ' チュートリアルの説明が切れない「' + r.txt + '」');
    await p.screenshot({ path: path.join(DIR, 'title_' + w + 'x' + h + '.png') });
    await ctx.close();
  }

  /* ---- 4 地図の横持ち：目標の吹き出し ---- */
  for (const [w, h] of [[844, 390], [854, 384], [390, 844]]) {
    const { ctx, p } = await open(b, { w, h });
    await p.click('#begin'); await p.waitForTimeout(800);
    const r = await p.evaluate(() => { const v = document.getElementById('runv'); const s = document.getElementById('rvSub').getBoundingClientRect(), c = document.querySelector('#rvCards .rv-card').getBoundingClientRect(), hb = document.getElementById('rvHelp').getBoundingClientRect();
      const top = document.elementFromPoint(hb.left + hb.width / 2, hb.bottom - 3);
      return { goal: v.classList.contains('show-goal'), over: !(s.right <= c.left || s.bottom <= c.top || s.left >= c.right || s.top >= c.bottom), help: !!top && !!top.closest('#rvHelp') }; });
    ok(r.goal && !r.over && r.help, '4 ' + w + '×' + h + ' 目標の吹き出しが札に重ならない・？が押せる ' + JSON.stringify(r));
    await p.screenshot({ path: path.join(DIR, 'map_' + w + 'x' + h + '.png') });
    await ctx.close();
  }

  /* ---- 5 タイトルの導線 ---- */
  { const { ctx, p } = await open(b, { seed: { 'rb-exp-save': null } });
    const gold = (id) => p.evaluate((id) => getComputedStyle(document.getElementById(id)).borderImageSource.includes('btn_gold'), id);
    const s0 = { resume: await p.evaluate(() => !document.getElementById('resume').hidden), begin: await gold('begin') };
    ok(!s0.resume && s0.begin, '5 保存なし：「続きから」は出ず、「環廊へ」が金 ' + JSON.stringify(s0));
    await p.click('#setBtn'); await p.waitForTimeout(300); const so = await p.evaluate(() => !document.getElementById('settings').hidden);
    await p.click('#setClose'); await p.waitForTimeout(300);
    const back1 = await p.evaluate(() => document.getElementById('settings').hidden && !document.getElementById('cover').hidden);
    ok(so && back1, '5 設定を開いて閉じると、タイトルに戻る');
    await p.click('#begin'); await p.waitForTimeout(700); await p.evaluate(() => window.__rb.goTitle()); await p.waitForTimeout(600);
    const s1 = { resume: await p.evaluate(() => !document.getElementById('resume').hidden), rg: await gold('resume'), bg: await gold('begin') };
    ok(s1.resume && s1.rg && !s1.bg, '5 保存あり：「続きから」が金、「環廊へ」は暗い板 ' + JSON.stringify(s1));
    const sb = await p.evaluate(() => !document.getElementById('storyBtn').hidden);
    if (sb) { await p.click('#storyBtn'); await p.waitForTimeout(400); const st = await p.evaluate(() => !document.getElementById('story').hidden); await p.click('#stSkip'); await p.waitForTimeout(500);
      const back2 = await p.evaluate(() => document.getElementById('story').hidden && !document.getElementById('cover').hidden && !document.getElementById('resume').hidden);
      ok(st && back2, '5 物語を開いて「とばす」でタイトルに戻る'); }
    else ok(false, '5 物語のボタンが出ていない');
    await p.click('#resume'); await p.waitForTimeout(700);
    ok(await p.evaluate(() => !!window.__rb.run && document.getElementById('cover').hidden), '5 戻ったあとも「続きから」で再開できる');
    ok(!p.__errs.length, '5 ページのエラーなし ' + p.__errs.join(' / ')); await ctx.close(); }

  /* ---- 6 戦闘前の「並びを回す」 ---- */
  for (const [w, h] of [[320, 568], [375, 667], [390, 844]]) {
    const { ctx, p } = await open(b, { w, h, seed: { 'rb-exp': '{"runs":2}' } });
    await toMap(p);
    const i = await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle'));
    await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.waitForTimeout(200); await p.click('#rvGo'); await p.waitForTimeout(900);
    const r = await p.evaluate(() => { const bt = document.getElementById('btnPrepRot'), s = bt.querySelector('small'), rr = bt.getBoundingClientRect(); return { txt: s && s.textContent, vis: !!s && s.getBoundingClientRect().width > 0, inside: rr.right <= innerWidth && rr.bottom <= innerHeight, cut: s && s.scrollWidth > s.clientWidth + 1 }; });
    ok(r.txt === '気力いらず' && r.vis && r.inside && !r.cut, '6 ' + w + '×' + h + ' 「並びを回す」に「気力いらず」' + JSON.stringify(r));
    await p.screenshot({ path: path.join(DIR, 'prep_' + w + 'x' + h + '.png') });
    if (w === 390) {
      await p.click('#btnPrepRot'); await p.waitForTimeout(700); await p.click('#btnPrepRot'); await p.waitForTimeout(700);
      await p.click('#btnStart'); await phaseIs(p, ['choose', 'over']);
      const g = await p.evaluate(() => window.__rb.gauge);
      ok(g === 3, '6 戦闘前に2回回しても、1ターン目のあとの気力は同じ（' + g + '／開始2＋1）');
    }
    ok(!p.__errs.length, '6 ページのエラーなし ' + p.__errs.join(' / ')); await ctx.close();
  }

  /* ---- 7・8 空列の注意と札の数字 ---- */
  for (const [w, h] of [[320, 568], [375, 667], [390, 844]]) {
    const { ctx, p } = await open(b, { w, h, seed: { 'rb-exp': '{"runs":2}', 'rb-teach-num': null, 'rb-teach-empty': null } });
    await p.click('#begin'); await p.waitForTimeout(700);
    await p.evaluate(() => { const R = window.__rb; const c = R.run.choices.find((x) => x.type === 'battle'); R.run.enemy = R.expEnemy(c.step, null, 1); R.run.members.forEach((m) => { m.max = 300; m.hp = 300; }); document.getElementById('runv').hidden = true; R.toPrepForTest(); });
    await p.waitForTimeout(300);
    await p.evaluate(() => { const R = window.__rb, g = R.grid; for (let c = 0; c < g[1].length; c++) if (g[1][c]) { for (let k = 0; k < g[2].length; k++) if (!g[2][k]) { g[2][k] = g[1][c]; g[1][c] = null; break; } } R.render(); });
    await p.click('#btnStart');
    const seen = [];
    for (let t = 0; t < 4; t++) {
      if (await phaseIs(p, ['choose', 'over']) !== 'choose') break;
      await p.waitForTimeout(700);
      const s = await p.evaluate(() => { const on = [...document.querySelectorAll('.rb-bubble.on')].map((x) => x.id); const e = document.querySelector('#emptyTip.on'), n = document.querySelector('#numTip.on'); return { on, empty: e && e.textContent, num: n && n.textContent, aria: document.getElementById('btnRotate').getAttribute('aria-label'), emptyRow: !window.__rb.previewGrid()[0].some(Boolean) }; });
      seen.push(s);
      if (t === 0) await p.screenshot({ path: path.join(DIR, 'empty_' + w + 'x' + h + '.png') });
      if (t === 2) await p.screenshot({ path: path.join(DIR, 'num_' + w + 'x' + h + '.png') });
      await p.click('#btnStay');
    }
    const em = seen.filter((s) => s.empty), nm = seen.filter((s) => s.num);
    ok(seen.length >= 3 && seen.every((s) => s.emptyRow) && em.length === 2 && /2倍/.test(em[0].empty) && seen.slice(0, 2).every((s) => s.empty) && seen.every((s) => /攻撃列が空になり、受けるダメージ2倍/.test(s.aria)), '7 ' + w + '×' + h + ' 回すと空列になる場面で、押す前に2倍の注意（最初の2回）・読み上げは毎回 ' + JSON.stringify(seen.map((s) => s.on)));
    ok(nm.length >= 1 && /剣の数字/.test(nm[0].num) && seen.every((s) => s.on.length <= 1), '8 ' + w + '×' + h + ' 剣の数字の説明が出る・1ターンに吹き出しは1つ ' + JSON.stringify(nm.map((s) => s.num)));
    ok(!p.__errs.length, '7 ページのエラーなし ' + p.__errs.join(' / ')); await ctx.close();
  }
  { // 8 「あと○発」：剣の数字を覚えたあと、「あと○発」が盤に出たターンに1回だけ
    const { ctx, p } = await open(b, { seed: { 'rb-exp': '{"runs":2}', 'rb-teach-num': '{"dm":1}' } });
    await p.click('#begin'); await p.waitForTimeout(700);
    await p.evaluate(() => { const R = window.__rb; const c = R.run.choices.find((x) => x.type === 'battle'); R.run.enemy = R.expEnemy(c.step, null, 1); R.run.members.forEach((m) => { m.max = 300; m.hp = 40; }); document.getElementById('runv').hidden = true; R.toPrepForTest(); });
    await p.waitForTimeout(300); await p.click('#btnStart');
    let got = null, turns = 0;
    for (let t = 0; t < 6 && !got; t++) {
      if (await phaseIs(p, ['choose', 'over']) !== 'choose') break;
      await p.waitForTimeout(700); turns++;
      got = await p.evaluate(() => { const n = document.querySelector('#numTip.on'); return n ? n.textContent : null; });
      if (got) await p.screenshot({ path: path.join(DIR, 'num2_390x844.png') });
      await p.click('#btnStay');
    }
    const flag = await p.evaluate(() => localStorage.getItem('rb-teach-num'));
    ok(got && /^あと\d+発：この強さの攻撃を、あと\d+回受けると倒れる$/.test(got) && /"n":1/.test(flag), '8 「あと○発」の説明（' + got + '・' + turns + 'ターン目）');
    ok(!p.__errs.length, '8 ページのエラーなし ' + p.__errs.join(' / ')); await ctx.close();
  }

  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
