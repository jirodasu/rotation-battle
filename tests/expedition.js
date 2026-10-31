// 遠征（本番。4人・3列×2マス・第1章）。以前の騎士団の30年の保存は読まず消さない。戦闘の規則は自動対戦（tools/expsim.mjs）と一致すること
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const sleep = (p, ms) => p.waitForTimeout(ms);
// 戦闘を最後まで：seq[ターン-1] が true なら回す（縛られていれば維持になる）
// 標準的な遊び方：tools/expsim.mjs の SMART と同じ判断（前列が疲れた／次の攻撃で倒れる／前列のHPが半分未満なら回す）
const SM = () => { const R = window.__rb, g = R.grid, e = R.enemy, act = e.pattern[(R.turn - 1) % e.pattern.length];
  const front = []; for (let c = 0; c < R.cols; c++) if (g[0][c]) front.push(g[0][c]);
  if (!front.length) return true; if (front.some((u) => u.staMax > 0 && u.sta <= 0)) return true;
  if (act.dmg) { const d = act.dmg * (act.hits || 1); if (act.rule === 'all' && front.some((u) => u.hp <= act.dmg)) return true; const low = front.reduce((a, b) => (b.hp < a.hp ? b : a)); if (low.hp <= d) return true; }
  return front.reduce((s, u) => s + u.hp / u.max, 0) / front.length < 0.5; };
