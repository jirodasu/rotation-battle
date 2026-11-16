// 敵10体の検討（2026-11-17）：候補の敵を1章の「ふつうの戦闘の敵」に置いて、遠征全体を自動対戦で回す。
//   比べるもの：仕掛けあり／仕掛けなし（ふつうの技に置き換え）、予告を読む遊び方（SMART2）／読まない遊び方（SMART）／毎ターン維持／毎ターン回す
//   node tools/enemysim.mjs [回数=400]
import { playRun, SMART, STAY, EXP } from './expsim.mjs';

export const CANDS = {
  weight: { ch: 0, def: { name: '重石の番兵', hp: 140, spd: 4, def: 2, pattern: [
    { name: '押し潰し', rule: 'highhp', dmg: 18 }, { name: 'ちからをためる', rule: 'charge' }, { name: '大槌', rule: 'highhp', dmg: 32 }, { name: '薙ぎ', rule: 'all', dmg: 10 }] } },
  thief: { ch: 0, def: { name: '灯盗みの影猫', hp: 130, spd: 8, def: 0, pattern: [
    { name: 'ひっかき', rule: 'lowhp', dmg: 14 }, { name: '灯を盗む', rule: 'lowhp', dmg: 10, steal: { at: 3, n: 2 } }, { name: '二度ひっかき', rule: 'random', hits: 2, dmg: 9 }, { name: 'とびかかり', rule: 'lowhp', dmg: 24 }] } },
  silence: { ch: 1, def: { name: '沈黙の司書', hp: 250, spd: 4, def: 2, pattern: [
    { name: '本の角', rule: 'lowhp', dmg: 18 }, { name: 'ちからをためる', rule: 'charge' }, { name: '静粛に', rule: 'all', dmg: 8, silence: true }, { name: '禁書の頁', rule: 'all', dmg: 26 }] } },
  shell: { ch: 1, def: { name: '割れ殻の守り貝', hp: 220, spd: 3, def: 1, shell: { min: 18, every: 3 }, pattern: [
    { name: '殻ごし体当たり', rule: 'lowhp', dmg: 16 }, { name: '潮騒', rule: 'all', dmg: 10 }, { name: 'ちからをためる', rule: 'charge' }, { name: '大波', rule: 'all', dmg: 24 }] } },
  thorns: { ch: 1, def: { name: '棘殻の聖骸', hp: 260, spd: 3, def: 2, pattern: [
    { name: '骨の鞭', rule: 'lowhp', dmg: 18 }, { name: '棘をまとう', rule: 'all', dmg: 6, thorns: 4 }, { name: 'ちからをためる', rule: 'charge' }, { name: '骨嵐', rule: 'all', dmg: 24 }] } },
  bell: { ch: 1, def: { name: '鐘楼の鳴き鐘', hp: 250, spd: 3, def: 2, bell: { at: 3, act: { dmg: 26 } }, pattern: [
    { name: '鐘の舌', rule: 'lowhp', dmg: 18 }, { name: '余韻', rule: 'all', dmg: 10 }, { name: '打ち鳴らし', rule: 'lowhp', dmg: 20 }, { name: '余韻', rule: 'all', dmg: 10 }] } },
  reverse: { ch: 2, def: { name: '逆さ時計の守', hp: 280, spd: 5, def: 2, pattern: [
    { name: '針', rule: 'lowhp', dmg: 20 }, { name: '時を戻す', rule: 'all', dmg: 8, reverse: true }, { name: 'ちからをためる', rule: 'charge' }, { name: '秒針の嵐', rule: 'random', hits: 3, dmg: 12 }] } },
  swap: { ch: 2, def: { name: '札替えの奇術師', hp: 260, spd: 6, def: 1, pattern: [
    { name: '札投げ', rule: 'random', hits: 2, dmg: 12 }, { name: 'すり替え', rule: 'lowhp', dmg: 14, swap: true }, { name: '手品', rule: 'all', dmg: 12 }, { name: '大仕掛け', rule: 'all', dmg: 22 }] } },
  hourglass: { ch: 2, def: { name: '時告げの砂時計', hp: 240, spd: 4, def: 1, pattern: [
    { name: 'こぼれ砂', rule: 'all', dmg: 8 }, { name: '砂礫', rule: 'lowhp', dmg: 16 }, { name: 'こぼれ砂', rule: 'all', dmg: 8 }, { name: '砂礫', rule: 'lowhp', dmg: 16 }, { name: 'こぼれ砂', rule: 'all', dmg: 8 }, { name: '砂礫', rule: 'lowhp', dmg: 16 }, { name: '終の刻', rule: 'all', dmg: 60, pierce: true }] } },
  silence2: { ch: 1, def: { name: '沈黙の司書（改）', hp: 250, spd: 4, def: 2, pattern: [
    { name: '本の角', rule: 'lowhp', dmg: 18 }, { name: '頁めくり', rule: 'all', dmg: 10 }, { name: 'ちからをためる', rule: 'charge' }, { name: '静粛に（禁書の頁）', rule: 'all', dmg: 24, silence: true }] } },
  phase: { ch: 2, def: { name: '二つ顔の祭司', hp: 300, spd: 5, def: 2, phase2: { at: 0.5, pattern: [
    { name: '裏の顔', rule: 'back', dmg: 16 }, { name: '断罪', rule: 'lowhp', dmg: 26 }, { name: '呪詛', rule: 'all', dmg: 14, pierce: true }, { name: '審判', rule: 'all', dmg: 26, pierce: true }] }, pattern: [
    { name: '祝詞', rule: 'all', dmg: 12 }, { name: '断罪', rule: 'lowhp', dmg: 24 }, { name: 'ちからをためる', rule: 'charge' }, { name: '審判', rule: 'all', dmg: 26, pierce: true }] } }
};
// 仕掛けを外した同じ敵（数値はそのまま、ふつうの技に置き換える）
export function plain(d) {
  const o = JSON.parse(JSON.stringify(d));
  const fix = (a) => { if (a.rule === 'highhp') a.rule = 'lowhp'; if (a.dmg >= 60) a.dmg = 24; delete a.steal; delete a.silence; delete a.thorns; delete a.reverse; delete a.swap; return a; };
  o.pattern = o.pattern.map(fix); delete o.shell; delete o.bell;
  if (o.phase2) { o.pattern = o.pattern; delete o.phase2; }
  return o;
}
// 予告を読む遊び方：SMART に、新しい仕掛けへの対応を足したもの（ゲームの予告に出ることだけを使う）
export const SMART2 = (s) => {
  const e = s.enemy, pat = e.phase2 && e.hpNow < e.hp * e.phase2.at ? e.phase2.pattern : e.pattern, nx = pat[s.turn % pat.length];
  const g = s.grid, C = s.cols, row = (r) => { const a = []; for (let c = 0; c < C; c++) if (g[r][c]) a.push(g[r][c]); return a; };
  const front = row(0), mid = row(1);
  if (!front.length) return true;
  const dmgOf = (a) => (a && a.dmg ? a.dmg * (a.hits || 1) : 0);
  const lethal = (() => {   // このまま維持すると、次の技で前の仲間が倒れるか
    if (!nx || !nx.dmg) return false;
    if (nx.rule === 'all') return front.some((u) => u.hp <= nx.dmg + (nx.thorns || 0) * (u.hits || 1));
    const t = nx.rule === 'highhp' ? front.reduce((a, b) => (b.hp > a.hp ? b : a)) : front.reduce((a, b) => (b.hp < a.hp ? b : a));
    return t.hp <= dmgOf(nx);
  })();
  if (e.bell && s.bell + 1 >= e.bell.at) {   // この回転で鐘が3つ鳴る：次のターンに鐘の音。回したあと前に来る仲間（補助列）が耐えられないなら回さない
    const after = mid.length ? mid : front;
    if (after.some((u) => u.hp <= e.bell.act.dmg) && !lethal) return false;
  }
  if (nx && nx.silence && !lethal) return false;   // 沈黙のターンに入ると突入技が出ない
  if (nx && nx.steal && s.gauge >= nx.steal.at) return true;   // 気力を盗まれる前に使う
  if (nx && nx.thorns && front.some((u) => u.hp <= (nx.dmg || 0) + nx.thorns * (u.hits || 1) + 4)) return true;
  if (lethal) return true;
  return SMART(s);
};
function rate(n, pol, over) {
  let clear = 0, reach = 0, pass = 0;
  const ch = over.__ch, cs = EXP.chiefs[ch], from = ch ? EXP.chiefs[ch - 1] : 0;
  for (let i = 1; i <= n; i++) {
    const r = playRun(i * 7919, pol, {}, over);
    if (r.clear) clear++;
    if (r.reached > from) { reach++; if (r.clear || r.reached > cs) pass++; }
  }
  return { clear: clear / n, pass: reach ? pass / reach : 0 };
}
export function evalCand(key, n = 400, defOver) {
  const C = CANDS[key], foes = EXP.foes.map((f) => f.slice()), D = defOver ? Object.assign(JSON.parse(JSON.stringify(C.def)), defOver) : C.def;
  const mk = (def) => { const f = foes.map((x) => x.slice()); f[C.ch] = ['cand']; return { size: 4, foes: f, cand: def, __ch: C.ch }; };
  const on = mk(D), off = mk(plain(D)), m = Math.min(n, 120);
  return { on2: rate(n, SMART2, on), on: rate(n, SMART, on), off2: rate(n, SMART2, off), stay: rate(n, STAY, on), always: rate(n, () => true, on), plan: rate(m, 'plan', on), planOff: rate(m, 'plan', off), on2m: rate(m, SMART2, on), off2m: rate(m, SMART2, off) };
}
if (process.argv[1] && /enemysim\.mjs$/.test(process.argv[1])) {
  const n = +(process.argv[2] || 400), p = (v) => (v * 100).toFixed(1).padStart(5) + '%';
  const keys = process.argv[3] ? process.argv[3].split(',') : Object.keys(CANDS);
  const base = { size: 4, __ch: 0 };
  for (const ch of [0, 1, 2]) { const r = rate(n, SMART2, Object.assign({}, base, { __ch: ch })); console.log(`基準（今の敵）第${ch + 1}章：読む遊び方の突破 ${p(r.pass)}　踏破 ${p(r.clear)}`); }
  for (const k of keys) {
    const ov = process.argv[4] ? JSON.parse(process.argv[4]) : null;
    const o = evalCand(k, n, ov), C = CANDS[k];
    console.log(`${C.def.name}（第${C.ch + 1}章）：読む ${p(o.on2.pass)}｜読まない ${p(o.on.pass)}｜仕掛けなし ${p(o.off2.pass)}｜維持 ${p(o.stay.pass)}｜回す ${p(o.always.pass)}｜名人 ${p(o.plan.pass)}（仕掛けなし ${p(o.planOff.pass)}）名人−読む 仕掛けあり ${((o.plan.pass - o.on2m.pass) * 100).toFixed(1)}pt／なし ${((o.planOff.pass - o.off2m.pass) * 100).toFixed(1)}pt　踏破 ${p(o.on2.clear)}`);
  }
}
