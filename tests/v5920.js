// v5.9.20 突入技の強化の「最大HP+7」は1人につき最初の2回だけ（2026-11-21 Jiro さん承認・A案）
// 合格の基準（測る前に決めたもの）：
//  1. EXP.upHp は 7、EXP.upHpN は 2
//  2. 同じ仲間を4回強化する：1・2回目は札に「最大HP+7」が出て、選ぶと最大HPとHPが7増える
//  3. 3・4回目は札に「最大HP+」が出ず「強化 3回目」「強化 4回目」が出る。選んでも最大HP・HPは変わらない
//  4. 3・4回目も突入技そのものは強くなる（攻撃などの値が1・2回目と同じだけ上がる）
//  5. 3回目以降の記録の文に「最大HP+」が入らない
//  6. ほかの仲間の最大HPは変わらない／ページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { if (!sessionStorage.getItem('s')) { localStorage.setItem('rb-tips', '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1}'); localStorage.setItem('rb-swapdemo', '1'); sessionStorage.setItem('s', '1'); } } catch (e) { /* */ } });
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300);
  const e = await p.evaluate(() => ({ up: window.__rb.EXP.upHp, n: window.__rb.EXP.upHpN }));
  ok(e.up === 7 && e.n === 2, '1 数値：upHp ' + e.up + '・upHpN ' + e.n);
  await p.evaluate(() => { window.__rb.beginExp('std', 1); }); await p.waitForTimeout(500);
  // サムライ（いなければ最初の仲間）を狙う
  const target = await p.evaluate(() => { const r = window.__rb.run, m = r.members.find((x) => x.job === 'samurai') || r.members[0]; return { uid: m.uid, name: m.name }; });
  const snap = () => p.evaluate(() => window.__rb.run.members.map((m) => ({ uid: m.uid, max: m.max, hp: m.hp, e: JSON.stringify([m.entry.atk || 0, m.entry.guard || 0, m.entry.heal || 0, m.entry.teamGuard || 0]) })));
  const steps = [];
  for (let k = 1; k <= 4; k++) {
    let card = null, idx = -1;
    // 章の切れ目（主の後の回復）に入らないよう、毎回、地点を初めに戻す（r.node = 0）
    for (let tr = 0; tr < 60 && idx < 0; tr++) {
      await p.evaluate(() => { const r = window.__rb.run; r.node = 0; r.members.forEach((m) => { m.hp = Math.max(1, m.max - 20); }); document.getElementById('runv').hidden = true; window.__rb.expReward([]); }); await p.waitForTimeout(250);
      const cards = await p.evaluate(() => [...document.querySelectorAll('#rvCards .rv-card')].map((c) => c.textContent));
      idx = cards.findIndex((t) => /突入技の強化/.test(t) && t.includes(target.name)); card = cards[idx];
    }
    if (idx < 0) { ok(false, k + '回目：' + target.name + ' の強化の札が出なかった'); break; }
    const before = await snap();
    await p.click('#rvCards .rv-card[data-i="' + idx + '"]'); await p.waitForTimeout(400);
    const after = await snap(), log = await p.evaluate((nm) => (document.body.innerText.split('\n').find((t) => t.includes(nm + 'の「') && t.includes('強くなった')) || ''), target.name);   // 選んだあとの地図の画面に出る記録の文
    const i = before.findIndex((x) => x.uid === target.uid);
    steps.push({ k, card, dm: after[i].max - before[i].max, dh: after[i].hp - before[i].hp, e0: JSON.parse(before[i].e), e1: JSON.parse(after[i].e), log, others: after.filter((x, j) => j !== i && x.max !== before[j].max).length });
  }
  const s = (k) => steps.find((x) => x.k === k) || {};
  [1, 2].forEach((k) => ok(/最大HP\+7/.test(s(k).card || '') && s(k).dm === 7 && s(k).dh === 7, '2 ' + k + '回目：札に「最大HP+7」・最大HP+' + s(k).dm + '・HP+' + s(k).dh));
  [3, 4].forEach((k) => ok(s(k).card && !/最大HP\+/.test(s(k).card) && s(k).card.includes('強化 ' + k + '回目') && s(k).dm === 0 && s(k).dh === 0, '3 ' + k + '回目：札に最大HPなし・「強化 ' + k + '回目」・最大HP+' + s(k).dm + '・HP+' + s(k).dh + ' ' + (s(k).card || '').slice(0, 70)));
  const gain = (x) => (x.e1 && x.e0 ? x.e1.map((v, j) => v - x.e0[j]).join(',') : '');
  ok(steps.length === 4 && gain(s(3)) === gain(s(1)) && gain(s(4)) === gain(s(1)) && gain(s(1)) !== '0,0,0,0', '4 3・4回目も突入技は1・2回目と同じだけ強くなる ' + steps.map(gain).join(' | '));
  ok(steps.length === 4 && /最大HP\+7/.test(s(1).log) && !/最大HP\+/.test(s(3).log) && !/最大HP\+/.test(s(4).log), '5 記録の文：1回目「' + (s(1).log || '').slice(0, 40) + '」／3回目「' + (s(3).log || '').slice(0, 40) + '」');
  ok(steps.every((x) => x.others === 0) && !errs.length, '6 ほかの仲間の最大HPは変わらない・ページのエラーなし ' + errs.join(' / '));
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
