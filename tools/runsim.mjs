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
const TRAITS = grab('TRAITS');
const VARIANTS = grab('VARIANTS');
export const SQUADS = grab('SQUADS');
export const ROGUE = grab('ROGUE');
let MENTORS = {}, CFG = RUN;
const COLS = 4;

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const phaseOf = (age) => AGE_PH.find((p) => age <= p.max);

function applyAge(m, fill) {
  const ph = phaseOf(m.age), b = m.base, add = (k) => m.bonus[k] || 0;
  const tr = m.trait ? TRAITS[m.trait] : null, tm = tr && tr.mul ? (tr.mul[ph.key] || 1) : 1, mul = (v) => Math.round(v * ph.mul * tm);
  const mt = MENTORS[m.job] && MENTORS[m.job] !== m.uid;
  m.max = Math.max(8, Math.round(b.hp * (ph.key === 'old' && !(tr && tr.keepHp) ? 0.9 : 1)) + add('hp') + ((tr && tr.hp) || 0) + (mt ? CFG.mentorHp : 0));
  m.atk = mul(b.atk) + add('atk') + (mt ? CFG.mentorAtk : 0);
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
function newMember(job, age, trait) {
  const j = JOBS.find((x) => x.id === job);
  const m = Object.assign({}, j, { uid: 'm' + (++uid), job, age, trait: trait || null, base: { hp: j.hp, atk: j.atk, ranged: j.ranged, atkSup: j.atkSup, defSup: j.defSup, heal: j.heal, rest: j.rest, sta: j.sta }, bonus: {}, equips: [], inherit: null, r: null, c: null });
  applyAge(m, true);
  return m;
}
function place(members) {
  const g = Array.from({ length: 3 }, () => Array(COLS).fill(null));
  members.forEach((m) => { if (m.r != null && !g[m.r][m.c]) g[m.r][m.c] = m; else m.r = null; });
  members.filter((m) => m.r == null).forEach((m) => { for (const r of [2, 1, 0]) for (let c = 0; c < COLS; c++) if (m.r == null && !g[r][c]) { g[r][c] = m; m.r = r; m.c = c; } });
}
export function runEnemy(step, cfg = RUN, vkey = null) {
  const tier = step <= 3 ? 0 : step <= 6 ? 1 : 2, start = [1, 4, 7][tier], boss = step === cfg.nodes;
  const base = boss ? BOSS : ENEMIES[tier], k = cfg.tierHp[tier] * (1 + cfg.hpStep * (step - start)), kd = cfg.tierDmg[tier] * (1 + cfg.dmgStep * (step - start));
  const v = !boss && vkey ? VARIANTS[vkey] : null;
  return Object.assign({}, base, { def: base.def + ((v && v.def) || 0), hp: Math.round(base.hp * k * ((v && v.hp) || 1)), pattern: base.pattern.map((a) => {
    const o = Object.assign({}, a, a.dmg ? { dmg: Math.round(a.dmg * kd * ((v && v.dmg) || 1)) } : {});
    if (v && vkey === 'swarm' && o.dmg && (o.rule === 'job' || o.rule === 'lowhp')) Object.assign(o, { rule: 'random', hits: 2, dmg: Math.round(o.dmg * 0.6) });
    if (v && vkey === 'poison' && o.dmg) o.pierce = true;
    return o;
  }) });
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
  const R = rng(seed); uid = 0; MENTORS = {}; CFG = cfg;
  const pick = (a) => a[Math.floor(R() * a.length)];
  // cfg.squad に騎士団の id を入れると、その編成から始める（無指定は標準）
  const sq = cfg.squad ? SQUADS.find((x) => x.id === cfg.squad) : null;
  const form = cfg.form ? cfg.form : sq ? sq.form : DEFAULT_FORM.map(([id, r, c]) => [id, r, c, cfg.start[id]]);
  let members = form.map(([id, r, c, age]) => { const m = newMember(id, age); m.r = r; m.c = c; return m; });
  // 語り継がれる者（cfg.legacy = 前の代の団員）：能力を保ったまま、同じ職業（無ければ同じ役割、無ければ最後）の初期団員と入れ替わる。年齢は cfg.legacyAge
  if (cfg.legacy) {
    const L = cfg.legacy, i0 = members.findIndex((m) => m.job === L.job), i1 = i0 >= 0 ? i0 : members.findIndex((m) => m.cls === JOBS.find((j) => j.id === L.job).cls), i = i1 >= 0 ? i1 : members.length - 1;
    const m = newMember(L.job, cfg.legacyAge === 'slot' ? members[i].age : cfg.legacyAge || 25, L.trait); const half = (b) => Object.fromEntries(Object.entries(b || {}).map(([k, v]) => [k, Math.trunc(v / 2)])); m.bonus = cfg.legacyMode === 'half' ? half(L.bonus) : cfg.legacyMode === 'none' ? {} : Object.assign({}, L.bonus); m.equips = cfg.legacyMode === 'none' ? [] : (L.equips || []).slice(); m.inherit = cfg.legacyMode === 'none' ? null : L.inherit || null; m.r = members[i].r; m.c = members[i].c; applyAge(m, true); members[i] = m;
  }
  // 地方（cfg.regions = [中盤, 終盤] の変異種。cfg.regionPick = 'random' なら別の乱数で2つ選ぶ。本体の乱数の並びは変えない）
  if (!cfg.regions && cfg.regionPick === 'random') { const R2 = rng(seed ^ 0x5bd1e995), ks = Object.keys(VARIANTS), a = ks.splice(Math.floor(R2() * ks.length), 1)[0]; cfg = Object.assign({}, cfg, { regions: [a, ks[Math.floor(R2() * ks.length)]] }); CFG = cfg; }
  let fallen = 0, retired = 0, battles = 0, fame = 0, spent = 0;
  const retiredList = [];
  const fin = (o) => Object.assign(o, { members, retiredList, fame, spent });
  const pairs = () => { const v = members.filter((m) => m.age >= 40), y = members.filter((m) => m.age <= 24 && !m.inherit), o = []; v.forEach((a) => y.forEach((b) => { if (a !== b) o.push([a, b]); })); return o; };
  const TK = Object.keys(TRAITS), VK = Object.keys(VARIANTS);
  const recruit = () => { if (members.length < cfg.cap) members.push(newMember(pick(JOBS).id, 16 + Math.floor(R() * 4), R() < cfg.traitRate ? pick(TK) : null)); };
  // 出来事（ゲームと同じ4種。選び方はランダム）
  const event = () => {
    const primes = members.filter((m) => m.phase === 'prime'), kinds = ['festival', 'plague', 'arms']; if (primes.length) kinds.push('marriage', 'marriage');
    const k = pick(kinds), a = R() < 0.5;
    if (k === 'festival') { const ys = members.filter((m) => m.phase === 'young' || m.phase === 'prime'); if (a || !ys.length) members.forEach((m) => { m.hp = m.max; }); else { const x = pick(ys); x.bonus.atk = (x.bonus.atk || 0) + 2; applyAge(x, false); } }
    else if (k === 'marriage') { const x = pick(primes); if (a) { x.bonus.hp = (x.bonus.hp || 0) + 6; applyAge(x, false); x.hp = Math.min(x.max, x.hp + 6); } else { x.bonus.atk = (x.bonus.atk || 0) + 2; applyAge(x, false); } }
    else if (k === 'plague') { const h = members.find((m) => m.heal > 0); if (h && a) { h.bonus.hp = (h.bonus.hp || 0) - 4; applyAge(h, false); } else members.forEach((m) => { m.hp = Math.max(1, m.hp - Math.ceil(m.max * 0.3)); }); }
    else equip();
  };
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
      const vk = step < cfg.nodes && R() < cfg.variantRate ? pick(VK) : null, reg = cfg.regions ? (step >= 4 && step <= 6 ? cfg.regions[0] : step >= 7 ? cfg.regions[1] : null) : null;
      const en = runEnemy(step, cfg, vk && reg ? reg : vk), bseed = Math.floor(R() * 1e9);
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
      if (!res.win || !members.length) return fin({ clear: false, reached: step, fallen, retired, battles });
      const bench = members.filter((m) => !fighters.includes(m));
      members.forEach((m) => { m.hp = bench.includes(m) ? m.max : Math.min(m.max, m.hp + Math.ceil(m.max * cfg.afterHeal)); });
      if (cfg.shop) fame += 1 + (res.fallen <= (en.allowFallen || 0) ? 1 : 0) + (res.turns <= (en.par || 99) ? 1 : 0);
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
    if (step === cfg.nodes) return fin({ clear: true, reached: step, fallen, retired, battles });
    members.forEach((m) => { m.age += cfg.years; if (m.age < cfg.retire) applyAge(m, false); });
    const gone = members.filter((m) => m.age >= cfg.retire);
    retired += gone.length; retiredList.push(...gone);
    gone.forEach((m) => { MENTORS[m.job] = m.uid; });
    members = members.filter((m) => m.age < cfg.retire);
    if (gone.length) members.forEach((m) => applyAge(m, false));
    if (!members.length) return fin({ clear: false, reached: step, fallen, retired, battles });
    // 章末の店（cfg.shop = 値段）：地点3・6の戦いのあと。手当て→装備→入団→稽古の順に、名声が足りる分だけ買う
    if (cfg.shop && cfg.forced[step] != null) {
      const P = cfg.shop, buy = (k, f) => { if (fame - spent >= P[k] && f() !== false) spent += P[k]; };
      const hpr = members.reduce((a, m) => a + m.hp, 0) / members.reduce((a, m) => a + m.max, 0);
      if (hpr < 0.8) buy('heal', () => members.forEach((m) => { m.hp = m.max; }));
      buy('equip', () => equip());
      if (members.length < cfg.cap) buy('recruit', () => recruit());
      buy('train', () => { const ys = members.filter((m) => phaseOf(m.age).key === 'young'); if (!ys.length) return false; ys.forEach((m) => { m.bonus.atk = (m.bonus.atk || 0) + cfg.restAtk; applyAge(m, false); }); });
    }
    if (cfg.forced[step + 1] == null && step + 1 < cfg.nodes && R() < cfg.eventRate) event();
  }
}

