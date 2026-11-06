// v5.5.7 地点選び A：選ぶたびに読む文字を減らす（地図をタップして選ぶ・目標は「?」・本文は「詳しく」）
// 合格の基準（測る前に決めたもの）：
//  1. 遠征の地図（393×852・320×568・844×390）：見えている文字が 90 字以下（v5.5.6 は約240字）。横にはみ出さない。「進む」ボタンが画面の中
//  2. 見出しは「第1章　祈りの間」。「どちらへ進む？」は札が2つのとき出さない（文字は残す）。全10地点の目盛り（済み・いま・章の主）がある
//  3. 目標：初めての遠征の最初の地図だけ自動で開く。次の地図では閉じていて、「?」で開閉できる
//  4. 札：選んだ札でも本文は隠れている。数字（HP など）は札の中で1回だけ。「詳しく」で本文が開き、「閉じる」で閉じる
//  5. 地図の地点をタップすると、選んだ札が替わる。「進む」の文字は短く、読み上げには「…」へ進むが入る。押すとその地点へ進む
//  6. 仲間の名前・職業は見えないが、読み上げ用に残る。ページのエラーなし
//  7. 盤の危なさの印：「倒」（このターンで倒れる）は「あと2発」より強い（脈打ちが速く、色が明るい）。「あとN発」の字は11px以上
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"trinity":1,"bench":1,"combo":1,"hmIntro":1}';
// 見えている文字（display:none・visibility:hidden・読み上げ専用の切り抜きを除く）
const VIS = () => { const out = []; const walk = (n) => { if (n.nodeType === 3) { const e = n.parentElement; if (!e) return; const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.clipPath === 'none' && +cs.opacity > 0.05) out.push(n.textContent); return; }
  if (n.nodeType === 1) { const cs = getComputedStyle(n); if (cs.display === 'none' || n.hidden) return; if (n.tagName === 'svg' && n.classList.contains('route')) { n.querySelectorAll('text').forEach((t) => { if (getComputedStyle(t).display !== 'none') out.push(t.textContent); }); return; } n.childNodes.forEach(walk); } };
  walk(document.getElementById('runv')); return out.join('').replace(/\s+/g, ''); };
