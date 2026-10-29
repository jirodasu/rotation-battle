// v5.1.37 表記の統一と遺言：報酬は「4つから1つ」／攻撃列が空のとき予告に2倍の数字／あそびかたに「補助は同じ縦の列だけ」／遺言は職業ごと。
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-10T10:00:00'));
  await p.addInitScript(() => { try { localStorage.setItem('rb-tips', '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1}'); localStorage.setItem('rb-swapdemo', '1'); } catch (e) {} });
  await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(600);
  const map = await p.evaluate(() => [...document.querySelectorAll('#rvCards .rv-card')].map((c) => c.textContent).join('|'));
  ok(/報酬を4つから1つ/.test(map) && !/3つから1つ/.test(map), '地図の戦闘の札：報酬は「4つから1つ」');
  const help = await p.evaluate(() => document.getElementById('help').textContent);
  ok(/二の列の補助は、一の列には届かない/.test(help), 'あそびかた：補助は同じ縦の列だけ');
  // 予告パネル：攻撃列が空だと2倍
  await p.evaluate(() => { const R = window.__rb; R.run.enemy = R.expEnemy(3, null, 0); document.getElementById('runv').hidden = true; R.toPrepForTest(); }); await p.waitForTimeout(300);
  const tk = () => p.evaluate(() => ({ n: +document.querySelector('#ticket .t-dmg b').childNodes[0].textContent, s: document.querySelector('#ticket .t-dmg small:last-child').textContent, dbl: document.querySelector('#ticket .t-dmg').classList.contains('dbl'), base: window.__rb.enemy.pattern[0].dmg }));
  const full = await tk();
  ok(!full.dbl && (full.s === '' || /^元\d+$/.test(full.s)) && !/2倍/.test(full.s), '攻撃列に仲間がいる：ふつうの表示は数字だけ（v5.1.59。防御補助で減るときは「元N」） ' + JSON.stringify(full));
  await p.evaluate(() => { const R = window.__rb, g = R.grid; for (let c = 0; c < g[0].length; c++) { if (g[0][c]) { let moved = false; for (let r = 1; r < g.length && !moved; r++) for (let k = 0; k < g[r].length && !moved; k++) if (!g[r][k]) { g[r][k] = g[0][c]; g[0][c] = null; moved = true; } } } R.render(); }); await p.waitForTimeout(200);
  const emp = await tk();
  const front = await p.evaluate(() => { const g = window.__rb.grid; return g[0].some(Boolean); });
  ok(!front && emp.dbl && emp.s === '2倍' && emp.n === emp.base * 2, '攻撃列が空：予告が2倍の数字と「2倍」（v5.1.59） ' + JSON.stringify({ full, emp, front }));
  // 遺言：職業ごと
  const jl = await p.evaluate(() => { const R = window.__rb, J = R.JOB_LAST, jobs = Object.keys(J), res = {}; jobs.forEach((j) => { const set = new Set(); for (let i = 0; i < 60; i++) set.add(R.lastWordOf({ job: j, phase: 'prime' })); res[j] = [...set]; }); const all = [].concat(...jobs.map((j) => J[j])); return { n: jobs.length, within: jobs.every((j) => res[j].every((w) => J[j].includes(w)) && res[j].length >= 2), uniq: new Set(all).size === all.length, each: jobs.every((j) => J[j].length === 3), fb: R.lastWordOf({ job: 'x', phase: 'prime' }).length > 0 }; });
  ok(jl.n === 7 && jl.within && jl.uniq && jl.each && jl.fb, '遺言：7職業それぞれ3文・職業どうしで重ならない・自分の職業の文だけ出る ' + JSON.stringify(jl));
  ok(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs));
  await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
