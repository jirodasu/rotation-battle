// でたらめな操作で本番（遠征）を何度も通しで遊び、ページエラー・止まり・状態の矛盾を探す。
//   node tests/fuzz.js [ラン数=6] [seed=1]
// 演出は「動きを減らす」設定で短縮して速く回す。画面サイズは横・縦・PCを順に使う。
const { launch, testPage, OUT } = require('./_env');
const fs = require('fs'), path = require('path');
const RUNS = +(process.argv[2] || 6);
let seed = +(process.argv[3] || 1);
const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const SIZES = [[844, 390, true], [390, 844, true], [1280, 720, false], [667, 375, true], [800, 600, false]];

// ゲームの状態の矛盾を調べる（ページの中で実行）
const INVARIANTS = () => {
  const R = window.__rb, run = R.run, bad = [];
  if (!run) return bad;
  const ids = new Set();
  run.members.forEach((m) => {
    if (ids.has(m.uid)) bad.push('団員の重複 ' + m.name); ids.add(m.uid);
    if (!(m.hp >= 0) || !(m.hp <= m.max)) bad.push(m.name + ' のHPが範囲外 ' + m.hp + '/' + m.max);
    if (!(m.max > 0) || !Number.isFinite(m.atk) || !Number.isFinite(m.staMax)) bad.push(m.name + ' の能力値が不正');
    if (m.age >= 55) bad.push(m.name + ' が55歳以上なのに在籍 ' + m.age);
    if (m.hp <= 0 && document.getElementById('runv') && !document.getElementById('runv').hidden) bad.push(m.name + ' がHP0のまま在籍');
  });
  if (run.members.length > 10) bad.push('団員が上限超え ' + run.members.length);
  run.gone.forEach((m) => { if (ids.has(m.uid)) bad.push('去った団員が在籍のまま ' + m.name); });
  const g = R.grid || [], onGrid = [];
  g.forEach((row) => row.forEach((u) => { if (u) onGrid.push(u); }));
  if (onGrid.length > 7) bad.push('出撃が7人超え ' + onGrid.length);
  const gid = new Set(); onGrid.forEach((u) => { if (gid.has(u.uid)) bad.push('盤面に同じ団員が2人 ' + u.name); gid.add(u.uid); });
  if (run.mode !== 'exp') bad.push('本番が遠征になっていない');
  if (run.members.length > 4) bad.push('遠征の仲間が4人を超えた ' + run.members.length);
  if (run.node > 3) bad.push('地点が章を超えた ' + run.node);
  if (R.cols !== 2 || document.querySelectorAll('#board .slot').length !== 6) bad.push('盤が3列×2マスでない cols=' + R.cols);
  document.querySelectorAll('#board .tok .nm u, .ehpn, #rvRoster small').forEach((e) => { if (/NaN|undefined/.test(e.textContent)) bad.push('表示に NaN/undefined: ' + e.textContent); });
  return bad;
};

