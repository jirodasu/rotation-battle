// v5.9.8 報酬の画面の文字を減らす（2026-11-19 通しプレイの指摘 5）
// 合格の基準（測る前に決めたもの）：
//  1 札が出せるレリックの報酬は、説明の文を出さず札だけ（強化・手当て・仲間と同じ）
//  2 報酬を選ぶ段では、勝利のまとめ（○ターンで撃破…）が消える。星の段では見える
//  3 札を長押し（0.6秒）すると説明の文の吹き出しが出て、その報酬は選ばれない。ふつうに押すと選ばれる
//  4 報酬を選ぶ段の見えている文字は、v5.9.5 の通しプレイ（平均 約230字）より少ない 170字以内
//  5 320・375・390px で札が画面に収まる。撮る（tests/out/v598_*.png）。ページのエラーなし
process.env.RB_PHASE_HOLD = '1';
const { launch, testPage } = require('./_env');
const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const OUT = path.join(__dirname, 'out');
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"einfo":1,"bench":1}';
const VIS = () => { let n = 0; const w = document.createTreeWalker(document.getElementById('runv'), NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) { const el = t.parentElement, s = t.textContent.replace(/\s+/g, ''); if (!s || !el) continue; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || el.closest('[hidden]')) continue; let a = el, op = 1; while (a) { op *= +getComputedStyle(a).opacity; a = a.parentElement; } if (op < 0.15) continue; n += s.length; } return n; };
(async () => {
  const b = await launch();
  for (const [w, h] of [[390, 844], [375, 667], [320, 568]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); } catch (e) { /* */ } }, TIPS);
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForSelector('#begin', { state: 'visible', timeout: 8000 }); await p.click('#begin'); await p.waitForTimeout(700);
    const tag = w + '×' + h;
    const i = await p.evaluate(() => Math.max(0, window.__rb.run.choices.findIndex((x) => x.type === 'battle')));
    // 地図の段（目標→道）をタップで進めてから道を選ぶ
    for (let k = 0; k < 4 && await p.evaluate(() => !!document.querySelector('#runv .ph-wait')); k++) { await p.mouse.click(w / 2, h * 0.3); await p.waitForTimeout(300); }
    await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(600);
    await p.evaluate(() => { const R = window.__rb; R.enemy.hp = 1; R.run.members.forEach((m) => { m.hp = Math.max(1, m.hp - 8); }); R.grid.forEach((row) => row.forEach((u) => { if (u) u.hp = Math.max(1, u.hp - 8); })); R.render(); });   // 回復の段が出るように、仲間のHPを減らしておく
    await p.click('#btnStart');
    for (let k = 0; k < 120 && await p.evaluate(() => document.getElementById('runv').hidden); k++) { if (await p.evaluate(() => !document.getElementById('btnStay').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden')) await p.click('#btnStay').catch(() => {}); await p.waitForTimeout(150); }
    await p.waitForTimeout(900);
    const s1 = await p.evaluate(() => ({ map: !document.getElementById('runv').hidden, stars: !document.getElementById('rvStars').hidden, sub: (() => { const e = document.getElementById('rvSub'); return getComputedStyle(e).display !== 'none' && e.textContent; })(), wait: !!document.querySelector('#runv .ph-wait') }));
    ok(s1.map && s1.stars && s1.sub && s1.wait, tag + ' 2 星の段：勝利のまとめが見える ' + JSON.stringify(s1));
    for (let k = 0; k < 4 && await p.evaluate(() => !!document.querySelector('#runv .ph-wait')); k++) { await p.mouse.click(w / 2, h * 0.2); await p.waitForTimeout(350); }
    await p.waitForTimeout(500);
    const s2 = await p.evaluate(() => { const cards = [...document.querySelectorAll('#rvCards .rv-card')]; const rel = cards.find((c) => /回転レリック/.test(c.textContent));
      return { sub: getComputedStyle(document.getElementById('rvSub')).visibility, rel: rel ? { d: getComputedStyle(rel.querySelector('.rv-d')).display, tags: !!rel.querySelector('.rv-tags em') } : null, n: cards.length, inView: cards.every((c) => { const r = c.getBoundingClientRect(); return r.right <= innerWidth + 1 && r.left >= -1; }), pick: (document.querySelector('.rv-pick') || {}).textContent };
    });
    const chars = await p.evaluate(VIS);
    ok(s2.sub === 'hidden', tag + ' 2 報酬の段：勝利のまとめは消える');
    ok(!s2.rel || (s2.rel.d === 'none' && s2.rel.tags), tag + ' 1 レリックは札だけ ' + JSON.stringify(s2.rel));
    ok(chars <= 170, tag + ' 4 報酬の段の文字 ' + chars + '字（170字以内）');
    ok(s2.inView, tag + ' 5 札が画面の横に収まる');
    await p.screenshot({ path: path.join(OUT, 'v598_' + w + '.png') });
    // 3 長押し
    const box = await p.evaluate(() => { const c = [...document.querySelectorAll('#rvCards .rv-card.hd')].find((x) => x.querySelector('.rv-d').textContent.trim()); if (!c) return null; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, d: c.querySelector('.rv-d').textContent.trim() }; });
    if (box) {
      await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.waitForTimeout(650);
      const bub = await p.evaluate(() => { const d = document.getElementById('rvDetail'); return d && !d.hidden && d.classList.contains('on') ? d.textContent : null; });
      await p.mouse.up(); await p.waitForTimeout(300);
      const still = await p.evaluate(() => !document.getElementById('runv').hidden && !!document.querySelector('#rvCards .rv-card') && !!document.getElementById('rvCards').__on);
      ok(bub === box.d && still, tag + ' 3 長押しで説明が出て、選ばれない「' + bub + '」');
      await p.screenshot({ path: path.join(OUT, 'v598_lp_' + w + '.png') });
      await p.mouse.click(box.x, box.y); await p.waitForTimeout(600);
      const taken = await p.evaluate(() => !document.getElementById('rvCards').__on || !document.querySelector('.rv-pick'));
      ok(taken, tag + ' 3 ふつうに押すと選ばれる');
    } else ok(false, tag + ' 3 説明を隠した札がない');
    ok(!errs.length, tag + ' 5 ページのエラーなし ' + errs.join(' / '));
    await ctx.close();
  }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
