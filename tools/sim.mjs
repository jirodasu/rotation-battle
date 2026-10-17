// ローテーションバトル　自動対戦シミュレーター（ヘッドレス）
// ゲーム本体 index.html から JOBS / ENEMIES / RULES をそのまま読み込み、同じルールで戦わせる。
//   node tools/sim.mjs            … 全戦闘のレポート
//   node tools/sim.mjs --json     … 数値だけ JSON で出す
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'index.html'), 'utf8');
function grab(name) {
  const one = SRC.match(new RegExp('const ' + name + ' = ([\\[{][^\\n]*[\\]}]);\\n'));
  const m = one || SRC.match(new RegExp('const ' + name + ' = ([\\[{][\\s\\S]*?\\n  [\\]}]);'));
  if (!m) return null;
  return Function('"use strict"; return (' + m[1] + ');')();
}
export const JOBS = grab('JOBS');
export const ENEMIES = grab('ENEMIES');
export const DEFAULT_FORM = grab('DEFAULT_FORM');
export const RULES = Object.assign({
  stamina: false,      // 前列スタミナ
  staCost: 1,          // 前列で1回攻撃するごとの消耗
  staMid: 0,           // 補助列にいる間の回復量（1ターン）
  staBack: 99,         // 回復列にいる間の回復量（1ターン）
  tiredMul: 0.5,       // スタミナ0のときの攻撃倍率
  entry: false         // 突入技
}, grab('RULES') || {});

const ROWS = 3, COLS = 4;
const hpMap = (g) => { const m = {}; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if (g[r][c] && g[r][c].uid) m[g[r][c].uid] = g[r][c].hp; return m; };

// 乱数（シード固定）
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function makeUnits() { return JOBS.map((j) => Object.assign({}, j, { max: j.hp, atkReady: true, defReady: true, sta: j.sta || 0, staMax: j.sta || 0, entered: false })); }
const empty = () => Array.from({ length: ROWS }, () => Array(COLS).fill(null));
const unitsOf = (g) => { const a = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (g[r][c]) a.push({ u: g[r][c], r, c }); return a; };
const frontRow = (g) => { for (let r = 0; r < ROWS; r++) if (g[r].some(Boolean)) return r; return -1; };

