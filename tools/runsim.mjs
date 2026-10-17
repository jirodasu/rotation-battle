// 「騎士団の30年」（1ラン）の自動プレイ。ゲーム本体の RUN / AGE_PH / EQUIPS / ENEMIES / JOBS を読み込み、
// 加齢・引退・入団・継承・装備・戦死を本体と同じ規則で再現して、ラン全体のクリア率を測る。
//   node tools/runsim.mjs [回数]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JOBS, ENEMIES, DEFAULT_FORM, battle } from './sim.mjs';

const SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');
function grab(name) {
  const m = SRC.match(new RegExp('const ' + name + ' = ([\\[{][\\s\\S]*?\\n  [\\]}]);'));
  return Function('"use strict"; return (' + m[1] + ');')();
}
export const RUN = grab('RUN');
const AGE_PH = grab('AGE_PH');
const EQUIPS = grab('EQUIPS');
const COLS = 4;

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const phaseOf = (age) => AGE_PH.find((p) => age <= p.max);

function applyAge(m, fill) {
  const ph = phaseOf(m.age), b = m.base, add = (k) => m.bonus[k] || 0, mul = (v) => Math.round(v * ph.mul);
  m.max = Math.max(8, Math.round(b.hp * (ph.key === 'old' ? 0.9 : 1)) + add('hp'));
  m.atk = mul(b.atk) + add('atk');
  m.ranged = b.ranged ? mul(b.ranged) + add('ranged') : 0;
  m.atkSup = b.atkSup ? Math.max(1, mul(b.atkSup)) : 0;
  m.defSup = b.defSup ? Math.max(1, mul(b.defSup)) + add('defSup') : 0;
  m.heal = b.heal ? Math.max(1, mul(b.heal)) : 0;
  m.rest = mul(b.rest) + add('rest');
  m.staMax = Math.max(1, b.sta + ph.sta + add('sta'));
  const e = Object.assign({}, m.inherit || JOBS.find((j) => j.id === m.job).entry);
  ['atk', 'guard', 'heal', 'teamGuard'].forEach((k) => { if (e[k]) e[k] = Math.round(e[k] * ph.ent); });
  m.entry = e;
  m.phase = ph.key;
  if (fill) m.hp = m.max; else m.hp = Math.min(m.hp, m.max);
}
let uid = 0;
function newMember(job, age) {
  const j = JOBS.find((x) => x.id === job);
  const m = Object.assign({}, j, { uid: 'm' + (++uid), job, age, base: { hp: j.hp, atk: j.atk, ranged: j.ranged, atkSup: j.atkSup, defSup: j.defSup, heal: j.heal, rest: j.rest, sta: j.sta }, bonus: {}, equips: [], inherit: null, r: null, c: null });
  applyAge(m, true);
  return m;
}
function place(members) {
  const g = Array.from({ length: 3 }, () => Array(COLS).fill(null));
  members.forEach((m) => { if (m.r != null && !g[m.r][m.c]) g[m.r][m.c] = m; else m.r = null; });
  members.filter((m) => m.r == null).forEach((m) => { for (const r of [2, 1, 0]) for (let c = 0; c < COLS; c++) if (m.r == null && !g[r][c]) { g[r][c] = m; m.r = r; m.c = c; } });
}
function runEnemy(step) {
  const tier = step <= 3 ? 0 : step <= 6 ? 1 : 2, start = [1, 4, 7][tier], boss = step === RUN.nodes;
  const base = ENEMIES[tier], k = RUN.tierHp[tier] * (1 + RUN.hpStep * (step - start) + (boss ? RUN.bossHp : 0)), kd = RUN.tierDmg[tier] * (1 + RUN.dmgStep * (step - start) + (boss ? RUN.bossDmg : 0));
  return Object.assign({}, base, { hp: Math.round(base.hp * k), pattern: base.pattern.map((a) => Object.assign({}, a, a.dmg ? { dmg: Math.round(a.dmg * kd) } : {})) });
}

// 戦い方：倒されそうな仲間がいる／前列が疲れている／前列の傷が深いときに回す
export const SMART = (s) => {
  const g = s.grid, e = s.enemy, act = e.pattern[s.turn % e.pattern.length];
  const front = []; for (let c = 0; c < COLS; c++) if (g[0][c]) front.push(g[0][c]);
  if (!front.length) return true;
  if (front.some((u) => u.staMax > 0 && u.sta <= 0)) return true;
  if (act.dmg) {
    const d = act.dmg * (act.hits || 1);
    if (act.rule === 'all' && front.some((u) => u.hp <= act.dmg)) return true;
    const low = front.reduce((a, b) => (b.hp < a.hp ? b : a));
    if (low.hp <= d) return true;
  }
  const hpf = front.reduce((s2, u) => s2 + u.hp / u.max, 0) / front.length;
  return hpf < 0.5;
};
export const STAY = () => false;

