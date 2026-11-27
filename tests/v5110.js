// v5.11.0 録音した音源（ElevenLabs）を入れる仕組み。音源はまだ無いので、テスト用の音（正弦波）を作って確かめる
// 合格の基準（測る前に決めたもの）：
//  1 AUDIO_FILES が空のときは音源を1つも取りに行かず、エラーもない（今までと同じ合成音）
//  2 届いた効果音は録音の方が鳴る：維持（se_stay）・回す（se_rotate）
//  3 届いた BGM：戦闘で bgm_battle が流れ、「回す／維持」を押しても先頭へ戻らない（曲の再生開始は1回だけ）
//  4 報酬・進路の画面では bgm_choice に替わり、報酬→進路で先頭に戻らない
//  5 一覧に載っているのに届いていない音（404）は、合成音のまま鳴り、エラーにならない
const fs = require('fs'), path = require('path'), http = require('http'), { execFileSync } = require('child_process');
const { launch, testPage, OUT } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const DIR = path.join(OUT, 'aud');
const TONES = { se_rotate: 0.31, se_stay: 0.32, se_ui_nope: 0.33, se_ui_tap: 0.35, bgm_battle: 8, bgm_choice: 9 };
const MISSING = 'se_heal';   // 一覧には載せるが、ファイルを置かない
function build() {
  fs.rmSync(DIR, { recursive: true, force: true }); fs.mkdirSync(path.join(DIR, 'audio', 'se'), { recursive: true }); fs.mkdirSync(path.join(DIR, 'audio', 'bgm'), { recursive: true });
  const src = fs.readFileSync(testPage().replace('file://', ''), 'utf8');
  const list = Object.keys(TONES).concat([MISSING]);
  if (!src.includes('const AUDIO_FILES = [];')) throw new Error('AUDIO_FILES が見つからない');
  fs.writeFileSync(path.join(DIR, 'index.html'), src.replace('const AUDIO_FILES = [];', 'const AUDIO_FILES = ' + JSON.stringify(list) + ';'));
  fs.cpSync(path.join(OUT, 'img'), path.join(DIR, 'img'), { recursive: true });
  Object.entries(TONES).forEach(([n, d], i) => {
    const out = path.join(DIR, 'audio', n.startsWith('bgm_') ? 'bgm' : 'se', n + '.m4a');
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=f=' + (300 + i * 50) + ':d=' + d, '-c:a', 'aac', '-b:a', '96k', out]);
  });
}
function serve(root) {
  const types = { '.html': 'text/html', '.m4a': 'audio/mp4', '.webp': 'image/webp', '.png': 'image/png', '.js': 'text/javascript' };
  const s = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  return new Promise((res) => s.listen(0, '127.0.0.1', () => res(s)));
}
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1}';
const spy = (t) => { try { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-fast', '1'); ['rb-story', 'rb-ending', 'rb-story2', 'rb-firstmap'].forEach((k) => localStorage.setItem(k, '1')); } catch (e) { /* */ }
  window.__starts = []; window.__fetch = [];
  const st = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) { if (this.buffer && this.buffer.duration > 0.2) window.__starts.push({ d: Math.round(this.buffer.duration * 100) / 100, loop: this.loop, st: (this.buffer.duration > 7 ? new Error().stack.split('\n').slice(1, 6).join('|') : '') }); return st.apply(this, a); };
  const f0 = window.fetch; window.fetch = function (u, ...a) { window.__fetch.push(String(u)); return f0.call(this, u, ...a); }; };
