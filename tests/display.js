// v5.1.41 新規ランの上書き確認と、表示の不一致の修正。
// 合格の基準（測る前に決めたもの）：
//  1. 上書き確認：保存が無いときは「本番モード」で確認なしに始まる。保存があるときは確認が出て、保存は消えない。
//     「やめる」・Esc・背景タップで閉じても保存はそのまま。開いた直後（0.45秒未満）の「始める」は受け付けない。
//     「記録を消して始める」で新しい遠征になる。チュートリアル勝利後の「本番モードへ」も、保存があれば同じ確認を通る
//  2. 地図のカードと実際の戦闘：地図にあるすべての戦闘（3章ぶん・章の主は休んだ回数込み・亜種込み・三位一体）で、
//     カードの敵名・HP・防御・素早さが、戦闘画面の表示と一致する（乱数の種を変えて8回ぶんの地図）
//  3. 技名：三位一体のパネルの技名は、行動パターン（ログに出る名前）と同じ。1〜3ターン目すべて
//  4. 勝利画面：ふつうの戦闘は「完」と出さず「地点 n / 10」。章の主に勝ったときだけ「完」
//  5. 三位一体のパネルに素早さの数値（3体とも、その体の素早さと一致）
//  6. 被ダメ予告：予告（盤の数字・予告札の数字）と、実際に受けたダメージが一致する。
//     対象外：ランダム攻撃（予告に「？」で出す仕様）、そのターンに誰か（敵・味方）が倒れたターン、戦闘が終わったターン。
//     予告札は、防御補助などで減るときは「軽減後」の数字を出し、その数字が実際のダメージと一致する（少なくとも1回は起きること）
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
const TIPS_ALL = '{"stars":1,"gauge":1,"bind":1,"entry":1,"charge":1,"pierce":1,"stamina":1,"trinity":1}';
async function page(b, w, h) {
  const ctx = await b.newContext({ viewport: { width: w || 390, height: h || 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-10T10:00:00'));
  await p.addInitScript((t) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('rb-tips', t); localStorage.setItem('rb-swapdemo', '1'); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* */ } }, TIPS_ALL);
  await p.goto(testPage()); await p.waitForTimeout(300); await p.click('#cover'); await p.waitForTimeout(250);
  return { ctx, p };
}
const vis = (p, id) => p.evaluate((id) => !document.getElementById(id).hidden, id);
(async () => {
  const b = await launch();

  /* ---- 1. 上書き確認 ---- */
  {
    const { ctx, p } = await page(b);
    await p.click('#begin'); await p.waitForTimeout(500);
    ok(!(await vis(p, 'newConf')) && await p.evaluate(() => window.__rb.run && window.__rb.run.mode === 'exp'), '保存が無いときは、確認なしに遠征が始まる');
    // 地点を進めた保存を作る
    await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('rb-exp-save')); o.run.node = 3; o.marker = 'keep'; localStorage.setItem('rb-exp-save', JSON.stringify(o)); window.__rb.goTitle(); }); await p.waitForTimeout(300);
    const save0 = await p.evaluate(() => localStorage.getItem('rb-exp-save'));
    await p.click('#begin'); await p.waitForTimeout(80);
    const s1 = await p.evaluate(() => ({ open: !document.getElementById('newConf').hidden, body: document.getElementById('ncBody').textContent, focus: document.activeElement && document.activeElement.id, cover: !document.getElementById('cover').hidden }));
    ok(s1.open && /地点 4 \/ 10/.test(s1.body) && s1.cover, '保存があると確認が出る（' + s1.body + '）');
    ok(s1.focus === 'ncNo', '既定の選択は「やめる」');
    await p.click('#ncGo', { force: true }); await p.waitForTimeout(50);
    ok(await vis(p, 'newConf') && (await p.evaluate(() => localStorage.getItem('rb-exp-save'))) === save0, '開いた直後の「始める」は受け付けない（連続タップで消えない）');
    await p.click('#ncNo'); await p.waitForTimeout(150);
    ok(!(await vis(p, 'newConf')) && (await p.evaluate(() => localStorage.getItem('rb-exp-save'))) === save0 && await vis(p, 'resume'), '「やめる」で閉じ、保存も「続きから」も残る');
    await p.click('#begin'); await p.waitForTimeout(100); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    ok(!(await vis(p, 'newConf')) && (await p.evaluate(() => localStorage.getItem('rb-exp-save'))) === save0, 'Esc で閉じても保存はそのまま');
    await p.click('#begin'); await p.waitForTimeout(100); await p.mouse.click(5, 5); await p.waitForTimeout(100);
    ok(!(await vis(p, 'newConf')) && (await p.evaluate(() => localStorage.getItem('rb-exp-save'))) === save0, '背景タップで閉じても保存はそのまま');
    await p.click('#resume'); await p.waitForTimeout(500);
    ok(await p.evaluate(() => window.__rb.run.node === 3), '「続きから」は元の地点（4）から再開できる');
    await p.evaluate(() => window.__rb.goTitle()); await p.waitForTimeout(300);
    await p.click('#begin'); await p.waitForTimeout(600);
    await p.click('#ncGo'); await p.waitForTimeout(600);
    const s2 = await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('rb-exp-save')); return { node: window.__rb.run.node, saved: o && o.run.node, marker: o && o.marker, conf: !document.getElementById('newConf').hidden }; });
    ok(!s2.conf && s2.node === 0 && s2.saved === 0 && !s2.marker, '「記録を消して始める」で新しい遠征になる ' + JSON.stringify(s2));
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }
  {
    // チュートリアルを勝ったあとの「本番モードへ」
    const { ctx, p } = await page(b);
    await p.click('#begin'); await p.waitForTimeout(500);
    await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('rb-exp-save')); o.run.node = 2; localStorage.setItem('rb-exp-save', JSON.stringify(o)); window.__rb.goTitle(); }); await p.waitForTimeout(300);
    const save0 = await p.evaluate(() => localStorage.getItem('rb-exp-save'));
    await p.click('#beginTut'); await p.waitForTimeout(900);
    // チュートリアルの戦闘を勝ち扱いで終わらせる：結果画面の「本番モードへ」と同じ処理を呼ぶ
    const hasNext = true;
    // チュートリアルの戦闘を勝ちで終える（勝利の処理そのものを呼ぶ）
    const routed = await p.evaluate(() => { try { window.__rb.finishForTest('win'); return true; } catch (e) { return String(e); } });
    await p.waitForTimeout(400);
    const lbl = await p.evaluate(() => document.getElementById('next').textContent);
    if (/本番モード/.test(lbl)) {
      await p.click('#next'); await p.waitForTimeout(200);
      ok(await vis(p, 'newConf') && (await p.evaluate(() => localStorage.getItem('rb-exp-save'))) === save0, 'チュートリアル勝利後の「本番モードへ」も、保存があれば確認が出る');
    } else ok(false, 'チュートリアルの勝利画面に進めなかった（' + lbl + ' ' + routed + ' ' + hasNext + '）');
    await ctx.close();
  }

  /* ---- 2. 地図のカードと実際の戦闘 ---- */
  {
    const { ctx, p } = await page(b);
    await p.click('#begin'); await p.waitForTimeout(500);
    const res = await p.evaluate(async () => {
      const R = window.__rb, bad = [], seen = { n: 0, chief: 0, variant: 0, trio: 0 };
      const num = (t, re) => { const m = t.match(re); return m ? +m[1] : null; };
      for (let seed = 1; seed <= 8; seed++) {
        R.run.map = R.expFill();
        for (const rests of [0, 2]) {
          R.run.chRests = rests;
          for (const id of Object.keys(R.run.map)) {
            const m = R.run.map[id]; if (!m.foe) continue;
            const c = R.routeChoice(id); if (c.type !== 'battle') continue;
            const card = R.expCard(c), txt = card.t + ' ' + card.d + ' ' + card.tags.map((x) => x.t).join(' ');
            R.run.node = c.step - 1; R.run.enemy = R.expEnemy(c.step, c.variant, m.foe); document.getElementById('runv').hidden = true; R.toPrepForTest();
            seen.n++; if (R.expIsChief(c.step)) seen.chief++; if (c.variant) seen.variant++;
            if (R.enemy.party) {
              seen.trio++;
              R.enemy.party.forEach((f) => { const el = document.querySelector('.fc[data-f="' + f.id + '"]'), t = el.innerText.replace(/\s+/g, '');
                if (!txt.includes(f.name + ' HP' + f.max + '・防御' + f.def + '・素早さ' + f.spd)) bad.push(['card', f.name, txt]);
                if (!t.includes(f.name) || !t.includes(f.hp + '/' + f.max) || !t.includes('速' + f.spd) || !t.includes('防' + f.def)) bad.push(['panel', f.name, t]); });
              continue;
            }
            const st = { name: document.getElementById('ename').textContent, hp: +document.getElementById('ehpn').textContent, spd: num(document.getElementById('espd').textContent, /素早さ (\d+)/), def: num(document.getElementById('espd').textContent, /防御 (\d+)/) };
            const cd = { name: card.t.replace(/^(章の主|戦闘)\s+/, ''), hp: num(card.d, /HP (\d+)/), def: num(card.d, /防御 (\d+)/), spd: num(card.d, /素早さ (\d+)/), tag: card.tags.map((x) => x.t).find((t) => /^HP\d+ 防\d+$/.test(t)) };
            if (cd.name !== st.name || cd.hp !== st.hp || cd.def !== st.def || cd.spd !== st.spd || cd.tag !== 'HP' + st.hp + ' 防' + st.def) bad.push([id, rests, JSON.stringify(cd), JSON.stringify(st)]);
          }
        }
      }
      return { bad: bad.slice(0, 6), nbad: bad.length, seen };
    });
    ok(res.nbad === 0 && res.seen.n > 100 && res.seen.chief > 10 && res.seen.variant > 10 && res.seen.trio > 0, '地図のカードの敵名・HP・防御・素早さが、戦闘画面と一致 ' + JSON.stringify(res.seen) + (res.nbad ? ' 不一致 ' + res.nbad + ' ' + JSON.stringify(res.bad) : ''));
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }

  /* ---- 3・5. 三位一体のパネル：技名と素早さ ---- */
  {
    const { ctx, p } = await page(b, 390, 844);
    await p.click('#begin'); await p.waitForTimeout(500);
    await p.evaluate(() => { const R = window.__rb; R.run.node = 4; R.run.enemy = R.expEnemy(5, null, 'trinity'); document.getElementById('runv').hidden = true; R.toPrepForTest(); }); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const R = window.__rb, out = []; for (let t = 1; t <= 3; t++) { R.setTurn(t);
      R.enemy.party.forEach((f) => { const a = f.pattern[(t - 1) % f.pattern.length], el = document.querySelector('.fc[data-f="' + f.id + '"]'), shown = el.querySelector('.fc-act span').textContent, spd = el.querySelector('.fc-spd').textContent; out.push({ t, f: f.id, shown, want: a.name, spd, wantSpd: '速' + f.spd }); }); }
      R.setTurn(1); return out; });
    ok(r.every((x) => x.shown === x.want), 'パネルの技名が行動パターンの名前と同じ（' + [...new Set(r.map((x) => x.shown))].join('・') + '）');
    ok(r.every((x) => x.spd === x.wantSpd), 'パネルに素早さ（' + r.slice(0, 3).map((x) => x.spd).join('・') + '）');
    // 1ターン動かして、ログに出た技名がパネルの名前と同じ
    const names1 = r.filter((x) => x.t === 1).map((x) => x.want);
    await p.click('#btnStart');
    for (let i = 0; i < 200; i++) { const ch = await p.evaluate(() => !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden'); if (ch) break; await p.waitForTimeout(50); }
    const log = await p.evaluate(() => window.__rb.log.join('\n'));
    ok(names1.every((n) => log.includes(n)), 'ログにパネルと同じ技名が出る（' + names1.join('・') + '）');
    ok(!/通常攻撃/.test(log) && !(await p.evaluate(() => document.getElementById('party').innerText.includes('通常攻撃'))), '「通常攻撃」という別名はどこにも出ない');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }

  /* ---- 4. 勝利画面の見出し ---- */
  {
    const { ctx, p } = await page(b, 844, 390);
    await p.click('#begin'); await p.waitForTimeout(500);
    const win = async (step, foe) => {
      await p.evaluate(([step, foe]) => { const R = window.__rb; R.run.node = step - 1; R.run.enemy = R.expEnemy(step, null, foe); document.getElementById('runv').hidden = true; R.toPrepForTest(); R.run.members.forEach((m) => { m.atk = 99; m.max = m.hp = 999; }); R.enemy.hp = 1; }, [step, foe]);
      await p.click('#spdBtn').catch(() => {});
      await p.click('#btnStart');
      for (let i = 0; i < 300; i++) { const s = await p.evaluate(() => ({ res: !document.getElementById('result').hidden, ch: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', tip: !document.getElementById('tip').hidden })); if (s.tip) { await p.click('#tipOk').catch(() => {}); continue; } if (s.res) break; if (s.ch) await p.click('#btnStay'); await p.waitForTimeout(40); }
      return p.evaluate(() => ({ small: document.getElementById('rSmall').textContent, title: document.getElementById('rTitle').textContent }));
    };
    const n = await win(2, 0);
    ok(n.title === '勝利' && !/完/.test(n.small) && /地点 2 \/ 10/.test(n.small), 'ふつうの戦闘の勝利画面は「完」でなく地点を出す（' + n.small + '）');
    const c = await win(3, 'chief');
    ok(/完/.test(c.small) && /章の主/.test(c.small), '章の主に勝ったときは「完」（' + c.small + '）');
    ok(!p.__errs.length, 'ページのエラーなし ' + p.__errs.join(' / '));
    await ctx.close();
  }

  /* ---- 6. 被ダメ予告と実際のダメージ ---- */
  {
    const CASES = [{ step: 2, k: 0, seed: 3 }, { step: 2, k: 'binder', v: 'armor', seed: 4 }, { step: 5, k: 'trinity', seed: 5 }, { step: 5, k: 'trinity', seed: 6, relics: ['shield'], up: 7 },
      { step: 4, k: 1, v: 'poison', seed: 7, relics: ['shield'] }, { step: 8, k: 2, seed: 8, up: 7 }, { step: 3, k: 1, seed: 9 }, { step: 6, k: 'chief', seed: 10, up: 7, relics: ['shield'] }, { step: 2, k: 0, v: 'swarm', seed: 11 }];
    let total = 0, bad = 0, tix = 0, tixBad = 0, cut = 0; const ex = [];
    for (const cs of CASES) {
      const { ctx, p } = await page(b, 844, 390);
      await p.click('#begin'); await p.waitForTimeout(500);
      await p.evaluate((cs) => { const R = window.__rb; if (cs.relics) R.run.relics = cs.relics; if (cs.up) R.run.members.forEach((m) => { m.up = { atk: cs.up, guard: cs.up, heal: cs.up, teamGuard: 2 }; R.applyAge(m, true); });
        R.run.node = cs.step - 1; R.run.enemy = R.expEnemy(cs.step, cs.v || null, cs.k); document.getElementById('runv').hidden = true; R.toPrepForTest(); }, cs);
      await p.waitForTimeout(250); await p.click('#spdBtn').catch(() => {});
      let sd = cs.seed; const rnd = () => { sd = (sd * 48271) % 2147483647; return sd / 2147483647; };
      let pred = null;
      const settle = async () => {
        if (!pred) return;
        const got = await p.evaluate((S) => { const C = window.__rb.log; let s = 0; while (s <= S.length && C.slice(0, S.length - s).join('\n') !== S.slice(s).join('\n')) s++; const L = C.slice(S.length - s), m = {}, hits = [];
          L.forEach((t) => { const x = t.match(/^(.+?)に(\d+)ダメージ/); if (x) { m[x[1]] = (m[x[1]] || 0) + +x[2]; hits.push(+x[2]); } }); return { m, L, hits, res: !document.getElementById('result').hidden }; }, pred.snap);
        const skip = pred.random || got.res || got.L.some((t) => /を倒した|が倒れた|とどめ/.test(t));
        if (!skip) {
          new Set(Object.keys(pred.m).concat(Object.keys(got.m))).forEach((n) => { total++; if ((pred.m[n] || 0) !== (got.m[n] || 0)) { bad++; if (ex.length < 4) ex.push([cs.k, n, pred.m[n] || 0, got.m[n] || 0, pred.ctx]); } });
          // 予告札：ひとつの敵・ひとりを狙う技のときは、受けたダメージの合計と一致。全員を狙う技は、一人ひとりが範囲内
          if (pred.tk && pred.tk.n != null) {
            tix++; const sum = Object.values(got.m).reduce((a, x) => a + x, 0), vals = Object.values(got.m);
            // v5.1.55（C7）：全員に当たる技は、札に範囲（1〜8）を出さず元の数字を出す。味方ごとの違いは味方カードの予測に一本化。札の数字＝いちばん大きい被ダメージ
            const okT = pred.tk.all ? (Math.max.apply(null, vals) === pred.tk.hi && vals.every((v) => v <= pred.tk.hi)) : sum === pred.tk.n;
            if (!okT) { tixBad++; if (ex.length < 6) ex.push(['札', cs.k, JSON.stringify(pred.tk), JSON.stringify(got.m)]); }
            if (pred.tk.cut && okT) cut++;
          }
        }
        pred = null;
      };
      for (let i = 0; i < 3000; i++) {
        const st = await p.evaluate(() => ({ res: !document.getElementById('result').hidden, prep: !document.getElementById('btnStart').hidden, choose: !document.getElementById('btnRotate').hidden && getComputedStyle(document.getElementById('dock')).visibility !== 'hidden', tip: !document.getElementById('tip').hidden, dis: document.getElementById('btnRotate').disabled }));
        if (st.tip) { await p.click('#tipOk').catch(() => {}); continue; }
        if (st.res) { await settle(); break; }
        if (st.prep || st.choose) {
          await settle();
          const rot = st.choose && !st.dis && rnd() < 0.45;
          if (rot) { await p.click('#btnPreview'); await p.waitForTimeout(30); }   // 回したときの予告を見る
          pred = await p.evaluate((rot) => { const R = window.__rb, src = rot ? R.previewGrid() : R.grid, inc = R.incoming(src, rot || R.phase === 'prep', rot), m = {};
            Object.keys(inc).forEach((k) => { const [r, c] = k.split(',').map(Number); m[src[r][c].name] = inc[k].d; });
            const foes = R.enemy.party ? R.enemy.party.filter((f) => f.hp > 0) : [R.enemy], acts = foes.map((F) => F.pattern[(R.turn - 1) % F.pattern.length]);
            const dmgActs = acts.filter((a) => a.dmg && a.rule !== 'charge' && a.rule !== 'bind');
            // 予告札の数字（攻撃する技が1つだけのターンに限って照合する）
            let tk = null; const el = document.querySelector('#ticket .t-dmg');
            if (dmgActs.length === 1 && dmgActs[0].rule !== 'random' && el && el.querySelector('small').textContent !== '大技') {
              const a = dmgActs[0], cutOn = el.classList.contains('cut'), mm = el.querySelector('b').textContent.replace(/×\d+$/, '').match(/^(\d+)(?:〜(\d+))?$/);
              if (mm) { const lo = +mm[1], hi = mm[2] ? +mm[2] : lo; tk = { all: a.rule === 'all', lo, hi, n: a.rule === 'all' ? lo : cutOn ? lo : lo * (a.hits || 1), cut: cutOn }; } }
            return { m, tk, random: acts.some((a) => a.rule === 'random'), ctx: (rot ? 'rot' : R.phase) + ' ' + acts.map((a) => a.rule).join('+'), snap: R.log.slice() }; }, rot);
          await p.click(st.prep ? '#btnStart' : rot ? '#btnRotate' : '#btnStay'); await p.waitForTimeout(20); continue;
        }
        await p.waitForTimeout(25);
      }
      if (p.__errs.length) { bad++; ex.push(['err', p.__errs.join(' / ')]); }
      await ctx.close();
    }
    ok(bad === 0 && total > 40, '盤の被ダメ予告が、実際のダメージと一致（' + total + '人ぶん' + (bad ? '、不一致 ' + bad : '') + '）' + (ex.length ? ' ' + JSON.stringify(ex) : ''));
    ok(tixBad === 0 && tix > 10, '予告札の数字が、実際のダメージと一致（' + tix + 'ターンぶん' + (tixBad ? '、不一致 ' + tixBad : '') + '）');
    ok(cut > 0, '防御補助などで減るターンは、予告札が「軽減後」の数字になり、それが実際と一致（' + cut + '回）');
  }

  await b.close();
  console.log(fails ? '\n失敗 ' + fails : '\nすべて合格');
  process.exit(fails ? 1 : 0);
})();
