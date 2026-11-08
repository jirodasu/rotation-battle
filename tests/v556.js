// v5.5.6 見通しの札の予測と、ターンが終わった後の本当の結果を突き合わせる
// 第1章〜終盤の5地点から始めた戦闘を、維持・回すをでたらめに選んで進め、毎ターン、選ぶ前の札の予測と、終わった後の結果を比べる
// 合格の基準（測る前に決めたもの）：
//  1. ランダムの技が無いターン：敵のHPの予測＝実際。札に出た仲間のHPの予測＝実際（祝福の回復を含む）。予測の無い仲間はHPが減らない
//     （戦闘が終わったターンは、勝利後の回復が入るので仲間のHPは比べない。敵のHPは比べる）
//  2. ランダムの技があるターン：敵のHPが予測とずれたときは、札の敵の行に「?」（運しだい）が出ていた
//  3. 倒しきるターン：被弾を見込んだ仲間は、実際にそのターン打たれている（v5.6.4・QA指摘2）
//  4. ページのエラーなし。突き合わせたターンが30以上
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1}';
let seed = +(process.env.SEED || 7); const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const SNAP = (rot) => { const R = window.__rb, g = rot ? R.previewGrid() : R.grid, L = R.outlook(g, rot, rot);
  const foes = R.enemy.party ? R.enemy.party.filter((F) => F.hp > 0) : [R.enemy];
  return { rot, turn: R.turn, T: L.T ? (L.T.id || 'boss') : null, Thp: L.T ? L.T.hp : null, left: L.left, dealt: L.dealt, party: !!R.enemy.party,
    rules: foes.map((F) => { const a = R.actOf(F); return a ? a.rule + (a.pierce ? '+p' : '') : '-'; }), names: foes.map((F) => F.name),
    hurt: L.hurt.map((h) => ({ uid: h.u.uid, n: h.n, hp: h.u.hp, max: h.u.max, heal: h.heal || 0, d: h.d, ko: h.ko })), foeMaybe: !!L.foeMaybe, logN: R.log.length,
    all: R.grid.flat().filter(Boolean).map((u) => ({ uid: u.uid, hp: u.hp })) }; };
const AFTER = ([Tid, logN]) => { const R = window.__rb, foes = R.enemy.party ? R.enemy.party : [R.enemy]; const T = foes.find((F) => (F.id || 'boss') === Tid);
  const hp = {}; R.run.members.forEach((m) => { hp[m.uid] = m.hp; }); R.grid.flat().filter(Boolean).forEach((u) => { hp[u.uid] = u.hp; });
  return { Thp: T ? T.hp : null, hp, log: R.log.slice(logN) }; };
