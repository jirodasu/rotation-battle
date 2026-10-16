// 新ルールの値を変えながら、シミュレーターで比べる
import { JOBS, ENEMIES, report } from './sim.mjs';
const HP0 = ENEMIES.map((e) => e.hp), DMG0 = ENEMIES.map((e) => e.pattern.map((a) => a.dmg));
const STA = { warrior: 4, knight: 5, samurai: 3, witch: 3, cleric: 3, monk: 4, archer: 4 };
const ENTRY = {
  warrior: { name: '踏み込み', atk: 6 },
  knight: { name: '盾構え', guard: 8 },
  samurai: { name: '居合', spd: 10, atk: 4 },
  witch: { name: '雷撃', atk: 8 },
  cleric: { name: '祝福', heal: 8 },
  monk: { name: '喝', teamGuard: 3 },
  archer: { name: '速射', hits: 1 }
};
const variants = JSON.parse(process.argv[2] || '[{}]');
for (const v of variants) {
  const sta = Object.assign({}, STA, v.sta || {});
  JOBS.forEach((j) => { j.sta = Math.max(1, Math.round((sta[j.id] || 3) * (v.staMul || 1))); j.entry = Object.assign({}, ENTRY[j.id], (v.entry || {})[j.id] || {}); });
  ENEMIES.forEach((e, i) => { e.hp = (v.hp && v.hp[i]) || HP0[i]; e.pattern.forEach((a, k) => { if (DMG0[i][k] != null) a.dmg = Math.round(DMG0[i][k] * ((v.dmg && v.dmg[i]) || 1)); }); });
  const rules = Object.assign({ stamina: true, entry: true }, v.rules || {});
  const rep = report(rules, v.n || 300);
  const avg = rep.reduce((s, x) => s + x.stayAny, 0) / rep.length;
  console.log('== ' + JSON.stringify(v));
  rep.forEach((x) => console.log(`  ${x.enemy.padEnd(8)} 回さない ${(x.stayAny * 100).toFixed(1).padStart(5)}%  毎回回す ${(x.alwaysAny * 100).toFixed(1).padStart(5)}%  勝ち手順 ${(x.searchWinShare * 100).toFixed(1).padStart(5)}%  最良 ${x.best ? `倒れ${x.best.fallen} ${x.best.turns}T/目標${x.par}T ${x.best.bits}` : 'なし'}`));
  console.log(`  平均 回さない ${(avg * 100).toFixed(1)}%`);
}
