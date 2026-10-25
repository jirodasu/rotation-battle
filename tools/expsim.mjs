// 試作：遠征（第1章）の自動プレイ。ゲーム本体の EXP / JOBS / ENEMIES / RULES を読み、同じ規則で戦わせる。
// 30年モード（runsim.mjs）とは別。年齢・引退・入団はない。回転レリック・突入技の強化・「縛る」敵を含む。
//   node tools/expsim.mjs [回数=200] [EXP の上書きJSON]
// 事前に決めた合格線（戦略書「試作の合格線」）で判定する。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JOBS, ENEMIES, RULES } from './sim.mjs';

const SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');
function grab(name) {
  const m = SRC.match(new RegExp('const ' + name + ' = ([\\[{][\\s\\S]*?\\n  [\\]}]);'));
  return m ? Function('"use strict"; return (' + m[1] + ');')() : null;
}
export const EXP = grab('EXP');
const VARIANTS = grab('VARIANTS');
const BOSS = grab('BOSS');
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// ---- 1戦（tools/sim.mjs の battle と同じ規則＋盤の幅・回転レリック・縛り） ----
export function battle(en, party, policy, o) {
  const COLS = o.cols, R = RULES, rand = rng(o.seed || 1), rel = new Set(o.relics || []), RD = Object.fromEntries((o.relicDefs || EXP.relics).map((x) => [x.id, x]));
  const empty = () => Array.from({ length: 3 }, () => Array(COLS).fill(null));
  const unitsOf = (g) => { const a = []; for (let r = 0; r < 3; r++) for (let c = 0; c < COLS; c++) if (g[r][c]) a.push({ u: g[r][c], r, c }); return a; };
  const frontRow = (g) => { for (let r = 0; r < 3; r++) if (g[r].some(Boolean)) return r; return -1; };
  let grid = empty();
  party.forEach((p) => { grid[p.r][p.c] = Object.assign({}, p, { atkReady: true, defReady: true, sta: p.staMax, entered: false }); });
  const e = Object.assign({}, en, { hpNow: en.hp, charged: false });
  let fallen = 0, stay = 0, bound = false;
  // 実験用（ゲームには無い）：o.rot = { start, gain, cost, cap } … 回すには気力が要る。毎ターン gain 回復、回すと cost 消費
  const RT = o.rot || null; let gauge = RT ? RT.start : 0;
  const hpMap = () => { const m = {}; unitsOf(grid).forEach(({ u }) => { m[u.uid] = u.hp; }); return m; };
  for (let turn = 1; turn <= 40; turn++) {
    if (turn > 1) {
      const back = []; for (let c = 0; c < COLS; c++) if (grid[2][c]) back.push(grid[2][c]);
      back.forEach((u) => { u.hp = Math.min(u.max, u.hp + (u.rest || 0)); });
      back.filter((h) => h.heal > 0).forEach((h) => back.forEach((u) => { if (u !== h) u.hp = Math.min(u.max, u.hp + h.heal); }));
      back.forEach((u) => { u.sta = Math.min(u.staMax, u.sta + R.staBack); });
      for (let c = 0; c < COLS; c++) if (grid[1][c]) grid[1][c].sta = Math.min(grid[1][c].staMax, grid[1][c].sta + R.staMid);
    }
    const ent = new Map();
    unitsOf(grid).forEach(({ u, r }) => { if (r === 0 && u.entered && u.entry) ent.set(u, u.entry); });
    ent.forEach((x) => { if (x.heal) for (let c = 0; c < COLS; c++) { const u = grid[0][c]; if (u) u.hp = Math.min(u.max, u.hp + x.heal); } });
    const actors = [{ kind: 'e', spd: e.spd }];
    unitsOf(grid).forEach(({ u, r, c }) => { if (r === 0 || (r === 1 && u.ranged > 0)) actors.push({ kind: 'p', u, r, c, spd: u.spd + ((ent.get(u) && ent.get(u).spd) || 0) }); });
    actors.sort((x, y) => y.spd - x.spd || (x.kind === 'p' ? -1 : 1));
    const act = e.pattern[(turn - 1) % e.pattern.length];
    const guardCol = {};
    unitsOf(grid).forEach(({ u, r, c }) => {
      if (r !== 0) return;
      if (ent.get(u) && ent.get(u).guard) guardCol[c] = (guardCol[c] || 0) + ent.get(u).guard;
      if (u.entered && rel.has('shield')) guardCol[c] = (guardCol[c] || 0) + RD.shield.guard;
    });
    const teamGuard = [...ent.values()].reduce((s, x) => s + (x.teamGuard || 0), 0);
    const stayAtk = rel.has('stance') ? Math.min(RD.stance.stayMax, stay * RD.stance.stayAtk) : 0;
    for (const a of actors) {
      if (a.kind === 'e') {
        if (act.rule === 'charge') { e.charged = true; continue; }
        if (act.rule === 'bind') { bound = true; continue; }
        e.charged = false;
        const hit = (col) => {
          const fr = frontRow(grid); if (fr < 0 || !grid[fr][col]) return;
          const v = grid[fr][col]; let d = act.dmg;
          if (fr > 0) d *= 2;
          else {
            if (act.vsEntered && v.entered) d = Math.round(d * act.vsEntered);   // 実験用：入ったばかりの仲間に大きく当たる
            const m = grid[1][col];
            if (!act.pierce && m && m.defReady && m.defSup > 0) { d -= m.defSup; m.defReady = false; }
            d -= (guardCol[col] || 0) + teamGuard;
          }
          d = Math.max(1, d); v.hp = Math.max(0, v.hp - d);
          if (v.hp === 0) { grid[fr][col] = null; fallen++; }
        };
        const fr = frontRow(grid); if (fr < 0) return { win: false, turns: turn, fallen, hp: hpMap() };
        const L = unitsOf(grid).filter((x) => x.r === fr);
        if (act.rule === 'random') { for (let i = 0; i < act.hits; i++) { const f2 = frontRow(grid); if (f2 < 0) break; const L2 = unitsOf(grid).filter((x) => x.r === f2); hit(L2[Math.floor(rand() * L2.length)].c); } }
        else if (act.rule === 'all') L.map((x) => x.c).forEach(hit);
        else {
          let t = act.rule === 'job' ? L.find((x) => (x.u.jname || x.u.name) === act.job) : null;
          if (!t) t = L.reduce((p, q) => (q.u.hp < p.u.hp ? q : p));
          for (let i = 0; i < (act.hits || 1); i++) hit(t.c);
        }
        if (!unitsOf(grid).length) return { win: false, turns: turn, fallen, hp: hpMap() };
      } else {
        const { u, r, c } = a;
        if (grid[r][c] !== u) continue;
        let power, sup = 0;
        if (r === 0) {
          power = u.atk + stayAtk;
          const m = grid[1][c];
          if (m && m.atkReady && m.atkSup > 0) { sup = m.atkSup; m.atkReady = false; }
          const x = ent.get(u);
          if (x) power += (x.atk || 0) + (rel.has('bell') ? RD.bell.entryAtk : 0);
          if (u.staMax > 0) { if (u.sta <= 0) power = Math.ceil(power * R.tiredMul); u.sta = Math.max(0, u.sta - R.staCost); }
        } else power = u.ranged;
        const hitsN = (u.hits || 1) + ((ent.get(u) && ent.get(u).hits) || 0);
        let tot = 0; for (let i = 0; i < hitsN; i++) tot += Math.max(1, power + (i === 0 ? sup : 0) - e.def);
        e.hpNow -= tot;
        if (e.hpNow <= 0) return { win: true, turns: turn, fallen, hp: hpMap() };
      }
    }
    unitsOf(grid).forEach(({ u }) => { u.entered = false; });
    if (RT) gauge = Math.min(RT.cap, gauge + RT.gain);
    const canRot = !bound && (!RT || gauge >= RT.cost); bound = false;
    if (canRot && policy({ grid, turn, enemy: e, cols: COLS })) {
      const n = empty();
      for (let c = 0; c < COLS; c++) { n[0][c] = grid[1][c]; n[1][c] = grid[2][c]; n[2][c] = grid[0][c]; }
      if (rel.has('incense')) for (let c = 0; c < COLS; c++) { const u = n[2][c]; if (u) u.hp = Math.min(u.max, u.hp + RD.incense.backHeal); }
      grid = n; stay = 0; if (RT) gauge -= RT.cost;
      unitsOf(grid).forEach(({ u, r }) => { u.atkReady = true; u.defReady = true; u.entered = r === 0; });
    } else stay++;
  }
  return { win: false, turns: 40, fallen, hp: hpMap(), timeout: true };
}