function rate(pol, strat, cfg, n) { let c = 0; for (let i = 1; i <= n; i++) if (playRun(i * 7919, pol, strat, cfg).clear) c++; return c / n; }
export function runReport(n = 300, cfg = RUN) {
  const out = {};
  for (const [name, pol] of [['回さない', STAY], ['回す判断あり', SMART], ['先読みの名人', 'plan']]) {
    let clear = 0, reached = 0, fallen = 0, retired = 0, clearLow = 0; const hist = Array(cfg.nodes + 1).fill(0);
    const N = pol === 'plan' ? Math.min(n, 120) : n;
    for (let i = 1; i <= N; i++) { const r = playRun(i * 7919, pol, {}, cfg); if (r.clear) { clear++; if (r.fallen <= 3) clearLow++; } reached += r.reached; fallen += r.fallen; retired += r.retired; hist[r.reached]++; }
    out[name] = { clearLow: clearLow / N, clear: clear / N, reached: reached / N, fallen: fallen / N, retired: retired / N, hist };
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

// ゲームと同じ設定（章末の店・地方選びあり）。RUN だけなら従来の測り方
export const GAME = Object.assign({}, RUN, { shop: ROGUE.shop, regionPick: 'random' });
if (process.argv[1] && /(^|[\\/])runsim\.mjs$/.test(process.argv[1])) {
  const n = +(process.argv[2] || 300);
  const cfg = Object.assign({}, GAME, process.argv[3] ? JSON.parse(process.argv[3]) : {});
  const rep = runReport(n, cfg);
  ['回さない', '回す判断あり', '先読みの名人'].forEach((k) => { const v = rep[k]; console.log(`${k}\tクリア率 ${(v.clear * 100).toFixed(1)}%\t平均到達 ${v.reached.toFixed(1)}/${cfg.nodes}\t戦死3人以下でクリア ${(v.clearLow * 100).toFixed(1)}%\t戦死 ${v.fallen.toFixed(1)}人\t引退 ${v.retired.toFixed(1)}人\t到達ノード分布 ${v.hist.slice(1).join(',')}`); });
  console.log('選び方ごと（回す判断あり）\t' + Object.entries(rep.strategies).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join('　'));
}
