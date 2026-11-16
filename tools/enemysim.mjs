// 敵10体の検討（2026-11-17）：候補の敵を1章の「ふつうの戦闘の敵」に置いて、遠征全体を自動対戦で回す。
//   比べるもの：仕掛けあり／仕掛けなし（ふつうの技に置き換え）、予告を読む遊び方（SMART2）／読まない遊び方（SMART）／毎ターン維持／毎ターン回す
//   node tools/enemysim.mjs [回数=400]
import { playRun, SMART, STAY, EXP } from './expsim.mjs';

export const CANDS = {
  weight: { ch: 0, def: { name: '重石の番兵', hp: 140, spd: 4, def: 2, pattern: [
    { name: '押し潰し', rule: 'highhp', dmg: 21 }, { name: 'ちからをためる', rule: 'charge' }, { name: '大槌', rule: 'highhp', dmg: 36 }, { name: '薙ぎ', rule: 'all', dmg: 11 }] } },
  thief: { ch: 0, def: { name: '灯盗みの影猫', hp: 130, spd: 8, def: 0, pattern: [
    { name: 'ひっかき', rule: 'lowhp', dmg: 14 }, { name: '灯を盗む', rule: 'lowhp', dmg: 10, steal: { at: 2, n: 1 } }, { name: '二度ひっかき', rule: 'random', hits: 2, dmg: 9 }, { name: 'とびかかり', rule: 'lowhp', dmg: 24 }] } },
  lure: { ch: 0, def: { name: '誘い火の燐光', hp: 130, spd: 6, def: 1, pattern: [
    { name: '燐光の矢', rule: 'highatk', dmg: 16 }, { name: 'ちらつき', rule: 'all', dmg: 8 }, { name: 'ちからをためる', rule: 'charge' }, { name: '焦がす', rule: 'highatk', dmg: 30 }] } },
  silence: { ch: 1, def: { name: '沈黙の司書', hp: 250, spd: 4, def: 2, pattern: [
    { name: '本の角', rule: 'lowhp', dmg: 18 }, { name: 'ちからをためる', rule: 'charge' }, { name: '静粛に', rule: 'all', dmg: 8, silence: true }, { name: '禁書の頁', rule: 'all', dmg: 26 }] } },
  shell: { ch: 1, def: { name: '割れ殻の守り貝', hp: 220, spd: 3, def: 1, shell: { min: 18, every: 3 }, pattern: [
    { name: '殻ごし体当たり', rule: 'lowhp', dmg: 16 }, { name: '潮騒', rule: 'all', dmg: 10 }, { name: 'ちからをためる', rule: 'charge' }, { name: '大波', rule: 'all', dmg: 24 }] } },
  thorns: { ch: 1, def: { name: '棘殻の聖骸', hp: 260, spd: 3, def: 2, pattern: [
    { name: '骨の鞭', rule: 'lowhp', dmg: 18 }, { name: '棘をまとう', rule: 'all', dmg: 6, thorns: 10 }, { name: 'ちからをためる', rule: 'charge' }, { name: '骨嵐', rule: 'all', dmg: 24 }] } },
  bell: { ch: 1, def: { name: '鐘楼の鳴き鐘', hp: 250, spd: 3, def: 2, bell: { at: 2, act: { dmg: 20 } }, pattern: [
    { name: '鐘の舌', rule: 'lowhp', dmg: 18 }, { name: '余韻', rule: 'all', dmg: 10 }, { name: '打ち鳴らし', rule: 'lowhp', dmg: 20 }, { name: '余韻', rule: 'all', dmg: 10 }] } },
  reverse: { ch: 2, def: { name: '逆さ時計の守', hp: 280, spd: 5, def: 2, pattern: [
    { name: '針', rule: 'lowhp', dmg: 18 }, { name: '払い', rule: 'all', dmg: 10 }, { name: '時を戻す（ためる）', rule: 'charge', reverse: true }, { name: '大嵐', rule: 'all', dmg: 26 }] } },
  swap: { ch: 2, def: { name: '札替えの奇術師', hp: 260, spd: 6, def: 1, pattern: [
    { name: '札投げ', rule: 'random', hits: 2, dmg: 12 }, { name: 'すり替え', rule: 'lowhp', dmg: 14, swap: true }, { name: '手品', rule: 'all', dmg: 12 }, { name: '大仕掛け', rule: 'all', dmg: 22 }] } },
  hourglass: { ch: 2, def: { name: '時告げの砂時計', hp: 240, spd: 4, def: 1, pattern: [
    { name: 'こぼれ砂', rule: 'all', dmg: 8 }, { name: '砂礫', rule: 'lowhp', dmg: 16 }, { name: 'こぼれ砂', rule: 'all', dmg: 8 }, { name: '砂礫', rule: 'lowhp', dmg: 16 }, { name: 'こぼれ砂', rule: 'all', dmg: 8 }, { name: '砂礫', rule: 'lowhp', dmg: 16 }, { name: 'こぼれ砂', rule: 'all', dmg: 8 }, { name: '終の刻', rule: 'all', dmg: 45, pierce: true }] } },
  silence2: { ch: 1, def: { name: '沈黙の司書（改）', hp: 250, spd: 4, def: 2, pattern: [
    { name: '本の角', rule: 'lowhp', dmg: 18 }, { name: '頁めくり', rule: 'all', dmg: 10 }, { name: 'ちからをためる', rule: 'charge' }, { name: '静粛に（禁書の頁）', rule: 'all', dmg: 24, silence: true }] } },
  douse: { ch: 1, def: { name: '灯消しの風精', hp: 240, spd: 6, def: 1, pattern: [
    { name: '吹きつけ', rule: 'lowhp', dmg: 18 }, { name: '灯を吹き消す', rule: 'all', dmg: 8, douse: true }, { name: 'ちからをためる', rule: 'charge' }, { name: '嵐', rule: 'all', dmg: 24 }] } },
  strip: { ch: 2, def: { name: '剥ぎ取りの屍騎士', hp: 280, spd: 4, def: 3, pattern: [
    { name: '剣撃', rule: 'lowhp', dmg: 22 }, { name: '盾剥ぎ', rule: 'all', dmg: 8, strip: true }, { name: 'ちからをためる', rule: 'charge' }, { name: '処刑', rule: 'lowhp', dmg: 34 }] } },
  drain: { ch: 0, def: { name: '血啜りの燭台', hp: 120, spd: 5, def: 1, pattern: [
    { name: '蝋の滴', rule: 'lowhp', dmg: 14, drain: 1 }, { name: '揺らめき', rule: 'all', dmg: 8, drain: 1 }, { name: 'ちからをためる', rule: 'charge' }, { name: '燃え移り', rule: 'lowhp', dmg: 26, drain: 1 }] } },
  door: { ch: 1, def: { name: '重い扉の番人', hp: 210, spd: 3, def: 2, rotCost: 3, pattern: [
    { name: '閂打ち', rule: 'lowhp', dmg: 16 }, { name: '軋み', rule: 'all', dmg: 8 }, { name: 'ちからをためる', rule: 'charge' }, { name: '扉の一撃', rule: 'all', dmg: 20 }] } },
  crow: { ch: 1, def: { name: '死肉喰らいの鴉', hp: 230, spd: 7, def: 1, pattern: [
    { name: 'ついばみ', rule: 'lowhp', dmg: 14, vsHurt: 2 }, { name: '羽ばたき', rule: 'all', dmg: 9 }, { name: 'ついばみ', rule: 'lowhp', dmg: 14, vsHurt: 2 }, { name: '群がる', rule: 'random', hits: 3, dmg: 9 }] } },
  lance: { ch: 2, def: { name: '串刺しの槍兵', hp: 270, spd: 5, def: 2, pattern: [
    { name: '串刺し', rule: 'lance', dmg: 16 }, { name: '払い', rule: 'all', dmg: 8 }, { name: 'ちからをためる', rule: 'charge' }, { name: '大串刺し', rule: 'lance', dmg: 26 }] } },
  incense: { ch: 1, def: { name: '不眠の香炉', hp: 240, spd: 4, def: 1, pattern: [
    { name: '煙の鞭', rule: 'lowhp', dmg: 18 }, { name: '眠らせぬ香', rule: 'all', dmg: 10, noRest: true }, { name: '煙の鞭', rule: 'lowhp', dmg: 18 }, { name: '咳き込み', rule: 'all', dmg: 14, noRest: true }] } },
  chant: { ch: 1, def: { name: '数え歌の聖歌隊長', hp: 240, spd: 4, def: 2, pattern: [
    { name: '指揮棒', rule: 'lowhp', dmg: 16 }, { name: '数え歌', rule: 'all', dmg: 6, perRot: 3 }, { name: '指揮棒', rule: 'lowhp', dmg: 16 }, { name: '大合唱', rule: 'all', dmg: 10, perRot: 3 }] } },
  twin: { ch: 2, def: { name: '双剣の首無し騎士', hp: 270, spd: 5, def: 2, pattern: [
    { name: '左を斬る', rule: 'col', col: 0, dmg: 30 }, { name: '右を斬る', rule: 'col', col: 1, dmg: 30 }, { name: 'ちからをためる', rule: 'charge' }, { name: '十字斬り', rule: 'all', dmg: 26 }] } },
  phase: { ch: 2, def: { name: '二つ顔の祭司', hp: 260, spd: 5, def: 2, phase2: { at: 0.5, pattern: [
    { name: '裏の顔', rule: 'back', dmg: 12 }, { name: '断罪', rule: 'lowhp', dmg: 22 }, { name: '呪詛', rule: 'all', dmg: 10, pierce: true }, { name: '審判', rule: 'all', dmg: 22, pierce: true }] }, pattern: [
    { name: '祝詞', rule: 'all', dmg: 12 }, { name: '断罪', rule: 'lowhp', dmg: 24 }, { name: 'ちからをためる', rule: 'charge' }, { name: '審判', rule: 'all', dmg: 26, pierce: true }] } }
};