// ---- 戦い方 ----
export const STAY = () => false;
export const SMART = (s) => {
  const g = s.grid, e = s.enemy, act = e.pattern[s.turn % e.pattern.length];
  const front = []; for (let c = 0; c < s.cols; c++) if (g[0][c]) front.push(g[0][c]);
  if (!front.length) return true;
  if (front.some((u) => u.staMax > 0 && u.sta <= 0)) return true;
  if (act.dmg) {
    const d = act.dmg * (act.hits || 1);
    if (act.rule === 'all' && front.some((u) => u.hp <= act.dmg)) return true;
    const low = front.reduce((a, b) => (b.hp < a.hp ? b : a));
    if (low.hp <= d) return true;
  }
  return front.reduce((s2, u) => s2 + u.hp / u.max, 0) / front.length < 0.5;
};

// ---- 1ラン（全3章・10地点。地点 cfg.chiefs が章の主、最後は毒竜） ----
function member(job, r, c, uid, cfg) {
  const j = JOBS.find((x) => x.id === job);
  // name は個人名、jname は職業名（ゲームの本番と同じ）。「職業を狙う」攻撃は jname で照合する
  return Object.assign({}, j, { uid, name: '団員' + uid, jname: j.name, job, r, c, max: j.hp, hp: j.hp, staMax: j.sta, entry: Object.assign({}, j.entry) });
}
export const chapterOf = (step, cfg) => cfg.chiefs.findIndex((c) => step <= c);
// 亜種（vkey）は VARIANTS をそのまま使う。rests：その章で休んだ回数（章の主は休むたびに強くなる：cfg.restPen）
export function enemyAt(step, k, cfg, vkey, rests = 0) {
  const ch = chapterOf(step, cfg), chief = cfg.chiefs.includes(step), key = chief ? cfg.chiefFoe[ch] : k;
  const base = key === 'boss' ? BOSS : typeof key === 'number' ? ENEMIES[key] : cfg[key];
  const t = step - 1, v = vkey ? VARIANTS[vkey] : null, rp = chief && cfg.restPen ? cfg.restPen : null;
  const kh = rp ? 1 + rp.hp * rests : 1, kd = rp ? 1 + rp.dmg * rests : 1;
  const pk = chief ? 'chief' + ch : String(key), pat = cfg.patch && cfg.patch[pk] ? cfg.patch[pk] : base.pattern;
  return Object.assign({}, base, { def: base.def + ((v && v.def) || 0), hp: Math.round(base.hp * cfg.hp[t] * kh * ((v && v.hp) || 1)), pattern: pat.map((a) => {
    const o = Object.assign({}, a, a.dmg ? { dmg: Math.round(a.dmg * cfg.dmg[t] * kd * ((v && v.dmg) || 1)) } : {});
    if (v && vkey === 'swarm' && o.dmg && (o.rule === 'job' || o.rule === 'lowhp')) Object.assign(o, { rule: 'random', hits: 2, dmg: Math.round(o.dmg * 0.6) });
    if (v && vkey === 'poison' && o.dmg) o.pierce = true;
    return o;
  }) });
}
export function upgrade(m, U) {
  const e = m.entry;
  if (e.guard) e.guard += U.guard; else if (e.heal) e.heal += U.heal; else if (e.teamGuard) e.teamGuard += U.teamGuard; else e.atk = (e.atk || 0) + U.atk;
}
// 章を越えたとき：全員全快、欠けた仲間の代わりを（職業はでたらめに）4人まで補う。空いたマスに回復列から入れる（ゲームの runGrid と同じ順）
function reinforce(members, cfg, cols, R, uidBase) {
  members.forEach((m) => { m.hp = m.max; });
  const n = cfg.party.length; let k = 0;
  while (members.length < n) {
    const used = new Set(members.map((m) => m.r + ',' + m.c)); let pos = null;
    for (const r of [2, 1, 0]) for (let c = 0; c < cols; c++) if (!pos && !used.has(r + ',' + c)) pos = [r, c];
    members.push(member(JOBS[Math.floor(R() * JOBS.length)].id, pos[0], pos[1], uidBase + '-' + (k++), cfg));
  }
}
// strat.node(['battle','rest']) / strat.reward(['relic','up','heal'])
export function playRun(seed, policy, strat = {}, over = {}) {
  const cfg = Object.assign({}, EXP, over), R = rng(seed), pick = (a) => a[Math.floor(R() * a.length)];
  const form = cfg.size === 5 ? cfg.party5 : cfg.party, cols = cfg.size === 5 ? 3 : cfg.cols;
  let members = form.map(([j, r, c], i) => member(j, r, c, 'm' + i, cfg));
  const relics = (cfg.startRelics || []).slice(); let fallen = 0, battles = 0, rests = 0;
  for (let step = 1; step <= cfg.nodes; step++) {
    const ch = chapterOf(step, cfg), chief = cfg.chiefs.includes(step);
    const type = chief ? 'battle' : (strat.node ? strat.node(['battle', 'rest'], step, R) : pick(['battle', 'rest']));
    if (type === 'rest') { rests++; members.forEach((m) => { m.hp = Math.min(m.max, m.hp + Math.ceil(m.max * (cfg.restHeal == null ? 1 : cfg.restHeal))); }); continue; }
    battles++;
    const fk = pick(cfg.foes[ch]), last = step === cfg.nodes;
    const vk = (!chief || (cfg.chiefVariant && !last)) && R() < cfg.variantRate ? pick(Object.keys(VARIANTS)) : null;
    const en = enemyAt(step, fk, cfg, vk, rests), bseed = Math.floor(R() * 1e9);
    const party = () => members.map((m) => Object.assign({}, m, { entry: Object.assign({}, m.entry) }));
    let res;
    if (policy === 'plan') {
      let best = null, sc0 = -1e9;
      for (let mk = 0; mk < 1024; mk++) {
        const r = battle(en, party(), (st) => (st.turn <= 10 ? !!((mk >> (st.turn - 1)) & 1) : SMART(st)), { cols, seed: bseed, relics, rot: cfg.rot, relicDefs: cfg.relics });
        const sc = (r.win ? 1e5 : 0) - r.fallen * 1000 + Object.values(r.hp).reduce((a, b) => a + b, 0);
        if (sc > sc0) { sc0 = sc; best = r; }
      }
      res = best;
    } else res = battle(en, party(), policy, { cols, seed: bseed, relics, rot: cfg.rot, relicDefs: cfg.relics });
    members.forEach((m) => { m.hp = res.hp[m.uid] != null ? res.hp[m.uid] : 0; });
    fallen += members.filter((m) => m.hp <= 0).length;
    members = members.filter((m) => m.hp > 0);
    if (!res.win || !members.length) return { clear: false, reached: step, fallen, battles, relics };
    members.forEach((m) => { m.hp = Math.min(m.max, m.hp + Math.ceil(m.max * cfg.afterHeal)); });
    if (!last) {
      const free = cfg.relics.filter((x) => !relics.includes(x.id));
      const tags = (free.length ? ['relic'] : []).concat(['up', 'heal']);
      let t = strat.reward ? strat.reward(tags) : pick(tags); if (!tags.includes(t)) t = pick(tags);
      if (t === 'relic') relics.push(pick(free).id);
      else if (t === 'up') upgrade(pick(members), cfg.up);
      else members.forEach((m) => { m.max += cfg.healMax || 0; m.hp = m.max; });   // 手当て：全快（＋最大HP）
      if (chief) { reinforce(members, cfg, cols, R, 's' + step); rests = 0; }   // 章を越えた
    }
  }
  return { clear: true, reached: cfg.nodes, fallen, battles, relics };
}