(async () => {
  const b = await launch(); const rows = [];
  for (const node of [0, 3, 5, 7, 9]) for (let rep = 0; rep < (+process.env.REP || 2); rep++) {
    const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { try { if (!sessionStorage.getItem('s')) { localStorage.clear(); localStorage.setItem('rb-story', '1'); localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); localStorage.setItem('rb-fast', '1'); sessionStorage.setItem('s', '1'); } } catch (e) {} }, TIPS);
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(700);
    if (node > 0) { await p.evaluate((n) => { const o = JSON.parse(localStorage.getItem('rb-exp-save')); o.run.node = n; delete o.battle; localStorage.setItem('rb-exp-save', JSON.stringify(o)); }, node);
      // file:// では読み込み直しで保存が消えることがある（環境の揺れ。v545 と同じ）。消えていたら書き戻して読み込み直す
      { const d = await p.evaluate(() => JSON.stringify(Object.assign({}, localStorage)));
        for (let k = 0; k < 3; k++) { await p.reload(); await p.waitForTimeout(500); const lost = await p.evaluate((d) => { if (localStorage.getItem('rb-exp-save')) return false; const o = JSON.parse(d); Object.keys(o).forEach((x) => localStorage.setItem(x, o[x])); return true; }, d); if (!lost) break; console.log('  （環境）読み込み直しで保存が消えたので書き戻した'); } }
      if (await p.evaluate(() => !document.getElementById('cover').classList.contains('revealed'))) await p.click('#cover'); await p.waitForTimeout(300); await p.click('#resume'); await p.waitForTimeout(900); }
    const i = await p.evaluate(() => Math.max(0, window.__rb.run.choices.findIndex((x) => x.type === 'battle' || x.type === 'boss' || x.type === 'elite')));
    await p.click('#rvCards .rv-card[data-i="' + i + '"]'); await p.click('#rvGo'); await p.waitForTimeout(1200);
    const ch = async () => { for (let k = 0; k < 600; k++) { const s = await p.evaluate(() => ({ ph: window.__rb.phase, end: !document.getElementById('result').hidden || !document.getElementById('runv').hidden, tip: !document.getElementById('tip').hidden }));
      if (s.tip) await p.click('#tipOk').catch(() => {}); if (s.end) return 'end'; if (s.ph === 'choose') return 'choose'; await p.waitForTimeout(40); } return 'stuck'; };
    // 陣立て→開始（開始の見込みも測る）
    let pre = await p.evaluate(() => { const R = window.__rb, L = R.outlook(R.grid, true, false); return null; });
    await p.click('#btnStart');
    for (let t = 0; t < 10; t++) {
      if ((await ch()) !== 'choose') break;
      const canRot = await p.evaluate(() => !document.getElementById('btnRotate').disabled);
      const rot = canRot && rnd() < 0.5;
      const s = await p.evaluate(SNAP, rot);
      await p.click(rot ? '#btnRotate' : '#btnStay');
      await p.waitForTimeout(100);
      const st = await ch();
      const a = await p.evaluate(AFTER, [s.T, s.logN]);
      rows.push({ node, rep, s, a, st });
      if (st !== 'choose') break;
    }
    ok(!errs.length, '3 地点' + (node + 1) + 'の戦闘：ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  await b.close();
  // 判定
  let n = 0; const bad = [];
  for (const { node, s, a, st } of rows) {
    const rnd = s.rules.some((r) => r.startsWith('random')), end = st !== 'choose', issues = [];
    const foeOff = s.Thp != null && a.Thp != null && s.left !== Math.max(0, a.Thp);
    if (foeOff && !(rnd && s.foeMaybe)) issues.push('敵HP 予測' + s.left + ' 実際' + Math.max(0, a.Thp) + (rnd ? '（ランダムなのに「?」が無い）' : ''));
    // v5.6.4：倒しきるターン（戦闘が終わる）も、被弾の見込みを確かめる。見込んだ仲間が実際に打たれていなければ、見込みが悲観的すぎる
    if (!rnd && end && s.left === 0 && a.Thp != null && a.Thp <= 0) {
      for (const h of s.hurt) { if (!a.log.some((l) => l.includes(h.n + 'に') && /ダメージ/.test(l))) issues.push('撃破のターン：' + h.n + 'の被弾 -' + h.d + ' を見込んだが、実際は受けていない'); }
    }
    if (!rnd && !end) {
      for (const h of s.hurt) { const got = a.hp[h.uid], want = Math.max(0, Math.min(h.max, h.hp + h.heal) - h.d); if (got !== want && !(got === undefined && want === 0)) issues.push(h.n + ' 予測' + want + ' 実際' + got); }
      for (const u of s.all) { if (s.hurt.some((h) => h.uid === u.uid)) continue; const got = a.hp[u.uid]; if (got !== undefined && got < u.hp) issues.push('予測なしで被弾 ' + u.uid + ' ' + u.hp + '→' + got); }
    }
    if (issues.length && process.env.DBG) console.log('      ログ：' + a.log.join(' | ') + '\n      予測：' + JSON.stringify(s.hurt) + ' 前 ' + JSON.stringify(s.all));
    n++; if (issues.length) bad.push('地点' + (node + 1) + ' ' + s.turn + 'ターン目 ' + (s.rot ? '回す' : '維持') + ' ' + s.names.join('/') + '（' + s.rules.join('/') + '）：' + issues.join('；'));
  }
  bad.forEach((x) => console.log('    ' + x));
  ok(!bad.length, '1・2 予測と結果が一致（' + n + 'ターン中 不一致 ' + bad.length + '）');
  ok(n >= 30, '3 突き合わせたターン ' + n);
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
