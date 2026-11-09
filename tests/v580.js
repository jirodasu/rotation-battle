// v5.8.0 回転レリックを4→12に（提案F）。遠征を重ねるほど、見つかるものが増える
// 合格の基準（測る前に決めたもの）：
//  1. 初めての遠征（記録なし）：報酬・祝福に出る回転レリックは、これまでの4つ（先陣の盾・休息の香・勢いの鐘・不動の構え）だけ
//  2. 遠征1回・最深4：研ぎ石・癒しの杯・守りの外套・静けさの衣が加わる（8つ）。見抜きの眼鏡・古い地図・灯の石・狩人の牙はまだ出ない
//     踏破1回・最深10：12すべて
//  3. 灯の石を手に入れる → 全員の最大HP+6・HPも+6
//  4. 古い地図を持つと、休んでも章の主のHP・威力が上がらない。休息の札にも「そのまま」と出る
//  5. 遠征の終わりに、新しく見つかるようになった回転レリックの名前が出る（初めての遠征の終わり → 研ぎ石・癒しの杯）
//  6. ページのエラーなし
//  （予告と実際のダメージの一致は display の 6、自動対戦との一致は expparity に新しいレリックのケースを足した）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"combo":1,"hmIntro":1,"bench":1}';
const OLD = ['shield', 'incense', 'bell', 'stance'], MID = ['whet', 'cup', 'cloak', 'veil'], LATE = ['lens', 'chart', 'stone', 'fang'];
(async () => {
  const b = await launch();
  const open = async (meta) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(([t, m]) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '9'); if (m) localStorage.setItem('rb-exp', m); } catch (e) { /* */ } }, [TIPS, meta && JSON.stringify(meta)]);
    await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
    return { ctx, p, errs };
  };
  const pool = (p) => p.evaluate(() => window.__rb.relFree().map((x) => x.id).sort().join(','));
  const S = (a) => a.slice().sort().join(',');
  // 1・3・4・5
  { const { ctx, p, errs } = await open(null);
    ok(await pool(p) === S(OLD), '1 初めての遠征：出るのは4つ ' + await pool(p));
    const st = await p.evaluate(() => { const R = window.__rb, b = R.run.members.map((m) => [m.max, m.hp]); R.relGet('stone'); return { b, a: R.run.members.map((m) => [m.max, m.hp]), has: R.run.relics.includes('stone') }; });
    ok(st.has && st.a.every((x, i) => x[0] === st.b[i][0] + 6 && x[1] === st.b[i][1] + 6), '3 灯の石：全員の最大HP+6・HP+6 ' + JSON.stringify(st.b) + '→' + JSON.stringify(st.a));
    const ch = await p.evaluate(() => { const R = window.__rb, h = (r) => { const e = R.expEnemy(3, null, 0, r); return e.hp + '/' + e.pattern.filter((a) => a.dmg).map((a) => a.dmg).join('-'); };
      const without = [h(0), h(3)]; R.run.relics.push('chart'); const withC = [h(0), h(3)]; return { without, withC }; });
    ok(ch.without[0] !== ch.without[1] && ch.withC[0] === ch.withC[1] && ch.withC[0] === ch.without[0], '4 古い地図：休んでも章の主はそのまま ' + JSON.stringify(ch));
    // 休息の札
    const rc = await p.evaluate(() => { const R = window.__rb; R.runShowMap ? 0 : 0; const i = R.run.choices.findIndex((x) => x.type !== 'battle'); return i; });
    if (rc >= 0) { await p.evaluate(() => window.__rb.expShowMap && window.__rb.expShowMap()); await p.waitForTimeout(300);
      const t = await p.evaluate((i) => { const c = document.querySelector('#rvCards .rv-card[data-i="' + i + '"]'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; }, rc);
      ok(/そのまま/.test(t) && !/HP\+5%/.test(t), '4 休息の札に「章の主 そのまま」 ' + t); }
    else ok(true, '4 （最初の分かれ道に休息がない地図。札の文は省略）');
    // 5：遠征の終わり
    await p.evaluate(() => window.__rb.expEnd(false)); await p.waitForTimeout(500);
    const end = await p.evaluate(() => document.getElementById('runv').innerText.replace(/\s+/g, ' '));
    ok(/見つかるようになった回転レリック/.test(end) && /研ぎ石/.test(end) && /癒しの杯/.test(end) && !/守りの外套/.test(end), '5 遠征の終わりに新しいレリックの名前 ' + (end.match(/見つかるようになった[^。]*?」(?!「)/) || [''])[0]);
    ok(!errs.length, '6 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  // 2
  { const { ctx, p, errs } = await open({ runs: 1, best: 4, hist: [{ clear: false, node: 5, fal: 4 }] });
    ok(await pool(p) === S(OLD.concat(MID)), '2 遠征1回・最深4：8つ ' + await pool(p));
    ok(!errs.length, '6 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  { const { ctx, p, errs } = await open({ runs: 3, best: 10, clears: 1, hist: [{ clear: true, node: 10, fal: 1 }] });
    ok(await pool(p) === S(OLD.concat(MID, LATE)), '2 踏破1回：12すべて ' + await pool(p));
    ok(!errs.length, '6 ページのエラーなし ' + errs.join(' / ')); await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
