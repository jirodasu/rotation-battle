// 「騎士団の30年」（1ラン）の自動プレイ。ゲーム本体の RUN / AGE_PH / EQUIPS / BOSS / ENEMIES / JOBS を読み込み、
// 加齢・引退・入団・継承・装備・訓練・戦死・出撃枠を本体と同じ規則で再現して、ラン全体のクリア率を測る。
//   node tools/runsim.mjs [回数] [RUN の上書きJSON]
// 支配戦略（どれか1つの選び方だけが極端に強い状態）がないかも一緒に調べる。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JOBS, ENEMIES, DEFAULT_FORM, battle } from './sim.mjs';

const SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');
function grab(name) {
  const m = SRC.match(new RegExp('const ' + name + ' = ([\\[{][\\s\\S]*?\\n  [\\]}]);')) || SRC.match(new RegExp('const ' + name + ' = ([\\[{].*?[\\]}]);'));
  return Function('"use strict"; return (' + m[1] + ');')();
}
export const RUN = grab('RUN');
const AGE_PH = grab('AGE_PH');
const EQUIPS = grab('EQUIPS');
export const BOSS = grab('BOSS');
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
export function runEnemy(step, cfg = RUN) {
  const tier = step <= 3 ? 0 : step <= 6 ? 1 : 2, start = [1, 4, 7][tier], boss = step === cfg.nodes;
  const base = boss ? BOSS : ENEMIES[tier], k = cfg.tierHp[tier] * (1 + cfg.hpStep * (step - start)), kd = cfg.tierDmg[tier] * (1 + cfg.dmgStep * (step - start));
  return Object.assign({}, base, { hp: Math.round(base.hp * k), pattern: base.pattern.map((a) => Object.assign({}, a, a.dmg ? { dmg: Math.round(a.dmg * kd) } : {})) });
}
// 出撃する仲間（ゲームでは編成画面で自分で選ぶ。ここでは強い順に枠まで）
const power = (m) => m.hp * (m.atk + m.heal * 2 + m.defSup + 4);
export function pickSortie(members, n) { return members.slice().sort((a, b) => power(b) - power(a)).slice(0, n); }

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

// strat.node(選択肢, members, step, R) → 'battle' | 'rest' | 'inherit'
// strat.reward(タグ一覧) → 選ぶタグ（'equip' | 'inherit' | 'heal' | 'equip2'）
// strat.recruit → false なら入団を断る
export function playRun(seed, policy, strat = {}, cfg = RUN, log = null) {
  const R = rng(seed); uid = 0;
  const pick = (a) => a[Math.floor(R() * a.length)];
  let members = DEFAULT_FORM.map(([id, r, c]) => { const m = newMember(id, cfg.start[id]); m.r = r; m.c = c; return m; });
  let fallen = 0, retired = 0, battles = 0;
  const pairs = () => { const v = members.filter((m) => m.age >= 40), y = members.filter((m) => m.age <= 24 && !m.inherit), o = []; v.forEach((a) => y.forEach((b) => { if (a !== b) o.push([a, b]); })); return o; };
  const recruit = () => { if (members.length < cfg.cap) members.push(newMember(pick(JOBS).id, 16 + Math.floor(R() * 4))); };
  const inherit = ([v, y]) => { y.inherit = JOBS.find((j) => j.id === v.job).entry; y.bonus.atk = (y.bonus.atk || 0) + cfg.inhAtk; y.bonus.hp = (y.bonus.hp || 0) + cfg.inhHp; applyAge(y, false); };
  const equip = () => { const eq = []; EQUIPS.forEach((e) => members.forEach((m) => { if (e.ok(m) && !m.equips.includes(e.name)) eq.push([e, m]); })); if (!eq.length) return false; const [e, m] = pick(eq); m.bonus[e.key] = (m.bonus[e.key] || 0) + e.v; m.equips.push(e.name); applyAge(m, false); return true; };
  for (let step = 1; step <= cfg.nodes; step++) {
    let type = 'battle';
    if (cfg.forced[step] == null) {
      const other = ['rest']; if (pairs().length) other.push('inherit');
      const opts = ['battle', pick(other)];
      type = strat.node ? strat.node(opts, members, step, R) : pick(opts);
    }
    if (type === 'battle') {
      battles++;
      const fighters = pickSortie(members, cfg.sortie);
      place(fighters);
      const en = runEnemy(step, cfg), bseed = Math.floor(R() * 1e9);
      const party = () => fighters.map((m) => Object.assign({}, m));
      if (strat.onBattle) strat.onBattle(en, party(), bseed, step);
      let res;
      if (policy === 'plan') {
        // 先を読める上手なプレイヤー：回す／維持の手順を10手先まで全部試して、いちばん良い結果を選ぶ
        let best = null, bestScore = -1e9;
        for (let mk = 0; mk < 1024; mk++) {
          const r = battle(en, null, (st) => (st.turn <= 10 ? !!((mk >> (st.turn - 1)) & 1) : SMART(st)), { party: party(), seed: bseed, maxTurns: 40 });
          const sc = (r.win ? 100000 : 0) - r.fallen * 1000 + Object.values(r.hp).reduce((a, b) => a + b, 0);
          if (sc > bestScore) { bestScore = sc; best = r; }
        }
        res = best;
      } else res = battle(en, null, policy, { party: party(), seed: bseed, maxTurns: 40 });
      if (log) log.push({ step, turns: res.turns, win: res.win, fallen: res.fallen, n: fighters.length, all: members.length });
      fighters.forEach((m) => { m.hp = res.hp[m.uid] != null ? res.hp[m.uid] : 0; });
      const dead = members.filter((m) => m.hp <= 0); fallen += dead.length;
      members = members.filter((m) => m.hp > 0);
      if (!res.win || !members.length) return { clear: false, reached: step, fallen, retired, battles };
      const bench = members.filter((m) => !fighters.includes(m));
      members.forEach((m) => { m.hp = bench.includes(m) ? m.max : Math.min(m.max, m.hp + Math.ceil(m.max * cfg.afterHeal)); });
      if (step < cfg.nodes) {
        if (strat.recruit !== false) recruit();
        const stars = res.fallen === 0 && res.turns <= (en.par || 99) ? 3 : 0;
        const tags = ['equip']; if (pairs().length) tags.push('inherit'); tags.push('heal'); if (stars === 3 && cfg.bonusPick) tags.push('equip2');
        let t = strat.reward ? strat.reward(tags) : pick(tags); if (!tags.includes(t)) t = pick(tags);
        if (t === 'equip' || t === 'equip2') { if (!equip()) members.forEach((m) => { m.hp = m.max; }); }
        else if (t === 'inherit') inherit(pick(pairs()));
        else members.forEach((m) => { m.hp = m.max; if (cfg.healTrain && phaseOf(m.age).key === 'young') { m.bonus.atk = (m.bonus.atk || 0) + cfg.restAtk; applyAge(m, false); } });
      }
    } else if (type === 'rest') {
      members.forEach((m) => { m.hp = m.max; if (phaseOf(m.age).key === 'young') { m.bonus.atk = (m.bonus.atk || 0) + cfg.restAtk; applyAge(m, false); } });
      if (cfg.restRecruit && strat.recruit !== false) recruit();
    }
    else if (type === 'inherit') { const ps = pairs(); if (ps.length) inherit(pick(ps)); }
    if (step === cfg.nodes) return { clear: true, reached: step, fallen, retired, battles };
    members.forEach((m) => { m.age += cfg.years; if (m.age < cfg.retire) applyAge(m, false); });
    retired += members.filter((m) => m.age >= cfg.retire).length;
    members = members.filter((m) => m.age < cfg.retire);
    if (!members.length) return { clear: false, reached: step, fallen, retired, battles };
  }
}