export function playRun(seed, policy) {
  const R = rng(seed); uid = 0;
  const pick = (a) => a[Math.floor(R() * a.length)];
  let members = DEFAULT_FORM.map(([id, r, c]) => { const m = newMember(id, RUN.start[id]); m.r = r; m.c = c; return m; });
  let fallen = 0, retired = 0, battles = 0;
  const pairs = () => { const v = members.filter((m) => m.age >= 40), y = members.filter((m) => m.age <= 24 && !m.inherit), o = []; v.forEach((a) => y.forEach((b) => { if (a !== b) o.push([a, b]); })); return o; };
  const recruit = () => { if (members.length < RUN.cap) { const m = newMember(pick(JOBS).id, 16 + Math.floor(R() * 4)); members.push(m); } };
  const inherit = ([v, y]) => { y.inherit = JOBS.find((j) => j.id === v.job).entry; y.bonus.atk = (y.bonus.atk || 0) + 2; applyAge(y, false); };
  for (let step = 1; step <= RUN.nodes; step++) {
    let type = 'battle';
    if (RUN.forced[step] == null) {
      const other = ['recruit', 'rest']; if (pairs().length) other.push('inherit');
      type = R() < 0.5 ? 'battle' : pick(other);
    }
    if (type === 'battle') {
      battles++;
      place(members);
      const en = runEnemy(step), bseed = Math.floor(R() * 1e9);
      let res;
      if (policy === 'plan') {
        // 先を読める上手なプレイヤー：回す／維持の手順を10手先まで全部試して、いちばん良い結果を選ぶ
        let best = null, bestScore = -1e9;
        for (let mk = 0; mk < 1024; mk++) {
          const r = battle(en, null, (st) => (st.turn <= 10 ? !!((mk >> (st.turn - 1)) & 1) : SMART(st)), { party: members.map((m) => Object.assign({}, m)), seed: bseed, maxTurns: 40 });
          const sc = (r.win ? 100000 : 0) - r.fallen * 1000 + Object.values(r.hp).reduce((a, b) => a + b, 0);
          if (sc > bestScore) { bestScore = sc; best = r; }
        }
        res = best;
      } else res = battle(en, null, policy, { party: members.map((m) => Object.assign({}, m)), seed: bseed, maxTurns: 40 });
      members.forEach((m) => { m.hp = res.hp[m.uid] != null ? res.hp[m.uid] : 0; });
      const dead = members.filter((m) => m.hp <= 0); fallen += dead.length;
      members = members.filter((m) => m.hp > 0);
      if (!res.win || !members.length) return { clear: false, reached: step, fallen, retired, battles };
      members.forEach((m) => { m.hp = Math.min(m.max, m.hp + Math.ceil(m.max * RUN.afterHeal)); });
      if (step < RUN.nodes) {
        const opts = [];
        if (members.length < RUN.cap) opts.push(() => recruit());
        const eq = []; EQUIPS.forEach((e) => members.forEach((m) => { if (e.ok(m) && !m.equips.includes(e.name)) eq.push([e, m]); }));
        if (eq.length) opts.push(() => { const [e, m] = pick(eq); m.bonus[e.key] = (m.bonus[e.key] || 0) + e.v; m.equips.push(e.name); applyAge(m, false); });
        const ps = pairs(); if (ps.length) opts.push(() => inherit(pick(ps))); else opts.push(() => members.forEach((m) => { m.hp = m.max; }));
        pick(opts)();
      }
    } else if (type === 'rest') members.forEach((m) => { m.hp = m.max; });
    else if (type === 'recruit') recruit();
    else if (type === 'inherit') { const ps = pairs(); if (ps.length) inherit(pick(ps)); }
    if (step === RUN.nodes) return { clear: true, reached: step, fallen, retired, battles };
    members.forEach((m) => { m.age += RUN.years; if (m.age < RUN.retire) applyAge(m, false); });
    retired += members.filter((m) => m.age >= RUN.retire).length;
    members = members.filter((m) => m.age < RUN.retire);
    if (!members.length) return { clear: false, reached: step, fallen, retired, battles };
  }
}

export function runReport(n = 300) {
  const out = {};
  for (const [name, pol] of [['回さない', STAY], ['回す判断あり', SMART], ['先読みの名人', 'plan']]) {
    let clear = 0, reached = 0, fallen = 0, retired = 0; const hist = Array(RUN.nodes + 1).fill(0);
    const N = pol === 'plan' ? Math.min(n, 120) : n;
    for (let i = 1; i <= N; i++) { const r = playRun(i * 7919, pol); if (r.clear) clear++; reached += r.reached; fallen += r.fallen; retired += r.retired; hist[r.reached]++; }
    out[name] = { clear: clear / N, reached: reached / N, fallen: fallen / N, retired: retired / N, hist };
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('runsim.mjs')) {
  const n = +(process.argv[2] || 300);
  if (process.argv[3]) Object.assign(RUN, JSON.parse(process.argv[3]));
  const rep = runReport(n);
  Object.entries(rep).forEach(([k, v]) => console.log(`${k}\tクリア率 ${(v.clear * 100).toFixed(1)}%\t平均到達 ${v.reached.toFixed(1)}/${RUN.nodes}\t戦死 ${v.fallen.toFixed(1)}人\t引退 ${v.retired.toFixed(1)}人\t到達ノード分布 ${v.hist.slice(1).join(',')}`));
}
