// v5.8.14 レリックの見える化（表示だけ。戦闘の数字は変えない）
// 合格の基準（測る前に決めたもの）：
//  1 選ぶ場面：研ぎ石を持つと、攻撃列の攻撃の札に印（.rl）が付き、札の説明に「研ぎ石」が入る。レリックなしでは盤のどこにも印が出ない
//  2 静けさの衣を持って維持の予告を見ると、狙われる仲間の赤い札と、敵の技の札（軽減後の数字）に印が付く。回したあとの並びの予告では、先陣の盾が内訳に入る
//  3 攻撃した瞬間、攻撃した仲間の上に「研ぎ石 +2」の札が出る。敵の上の内訳は「＋研ぎ石2」と分けて書き、記録にも「（研ぎ石 +2）」が残る
//  4 静けさの衣で軽くなった被ダメは、記録が「（静けさの衣-2）」になり、「突入技-2」とは書かない。受けた仲間の上に「静けさの衣 -2」の札が出る
//  5 取ったとき：研ぎ石は「攻撃列での攻撃」の前と後（＋2）を全員ぶん、灯の石は「最大HP」の前と後（＋6）を出す。先陣の盾は前後の表示なし
//  6 レリックなしの戦闘では、レリックの札は1枚も出ない
//  7 320幅でも、レリックの札は画面の中に収まる。どれもページのエラーなし
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const HOOK = () => { window.__rel = []; const go = () => new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('pop')) { const r = n.getBoundingClientRect(); window.__rel.push({ rel: n.classList.contains('rel'), sub: n.classList.contains('sub'), t: n.textContent, l: r.left, r: r.right, vw: document.documentElement.clientWidth }); } }).observe(document.body, { childList: true, subtree: true }); if (document.body) go(); else document.addEventListener('DOMContentLoaded', go); };
async function open(b, rel, w) {
  const ctx = await b.newContext({ viewport: { width: w || 390, height: 844 } });
  await ctx.addInitScript(HOOK);
  await ctx.addInitScript(() => { try { localStorage.setItem('rb-exp', JSON.stringify({ runs: 3, best: 8, clears: 1 })); localStorage.setItem('rb-teach-inc', '3'); } catch (e) { /* */ } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(testPage()); await p.waitForTimeout(500); await p.click('#cover'); await p.waitForTimeout(400); await p.click('#begin'); await p.waitForTimeout(1000);
  await p.click('#rvCards .rv-card[data-i="1"]'); await p.waitForTimeout(1200);
  for (let i = 0; i < 4; i++) { if (await p.evaluate(() => !!(window.__rb.run && window.__rb.run.map))) break; await p.evaluate(() => { const g = document.getElementById('rvGo'); if (g && g.getBoundingClientRect().width > 0) g.click(); else { const c = document.querySelector('#rvCards .rv-card[data-i="0"]'); if (c) c.click(); } }); await p.waitForTimeout(900); }
  await p.evaluate((rel) => { const R = window.__rb; const ids = Object.keys(R.run.map).filter((id) => R.run.map[id].foe && R.routeChoice(id).type === 'battle'); const c = R.routeChoice(ids[0]); R.run.node = c.step - 1; R.run.relics = rel; R.run.enemy = R.expEnemy(9, null, 1); document.getElementById('runv').hidden = true; R.toPrepForTest(); }, rel);
  await p.waitForTimeout(500); await p.click('#btnStart').catch(() => {});
  return { ctx, p, errs };
}
const waitChoose = async (p) => { for (let i = 0; i < 700; i++) { const ph = await p.evaluate(() => window.__rb.phase); if (ph === 'choose' || ph === 'over') return ph; await p.waitForTimeout(20); } return ''; };
const board = (p) => p.evaluate(() => {
  const b = document.getElementById('board');
  return { dmRl: [...b.querySelectorAll('.slot[data-r="0"] .dm')].map((x) => !!x.querySelector('.rl') && x.classList.contains('hasrl') && /研ぎ石/.test(x.title || '')),
    anyRl: b.querySelectorAll('.rl').length + document.querySelectorAll('#ticket .rl, .t-dmg .rl').length,
    inc: [...b.querySelectorAll('.inc')].map((x) => ({ rl: !!x.querySelector('.rl'), t: x.title })), tk: !!document.querySelector('.t-dmg.cut .rl.tk') };
});
const logs = (p) => p.evaluate(() => [...document.querySelectorAll('#log p, #logList p, .log p')].map((x) => x.textContent).join('\n'));
(async () => {
  const b = await launch();
  { const { ctx, p, errs } = await open(b, ['whet', 'veil', 'shield']);
    await waitChoose(p); await p.waitForTimeout(400);
    const s1 = await board(p);
    ok(s1.dmRl.length >= 2 && s1.dmRl.every(Boolean), '1 研ぎ石：攻撃列の攻撃の札に印と説明（' + s1.dmRl.join(',') + '）');
    await p.evaluate(() => { window.__rel = []; }); await p.click('#btnStay');
    await p.waitForTimeout(150); await waitChoose(p); await p.waitForTimeout(400);
    const hit = await p.evaluate(() => window.__rel.slice());
    const rp = hit.filter((x) => x.rel), sub = hit.filter((x) => x.sub && !x.rel).map((x) => x.t);
    ok(rp.some((x) => /研ぎ石 \+2/.test(x.t)) && sub.some((x) => /＋研ぎ石2/.test(x)), '3 攻撃の瞬間：札「' + rp.map((x) => x.t).join(' / ') + '」・内訳「' + sub.filter((x) => /研ぎ石/.test(x)).join(' / ') + '」');
    const lg1 = await p.evaluate(() => (window.__rb.log || []).join('\n'));
    const s2 = await board(p);
    const tgt = s2.inc.filter((x) => x.t !== undefined);
    ok(tgt.length > 0 && tgt.every((x) => x.rl && /静けさの衣/.test(x.t)) && s2.tk, '2 衣：赤い札に印（' + tgt.map((x) => x.rl + ':' + x.t).join(' / ') + '）・敵の技の札に印 ' + s2.tk);
    const sh = await p.evaluate(() => { const R = window.__rb; const o = R.incoming(R.previewGrid(), true, true); return Object.keys(o).map((k) => (o[k].rel || []).map((x) => x.id).join('+')); });
    ok(sh.length > 0 && sh.every((x) => /shield/.test(x) && !/veil/.test(x)), '2 回したあとの予告：盾が入り、衣は入らない（' + sh.join(' / ') + '）');
    await p.evaluate(() => { window.__rel = []; }); await p.click('#btnStay');
    await p.waitForTimeout(150); await waitChoose(p); await p.waitForTimeout(300);
    const hit2 = await p.evaluate(() => window.__rel.slice()), lg = await p.evaluate(() => [...document.querySelectorAll('#logBody p, #log p, .lg p, li')].map((x) => x.textContent).join('\n'));
    const all = await p.evaluate(() => document.body.innerText);
    ok(hit2.some((x) => x.rel && /静けさの衣 -2/.test(x.t)), '4 被ダメの瞬間：札「' + hit2.filter((x) => x.rel).map((x) => x.t).join(' / ') + '」');
    const txt = await p.evaluate(() => (window.__rb.log || []).join('\n'));
    ok(/（静けさの衣-2）/.test(txt) && !/（突入技-2）/.test(txt) && /（研ぎ石 \+2）/.test(txt), '3・4 記録：「（研ぎ石 +2）」' + /（研ぎ石 \+2）/.test(txt) + '・「（静けさの衣-2）」' + /（静けさの衣-2）/.test(txt) + '・「（突入技-2）」なし ' + !/（突入技-2）/.test(txt));
    void lg1; void lg; void all;
    ok(!errs.length, '1〜4 ページのエラーなし ' + errs.join(' / '));
    // 5 取ったとき
    const g = await p.evaluate(() => { const R = window.__rb, ms = R.run.members; R.run.relics = []; const a = ms.map((m) => m.atk), h = ms.map((m) => m.max);
      const w = R.relGet('whet'), st = R.relGet('stone'), sd = R.relGet('shield');
      const nums = (s) => [...s.matchAll(/(\d+)→<em>(\d+)<\/em>/g)].map((x) => [+x[1], +x[2]]);
      return { n: ms.length, wa: nums(w), sh: nums(st), a, h, w: /攻撃列での攻撃/.test(w), s: /最大HP/.test(st), sd: /rel-ba/.test(sd) }; });
    ok(g.w && g.wa.length === g.n && g.wa.every((x, i) => x[0] === g.a[i] && x[1] === g.a[i] + 2), '5 研ぎ石：攻撃列での攻撃 ' + g.wa.map((x) => x.join('→')).join(' '));
    ok(g.s && g.sh.length === g.n && g.sh.every((x, i) => x[0] === g.h[i] && x[1] === g.h[i] + 6), '5 灯の石：最大HP ' + g.sh.map((x) => x.join('→')).join(' '));
    ok(!g.sd, '5 先陣の盾：前後の表示なし');
    await ctx.close(); }
  { const { ctx, p, errs } = await open(b, []);
    await waitChoose(p); await p.waitForTimeout(300);
    const s = await board(p);
    for (let t = 0; t < 2; t++) { await p.click('#btnStay'); await p.waitForTimeout(150); if ((await waitChoose(p)) !== 'choose') break; }
    const n = await p.evaluate(() => window.__rel.filter((x) => x.rel).length);
    ok(s.anyRl === 0 && n === 0, '1・6 レリックなし：盤の印 ' + s.anyRl + '・札 ' + n + '枚');
    ok(!errs.length, '6 ページのエラーなし ' + errs.join(' / '));
    await ctx.close(); }
  { const { ctx, p, errs } = await open(b, ['whet', 'lens', 'bell', 'veil'], 320);
    await waitChoose(p);
    for (let t = 0; t < 3; t++) { await p.waitForTimeout(300); await p.click(t === 1 ? '#btnRotate' : '#btnStay').catch(() => {}); await p.waitForTimeout(150); if ((await waitChoose(p)) !== 'choose') break; }
    const r = await p.evaluate(() => window.__rel.filter((x) => x.rel));
    ok(r.length > 0 && r.every((x) => x.l >= 0 && x.r <= x.vw), '7 320幅：札 ' + r.length + '枚が画面の中（' + r.map((x) => Math.round(x.l) + '〜' + Math.round(x.r)).join(' ') + '／' + (r[0] ? r[0].vw : '-') + '）');
    ok(!errs.length, '7 ページのエラーなし ' + errs.join(' / '));
    await ctx.close(); }
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