// ---- 2026-11-17 朝：添付のA案・B案を同じ物差しで測る（数値は各案の基礎値。第4章の案は第3章の枠で測る） ----
const N = (o) => o;
Object.assign(CANDS, {
  A01: { ch: 0, src: 'A', def: { name: '割れ鐘の番骸', hp: 210, spd: 4, def: 1, pattern: [
    { name: '打ち鳴らし', rule: 'lowhp', dmg: 13 }, { name: '鐘鳴らし', rule: 'all', dmg: 9 }, { name: 'ため', rule: 'charge', interrupt: { n: 20, to: { name: '落ちた鐘', rule: 'all', dmg: 9 } } }, { name: '落鐘', rule: 'all', dmg: 20, pierce: true }] } },
  A02: { ch: 1, src: 'A', def: { name: '数え貝の秤守', hp: 230, spd: 4, def: 2, pattern: [
    { name: '数え打ち', rule: 'lowhp', dmg: 8, perMid: 5 }, { name: '秤ゆらし', rule: 'all', dmg: 8 }, { name: '貝殻投げ', rule: 'all', dmg: 10 }, { name: '大数え', rule: 'lowhp', dmg: 16, perMid: 5 }] } },
  A03: { ch: 2, src: 'A', def: { name: '眠り竜のまぶた', hp: 250, spd: 3, def: 2, pattern: [
    { name: 'まどろみ', rule: 'none', sleep: true }, { name: 'まどろみ', rule: 'none', sleep: true }, { name: '開眼の構え', rule: 'charge', interrupt: { n: 30, sleep: true } }, { name: '開眼の一睨み', rule: 'lowhp', dmg: 26 }] } },
  A04: { ch: 2, src: 'A', def: { name: '祭壇の仕掛け番人', hp: 240, spd: 4, def: 2, pattern: [
    { name: '石拳', rule: 'lowhp', dmg: 14 }, { name: '仕掛け（攻撃列）', rule: 'none', trap: { row: 0, dmg: 16 } }, { name: 'なぎ払い', rule: 'all', dmg: 10 }, { name: '仕掛け（回復列）', rule: 'none', trap: { row: 2, dmg: 16 } }] } },
  A05: { ch: 2, src: 'A', def: { name: '旺食の仔竜', hp: 260, spd: 6, def: 0, pattern: [
    { name: '旺食', rule: 'highhp', dmg: 18 }, { name: '噛みつき', rule: 'lowhp', dmg: 12 }, { name: 'ため', rule: 'charge' }, { name: '盛食', rule: 'highhp', dmg: 22, pierce: true }] } },
  A09: { ch: 2, src: 'A', def: { name: '岐路の案内翁', hp: 300, spd: 5, def: 2, pattern: [
    { name: '左の道／右の道', branch: { rot: { rule: 'all', dmg: 14 }, stay: { rule: 'back', dmg: 15 } } }, { name: '坂の道／沢の道', branch: { rot: { rule: 'lowhp', dmg: 20 }, stay: { rule: 'mid', dmg: 13 } } }] } },
  A10: { ch: 2, src: 'A', def: { name: '灯芯を摘む者', hp: 300, spd: 6, def: 1, pattern: [
    { name: '摘芯', rule: 'lowhp', dmg: 14, steal: { at: 1, n: 1 } }, { name: '芯喰い', rule: 'all', dmg: 12 }, { name: 'ため', rule: 'charge' }, { name: '黒い息', rule: 'all', dmg: 23, pierce: true }, { name: '摘芯', rule: 'lowhp', dmg: 14, steal: { at: 1, n: 1 } }] } },
  B01: { ch: 0, src: 'B', def: { name: '鐘腹の守り蟲', hp: 140, spd: 4, def: 1, pattern: [
    { name: '強者狙い', rule: 'highhp', dmg: 14 }, { name: '小突き', rule: 'lowhp', dmg: 10 }, { name: '鐘をためる', rule: 'charge' }, { name: '大鐘の衝撃', rule: 'all', dmg: 20 }] } },
  B02: { ch: 0, src: 'B', def: { name: '継ぎ目の亡衣', hp: 140, spd: 4, def: 3, rotDef: 3, pattern: [
    { name: '針の一突き', rule: 'lowhp', dmg: 13 }, { name: '裂布', rule: 'all', dmg: 9 }, { name: '身を縫う', rule: 'charge' }, { name: '針雨', rule: 'all', dmg: 19 }] } },
  B04: { ch: 1, src: 'B', def: { name: '逆祈の蝋人形', hp: 240, spd: 4, def: 1, pattern: [
    { name: '蝋涙', rule: 'lowhp', dmg: 17 }, { name: '逆祈り', rule: 'none', rotHeal: 10 }, { name: '溶蝋の雨', rule: 'all', dmg: 15 }, { name: '蝋の腕', rule: 'lowhp', dmg: 19 }] } },
  B05: { ch: 1, src: 'B', def: { name: '聖櫃の貝守', hp: 240, spd: 3, def: 1, pattern: [
    { name: '閉櫃', rule: 'none', defUp: 6 }, { name: '殻の衝撃', rule: 'all', dmg: 12 }, { name: '開櫃', rule: 'lowhp', dmg: 20 }, { name: '力をためる', rule: 'charge' }, { name: '聖櫃砕き', rule: 'all', dmg: 26 }] } },
  B06: { ch: 2, src: 'B', def: { name: '灯盗みの火鼠', hp: 260, spd: 6, def: 1, pattern: [
    { name: '噛みつき', rule: 'lowhp', dmg: 18 }, { name: '灯盗み', rule: 'none', steal: { at: 1, n: 1, once: true } }, { name: '力をためる', rule: 'charge' }, { name: '火の暴発', rule: 'all', dmg: 27 }] } },
  B07: { ch: 2, src: 'B', def: { name: '三段の鐘獣', hp: 270, spd: 4, def: 2, pattern: [
    { name: '前鐘', rule: 'all', dmg: 15 }, { name: '中鐘', rule: 'mid', dmg: 12 }, { name: '後鐘', rule: 'back', dmg: 13 }, { name: '三鐘をためる', rule: 'charge' }, { name: '大鐘', rule: 'all', dmg: 26 }] } },
  B08: { ch: 2, src: 'B', def: { name: '貪り火の獣', hp: 260, spd: 5, def: 1, starve: true, pattern: [
    { name: '爪', rule: 'lowhp', dmg: 17 }, { name: '力をためる', rule: 'charge' }, { name: '炎の咆哮', rule: 'all', dmg: 27 }, { name: '尾撃', rule: 'lowhp', dmg: 12 }] } },
  B09: { ch: 2, src: 'B', def: { name: '双面の裁判官', hp: 270, spd: 5, def: 2, pattern: [
    { name: '入列裁き', rule: 'lowhp', dmg: 16, vsEntered: 2 }, { name: '居座り裁き', rule: 'lowhp', dmg: 16, vsStayed: 2 }, { name: '仮面の祈り', rule: 'charge' }, { name: '連帯責任', rule: 'all', dmg: 18 }] } },
  B10: { ch: 2, src: 'B', def: { name: '魂秤の審問官', hp: 270, spd: 5, def: 2, pattern: [
    { name: '魂を量る', rule: 'none', mark: true }, { name: '魂の徴収', rule: 'lock', dmg: 28 }, { name: '秤の一撃', rule: 'all', dmg: 11 }, { name: '再び量る', rule: 'none', mark: true }] } }
});
// 仕掛けを外した同じ敵（数値はそのまま、ふつうの技に置き換える）
export function plain(d) {
  const o = JSON.parse(JSON.stringify(d));
  const fix = (a) => { if (a.rule === 'highhp' || a.rule === 'highatk') a.rule = 'lowhp'; if (/終の刻/.test(a.name)) { a.dmg = 24; delete a.pierce; } delete a.steal; delete a.silence; delete a.douse; delete a.strip; delete a.drain; delete a.noRest; delete a.vsHurt; if (a.rule === 'lance' || a.rule === 'col') a.rule = 'lowhp'; delete a.perRot; delete a.col; delete a.thorns; delete a.reverse; delete a.swap; return a; };
  const fix2 = (a) => { a = fix(a);
    if (a.interrupt) delete a.interrupt; if (a.perMid) { a.dmg += 10; delete a.perMid; } if (a.sleep) delete a.sleep;
    if (a.trap) { Object.assign(a, { rule: a.trap.row === 0 ? 'all' : 'back', dmg: a.trap.dmg }); delete a.trap; }
    if (a.branch) { const b = a.branch.rot; delete a.branch; Object.assign(a, b); }
    if (a.rule === 'lock') a.rule = 'lowhp'; delete a.mark; delete a.rotHeal; delete a.defUp; delete a.vsEntered; delete a.vsStayed; return a; };
  o.pattern = o.pattern.map(fix2); delete o.shell; delete o.bell; delete o.rotCost; delete o.rotDef; delete o.starve;
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
    if (nx.rule === 'col') { const u = g[0][nx.col]; return !!u && u.hp <= nx.dmg; }
    if (nx.rule === 'all') return front.some((u) => u.hp <= nx.dmg + (nx.thorns || 0) * (u.hits || 1));
    const t = nx.rule === 'highatk' ? front.reduce((a, b) => (b.atk > a.atk ? b : a)) : nx.rule === 'highhp' ? front.reduce((a, b) => (b.hp > a.hp ? b : a)) : front.reduce((a, b) => (b.hp < a.hp ? b : a));
    return t.hp <= dmgOf(nx) * (nx.vsHurt && t.hp * 2 < t.max ? nx.vsHurt : 1) + (nx.rule === 'lance' ? 0 : 0);
  })();
  if (e.bell && s.bell + 1 >= e.bell.at) {   // この回転で鐘が3つ鳴る：次のターンに鐘の音。回したあと前に来る仲間（補助列）が耐えられないなら回さない
    const after = mid.length ? mid : front;
    if (after.some((u) => u.hp <= e.bell.act.dmg) && !lethal) return false;
  }
  if (nx && nx.silence && !lethal) return false;
  if (nx && nx.douse && s.combo === 2) return true;   // 灯を吹き消される前に3回目を回す   // 沈黙のターンに入ると突入技が出ない
  if (nx && nx.steal && s.gauge >= nx.steal.at) return true;   // 気力を盗まれる前に使う
  if (nx && nx.thorns && front.some((u) => u.hp <= (nx.dmg || 0) + nx.thorns * (u.hits || 1) + 4)) return true;
  if (nx && nx.branch) {   // 案内翁：回したときと維持したときの技を両方読み、倒れないほうを選ぶ
    const kill = (act, rowUnits) => act.rule === 'all' ? rowUnits.some((u) => u.hp <= act.dmg) : act.rule === 'lowhp' ? rowUnits.length && rowUnits.reduce((a, b) => (b.hp < a.hp ? b : a)).hp <= act.dmg : false;
    const back = row(2);
    const stayK = nx.branch.stay.rule === 'back' ? back.some((u) => u.hp <= nx.branch.stay.dmg) : nx.branch.stay.rule === 'mid' ? mid.some((u) => u.hp <= nx.branch.stay.dmg) : kill(nx.branch.stay, front);
    const rotK = kill(nx.branch.rot, mid.length ? mid : front);
    if (stayK && !rotK) return true; if (rotK && !stayK) return false;
  }
  if (nx && nx.rotHeal && !lethal) return false;   // 蝋人形：回すと敵が回復するターン
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
