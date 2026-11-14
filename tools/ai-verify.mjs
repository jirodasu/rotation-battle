// AI・自動ブラウザでの実プレイ検証（v5.8.10〜）。ChatGPT など外のAIが公開ページを開けないときに、同じ版を手元で動かして証拠を残す。
// 使い方：node tools/ai-verify.mjs [URL]   URL を省くと、このフォルダを手元のサーバー（127.0.0.1）で配って開く
//   出力：tests/out/ai-verify/ に report.json（数値）・log.txt（時刻付きの記録）・画面写真（390px と 320px）
//   測るもの：版の表示、致命的なエラー、読み込みに失敗したファイル、Service Worker、新規プロファイルでの起動、
//            アーチャーと戦士の「動きの始まり→ダメージの数字」の時間、速射（2回攻撃）のときの動きの回数、予報と実ダメージ、セーブと再開
// 「観測した値」だけを report.json の observed に入れる。ソースから読んだ予定の値は expected に分けて入れる
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { chromium } = require(process.env.PW || '/home/claude/.npm-global/lib/node_modules/playwright');
const CHROME = process.env.CHROME_PATH || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const OUT = path.join(ROOT, 'tests', 'out', 'ai-verify'); fs.mkdirSync(OUT, { recursive: true });
const t00 = Date.now(), lines = [];
const log = (...a) => { const s = '[' + ((Date.now() - t00) / 1000).toFixed(2) + 's] ' + a.join(' '); lines.push(s); console.log(s); };
const report = { url: '', when: new Date().toISOString(), expected: { archerHitMs: 500, othersHitMs: 170, archerMotionMs: 500, othersMotionMs: 420, note: 'expected はソースから読んだ予定の値。合否は observed で見る' }, observed: {}, problems: [] };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' };
async function serve() {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); return { srv, url: 'http://127.0.0.1:' + srv.address().port + '/' };
}
async function page(b, w, h, opt = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: opt.sw ? 'allow' : 'block' });
  const p = await ctx.newPage(); const errs = [], fails = [], cons = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('requestfailed', (r) => fails.push(r.url() + ' ' + (r.failure() || {}).errorText));
  p.on('response', (r) => { if (r.status() >= 400) fails.push(r.url() + ' HTTP ' + r.status()); });
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') cons.push(m.type() + ': ' + m.text()); });
  await p.addInitScript(DOM);
  if (opt.hook) await p.addInitScript(opt.hook);
  return { ctx, p, errs, fails, cons };
}
// 攻撃の時刻を拾う仕掛け：跳び出しの動き（札の scale(1.12)）か、アーチャーの部品（bowU を持つ札の部品）の動きが始まった時刻と、ダメージの数字（.dmg）が出た時刻
// 画面（DOM）だけで状態を読む道具。テスト用に書き換えたページに頼らないので、公開ページそのままでも動く
const DOM = () => {
  const vis = (el) => !!el && !el.hidden && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length > 0;
  const job = (t) => t.querySelector('[data-p="bowU"]') ? 'archer' : t.querySelector('[data-p="spear"]') ? 'knight' : t.querySelector('[data-p="staff"]') ? 'witch' : t.querySelector('[data-p="sword"]') ? 'warrior' : 'other';
  window.__dom = {
    phase: () => vis(document.getElementById('result')) ? 'over' : (vis(document.getElementById('btnRotate')) && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden') ? 'choose' : 'busy',
    units: () => [...document.querySelectorAll('#board .tok.cb')].map((t) => { const sl = t.closest('[data-r]'), b = t.querySelector('.nm b'), u = t.querySelector('.nm u'); return { id: t.dataset.id, job: job(t), name: b ? b.textContent.trim() : '', hp: u ? +u.textContent : null, r: sl ? +sl.dataset.r : null, c: sl ? +sl.dataset.c : null }; }),
    foeHp: () => { const e = document.getElementById('ehpn'); return e ? +e.textContent : null; }
  };
};
const HOOK = () => {
  window.__ev = [];
  const orig = Element.prototype.animate;
  Element.prototype.animate = function (kf, opt) {
    try {
      const tok = this.closest && this.closest('.tok');
      if (tok && this.classList.contains('tok') && /scale\(1\.12\)/.test(JSON.stringify(kf))) window.__ev.push({ t: performance.now(), k: 'lunge', id: tok.dataset.id, d: opt && opt.duration });
      else if (tok && this.dataset && this.dataset.p === 'drU') window.__ev.push({ t: performance.now(), k: 'archer', id: tok.dataset.id, d: opt && opt.duration });
      else if (tok && this.dataset && this.dataset.p === 'root' && !tok.querySelector('[data-p="bowU"]')) window.__ev.push({ t: performance.now(), k: 'rig', id: tok.dataset.id, d: opt && opt.duration });
    } catch (e) { /* */ }
    return orig.apply(this, arguments);
  };
  // ダメージの数字は0から数え上げる（0.35秒）ので、0.45秒後の文字で上書きする
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && (n.classList.contains('dmg') || n.classList.contains('sub'))) { const e = { t: performance.now(), k: n.classList.contains('dmg') ? 'dmg' : 'sub', txt: n.textContent }; window.__ev.push(e); setTimeout(() => { e.txt = n.textContent; }, 450); } }).observe(document, { childList: true, subtree: true });
};
const shot = async (p, name) => { const f = path.join(OUT, name + '.png'); await p.screenshot({ path: f }); log('写真', name + '.png'); };
const overflow = (p) => p.evaluate(() => { const bad = []; for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || !el.offsetParent && cs.position !== 'fixed') continue; const r = el.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 1 || r.left < -1) && !el.closest('[aria-hidden="true"], .fx, svg')) bad.push((el.id ? '#' + el.id : el.className && String(el.className).split(' ')[0] || el.tagName) + ' ' + Math.round(r.left) + '〜' + Math.round(r.right)); } return [...new Set(bad)].slice(0, 12); });
(async () => {
  let base = process.argv[2], srv = null;
  if (!base) { const s = await serve(); srv = s.srv; base = s.url; }
  report.url = base; log('対象', base);
  const b = await chromium.launch({ executablePath: CHROME });
  // 1 起動と版（新規プロファイル・Service Worker も動かす）。390px と 320px
  for (const [w, h] of [[390, 844], [320, 568]]) {
    const { ctx, p, errs, fails, cons } = await page(b, w, h, { sw: true });
    let status = null; try { const r = await p.goto(base, { waitUntil: 'load', timeout: 30000 }); status = r && r.status(); } catch (e) { log('開けない', w + 'px', e.message.split('\n')[0]); report.observed['open' + w] = { ok: false, error: e.message.split('\n')[0] }; await ctx.close(); continue; }
    await p.waitForTimeout(1500);
    const st = await p.evaluate(async () => ({ ver: (document.getElementById('cVer') || {}).textContent || null, title: document.title, sw: navigator.serviceWorker ? !!(await navigator.serviceWorker.getRegistration()) : 'なし', visible: [...document.querySelectorAll('button')].filter((x) => x.offsetParent).map((x) => x.textContent.trim()).filter(Boolean).slice(0, 8) }));
    const of = await overflow(p);
    await shot(p, 'boot-' + w);
    report.observed['open' + w] = { ok: status === 200 && !errs.length, http: status, version: st.ver, title: st.title, serviceWorker: st.sw, buttons: st.visible, pageErrors: errs, failedRequests: fails, consoleErrors: cons, offscreen: of };
    log(w + 'px', 'HTTP', status, '版', st.ver, 'SW', st.sw, 'エラー', errs.length, '読み込み失敗', fails.length, 'はみ出し', of.length);
    if (errs.length) report.problems.push(w + 'px 起動でエラー：' + errs.join(' / '));
    if (fails.length) report.problems.push(w + 'px 読み込み失敗：' + fails.join(' / '));
    await ctx.close();
  }
  // 2 アーチャーと戦士の時間（盤を直接開くQAジャンプ。動きの数値を繰り返し測るため）
  for (const [sq, label] of [['fast', '速攻の隊（アーチャー入り）'], ['std', '標準の隊（戦士入り）']]) {
    for (const [w, h] of [[390, 844], [320, 568]]) {
      const { ctx, p, errs } = await page(b, w, h, { hook: HOOK });
      await p.goto(base + '?qa&ch=1&loc=1&foe=0&v=none&sq=' + sq); await p.waitForTimeout(1000);
      const t0 = await p.evaluate(() => performance.now());
      await p.click('#btnStart');
      for (let k = 0; k < 300; k++) { await p.waitForTimeout(50); if (await p.evaluate(() => ['choose', 'over'].includes(window.__dom.phase()))) break; }
      const turnMs = Math.round((await p.evaluate(() => performance.now())) - t0);
      const res = await p.evaluate(() => { const who = (id) => { const x = window.__dom.units().find((v) => v.id === id); return x ? x.job + '(' + x.name + ')' : id; }; const ev = window.__ev; const out = [];
        ev.forEach((e, i) => { if (e.k === 'lunge' || e.k === 'archer' || (e.k === 'rig' && !ev.some((x) => x.k === 'lunge' && x.id === e.id && Math.abs(x.t - e.t) < 30))) { const d = ev.slice(i + 1).find((x) => x.k === 'dmg'); out.push({ job: who(e.id), kind: e.k, motionMs: e.d, hitMs: d ? Math.round(d.t - e.t) : null, dmg: d && d.txt }); } });
        return { attacks: out.filter((o, i, a) => a.findIndex((x) => x.job === o.job && Math.abs((x.hitMs || 0) - (o.hitMs || 0)) < 5) === i), phase: window.__dom.phase() }; });
      report.observed['timing-' + sq + '-' + w] = { turnMs, ...res, pageErrors: errs };
      log(label, w + 'px', '1ターン', turnMs + 'ms', res.attacks.map((a) => a.job + ' 動き' + a.motionMs + 'ms 命中' + a.hitMs + 'ms').join(' / '));
      await shot(p, 'battle-' + sq + '-' + w);
      const of = await overflow(p); if (of.length) report.problems.push(label + ' ' + w + 'px 画面外にはみ出す要素：' + of.join(', '));
      await ctx.close();
    }
  }
  // 3 速射：アーチャーを攻撃列へ回して突入させ、その攻撃の動きの回数とダメージの数字の数を見る
  { const { ctx, p, errs } = await page(b, 390, 844, { hook: HOOK });
    await p.goto(base + '?qa&ch=1&loc=1&foe=0&v=none&sq=fast'); await p.waitForTimeout(1000);
    await p.click('#btnStart');
    for (let k = 0; k < 300; k++) { await p.waitForTimeout(50); if (await p.evaluate(() => ['choose', 'over'].includes(window.__dom.phase()))) break; }
    const before = await p.evaluate(() => window.__dom.units().map((x) => x.job + '(' + x.name + ')@' + x.r + ',' + x.c).join(' '));
    let ok = false;
    if (await p.evaluate(() => window.__dom.phase() === 'choose' && !document.getElementById('btnRotate').disabled)) {
      const foeHpBefore = await p.evaluate(() => window.__dom.foeHp());
      await p.evaluate(() => { window.__ev = []; }); const t0 = await p.evaluate(() => performance.now());
      await p.click('#btnRotate');
      for (let k = 0; k < 300; k++) { await p.waitForTimeout(50); if (await p.evaluate(() => ['choose', 'over'].includes(window.__dom.phase()))) break; }
      const r = await p.evaluate((t0) => { const ev = window.__ev, A = ev.filter((e) => e.k === 'archer'); const ar = window.__dom.units().find((x) => x.job === 'archer'); return { archerMotions: A.length, archerAt: ar ? ar.r + ',' + ar.c : null, popsAfterArcher: A.length ? ev.filter((e) => (e.k === 'dmg' || e.k === 'sub') && e.t > A[0].t && e.t < A[0].t + 900).map((e) => Math.round(e.t - A[0].t) + 'ms ' + e.k + ' ' + e.txt) : [], foeHpAfter: window.__dom.foeHp(), turnMs: Math.round(performance.now() - t0) }; }, t0);
      report.observed.rapidShot = { before, foeHpBefore, ...r, note: '速射は「このターン攻撃回数+1」。本体はダメージを回数分まとめて計算し、動きと数字は1回だけ出す作り（ソースの読み）。観測で確かめる', pageErrors: errs };
      log('速射', JSON.stringify(r)); ok = true;
      await shot(p, 'rapid-shot-390');
    }
    if (!ok) { report.observed.rapidShot = { before, note: '回せず未確認' }; log('速射 未確認'); }
    await ctx.close(); }
  // 4 予報と実ダメージ：「維持」のボタンに書かれた予報（〜 HP AからB）と、敵の行動のあとの実際のHPを比べる
  { const { ctx, p } = await page(b, 390, 844, {});
    await p.goto(base + '?qa&ch=1&loc=1&foe=0&v=none&sq=std'); await p.waitForTimeout(1000);
    await p.click('#btnStart');
    for (let k = 0; k < 300; k++) { await p.waitForTimeout(50); if (await p.evaluate(() => ['choose', 'over'].includes(window.__dom.phase()))) break; }
    const rows = [];
    for (let turn = 0; turn < 3; turn++) {
      if (!(await p.evaluate(() => window.__dom.phase() === 'choose'))) break;
      const fc = await p.evaluate(() => { const a = document.getElementById('btnStay').getAttribute('aria-label') || ''; const m = [...a.matchAll(/([^\s、：]+) HP (\d+)から(\d+)/g)].map((x) => ({ name: x[1], from: +x[2], to: +x[3] })); return { label: a, m }; });
      await p.evaluate(() => { const t = document.getElementById('tip'); if (t && !t.hidden) document.getElementById('tipOk').click(); });
      await p.click('#btnStay');
      // 敵の大技のあと（自分の攻撃の前）のHPを見たいので、HPが予報の数まで動くのを待つ
      let got = null;
      for (let k = 0; k < 300; k++) { await p.waitForTimeout(40); got = await p.evaluate((m) => m.map((x) => { if (x.name === '敵') return { name: '敵', hp: window.__dom.foeHp() }; const u = window.__dom.units().find((v) => v.name === x.name); return u ? { name: x.name, hp: u.hp } : null; }), fc.m); if (fc.m.length && got.every((g, i) => !g || g.hp === fc.m[i].to)) break; if (await p.evaluate(() => window.__dom.phase() === 'over')) break; }
      rows.push({ forecast: fc.label, compare: fc.m.map((x, i) => ({ name: x.name, forecastTo: x.to, actual: got && got[i] ? got[i].hp : '（名前で引けない）', match: !!(got && got[i] && got[i].hp === x.to) })) });
      if (rows[rows.length - 1].compare.some((c) => !c.match)) report.problems.push('予報と実際のHPが違う：' + JSON.stringify(rows[rows.length - 1]));
      for (let k = 0; k < 300; k++) { await p.waitForTimeout(50); if (await p.evaluate(() => ['choose', 'over'].includes(window.__dom.phase()))) break; }
    }
    report.observed.forecast = rows; log('予報と実ダメージ', JSON.stringify(rows).slice(0, 400));
    await ctx.close(); }
  // 5 セーブと再開：遠征の盤で1ターン進め、開き直して続きから遊べるか
  { const { ctx, p, errs } = await page(b, 390, 844, {});
    await p.goto(base + '?qa&ch=1&loc=1&foe=0&v=none&sq=std'); await p.waitForTimeout(1000);
    await p.click('#btnStart');
    for (let k = 0; k < 300; k++) { await p.waitForTimeout(50); if (await p.evaluate(() => ['choose', 'over'].includes(window.__dom.phase()))) break; }
    const a = await p.evaluate(() => ({ units: window.__dom.units().map((x) => x.name + ' HP' + x.hp).join(' '), keys: Object.keys(localStorage).filter((k) => k.startsWith('rb')) }));
    await p.goto(base); await p.waitForTimeout(1500);
    const c = await p.evaluate(() => ({ buttons: [...document.querySelectorAll('button')].filter((x) => x.offsetParent).map((x) => x.textContent.trim()).filter(Boolean).slice(0, 10), keys: Object.keys(localStorage).filter((k) => k.startsWith('rb')) }));
    report.observed.saveResume = { afterTurn: a, afterReopen: c, note: 'QAジャンプの盤は保存しない作りなので、ここでは保存の鍵が無いこと（＝QAの盤が本物の保存を汚さないこと）だけを見る。遠征の保存と再開は tests/battlesave.js（遠征を本当に進めて開き直す）で確かめる', pageErrors: errs };
    log('セーブと再開', JSON.stringify(report.observed.saveResume).slice(0, 400));
    await shot(p, 'reopen-390');
    await ctx.close(); }
  await b.close(); if (srv) srv.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2)); fs.writeFileSync(path.join(OUT, 'log.txt'), lines.join('\n') + '\n');
  log('出力', path.relative(ROOT, OUT));
})();