(async () => {
  const b = await launch();
  // 1 音源なし（本番の index.html と同じ）
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(spy, TIPS); await p.goto(testPage()); await p.waitForTimeout(500); await p.click('#cover'); await p.waitForTimeout(300);
    await p.click('#begin'); await p.waitForTimeout(500); await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({ f: window.__fetch.filter((u) => /audio\//.test(u)), file: window.__M.file }));
    ok(r.f.length === 0 && !r.file && !errs.length, '1 音源なしでは何も取りに行かず、合成音のまま（取得 ' + r.f.length + '・エラー ' + errs.length + '）');
    await ctx.close(); }
  build(); const srv = await serve(DIR), base = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(spy, TIPS); await p.goto(base); await p.waitForTimeout(500); await p.click('#cover'); await p.waitForTimeout(300);
  await p.click('#begin'); await p.waitForTimeout(600); await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo');
  await p.waitForFunction(() => window.__M.file === 'bgm_battle', null, { timeout: 8000 }).catch(() => {});
  const n = (d) => p.evaluate((d) => window.__starts.filter((x) => x.d === d).length, d);
  ok(await p.evaluate(() => window.__M.file) === 'bgm_battle', '3 戦闘で bgm_battle が流れる');
  ok((await p.evaluate(() => window.__starts.find((x) => x.d === 8))).loop === true, '3 戦闘の曲はループする');
  const b8 = await n(8);
  await p.click('#btnStart'); await p.waitForSelector('#btnRotate:not([hidden])', { timeout: 30000 });
  await p.click('#btnStay'); await p.waitForTimeout(300);
  ok(await n(0.32) === 1, '2 維持で se_stay が鳴る（' + await n(0.32) + '回）');
  await p.waitForSelector('#btnRotate:not([hidden])', { timeout: 30000 });
  const can = await p.evaluate(() => !document.getElementById('btnRotate').disabled);
  if (can) { await p.click('#btnRotate'); await p.waitForTimeout(300); ok(await n(0.31) >= 1, '2 回すで se_rotate が鳴る（' + await n(0.31) + '回）'); }
  else ok(false, '2 回すを押せる場面にならなかった');
  await p.waitForSelector('#btnRotate:not([hidden]), #runv:not([hidden])', { timeout: 30000 });
  ok(await n(8) === b8, '3 「回す／維持」を押しても戦闘の曲は先頭に戻らない（戦闘中の開始 ' + (await n(8) - b8) + '回）');
  // 4 勝つまで進めて、報酬の画面へ
  await p.waitForSelector('#btnRotate:not([hidden])', { timeout: 30000 });
  await p.evaluate(() => window.__rb.finishForTest('win'));
  for (let i = 0; i < 20; i++) {   // 勝利の後：会話の札・結果の札が出たら先へ
    const s = await p.evaluate(() => (!document.getElementById('runv').hidden ? 'rv' : !document.getElementById('talkCard').hidden ? 'tc' : 'x'));
    if (s === 'rv') break; if (s === 'tc') await p.click('#tcLater'); await p.waitForTimeout(500);
  }
  await p.waitForFunction(() => window.__M.file === 'bgm_choice', null, { timeout: 15000 }).catch(() => {});
  ok(await p.evaluate(() => window.__M.file) === 'bgm_choice', '4 報酬の画面で bgm_choice に替わる（' + await p.evaluate(() => window.__M.file) + '）');
  const c0 = await n(9), seen = [];
  for (let i = 0; i < 8; i++) {
    const st = await p.evaluate(() => ({ rv: !document.getElementById('runv').hidden, t: document.getElementById('rvTitle').textContent, f: window.__M.file }));
    if (!st.rv) break;
    if (!seen.length || seen[seen.length - 1].t !== st.t) seen.push(st);
    await p.evaluate(() => { const v = document.getElementById('runv'); v.click(); const c = document.querySelector('#rvCards .rv-card:not([disabled])'); if (c) c.click(); const g = document.getElementById('rvGo'); if (g && !g.hidden && !g.disabled) g.click(); });
    await p.waitForTimeout(700);
  }
  const c1 = await n(9);
  ok(seen.length >= 2 && seen.every((x) => x.f === 'bgm_choice') && c1 === c0, '4 報酬→進路で bgm_choice は先頭に戻らない（' + seen.map((x) => x.t + '：' + x.f).join(' → ') + '・開始 ' + (c1 - c0) + '回）');
  // 5 届いていない音（se_heal）は合成音で鳴り、エラーにならない
  const miss = await p.evaluate(() => { try { window.__rb.SFX.heal(); return 'ok'; } catch (e) { return e.message; } });
  ok(miss === 'ok' && !errs.length, '5 一覧にあって届いていない音は合成音のまま（' + miss + '・エラー ' + errs.length + '）' + errs.join(' / '));
  await ctx.close(); srv.close(); await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