// 1戦を最後まで戦う。policy(state) → true で回す
export function battle(enemyDef, form, policy, opt = {}) {
  const R = Object.assign({}, RULES, opt.rules || {});
  const rand = rng(opt.seed || 1);
  const g = empty();
  if (opt.party) opt.party.forEach((p) => { g[p.r][p.c] = Object.assign({}, p, { atkReady: true, defReady: true, sta: p.staMax, entered: false }); });
  else { const roster = makeUnits(); form.forEach(([id, r, c]) => { g[r][c] = roster.find((u) => u.id === id); }); }
  const e = Object.assign({}, enemyDef, { hpNow: enemyDef.hp, charged: false });
  let grid = g, fallen = 0, taken = 0;
  const maxTurns = opt.maxTurns || 40;
  unitsOf(grid).forEach(({ u }) => { u.entered = false; });   // 突入技は「回して攻撃列に入った」ときだけ
  for (let turn = 1; turn <= maxTurns; turn++) {
    if (turn > 1) {
      // 回復列：休む → 列回復
      const back = []; for (let c = 0; c < COLS; c++) if (grid[2][c]) back.push(grid[2][c]);
      back.forEach((u) => { u.hp = Math.min(u.max, u.hp + (u.rest || 0)); });
      back.filter((h) => h.heal > 0).forEach((h) => back.forEach((u) => { if (u !== h) u.hp = Math.min(u.max, u.hp + h.heal); }));
      if (R.stamina) {
        back.forEach((u) => { u.sta = Math.min(u.staMax, u.sta + R.staBack); });
        for (let c = 0; c < COLS; c++) if (grid[1][c]) grid[1][c].sta = Math.min(grid[1][c].staMax, grid[1][c].sta + R.staMid);
      }
    }
    // 突入技（このターンだけ）
    const ent = new Map();
    if (R.entry) unitsOf(grid).forEach(({ u, r }) => { if (r === 0 && u.entered && u.entry) ent.set(u, u.entry); });
    ent.forEach((en) => { if (en.heal) for (let c = 0; c < COLS; c++) { const u = grid[0][c]; if (u) u.hp = Math.min(u.max, u.hp + en.heal); } });
    const actors = [{ kind: 'e', spd: e.spd }];
    unitsOf(grid).forEach(({ u, r, c }) => { if (r === 0 || (r === 1 && u.ranged > 0)) actors.push({ kind: 'p', u, r, c, spd: u.spd + ((ent.get(u) && ent.get(u).spd) || 0) }); });
    actors.sort((x, y) => y.spd - x.spd || (x.kind === 'p' ? -1 : 1));
    const act = e.pattern[(turn - 1) % e.pattern.length];
    const guardCol = {};
    if (R.entry) unitsOf(grid).forEach(({ u, r, c }) => { if (r === 0 && ent.get(u) && ent.get(u).guard) guardCol[c] = (guardCol[c] || 0) + ent.get(u).guard; });
    const teamGuard = R.entry ? [...ent.values()].reduce((s, x) => s + (x.teamGuard || 0), 0) : 0;
    for (const a of actors) {
      if (a.kind === 'e') {
        if (act.rule === 'charge') { e.charged = true; continue; }
        e.charged = false;
        const hit = (col) => {
          const fr = frontRow(grid); if (fr < 0 || !grid[fr][col]) return;
          const v = grid[fr][col]; let d = act.dmg;
          if (fr > 0) d *= 2;
          else {
            const m = grid[1][col];
            if (!act.pierce && m && m.defReady && m.defSup > 0) { d -= m.defSup; m.defReady = false; }
            d -= (guardCol[col] || 0) + teamGuard;
          }
          d = Math.max(1, d); v.hp = Math.max(0, v.hp - d); taken += d;
          if (v.hp === 0) { grid[fr][col] = null; fallen++; }
        };
        const fr = frontRow(grid); if (fr < 0) return { win: false, turns: turn, fallen, taken, hp: hpMap(grid) };
        const L = unitsOf(grid).filter((x) => x.r === fr);
        if (act.rule === 'random') { for (let i = 0; i < act.hits; i++) { const f2 = frontRow(grid); if (f2 < 0) break; const L2 = unitsOf(grid).filter((x) => x.r === f2); hit(L2[Math.floor(rand() * L2.length)].c); } }
        else if (act.rule === 'all') L.map((x) => x.c).forEach(hit);
        else {
          let t = act.rule === 'job' ? L.find((x) => x.u.name === act.job) : null;
          if (!t) t = L.reduce((p, q) => (q.u.hp < p.u.hp ? q : p));
          for (let i = 0; i < (act.hits || 1); i++) hit(t.c);
        }
        if (!unitsOf(grid).length) return { win: false, turns: turn, fallen, taken, hp: hpMap(grid) };
      } else {
        const { u, r, c } = a;
        if (grid[r][c] !== u) continue;
        let power, sup = 0;
        if (r === 0) {
          power = u.atk;
          const m = grid[1][c];
          if (m && m.atkReady && m.atkSup > 0) { sup = m.atkSup; m.atkReady = false; }
          const en = ent.get(u);
          if (en) power += en.atk || 0;
          if (R.stamina && u.staMax > 0) {
            if (u.sta <= 0) power = Math.ceil(power * R.tiredMul);
            u.sta = Math.max(0, u.sta - R.staCost);
          }
        } else power = u.ranged;
        const hitsN = (u.hits || 1) + ((ent.get(u) && ent.get(u).hits) || 0);
        let tot = 0; for (let i = 0; i < hitsN; i++) tot += Math.max(1, power + (i === 0 ? sup : 0) - e.def);
        e.hpNow -= tot;
        if (e.hpNow <= 0) return { win: true, turns: turn, fallen, taken, hp: hpMap(grid) };
      }
    }
    // 判断
    unitsOf(grid).forEach(({ u }) => { u.entered = false; });
    if (policy({ grid, turn, enemy: e, rules: R })) {
      const n = empty();
      for (let c = 0; c < COLS; c++) { n[0][c] = grid[1][c]; n[1][c] = grid[2][c]; n[2][c] = grid[0][c]; }
      grid = n;
      unitsOf(grid).forEach(({ u, r }) => { u.atkReady = true; u.defReady = true; u.entered = r === 0; });
    }
  }
  return { win: false, turns: maxTurns, fallen, taken, timeout: true, hp: hpMap(grid) };
}