(async () => {
  const b = await launch();
  const url = testPage();
  const log = [], problems = [];
  const t0 = Date.now();
  for (let k = 0; k < RUNS; k++) {
    const [w, h, mob] = SIZES[k % SIZES.length];
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url); await p.waitForTimeout(400);
    await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(500);
    let steps = 0, last = '', same = 0, battles = 0, resumes = 0, outcome = '途中', node = 0;
    const style = rnd() < 0.5 ? 'smart' : 'random';
    while (steps++ < 4000) {
      const st = await p.evaluate(() => ({
        rv: !document.getElementById('runv').hidden, res: !document.getElementById('result').hidden, en: !document.getElementById('ending').hidden,
        title: document.getElementById('rvTitle').textContent, cards: [...document.querySelectorAll('#rvCards [data-i]')].map((c) => c.dataset.i + (c.disabled ? 'x' : '')),
        prep: !document.getElementById('btnStart').hidden, choose: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden',
        tip: !document.getElementById('tip').hidden, node: window.__rb.run ? window.__rb.run.node : -1, ko: document.querySelectorAll('.inc.ko').length, tired: document.querySelectorAll('#board .slot[data-r="0"] .tok.tired').length,
        bench: document.querySelectorAll('.bn').length, cover: !document.getElementById('cover').hidden
      }));
      const bad = await p.evaluate(INVARIANTS);
      if (bad.length) { problems.push({ run: k, node: st.node, bad }); }
      node = st.node;
      const key = JSON.stringify(st);
      if (key === last) { if (++same > 60) { problems.push({ run: k, node: st.node, bad: ['進行が止まった: ' + key] }); break; } } else { same = 0; last = key; }
      if (st.tip) { await p.click('#tipOk').catch(() => {}); continue; }
      if (st.en) { outcome = 'クリア'; break; }
      if (st.rv) {
        if (/ここまで/.test(st.title)) { outcome = '全滅（地点' + (st.node + 1) + '）'; break; }
        if (/突破/.test(st.title)) { outcome = 'クリア'; break; }
        // ときどき「中断して再開」：ページを読み直して続きから
        if (/どちらへ/.test(st.title) && rnd() < 0.15) {
          await p.goto(url); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300);
          const can = await p.evaluate(() => !document.getElementById('resume').hidden);
          if (!can) { problems.push({ run: k, node: st.node, bad: ['再開ボタンが出ない'] }); break; }
          const before = st.node;
          await p.click('#resume'); await p.waitForTimeout(500); resumes++;
          const after = await p.evaluate(() => window.__rb.run && window.__rb.run.node);
          if (after !== before) problems.push({ run: k, node: before, bad: ['再開で地点が変わった ' + before + '→' + after] });
          continue;
        }
        const ok = st.cards.filter((c) => !c.endsWith('x'));
        const choices = ok.filter((c) => c !== '-1');
        let pickI = choices.length ? choices[Math.floor(rnd() * choices.length)] : '-1';
        if (ok.includes('-1') && rnd() < 0.15) pickI = '-1';
        await p.click(`#rvCards [data-i="${pickI}"]`).catch(() => {});
        if (await p.evaluate(() => !!document.getElementById('rvGo'))) await p.click('#rvGo').catch(() => {});
        await p.waitForTimeout(80);
        continue;
      }
      if (st.res) { await p.click('#next').catch(() => {}); await p.waitForTimeout(100); continue; }
      if (st.prep) {
        battles++;
        // 編成をでたらめに：入れ替え・留守番との交代・縦回し
        const W = await p.evaluate(() => window.__rb.cols);
        for (let s = 0; s < 3; s++) {
          const a = Math.floor(rnd() * 3 * W), c = Math.floor(rnd() * 3 * W);
          await p.click(`#board .slot[data-r="${Math.floor(a / W)}"][data-c="${a % W}"]`).catch(() => {});
          await p.click(`#board .slot[data-r="${Math.floor(c / W)}"][data-c="${c % W}"]`).catch(() => {});
        }
        if (rnd() < 0.3) await p.click('#btnPrepRot').catch(() => {});
        await p.waitForTimeout(150);
        if (await p.evaluate(() => !document.getElementById('tip').hidden)) await p.click('#tipOk').catch(() => {});
        await p.click('#btnStart').catch(() => {});
        await p.waitForTimeout(100);
        continue;
      }
      if (st.choose) {
        const rot = style === 'smart' ? (st.ko > 0 || st.tired > 0 || rnd() < 0.2) : rnd() < 0.5;
        if (rnd() < 0.1) { await p.click('#btnPreview').catch(() => {}); await p.waitForTimeout(50); }
        await p.click(rot ? '#btnRotate' : '#btnStay').catch(() => {});
        await p.waitForTimeout(60);
        continue;
      }
      await p.waitForTimeout(80);
    }
    errs.forEach((e) => problems.push({ run: k, node, bad: ['ページエラー: ' + e] }));
    log.push(`ラン${k + 1} ${w}x${h} ${style}: ${outcome}　戦闘${battles}回　再開${resumes}回　手数${steps}`);
    console.log(log.at(-1));
    await ctx.close();
  }
  await b.close();
  const uniq = {}; problems.forEach((x) => x.bad.forEach((m) => { const k = m.replace(/[0-9]+/g, '#'); (uniq[k] ||= []).push('ラン' + (x.run + 1) + '・地点' + (x.node + 1) + '：' + m); }));
  console.log('\n問題 ' + Object.keys(uniq).length + ' 種類');
  Object.entries(uniq).forEach(([k, v]) => console.log('- ' + v[0] + (v.length > 1 ? '（ほか' + (v.length - 1) + '回）' : '')));
  console.log('所要 ' + Math.round((Date.now() - t0) / 1000) + '秒');
  fs.writeFileSync(path.join(OUT, 'fuzz.json'), JSON.stringify({ log, problems }, null, 1));
  process.exit(Object.keys(uniq).length ? 1 : 0);
})();
