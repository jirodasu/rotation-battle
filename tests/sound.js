// 音（v5.1.35 環廊）：BGM（タイトル・戦闘・最後の戦い）と主な効果音を録音し、無音でない・音割れしない・音量が以前（v5.1.34）から大きく外れないことを確かめる。
// 基準：BGM の RMS は v5.1.34 の ±25%、効果音は 0.6〜1.6倍、ピークは 0.95 以下。
const fs = require('fs'), path = require('path');
const { launch, ROOT, OUT } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const BASE = { 'bgm-title': 0.0503, 'bgm-battle': 0.0643, 'bgm-boss': 0.0722, rotate: 0.0818, start: 0.0819, hit: 0.0402, hurt: 0.0373, heal: 0.0473, guard: 0.034, entry: 0.0319, chapter: 0.0518, win: 0.1603 };
let s = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
s = s.replace('  function beginMain(sqId, legacy) {', `  window.__snd = {
    st(b) { const n = b.length, L = b.getChannelData(0), R = b.getChannelData(Math.min(1, b.numberOfChannels - 1)); let pk = 0, sq = 0; for (let i = 0; i < n; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); if (v > pk) pk = v; sq += (L[i] * L[i] + R[i] * R[i]) / 2; } return { peak: pk, rms: Math.sqrt(sq / n) }; },
    async sfx(name, args, sec) { const SR = 44100, oc = new OfflineAudioContext(2, Math.ceil(SR * sec), SR); oc.resume = () => Promise.resolve(); const sv = { ac, bus, noiseBuf }; ac = oc; buildBus(); try { SFX[name].apply(null, args || []); } finally { ac = sv.ac; bus = sv.bus; noiseBuf = sv.noiseBuf; } return this.st(await oc.startRendering()); },
    async mix(st, layers, w) { actx(); const bs = []; for (const l of layers) bs.push(await Music._render(st, l)); const n = bs[0].length, out = ac.createBuffer(2, n, bs[0].sampleRate); for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); bs.forEach((b, i) => { const x = b.getChannelData(c); for (let j = 0; j < n; j++) d[j] += x[j] * w[i] * 0.85; }); } return this.st(out); }
  };
  function beginMain(sqId, legacy) {`);
const page = path.join(OUT, 'snd.html'); fs.writeFileSync(page, s);
(async () => {
  const b = await launch();
  const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + page); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(400);
  const chk = (n, r, lo, hi) => ok(r.rms >= BASE[n] * lo && r.rms <= BASE[n] * hi && r.peak <= 0.95, n + ' 音量 ' + r.rms.toFixed(4) + '（基準 ' + BASE[n] + '）ピーク ' + r.peak.toFixed(3));
  for (const [n, st, ls, w] of [['bgm-title', 'title', ['title'], [1.3]], ['bgm-battle', 'resolve', ['str', 'drm', 'mel', 'brs'], [0.85, 0.75, 0.75, 0.35]], ['bgm-boss', 'boss', ['str', 'drm', 'mel', 'brs'], [0.85, 0.75, 0.75, 0.35]]])
    chk(n, await p.evaluate(([st, ls, w]) => window.__snd.mix(st, ls, w), [st, ls, w]), 0.75, 1.25);
  for (const [n, a, sec] of [['rotate', [], 2.2], ['start', [], 2], ['hit', [true], 1.4], ['hurt', [], 1.2], ['heal', [], 2.2], ['guard', [], 1.4], ['entry', [1], 1.6], ['chapter', [], 2.5], ['win', [], 4.5]])
    chk(n, await p.evaluate(([n, a, s]) => window.__snd.sfx(n, a, s), [n, a, sec]), 0.6, 1.6);
  ok(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs));
  await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
