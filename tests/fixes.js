// v5.1.47 検証で見つかった不具合4件の修正。
// 合格の基準（測る前に決めたもの）：
//  1. 敵詳細：地図にあるすべての戦闘（8つの地図・休み0/2回・亜種込み・章の主・三位一体）の敵詳細に
//     「undefined」「NaN」「null」が出ない。「しっぽで縛る」「ちからをためる」は「— ダメージ」。
//     技の数値は変えない（ダメージのある技は従来どおり数字）
//  2. 勝利・報酬・地図のパネルを出している間、背面の戦闘表示（HP・次の行動・敵名）は読めない（visibility:hidden）。
//     閉じて戦闘に入ると、背面は最新の敵・HPで表示される。あそびかた・設定は戦闘を見ながら開くので背面は残す
//  3. 地図の背面にも旧敵名が読めない。10月でも同じ
//  4. 上書き確認：戦闘中の保存なら「戦闘中（ターンn）」が併記され、nは保存のターンと一致。
//     戦闘中でない保存は従来の文面のまま。「やめる」で保存は残る
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS_ALL = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"bench":1}';
async function page(b, opt) {
  opt = opt || {};
  const ctx = await b.newContext({ viewport: { width: opt.w || 390, height: opt.h || 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.clock.setFixedTime(new Date(opt.date || '2026-11-10T10:00:00'));
  await p.addInitScript((t) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* 保存できない */ } }, TIPS_ALL);
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(250);
  return { ctx, p };
}
const vis = (p, id) => p.evaluate((id) => !document.getElementById(id).hidden, id);
const appHidden = (p) => p.evaluate(() => { const a = getComputedStyle(document.querySelector('.app')); return a.visibility === 'hidden' || +a.opacity === 0; });
async function toChoose(p) {
  await p.click('#begin'); await p.waitForTimeout(400);
  await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1200);
  await p.click('#btnStart');
  for (let i = 0; i < 100; i++) { if (await p.evaluate(() => !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden')) break; await p.waitForTimeout(100); }
}
async function winNow(p) {
  await p.evaluate(() => { window.__rb.enemy.hp = 1; window.__rb.run.members.forEach((m) => { m.atk = 99; }); });
  await p.click('#btnStay');
  for (let i = 0; i < 80; i++) { if (await vis(p, 'result') || await vis(p, 'runv')) return true; await p.waitForTimeout(150); }   // v5.3.3：途中の勝利は報酬の画面（題「勝利」）
  return false;
}
(async () => {
  const b = await launch();

  /* ---- 1. 敵詳細に undefined が出ない ---- */
  {
    const { ctx, p } = await page(b);
    await p.click('#begin'); await p.waitForTimeout(500);
    const res = await p.evaluate(async () => {
      const R = window.__rb, bad = [], seen = { n: 0, bind: 0, charge: 0, trio: 0, dmg: 0 }, strip = (h) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
      for (let seed = 1; seed <= 8; seed++) {
        R.run.map = R.expFill();
        for (const rests of [0, 2]) {
          R.run.chRests = rests;
          for (const id of Object.keys(R.run.map)) {
            const m = R.run.map[id]; if (!m.foe) continue;
            const c = R.routeChoice(id); if (c.type !== 'battle') continue;
            R.run.node = c.step - 1; R.run.enemy = R.expEnemy(c.step, c.variant, m.foe); document.getElementById('runv').hidden = true; R.toPrepForTest();
            seen.n++;
            for (let t = 1; t <= 4; t++) {
              R.setTurn(t);
              const html = R.enemyCardHTML(), txt = strip(html);
              if (/undefined|NaN|null/.test(txt)) bad.push([id, t, (txt.match(/.{0,24}(undefined|NaN|null).{0,12}/) || [''])[0]]);
              if (R.enemy.party) { seen.trio++; continue; }
              const rows = [...new DOMParser().parseFromString(html, 'text/html').querySelectorAll('.ep')];
              rows.forEach((r) => { const nm = r.querySelector('.ep-n b').textContent, d = r.querySelector('.ep-d b').textContent.trim();
                if (/縛る/.test(nm)) { seen.bind++; if (d !== '—') bad.push(['bind', nm, d]); }
                else if (/ためる|吸いこむ/.test(nm)) { seen.charge++; if (d !== '—') bad.push(['charge', nm, d]); }
                else { seen.dmg++; if (!/^\d+/.test(d)) bad.push(['dmg', nm, d]); } });
            }
          }
        }
      }
      return { bad: bad.slice(0, 6), nbad: bad.length, seen };
    });
    ok(res.nbad === 0 && res.seen.bind > 0 && res.seen.charge > 0 && res.seen.dmg > 0 && res.seen.trio > 0, '敵詳細に undefined / NaN / null が出ず、無ダメージ技は「—」、ダメージ技は数字 ' + JSON.stringify(res.seen) + (res.nbad ? ' 不具合 ' + JSON.stringify(res.bad) : ''));
    // 実際に敵詳細を開いて確かめる（しばりネズミ）
    await p.evaluate(() => { const R = window.__rb; R.run.node = 0; R.run.enemy = R.expEnemy(2, null, 'binder'); document.getElementById('runv').hidden = true; R.toPrepForTest(); }).catch(() => {});
    const hasBind = await p.evaluate(() => window.__rb.enemy.pattern.some((a) => a.rule === 'bind'));
    if (hasBind) {
      await p.waitForTimeout(300); await p.click('#stage'); await p.waitForTimeout(400);
      const t = await p.evaluate(() => document.getElementById('foeSheet').innerText);
      ok(!/undefined/.test(t) && /縛る/.test(t) && /—\s*\n?\s*ダメージ/.test(t), '実際に開いた敵詳細で「しっぽで縛る」が「— ダメージ」');
    } else console.log('  --  (binder が作れなかったので実画面の確認は省略)');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }

  /* ---- 2・3. 勝利・報酬・地図の背面 ---- */
  for (const sk of [{ name: '通常', date: '2026-11-10T10:00:00' }, { name: '10月', date: '2026-10-20T10:00:00' }]) {   // 10月もハロウィン版は無い（v5.2.1）
    const { ctx, p } = await page(b, { date: sk.date });
    await toChoose(p);
    ok(!(await appHidden(p)), sk.name + '：戦闘中は戦闘表示が見えている');
    const before = await p.evaluate(() => ({ name: document.getElementById('ename').textContent, hp: window.__rb.run.members.map((m) => m.name + ' ' + m.hp) }));
    const won = await winNow(p);
    ok(won, sk.name + '：勝利（報酬）のパネルが出る');
    await p.waitForTimeout(500);
    ok(await appHidden(p), sk.name + '：勝利パネルの間、背面の戦闘表示（HP・次の行動）は読めない');
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.scene')).visibility !== 'hidden' && +getComputedStyle(document.querySelector('.scene')).opacity > 0), sk.name + '：背景の絵は残る');
    if (await vis(p, 'result')) await p.click('#next'); await p.waitForTimeout(600);
    const rv = await p.evaluate(() => ({ open: !document.getElementById('runv').hidden, map: document.getElementById('runv').classList.contains('is-map') }));
    ok(rv.open && await appHidden(p), sk.name + '：報酬パネルの間も背面は読めない');
    // 報酬を選ぶ → 地図
    for (let i = 0; i < 6 && !(await p.evaluate(() => document.getElementById('runv').classList.contains('is-map'))); i++) {
      await p.evaluate(() => { const c = document.querySelector('#rvCards .rv-card') || document.getElementById('rvGo'); if (c) c.click(); }); await p.waitForTimeout(500);
      const go = await p.evaluate(() => { const g = document.getElementById('rvGo'); return g && !g.hidden && !g.disabled; }); if (go) { await p.click('#rvGo').catch(() => {}); await p.waitForTimeout(500); }
    }
    const isMap = await p.evaluate(() => document.getElementById('runv').classList.contains('is-map') && !document.getElementById('runv').hidden);
    ok(isMap && await appHidden(p), sk.name + '：地図の間、背面の旧敵名・HPは読めない（地図 ' + isMap + '）');
    if (isMap) {
      // 地図から次の戦闘へ。背面は最新の敵・HP
      await p.click('#rvCards .rv-card[data-i="0"]'); const card = await p.evaluate(() => document.querySelector('#rvCards .rv-card[data-i="0"]').innerText.replace(/\s+/g, ' ')); await p.click('#rvGo'); await p.waitForTimeout(1200);
      const now = await p.evaluate(() => ({ name: document.getElementById('ename').textContent, hp: document.getElementById('ehpn').textContent, members: window.__rb.run.members.map((m) => m.name + ' ' + m.hp), appVisible: getComputedStyle(document.querySelector('.app')).visibility !== 'hidden' }));
      ok(now.appVisible && card.includes(now.name) && now.hp === String(await p.evaluate(() => window.__rb.enemy.hp)), sk.name + '：戦闘に入ると背面は最新の敵・HP（' + now.name + ' ' + now.hp + '）で、カードと一致');
    }
    ok(!p.__errs.length, sk.name + '：ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }
  // あそびかた・設定は戦闘を見ながら開くので、背面を隠さない
  {
    const { ctx, p } = await page(b);
    await toChoose(p);
    await p.click('#helpBtn'); await p.waitForTimeout(400);
    ok(!(await appHidden(p)), 'あそびかたを開いても戦闘表示は残る');
    await ctx.close();
  }

  /* ---- 4. 上書き確認に「戦闘中（ターンn）」 ---- */
  {
    const { ctx, p } = await page(b);
    await toChoose(p);
    const turn = await p.evaluate(() => window.__rb.turn);
    await p.evaluate(() => window.__rb.goTitle()); await p.waitForTimeout(500);
    if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) await p.click('#cover');
    const sub = await p.evaluate(() => document.getElementById('resumeSub').textContent);
    ok(sub.includes('戦闘中（ターン' + turn + '）'), '表紙の「続きから」：' + sub);
    const save0 = await p.evaluate(() => localStorage.getItem('rb-exp-save'));
    await p.click('#begin'); await p.waitForTimeout(100);
    const body = await p.evaluate(() => document.getElementById('ncBody').textContent);
    ok(body.includes('戦闘中（ターン' + turn + '）') && /記録は消えて、元に戻せません/.test(body), '確認ダイアログに戦闘中が併記される：' + body);
    await p.waitForTimeout(500); await p.click('#ncNo'); await p.waitForTimeout(150);
    ok((await p.evaluate(() => localStorage.getItem('rb-exp-save'))) === save0 && await vis(p, 'resume'), '「やめる」で保存は残る');
    // 戦闘中でない保存
    await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('rb-exp-save')); delete o.battle; localStorage.setItem('rb-exp-save', JSON.stringify(o)); });
    await p.reload(); await p.waitForTimeout(500); await p.click('#cover').catch(() => {}); await p.waitForTimeout(300);
    await p.click('#begin'); await p.waitForTimeout(100);
    const body2 = await p.evaluate(() => document.getElementById('ncBody').textContent);
    ok(!/戦闘/.test(body2) && /^いまの遠征（地点 \d+ \/ 10）の記録は消えて、元に戻せません。$/.test(body2), '戦闘中でない保存は従来の文面：' + body2);
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }

  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