async function fightSmart(p) {
  for (let i = 0; i < 800; i++) {
    const st = await p.evaluate(() => ({ res: !document.getElementById('result').hidden || !document.getElementById('runv').hidden, prep: !document.getElementById('btnStart').hidden, choose: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', tip: !document.getElementById('tip').hidden, ko: document.querySelectorAll('.inc.ko').length, tired: document.querySelectorAll('#board .slot[data-r="0"] .tok.tired').length, dis: document.getElementById('btnRotate').disabled }));
    if (st.tip) { await p.click('#tipOk').catch(() => {}); continue; }
    if (st.res) return;
    if (st.prep) { await p.click('#btnStart'); await p.waitForTimeout(50); continue; }
    if (st.choose) { const rot = await p.evaluate(SM); await p.click(rot && !st.dis ? '#btnRotate' : '#btnStay'); await p.waitForTimeout(30); continue; }
    await p.waitForTimeout(40);
  }
}
// v5.3.3：遠征の途中の勝利は勝利パネルを出さずに報酬の画面へ。パネルが出ているとき（負け・最後の戦い）だけ「次へ」を押す
async function nextIf(p) { for (let i = 0; i < 40; i++) { if (await p.evaluate(() => !document.getElementById('result').hidden)) { await p.click('#next'); return; } if (await p.evaluate(() => !document.getElementById('runv').hidden)) return; await sleep(p, 100); } }
async function fight(p, seq) {
  for (let i = 0; i < 600; i++) {
    const st = await p.evaluate(() => ({ res: !document.getElementById('result').hidden || !document.getElementById('runv').hidden, prep: !document.getElementById('btnStart').hidden, choose: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', tip: !document.getElementById('tip').hidden, turn: window.__rb.run ? 0 : 0 }));
    if (st.tip) { await p.click('#tipOk').catch(() => {}); continue; }
    if (st.res) return;
    if (st.prep) { await p.click('#btnStart'); await sleep(p, 60); continue; }
    if (st.choose) {
      const t = await p.evaluate(() => document.getElementById('chipTurn').textContent.match(/ターン(\d+)/)[1]);
      const rot = !!seq[(+t - 2) % seq.length];
      const dis = await p.evaluate(() => document.getElementById('btnRotate').disabled);
      await p.click(rot && !dis ? '#btnRotate' : '#btnStay'); await sleep(p, 40); continue;
    }
    await sleep(p, 50);
  }
}
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  // 30年モードの途中保存と記録を置いておき、遠征が触らないことを確かめる
  const RUNSAVE = '{"v":"x","rseed":5,"uidSeq":7,"run":{"node":2,"year":7,"members":[{"uid":"m1","name":"A"}]}}', META = '{"runs":3,"clears":1,"won":{"std":1},"ach":{"clear":1},"bought":{},"spent":0,"hist":[]}';
  await p.addInitScript(([a, m]) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('rb-run-save', a); localStorage.setItem('rb-meta', m); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } }, [RUNSAVE, META]);
  await p.goto(testPage()); await sleep(p, 500);
  await p.click('#cover'); await sleep(p, 300);
  const vis = await p.evaluate(() => { const e = document.getElementById('begin'), r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width > 0 && r.bottom <= innerHeight + 2; });
  ok(vis && /環廊/.test(await p.evaluate(() => document.getElementById('begin').textContent)), '表紙の「環廊へ」が環廊を下る遠征になっている');
  await p.click('#begin'); await sleep(p, 600);
  const s0 = await p.evaluate(() => ({ mode: window.__rb.run.mode, n: window.__rb.run.members.length, cols: window.__rb.cols, slots: document.querySelectorAll('#board .slot').length, title: document.getElementById('rvTitle').textContent, cards: document.querySelectorAll('#rvCards .rv-card').length, ages: [...document.querySelectorAll('#rvRoster small')].map((e) => e.textContent).join(',') }));
  ok(s0.mode === 'exp' && s0.n === 4 && s0.cols === 2 && s0.slots === 6, '遠征は4人・3列×2マスの盤で始まる ' + JSON.stringify([s0.n, s0.cols, s0.slots]));
  ok(/どちらへ/.test(s0.title) && s0.cards === 2, '地図で2つの道（戦闘・休息）から選べる');
  ok(!/歳/.test(s0.ages), '名簿に年齢が出ない（' + s0.ages + '）');
  // 道の1つ目の戦闘を「鎖ネズミ」にして進む
  await p.evaluate(() => { const R = window.__rb, c = R.run.choices.find((x) => x.type === 'battle'); R.run.map[c.rid] = { foe: 'binder', variant: null }; });
  await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle')).then((i) => p.click('#rvCards .rv-card[data-i="' + i + '"]'));
  await p.click('#rvGo'); await sleep(p, 700);
  const e1 = await p.evaluate(() => ({ name: window.__rb.enemy.name, binds: window.__rb.enemy.pattern.some((a) => a.rule === 'bind') }));
  ok(/鎖ネズミ/.test(e1.name) && e1.binds, '「縛る」敵と戦える（' + e1.name + '）');
  // 縛りのターン：回すボタンが押せない
  await p.click('#btnStart'); let boundSeen = false, tries = 0;
  while (tries++ < 200) {
    const st = await p.evaluate(() => ({ choose: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', bound: !!window.__rb.enemy.bound, dis: document.getElementById('btnRotate').disabled, res: !document.getElementById('result').hidden, tip: !document.getElementById('tip').hidden }));
    if (st.tip) { await p.click('#tipOk').catch(() => {}); continue; }
    if (st.res) break;
    if (st.choose) { if (st.bound) { boundSeen = st.dis; break; } await p.click('#btnStay'); }
    await sleep(p, 50);
  }
  ok(boundSeen, '縛られたターンは「回す」が押せない');
  // 誰も倒れないようにする（倒れると報酬が「入れ替え」ではなく「補充」になり、ここで確かめたい入れ替えの流れにならない。補充は tests/refill.js で確かめる）
  await p.evaluate(() => window.__rb.run.members.forEach((m) => { m.hp = 999; }));
  await fight(p, [false, true]);
  const r1 = await p.evaluate(() => document.getElementById('rTitle').textContent);
  await nextIf(p); await sleep(p, 500);
  const after = await p.evaluate(() => ({ title: document.getElementById('rvTitle').textContent, cards: [...document.querySelectorAll('#rvCards .rv-card b')].map((e) => e.textContent) }));
  if (/勝利/.test(r1)) {
    ok(/勝利|報酬/.test(after.title) && after.cards.length === 4 && after.cards.some((t) => /回転レリック/.test(t)) && after.cards.some((t) => /突入技の強化/.test(t)) && after.cards.some((t) => /手当て/.test(t)) && after.cards.some((t) => /仲間の入れ替え/.test(t)), '勝つと報酬が4つ（回転レリック・突入技の強化・手当て・仲間の入れ替え）' + JSON.stringify(after.cards));
    // 仲間の入れ替え：「やめる」で報酬に戻れる。選ぶと、隊にいなかった職業の仲間が同じマスに入り、去った仲間は「離隊」
    const before = await p.evaluate(() => window.__rb.run.members.map((m) => ({ uid: m.uid, job: m.job, r: m.r, c: m.c })));
    await p.click('#rvCards .rv-card[data-i="3"]'); await sleep(p, 500);
    const pickT = await p.evaluate(() => ({ t: document.getElementById('rvTitle').textContent, n: document.querySelectorAll('#rvCards .rv-card').length }));
    await p.click('#rvCards .rv-skip'); await sleep(p, 500);
    const back = await p.evaluate(() => document.getElementById('rvTitle').textContent);
    ok(/誰と入れ替える/.test(pickT.t) && pickT.n === before.length && /勝利|報酬/.test(back), '入れ替えは相手を選べ、「やめる」で報酬に戻れる ' + JSON.stringify([pickT, back]));
    await p.click('#rvCards .rv-card[data-i="3"]'); await sleep(p, 500);
    await p.click('#rvCards .rv-card[data-i="0"]'); await sleep(p, 600);
    const sw = await p.evaluate(() => { const run = window.__rb.run; return { members: run.members.map((m) => ({ uid: m.uid, job: m.job, r: m.r, c: m.c, hp: m.hp, max: m.max, up: m.up || null })), left: run.gone.filter((m) => m.fate === 'left').map((m) => m.uid), node: run.node }; });
    const nm = sw.members[0], ok1 = !before.some((b) => b.job === nm.job) && nm.r === before[0].r && nm.c === before[0].c && sw.left[0] === before[0].uid && nm.hp === nm.max && !!nm.up && sw.node === 1;
    ok(ok1, '入れ替えると、隊にいなかった職業の仲間（強化済み・全快）が同じマスに入り、去った仲間は離隊 ' + JSON.stringify(nm));
    // 次の報酬でレリックを取る（以降の確認のため）
    await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('rb-exp-save')); o.run.relics = ['bell']; localStorage.setItem('rb-exp-save', JSON.stringify(o)); });   // 再開の確認用にレリックを1つ持たせた保存にする
    const rl = await p.evaluate(() => window.__rb.run.relics.slice());
    // 途中保存：別の保存で、30年モードの保存と記録は変わらない
    const sv = await p.evaluate(() => ({ exp: !!localStorage.getItem('rb-exp-save'), main: localStorage.getItem('rb-run-save'), meta: localStorage.getItem('rb-meta') }));
    ok(sv.exp && sv.main === RUNSAVE && JSON.parse(sv.meta).runs === 3, '遠征の途中保存は別の項目で、以前の騎士団の30年の保存・記録は消えない');
    await p.reload(); await sleep(p, 500); if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) await p.click('#cover'); await sleep(p, 300);   // 保存があると表紙は最初から開いている。真ん中を押すとボタンに当たる（v5.1.61で表紙を詰めたため）
    const sub = await p.evaluate(() => (document.getElementById('resume').hidden ? '' : document.getElementById('resumeSub').textContent));
    ok(/遠征/.test(sub), '表紙に遠征の「続きから」が出る（' + sub + '）');
    await p.click('#resume'); await sleep(p, 600);
    const rs = await p.evaluate(() => ({ node: window.__rb.run.node, relics: window.__rb.run.relics.length, cols: window.__rb.cols, slots: document.querySelectorAll('#board .slot').length }));
    ok(rs.node === 1 && rs.relics === 1 && rs.cols === 2 && rs.slots === 6, '再開すると地点・レリック・盤の幅が保たれる ' + JSON.stringify(rs));
  } else ok(false, '1戦目に勝てなかったため、報酬と保存の確認ができない（' + r1 + '）');
  // 第1章だけだった頃（v5.1.25 まで）の途中保存：地図の中身が第1章だけ・章の休息回数が無い → 再開すると補われる
  {
    await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('rb-exp-save')); Object.keys(o.run.map).forEach((id) => { if (!/^s[123]-/.test(id)) delete o.run.map[id]; }); delete o.run.chRests; o.run.rests = 1; localStorage.setItem('rb-exp-save', JSON.stringify(o)); window.__rb.goTitle(); });
    await sleep(p, 200); if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) { await p.click('#cover'); await sleep(p, 200); }
    await p.click('#resume'); await sleep(p, 600);
    const old = await p.evaluate(() => { const run = window.__rb.run; return { s6: !!run.map['s6-0'], s10: !!run.map['s10-0'], ch: run.chRests, node: run.node }; });
    ok(old.s6 && old.s10 && old.ch === 1 && old.node === 1, '第1章だけの古い途中保存も再開でき、第2・3章の中身が補われる ' + JSON.stringify(old));
  }
  // 気力：回すと2減り、毎ターン1たまる。足りないと「回す」が押せない
  await p.evaluate(() => { localStorage.removeItem('rb-exp-save'); window.__rb.goTitle(); }); await sleep(p, 200);
  if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) { await p.click('#cover'); await sleep(p, 200); }
  await p.click('#begin'); await sleep(p, 500);
  await p.evaluate(() => { const R = window.__rb, c = R.run.choices.find((x) => x.type === 'battle'); R.run.map[c.rid] = { foe: 0, variant: null }; });
  await p.evaluate(() => window.__rb.run.choices.findIndex((x) => x.type === 'battle')).then((i) => p.click('#rvCards .rv-card[data-i="' + i + '"]'));
  await p.click('#rvGo'); await sleep(p, 600); await p.click('#btnStart');
  const g = [];
  for (let i = 0; i < 300 && g.length < 3; i++) {
    const st = await p.evaluate(() => ({ choose: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', dis: document.getElementById('btnRotate').disabled, chip: document.getElementById('chipTurn').textContent, res: !document.getElementById('result').hidden, tip: !document.getElementById('tip').hidden }));
    if (st.tip) { await p.click('#tipOk').catch(() => {}); continue; }
    if (st.res) break;
    if (st.choose) { g.push([st.chip.replace(/.*気力/, ''), st.dis]); await p.click(st.dis ? '#btnStay' : '#btnRotate'); }
    await sleep(p, 50);
  }
  for (let i = 0; i < 100; i++) { if (await p.evaluate(() => !document.getElementById('result').hidden || (!document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden'))) break; await sleep(p, 100); }   // 解決中はタイトルへ戻れない
  ok(g.length >= 3 && g[0][0] === '●●●' && !g[0][1] && g[1][0] === '●●○' && !g[1][1] && g[2][0] === '●○○' && g[2][1], '気力：3→回して1→2→回して0→1では回せない ' + JSON.stringify(g));
  // 休むと章の主が強くなる
  const pen = await p.evaluate(() => { const R = window.__rb; const a = R.expEnemy(3, null, 0, 0), b = R.expEnemy(3, null, 0, 2); return [a.hp, b.hp, a.pattern.find((x) => x.dmg).dmg, b.pattern.find((x) => x.dmg).dmg]; });
  ok(pen[1] > pen[0] && pen[3] >= pen[2], '休むたびに章の主のHPと威力が上がる ' + JSON.stringify(pen));
  // 遠征を最後まで（2回、標準的な遊び方）：道・報酬はでたらめ。終わりの画面まで止まらずに進み、表示に NaN/undefined が出ない
  for (let k = 0; k < 3; k++) {
    await p.evaluate(() => { localStorage.removeItem('rb-exp-save'); window.__rb.goTitle(); }); await sleep(p, 200);
    if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) { await p.click('#cover'); await sleep(p, 200); }
    await p.click('#begin'); await sleep(p, 500);
    let end = '', bad = '', far = 0;
    for (let i = 0; i < 400 && !end; i++) {
      const st = await p.evaluate(() => ({ rv: !document.getElementById('runv').hidden, title: document.getElementById('rvTitle').textContent, n: document.querySelectorAll('#rvCards .rv-card').length, txt: document.body.innerText, node: window.__rb.run ? window.__rb.run.node : 0 }));
      far = Math.max(far, st.node + 1);
      if (/NaN|undefined/.test(st.txt)) { bad = (st.txt.match(/.{0,20}(NaN|undefined).{0,20}/) || [''])[0]; break; }
      if (st.rv && /踏破|ここまで|途絶えた/.test(st.title)) { end = st.title; break; }
      if (st.rv) {
        await p.click('#rvCards .rv-card[data-i="' + Math.floor(Math.random() * st.n) + '"]').catch(() => {});
        if (await p.evaluate(() => !!document.getElementById('rvGo'))) await p.click('#rvGo').catch(() => {});
        await sleep(p, 300); continue;
      }
      if (await p.evaluate(() => !document.getElementById('result').hidden)) { await p.click('#next'); await sleep(p, 300); continue; }
      if (k === 0) await fight(p, [Math.random() < 0.5, true, false]); else await fightSmart(p);
    }
    ok(!!end && !bad, '遠征を最後まで遊べる（' + (end || '止まった') + '・地点' + far + 'まで' + (bad ? '　表示に ' + bad : '') + '）');
  }
  // 章の主を倒すと：報酬のあと次の章へ。全員全快し、欠けた仲間の代わりが合流して4人に戻る
  async function goTo(step) {   // 地点 step の手前まで道を進めた状態にする
    await p.evaluate((step) => { const R = window.__rb, run = R.run; let cur = 'start'; const path = []; for (let i = 1; i < step; i++) { cur = R.ROUTE.nodes[cur].next[0]; path.push(cur); } run.path = path; run.node = step - 1; run.choices = R.routeChoices(); R.expShowMap([]); }, step);
    await sleep(p, 400);
    await p.click('#rvCards .rv-card[data-i="0"]'); if (await p.evaluate(() => !!document.getElementById('rvGo') && !document.getElementById('runv').hidden)) await p.click('#rvGo'); await sleep(p, 700);
    await p.evaluate(() => { window.__rb.enemy.hp = 1; });
    await fight(p, [false]);
    const w = await p.evaluate(() => document.getElementById('rTitle').textContent);
    await nextIf(p); await sleep(p, 600);
    return w;
  }
  await p.evaluate(() => { localStorage.removeItem('rb-exp-save'); window.__rb.goTitle(); }); await sleep(p, 200);
  if (await p.evaluate(() => document.getElementById('cover').classList.contains('gate'))) { await p.click('#cover'); await sleep(p, 200); }
  await p.click('#begin'); await sleep(p, 500);
  // 踏破の記録があると出発の準備（隊→深さ）が先に出る（v5.2.0）。標準の隊・深さ1を選ぶ
  for (let k = 0; k < 2 && await p.evaluate(() => /どの(隊|深さ)/.test(document.getElementById('rvTitle').textContent) && !document.getElementById('runv').hidden); k++) { await p.click('#rvCards .rv-card[data-i="0"]'); await sleep(p, 500); }
  await p.evaluate(() => { const run = window.__rb.run; run.members.pop(); run.members[0].hp = 5; run.chRests = 2; });
  const w3 = await goTo(3);
  const rw3 = await p.evaluate(() => document.getElementById('rvTitle').textContent);
  await p.click('#rvCards .rv-card[data-i="1"]'); await sleep(p, 600);
  const c2 = await p.evaluate(() => { const run = window.__rb.run; return { node: run.node, n: run.members.length, full: run.members.every((m) => m.hp === m.max), ch: run.chRests, small: document.getElementById('rvSmall').textContent, ev: document.getElementById('rvEvents').textContent }; });
  ok(/勝利/.test(w3) && /勝利|報酬/.test(rw3), '第1章の主に勝つと報酬を選べる');
  ok(c2.node === 3 && c2.n === 4 && c2.full && c2.ch === 0 && /第2章/.test(c2.small) && /合流/.test(c2.ev), '報酬のあと第2章へ：全員全快、欠けた仲間の代わりが合流して4人、章の休息回数は0 ' + JSON.stringify(c2));
  // 最後の主（毒竜）に勝つと踏破
  const w10 = await goTo(10);
  const end10 = await p.evaluate(() => ({ t: document.getElementById('rvTitle').textContent, boss: document.body.classList.contains('boss-stage') }));
  ok(/勝利/.test(w10) && /踏破/.test(end10.t), '地点10の毒竜に勝つと「環廊を踏破」になる（' + end10.t + '）');
  const xm = await p.evaluate(() => JSON.parse(localStorage.getItem('rb-exp') || '{}'));
  ok(xm.runs >= 3 && xm.clears >= 1, '遠征の回数と踏破が別の記録（rb-exp）に残る ' + JSON.stringify(xm));
  // チュートリアルは本番と同じ盤
  await p.evaluate(() => window.__rb.goTitle()); await sleep(p, 300);
  await p.click('#beginTut'); await sleep(p, 900);
  const m4 = await p.evaluate(() => ({ cols: window.__rb.cols, slots: document.querySelectorAll('#board .slot').length }));
  const tu = await p.evaluate(() => [...document.querySelectorAll('#board .tok[data-id]')].length);
  ok(m4.cols === 2 && m4.slots === 6 && tu === 4, 'チュートリアルも本番と同じ4人・3列×2マス ' + JSON.stringify(Object.assign(m4, { units: tu })));
  const tel = await p.evaluate(() => JSON.parse(localStorage.getItem('rb-exp') || '{}'));
  ok(Array.isArray(tel.hist) && tel.hist.length >= 4 && tel.hist.every((h) => typeof h.ms === 'number' && h.node >= 1), '遠征ごとに遊んだ時間と到達地点が端末内に残る（' + (tel.hist || []).map((h) => h.node + '地点/' + Math.round(h.ms / 1000) + '秒').join(' ') + '）');
  ok(!errs.length, 'ページのエラーなし ' + JSON.stringify(errs));
  await ctx.close(); await b.close();
  console.log(fails ? '不合格 ' + fails : '全て合格'); process.exit(fails ? 1 : 0);
})();