export function report(n = 200, over = {}) {
  const cfg = Object.assign({}, EXP, over);
  const rate = (pol, strat, N = n) => {
    let c = 0, f = 0; const reach = [0, 0, 0], pass = [0, 0, 0];
    for (let i = 1; i <= N; i++) {
      const r = playRun(i * 7919, pol, strat, over); if (r.clear) c++; f += r.fallen;
      cfg.chiefs.forEach((cs, k) => { const from = k ? cfg.chiefs[k - 1] : 0; if (r.reached > from) { reach[k]++; if (r.clear || r.reached > cs) pass[k]++; } });
    }
    return { clear: c / N, fallen: f / N, chap: pass.map((p, k) => (reach[k] ? p / reach[k] : 0)) };
  };
  function rng2(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  let rr = rng2(12345); const RANDOM = () => rr() < 0.5;
  const out = { stay: rate(STAY), always: rate(() => true) }; rr = rng2(12345); out.random = rate(RANDOM);
  out.smart = rate(SMART); out.plan = rate('plan', {}, Math.min(n, 120));
  out.rewards = { relic: rate(SMART, { reward: () => 'relic' }).clear, up: rate(SMART, { reward: () => 'up' }).clear, heal: rate(SMART, { reward: () => 'heal' }).clear };
  out.nodes = { fight: rate(SMART, { node: () => 'battle' }).clear, rest: rate(SMART, { node: () => 'rest' }).clear };
  return out;
}
// 事前に決めた合格線（全3章。2026-10-25）
export function judge(o) {
  const rw = Object.values(o.rewards), gap = o.plan.clear - o.smart.clear;
  return [
    ['回さない ≦5%', o.stay.clear <= 0.05],
    ['毎ターン回すだけ ≦15%', o.always.clear <= 0.15],
    ['でたらめ ≦15%', o.random.clear <= 0.15],
    ['標準 最後まで 25〜50%', o.smart.clear >= 0.25 && o.smart.clear <= 0.5],
    ['名人と標準の差 ≦45pt', gap <= 0.45],
    ['各章の突破率（着いた人のうち）50〜90%', o.smart.chap.every((x) => x >= 0.5 && x <= 0.9)],
    ['報酬の差 ≦10pt', Math.max(...rw) - Math.min(...rw) <= 0.10],
    ['標準：戦う ≧ 休む', o.nodes.fight >= o.nodes.rest]
  ];
}

if (process.argv[1] && /(^|[\\/])expsim\.mjs$/.test(process.argv[1])) {
  const n = +(process.argv[2] || 200), over = Object.assign({ size: 4 }, process.argv[3] ? JSON.parse(process.argv[3]) : {});
  const p = (v) => (v * 100).toFixed(1) + '%';
  const o = report(n, over);
  console.log(`== 遠征（全3章・仲間4人・盤 3列×${EXP.cols}）`);
  console.log(`回さない ${p(o.stay.clear)}　毎ターン回す ${p(o.always.clear)}　でたらめ ${p(o.random.clear)}　標準 ${p(o.smart.clear)}（倒れ ${o.smart.fallen.toFixed(2)}人）　名人 ${p(o.plan.clear)}（倒れ ${o.plan.fallen.toFixed(2)}人）`);
  console.log(`標準の章ごとの突破率（着いた人のうち）：${o.smart.chap.map((x, i) => '第' + (i + 1) + '章 ' + p(x)).join('　')}`);
  console.log(`報酬はいつも：レリック ${p(o.rewards.relic)}　突入技の強化 ${p(o.rewards.up)}　手当て ${p(o.rewards.heal)}`);
  console.log(`地点の選び方：戦闘を常に ${p(o.nodes.fight)}　休息を常に ${p(o.nodes.rest)}`);
  judge(o).forEach(([k, v]) => console.log((v ? '  OK  ' : '  NG  ') + k));
}