function rate(pol, strat, cfg, n) { let c = 0; for (let i = 1; i <= n; i++) if (playRun(i * 7919, pol, strat, cfg).clear) c++; return c / n; }
export function runReport(n = 300, cfg = RUN) {
  const out = {};
  for (const [name, pol] of [['回さない', STAY], ['回す判断あり', SMART], ['先読みの名人', 'plan']]) {
    let clear = 0, reached = 0, fallen = 0, retired = 0; const hist = Array(cfg.nodes + 1).fill(0);
    const N = pol === 'plan' ? Math.min(n, 120) : n;
    for (let i = 1; i <= N; i++) { const r = playRun(i * 7919, pol, {}, cfg); if (r.clear) clear++; reached += r.reached; fallen += r.fallen; retired += r.retired; hist[r.reached]++; }
    out[name] = { clear: clear / N, reached: reached / N, fallen: fallen / N, retired: retired / N, hist };
  }
  // 選び方ごとのクリア率（回す判断あり）。どれか1つだけ極端に高い／0%に近いものがあれば要調整
  const S = {
    '戦闘を常に選ぶ': { node: () => 'battle' }, '戦闘を避ける': { node: (o) => o.find((x) => x !== 'battle') },
    '休息・訓練を優先': { node: (o) => (o.includes('rest') ? 'rest' : 'battle') }, '入団を断る': { recruit: false },
    '報酬はいつも装備': { reward: () => 'equip' }, '報酬はいつも継承': { reward: (t) => (t.includes('inherit') ? 'inherit' : 'equip') }, '報酬はいつも手当て': { reward: () => 'heal' }
  };
  out.strategies = Object.fromEntries(Object.entries(S).map(([k, s]) => [k, rate(SMART, s, cfg, n)]));
  return out;
}

if (process.argv[1] && /(^|[\\/])runsim\.mjs$/.test(process.argv[1])) {
  const n = +(process.argv[2] || 300);
  const cfg = Object.assign({}, RUN, process.argv[3] ? JSON.parse(process.argv[3]) : {});
  const rep = runReport(n, cfg);
  ['回さない', '回す判断あり', '先読みの名人'].forEach((k) => { const v = rep[k]; console.log(`${k}\tクリア率 ${(v.clear * 100).toFixed(1)}%\t平均到達 ${v.reached.toFixed(1)}/${cfg.nodes}\t戦死 ${v.fallen.toFixed(1)}人\t引退 ${v.retired.toFixed(1)}人\t到達ノード分布 ${v.hist.slice(1).join(',')}`); });
  console.log('選び方ごと（回す判断あり）\t' + Object.entries(rep.strategies).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join('　'));
}