// ---- 戦い方 ----
export const POLICIES = {
  stay: () => false,
  always: () => true,
  alt: (s) => s.turn % 2 === 0
};
export function seqPolicy(bits) { return (s) => !!bits[s.turn - 1]; }

// ---- 隊列のサンプル ----
export function randomForms(n, seed = 7, minFront = 2) {
  const r = rng(seed), ids = JOBS.map((j) => j.id), out = [];
  while (out.length < n) {
    const slots = []; for (let i = 0; i < ROWS * COLS; i++) slots.push(i);
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    const f = ids.map((id, i) => [id, Math.floor(slots[i] / COLS), slots[i] % COLS]);
    if (f.filter((x) => x[1] === 0).length >= minFront) out.push(f);
  }
  return out;
}
const SEEDS = [1, 2, 3, 4, 5];
const hasRandom = (en) => en.pattern.some((a) => a.rule === 'random');

// 決まった戦い方で、いろいろな隊列・乱数で勝てる割合
export function winRate(en, forms, policy, rules) {
  let w = 0, n = 0;
  const seeds = hasRandom(en) ? SEEDS : [1];
  forms.forEach((f) => seeds.forEach((s) => { n++; if (battle(en, f, policy, { seed: s, rules }).win) w++; }));
  return w / n;
}
// 回す／維持の全パターン（深さ depth まで）を試し、勝てる手順の割合と最良手順を出す
export function search(en, form, depth, rules) {
  let wins = 0, total = 0, best = null;
  const seeds = hasRandom(en) ? SEEDS : [1];
  for (let m = 0; m < (1 << depth); m++) {
    const bits = []; for (let i = 0; i < depth; i++) bits.push((m >> i) & 1);
    total++;
    const rs = seeds.map((s) => battle(en, form, seqPolicy(bits), { seed: s, rules }));
    if (rs.every((x) => x.win)) {
      wins++;
      const f = Math.max(...rs.map((x) => x.fallen)), t = Math.max(...rs.map((x) => x.turns));
      if (!best || f < best.fallen || (f === best.fallen && t < best.turns)) best = { fallen: f, turns: t, bits: bits.slice(0, t).join('') };
    }
  }
  return { winShare: wins / total, best };
}

export function report(rules, nForms = 400) {
  const forms = randomForms(nForms);
  return ENEMIES.map((en) => {
    const stayAny = winRate(en, forms, POLICIES.stay, rules);
    const stayDef = battle(en, DEFAULT_FORM, POLICIES.stay, { rules }).win;
    const alwaysAny = winRate(en, forms, POLICIES.always, rules);
    const s = search(en, DEFAULT_FORM, 14, rules);
    return { enemy: en.name, par: en.par, stayAny, stayDefault: stayDef, alwaysAny, searchWinShare: s.winShare, best: s.best };
  });
}

if (process.argv[1] && /(^|[\\/])sim\.mjs$/.test(process.argv[1])) {
  const json = process.argv.includes('--json');
  const rep = report();
  if (json) { console.log(JSON.stringify({ rules: RULES, rep }, null, 1)); }
  else {
    console.log('ルール', JSON.stringify(RULES));
    let sum = 0;
    rep.forEach((x) => {
      sum += x.stayAny;
      console.log(`${x.enemy}\t回さない勝率 ${(x.stayAny * 100).toFixed(1)}%（初期隊列で回さない: ${x.stayDefault ? '勝ち' : '負け'}）\t毎ターン回す ${(x.alwaysAny * 100).toFixed(1)}%\t初期隊列で勝てる手順 ${(x.searchWinShare * 100).toFixed(1)}%\t最良 ${x.best ? `倒れ${x.best.fallen} ${x.best.turns}T（目標${x.par}T） ${x.best.bits}` : 'なし'}`);
    });
    console.log(`平均：回さない勝率 ${(sum / rep.length * 100).toFixed(1)}%（基準 20%未満）`);
  }
}