(async () => {
  const b = await launch();
  for (const [w, h] of [[393, 852], [320, 568], [844, 390]]) {
    const tag = w + '×' + h;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript((t) => { try { if (!sessionStorage.getItem('s')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); localStorage.setItem('rb-order-n', '5'); sessionStorage.setItem('s', '1'); } } catch (e) { /* */ } }, TIPS);
    await p.addInitScript('window.__vis = ' + VIS.toString());
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
    const s = await p.evaluate(() => { const v = document.getElementById('runv'), t = document.getElementById('rvTitle'), go = document.getElementById('rvGo').getBoundingClientRect(), sub = document.getElementById('rvSub');
      return { a: v.classList.contains('map-a'), text: window.__vis(), small: document.getElementById('rvSmall').textContent, titleShown: getComputedStyle(t).display !== 'none', title: t.textContent,
        prog: document.querySelectorAll('.rt-prog i').length, now: document.querySelectorAll('.rt-prog i.now').length, chief: document.querySelectorAll('.rt-prog i.chief').length,
        goal: getComputedStyle(sub).display !== 'none' && /目標/.test(sub.textContent), over: document.documentElement.scrollWidth - innerWidth, goIn: go.bottom <= innerHeight + 1 && go.top >= 0,
        names: [...document.querySelectorAll('#rvRoster .rv-m > b')].map((e) => e.textContent), namesShown: [...document.querySelectorAll('#rvRoster .rv-m > b')].some((e) => getComputedStyle(e).clipPath === 'none') }; });
    ok(s.a && s.small === '第1章　祈りの間' && !s.titleShown && s.title === 'どちらへ進む？', tag + ' 2 見出しは章だけ、「どちらへ進む？」は出さない ' + JSON.stringify({ small: s.small, title: s.titleShown }));
    ok(s.prog === 10 && s.now === 1 && s.chief === 3, tag + ' 2 全10地点の目盛り（いま1・章の主3） ' + [s.prog, s.now, s.chief].join('/'));
    ok(s.goal, tag + ' 3 初めての遠征の最初の地図は、目標が開いている');
    ok(s.over <= 0 && s.goIn, tag + ' 1 横にはみ出さず、「進む」が画面の中 ' + JSON.stringify({ over: s.over, goIn: s.goIn }));
    ok(s.names.length === 4 && s.names.every(Boolean) && !s.namesShown, tag + ' 6 仲間の名前は見えないが、読み上げ用に残る ' + s.names.join('・'));
    // 目標を閉じて、見えている文字を数える
    await p.click('#rvHelp'); await p.waitForTimeout(150);
    const t1 = await p.evaluate(() => ({ goal: getComputedStyle(document.getElementById('rvSub')).display !== 'none', text: window.__vis(), exp: document.getElementById('rvHelp').getAttribute('aria-expanded') }));
    ok(!t1.goal && t1.exp === 'false', tag + ' 3 「?」で目標が閉じる');
    ok(t1.text.length <= 90, tag + ' 1 見えている文字 ' + t1.text.length + ' 字（90字以下）：' + t1.text);
    // 札：本文は隠れ、数字は1回だけ。「詳しく」で開く
    const c = await p.evaluate(() => { const sel = document.querySelector('#rvCards .rv-card.sel') || document.querySelector('#rvCards .rv-card'); const d = sel.querySelector('.rv-d'); const k = [...sel.querySelectorAll('.rv-k em')].map((e) => e.textContent);
      const R = window.__rb, ch = R.run.choices.find((x) => x.type === 'battle');
      return { dShown: getComputedStyle(d).display !== 'none', k, dText: d.textContent, more: !!document.getElementById('rvMore') }; });
    // 札を1つ選んでから
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.waitForTimeout(150);
    const c2 = await p.evaluate(() => { const sel = document.querySelector('#rvCards .rv-card.sel'), d = sel.querySelector('.rv-d'), hp = (sel.querySelector('.rv-k em') || {}).textContent;
      const vis = window.__vis(); return { dShown: getComputedStyle(d).display !== 'none', hp, count: hp ? vis.split(hp).length - 1 : -1, go: document.getElementById('rvGo').textContent, aria: document.getElementById('rvGo').getAttribute('aria-label') }; });
    ok(!c2.dShown, tag + ' 4 選んだ札でも本文は隠れている');
    ok(c2.hp && c2.count === 1, tag + ' 4 数字（HP ' + c2.hp + '）は札の中で1回だけ（' + c2.count + '回）');
    ok(c2.go === '進む' && /^「.+」へ進む$/.test(c2.aria || ''), tag + ' 5 ボタンは「進む」、読み上げは ' + c2.aria);
    await p.click('#rvMore'); await p.waitForTimeout(150);
    const m1 = await p.evaluate(() => ({ d: getComputedStyle(document.querySelector('#rvCards .rv-card.sel .rv-d')).display !== 'none', t: document.getElementById('rvMore').textContent }));
    await p.click('#rvMore'); await p.waitForTimeout(150);
    const m2 = await p.evaluate(() => getComputedStyle(document.querySelector('#rvCards .rv-card.sel .rv-d')).display !== 'none');
    ok(m1.d && m1.t === '閉じる' && !m2, tag + ' 4 「詳しく」で本文が開き、「閉じる」で閉じる');
    // 地図の地点をタップ → 札が替わる → 進む
    const other = await p.evaluate(() => { const R = window.__rb; return R.run.choices.findIndex((x, i) => i !== 0); });
    const box = await p.evaluate((i) => { const e = document.querySelector('#rvTrack .mk[data-pick="' + i + '"] .seal'); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, other);
    if (box) await p.mouse.click(box.x, box.y); await p.waitForTimeout(200);
    const sw = await p.evaluate((i) => ({ sel: (document.querySelector('#rvCards .rv-card.sel') || {}).dataset ? document.querySelector('#rvCards .rv-card.sel').dataset.i : null, type: window.__rb.run.choices[i].type }), other);
    ok(box && sw.sel === String(other), tag + ' 5 地図の地点をタップすると、選んだ札が替わる ' + JSON.stringify(sw));
    await p.click('#rvGo'); await p.waitForTimeout(1000);
    const after = await p.evaluate(() => ({ runv: !document.getElementById('runv').hidden, phase: window.__rb.phase, node: window.__rb.run.node, title: document.getElementById('rvTitle').textContent }));
    ok(sw.type === 'battle' ? (!after.runv && after.phase === 'prep') : after.node === 1, tag + ' 5 「進む」でその地点へ ' + JSON.stringify(after));
    // 次の地図：目標は閉じている（休息を選んだときだけ、すぐ次の地図が出る）
    if (sw.type !== 'battle' && after.runv) {
      const g2 = await p.evaluate(() => getComputedStyle(document.getElementById('rvSub')).display !== 'none');
      ok(!g2, tag + ' 3 次の地図では目標は閉じている');
      await p.click('#rvHelp'); await p.waitForTimeout(150);
      ok(await p.evaluate(() => getComputedStyle(document.getElementById('rvSub')).display !== 'none'), tag + ' 3 「?」で目標が開く');
    }
    ok(!errs.length, tag + ' 6 ページのエラーなし ' + errs.join('/'));
    await ctx.close();
  }
  // 7 危なさの印の強さ（盤に印を置いて、効いている見た目を読む）
  { const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
    await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(300); await p.click('#begin'); await p.waitForTimeout(900);
    await p.click('#rvCards .rv-card[data-i="0"]'); await p.click('#rvGo'); await p.waitForTimeout(1300);
    const k = await p.evaluate(() => { const t = document.querySelector('#board .tok') || document.getElementById('board'); const a = document.createElement('i'); a.className = 'inc ko'; a.textContent = '倒-9'; const n = document.createElement('small'); n.className = 'inc-n n1'; n.textContent = 'あと2発'; t.appendChild(a); t.appendChild(n);
      const ca = getComputedStyle(a), cn = getComputedStyle(n), lum = (c) => { const m = c.match(/\d+/g).map(Number); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
      return { koDur: parseFloat(ca.animationDuration), n1Dur: parseFloat(cn.animationDuration), koLum: lum(ca.backgroundColor), n1Lum: lum(cn.backgroundColor), fs: parseFloat(cn.fontSize) }; });
    ok(k.koDur < k.n1Dur && k.koLum > k.n1Lum, '7 「倒」は「あと2発」より強い（脈打ち ' + k.koDur + 's ＜ ' + k.n1Dur + 's、明るさ ' + Math.round(k.koLum) + ' ＞ ' + Math.round(k.n1Lum) + '）');
    ok(k.fs >= 11, '7 「あとN発」の字は11px以上（' + k.fs + 'px）');
    await ctx.close(); }
  await b.close();
  console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
