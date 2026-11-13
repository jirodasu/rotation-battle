// v5.8.5 日本語の読みやすさ改善（10件）。文言が入っていて、古い言い回しが残っていないことを、ソースで確かめる。
// 画面での表示（320・375・390px）は手元で確認済み。ここでは文言とページのエラーを見る。
const fs = require('fs'), path = require('path');
const { launch, testPage } = require('./_env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
(async () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const has = (s) => src.includes(s);
  const cases = [
    ['H-01/02 「回す」「維持」の結果を比べる', '「回す」「維持」の結果を比べる', '下の札を見比べる'],
    ['H-03 点線の矢印の説明', '点線の矢印は、このターンは効果が出ない。', '点線はこのターンは効かない'],
    ['H-04 防無効（防御補助を無視）', '防無効（防御補助を無視）', null],
    ['H-05 狙いの条件', 'がいないため、HPが最も少ない', 'なし→HP最低の'],
    ['M-01 回転レリックの説明', '回転レリック（遠征を助ける遺物）', null],
    ['M-02 ★3の報酬', '★3を達成したため、報酬の候補が1つ増えた。', '戦果★3で、選べる報酬が1つ増えた'],
    ['M-03 記録リセットの説明', '遠征の続き・踏破記録・集めた星・解放した隊などを削除して', null],
    ['M-04 チュートリアルの結び', '基本操作はこれで完了。環廊へ向かおう。', '基本はこれで完了。環廊に挑もう'],
    ['M-05 速攻の説明', '素早く攻撃力も高いが、打たれ弱い。', '速く重いが、脆い'],
  ];
  for (const [n, neu, old] of cases) ok(has(neu) && (!old || !has(old)), n);
  ok(has("'狙い　前列に' + act.job + 'がいないため"), 'H-05 「狙い　」の先頭は残っている（回すと／維持だと の置き換えに必要）');
  ok(/APP_VERSION = '5\.8\.([5-9]|\d\d)'/.test(src) && />ver 5\.8\.([5-9]|\d\d)</.test(src), '版が 5.8.5 以降');
  const b = await launch(), ctx = await b.newContext({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(testPage()); await p.waitForTimeout(700); await p.click('#cover'); await p.waitForTimeout(500); await p.click('#setBtn'); await p.waitForTimeout(500);
  const t = await p.evaluate(() => document.getElementById('rstNote').textContent);
  ok(/踏破記録・集めた星・解放した隊/.test(t), '設定の画面に新しい説明が出る（' + t + '）');
  ok(!errs.length, 'ページのエラーなし ' + errs.join(' / '));
  await b.close(); console.log(fails ? '不合格 ' + fails + ' 件' : '全て合格'); process.exit(fails ? 1 : 0);
})();
