// 設定画面（v5.1.38）：BGM・効果音の音量／すべての音／振動／文字の大きさ／クレジット／問い合わせ。
// 基準：入口は表紙とあそびかたの2つ／音量は保存され再読み込みで戻る／文字「大」で読む文字が大きくなり名札が重ならない／
//       iPhone相当（振動なし）では振動の行が無効で理由が出る／ボタンの押せる高さ44px／小さい画面でも「閉じる」に届く／壊れた保存でも起動する。
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1}';
async function open(b, w, h, opt = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 900, hasTouch: w < 900, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-10T10:00:00'));
  await p.addInitScript(([tips, o]) => { try { localStorage.setItem('rb-tips', tips); localStorage.setItem('rb-swapdemo', '1'); if (o.bad) localStorage.setItem('rb-set', o.bad); } catch (e) {} if (o.novib) { try { Object.defineProperty(Navigator.prototype, 'vibrate', { value: undefined, configurable: true }); } catch (e) {} } window.__vibs = 0; if (navigator.vibrate) { const v = navigator.vibrate.bind(navigator); navigator.vibrate = (x) => { window.__vibs++; return v(x); }; } }, [TIPS, opt]);
  await p.goto(testPage()); await p.waitForTimeout(400); await p.click('#cover'); await p.waitForTimeout(400);
  return { ctx, p, errs };
}
(async () => {
  const b = await launch();
  // 1 表紙の入口と、小さい画面での収まり
  for (const [w, h] of [[390, 844], [375, 667], [320, 568], [844, 390], [568, 320]]) {
    const { ctx, p } = await open(b, w, h);
    const r = await p.evaluate(() => { const e = document.getElementById('setBtn'), q = e.getBoundingClientRect(), bg = document.getElementById('begin').getBoundingClientRect(); return { h: Math.round(q.height), inView: q.top >= 0 && q.bottom <= innerHeight + 1, beginIn: bg.bottom <= innerHeight + 1, vis: !!e.offsetParent }; });
    ok(r.vis && r.inView && r.beginIn && r.h >= 38, w + 'x' + h + ' 表紙：設定ボタンが画面内・「本番モード」も収まる ' + JSON.stringify(r));
    await ctx.close();
  }
  // 2 開く・音量・保存・再読み込み
  {
    const { ctx, p, errs } = await open(b, 390, 844);
    await p.click('#setBtn'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !document.getElementById('settings').hidden && document.activeElement.id === 'setClose'), '設定が開き、「閉じる」にフォーカス');
    await p.evaluate(() => { const e = document.getElementById('setBgm'); e.value = 40; e.dispatchEvent(new Event('input', { bubbles: true })); const f = document.getElementById('setSfx'); f.value = 50; f.dispatchEvent(new Event('input', { bubbles: true })); });
    const g = await p.evaluate(() => { const B = window.__rb.bus; return { bgm: B ? +B.bgmVol.gain.value.toFixed(2) : null, sfx: B ? +B.sfx.gain.value.toFixed(3) : null, saved: JSON.parse(localStorage.getItem('rb-set')) }; });
    ok(g.saved.bgm === 0.4 && g.saved.sfx === 0.5, '音量を変えると保存される ' + JSON.stringify(g.saved));
    await p.waitForTimeout(300);
    const g2 = await p.evaluate(() => { const B = window.__rb.bus; return B ? [+B.bgmVol.gain.value.toFixed(2), +B.sfx.gain.value.toFixed(2)] : null; });
    ok(g2 && Math.abs(g2[0] - 0.4) < 0.02 && Math.abs(g2[1] - 0.36) < 0.02, '音の出口に反映（BGM 0.4／効果音 0.72×0.5） ' + JSON.stringify(g2));
    await p.evaluate(() => document.getElementById('setClose').click());
    await p.reload(); await p.waitForTimeout(500); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#setBtn');
    const back = await p.evaluate(() => [document.getElementById('setBgm').value, document.getElementById('setSfx').value, document.getElementById('setBgmV').textContent]);
    ok(back.join() === '40,50,40', '再読み込みしても音量が戻る ' + back.join());
    // 押せる高さ
    const hit = await p.evaluate(() => [...document.querySelectorAll('#settings input, #settings .set-sw, #settings .set-seg button, #settings .h-x, #setClose')].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return [e.id || e.dataset.text || e.className, Math.round(r.height), Math.round(r.width)]; }));
    ok(hit.every(([, hh]) => hh >= 36) && hit.filter(([n]) => /setBgm|setSfx|setAll|setVib|setClose/.test(n)).every(([, hh]) => hh >= 44), '押せる高さ：スライダー・スイッチ・閉じるは44px以上 ' + JSON.stringify(hit));
    // クレジットと問い合わせ
    const cr = await p.evaluate(() => { const a = document.querySelector('.set-contact a'); return { t: document.querySelector('.set-about').textContent, href: a && a.href, rel: a && a.rel, tg: a && a.target, ver: document.getElementById('setVer').textContent }; });
    ok(/企画・制作/.test(cr.t) && /Claude/.test(cr.t) && /Shippori Mincho B1/.test(cr.t) && /Zen Kaku Gothic New/.test(cr.t) && /不具合・ご意見/.test(cr.t) && /サーバーには送られません/.test(cr.t), 'クレジット・書体・保存の説明');
    ok(cr.href === 'https://github.com/jirodasu/rotation-battle/issues' && /noopener/.test(cr.rel) && cr.tg === '_blank' && /ver 5\.1\.\d+/.test(cr.ver), '問い合わせは GitHub Issues（別タブ・noopener）・バージョン表示 ' + cr.ver);
    // Escape で閉じ、フォーカスが戻る
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => document.getElementById('settings').hidden && document.activeElement.id === 'setBtn'), 'Escape で閉じ、フォーカスが設定ボタンに戻る');
    ok(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs));
    await ctx.close();
  }
  // 3 すべての音：♪ボタンと同期
  {
    const { ctx, p } = await open(b, 390, 844);
    await p.click('#setBtn'); await p.click('#setAll'); await p.waitForTimeout(150);
    const s1 = await p.evaluate(() => [document.getElementById('snd').getAttribute('aria-pressed'), document.getElementById('setAll').getAttribute('aria-checked'), localStorage.getItem('rb-snd')]);
    await p.click('#setAll'); await p.waitForTimeout(150);
    const s2 = await p.evaluate(() => [document.getElementById('snd').getAttribute('aria-pressed'), document.getElementById('setAll').getAttribute('aria-checked'), localStorage.getItem('rb-snd')]);
    ok(s1.join() === 'false,false,0' && s2.join() === 'true,true,1', '「すべての音」と♪ボタンが同期 ' + s1.join() + ' → ' + s2.join());
    await ctx.close();
  }
  // 4 振動：対応端末でオフにすると鳴らない／非対応（iPhone相当）では無効＋理由
  {
    const { ctx, p } = await open(b, 390, 844);
    await p.click('#setBtn');
    const on = await p.evaluate(() => ({ dis: document.getElementById('setVib').disabled, c: document.getElementById('setVib').getAttribute('aria-checked') }));
    await p.click('#setVib'); await p.waitForTimeout(100);
    const v0 = await p.evaluate(() => window.__vibs);
    await p.evaluate(() => { document.getElementById('setClose').click(); });
    ok(!on.dis && on.c === 'true' && (await p.evaluate(() => window.__rb.SET.vib)) === false, '振動をオフにできる（保存あり） ' + JSON.stringify(on));
    await p.click('#begin'); await p.waitForTimeout(600);
    await p.evaluate(() => { window.__vibs = 0; });
    await p.evaluate(() => { const R = window.__rb; R.run.enemy = R.expEnemy(1, null, 0); document.getElementById('runv').hidden = true; R.toPrepForTest(); });
    await p.click('#btnStart'); for (let k = 0; k < 40; k++) { await p.waitForTimeout(150); }
    const v1 = await p.evaluate(() => window.__vibs);
    ok(v1 === 0, '振動オフなら、戦闘で振動を呼ばない（回数 ' + v1 + '）');
    await ctx.close();
    const n = await open(b, 390, 844, { novib: true });
    await n.p.click('#setBtn');
    const r = await n.p.evaluate(() => ({ dis: document.getElementById('setVib').disabled, c: document.getElementById('setVib').getAttribute('aria-checked'), note: document.getElementById('setVibNote').textContent }));
    ok(r.dis && r.c === 'false' && /対応していません/.test(r.note), '非対応の端末：振動の行は無効で、理由を表示 ' + JSON.stringify(r));
    await n.ctx.close();
  }
  // 5 文字の大きさ
  for (const [w, h] of [[390, 844], [320, 568]]) {
    const { ctx, p } = await open(b, w, h);
    await p.click('#begin'); await p.waitForTimeout(600);
    const fs = () => p.evaluate(() => [getComputedStyle(document.querySelector('.rv-txt b')).fontSize, getComputedStyle(document.querySelector('.rv-txt span')).fontSize]);
    const base = await fs();
    await p.evaluate(() => { document.getElementById('helpBtn').click(); }); await p.waitForTimeout(150);
    await p.click('#helpSet'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => { const s = document.getElementById('settings'), r = document.getElementById('setClose').getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !s.hidden && s.contains(e) && r.bottom <= innerHeight + 1; }), w + 'x' + h + ' あそびかたの上に設定が重なり、「閉じる」に届く');
    await p.click('.set-seg button[data-text="1"]'); await p.waitForTimeout(150);
    const lg = await fs();
    ok(parseFloat(lg[0]) > parseFloat(base[0]) && parseFloat(lg[1]) > parseFloat(base[1]) && await p.evaluate(() => document.documentElement.dataset.text === 'lg'), w + 'x' + h + ' 「大」で報酬の文字が大きくなる ' + base.join('/') + ' → ' + lg.join('/'));
    await p.evaluate(() => { document.getElementById('setClose').click(); document.getElementById('helpClose').click(); });
    await p.evaluate(() => { const R = window.__rb; R.run.enemy = R.expEnemy(3, null, 0); document.getElementById('runv').hidden = true; R.toPrepForTest(); }); await p.waitForTimeout(400);
    const bd = await p.evaluate(() => { const ov = (a, b) => !(a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5); const nms = [...document.querySelectorAll('#board .tok .nm')].filter((e) => e.offsetParent); let over = 0; for (let i = 0; i < nms.length; i++) for (let j = i + 1; j < nms.length; j++) if (ov(nms[i].getBoundingClientRect(), nms[j].getBoundingClientRect())) over++; const clip = nms.filter((e) => { const q = (e.closest('.strip') || e.parentElement).getBoundingClientRect(), a = e.getBoundingClientRect(); return a.left < q.left - 1 || a.right > q.right + 1; }).length; const dm = [...document.querySelectorAll('.dm,.inc')].filter((e) => e.offsetParent); const dmOver = dm.some((e) => e.scrollWidth > e.clientWidth + 1); return { over, clip, dmOver, fs: Math.min(...nms.map((e) => parseFloat(getComputedStyle(e.querySelector('b')).fontSize))) }; });
    ok(bd.over === 0 && bd.clip === 0 && !bd.dmOver, w + 'x' + h + ' 「大」でも盤の名札が重ならず・はみ出さない ' + JSON.stringify(bd));
    await p.evaluate(() => { document.getElementById('helpBtn').click(); }); await p.waitForTimeout(100);
    await ctx.close();
  }
  // 6 小さい横画面でも「閉じる」に届く／壊れた保存でも起動
  {
    const { ctx, p } = await open(b, 568, 320);
    await p.click('#setBtn'); await p.waitForTimeout(200);
    const r = await p.evaluate(() => { const c = document.querySelector('#settings .r-card'), f = document.getElementById('setClose').getBoundingClientRect(); return { card: c.scrollHeight > c.clientHeight, fin: f.bottom <= innerHeight + 1 && f.top >= 0 }; });
    ok(r.fin, '568x320 小さい横画面でも「閉じる」が画面内（カードは内側でスクロール ' + r.card + '）');
    await ctx.close();
    const bad = await open(b, 390, 844, { bad: '{broken' });
    await bad.p.click('#setBtn');
    ok(await bad.p.evaluate(() => document.getElementById('setBgm').value === '100' && document.documentElement.dataset.text === 'md') && !bad.errs.length, '壊れた保存（rb-set）でも起動し、初期値になる');
    await bad.ctx.close();
  }
  await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
