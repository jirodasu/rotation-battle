// v5.6.0 書体の文字の抜け
// 合格の基準（測る前に決めたもの）：
//  1. index.html に出てくる文字のうち、元の書体にある字は、同梱の5つの書体（fonts/*.woff）にすべて入っている（抜けると、その字だけ端末の別の書体になる）
//  2. 元の書体がこの機械にないときは、同梱の書体だけで抜け字を参考表示する。ただし完全な合否は判定できないので終了コード2
// 直し方：python3 tools/fonts.py
const { execFileSync } = require('child_process');
const path = require('path');
const py = `
import os, sys, json
from fontTools.ttLib import TTFont
root = sys.argv[1]; src = os.path.expanduser('~/.local/share/fonts')
M = {'ShipporiMincho-700': 'ShipporiMinchoB1-Bold', 'ShipporiMincho-800': 'ShipporiMinchoB1-ExtraBold', 'ZenKaku-500': 'ZenKakuGothicNew-Medium', 'ZenKaku-700': 'ZenKakuGothicNew-Bold', 'ZenKaku-900': 'ZenKakuGothicNew-Black'}
text = set(c for c in open(os.path.join(root, 'index.html'), encoding='utf-8').read() if ord(c) > 0x7e)
out = {}
for k, v in M.items():
    have = set(chr(c) for c in TTFont(os.path.join(root, 'fonts', k + '.woff')).getBestCmap())
    sp = os.path.join(src, v + '.ttf')
    can = set(chr(c) for c in TTFont(sp).getBestCmap()) if os.path.exists(sp) else None
    out[k] = {'src': can is not None, 'miss': ''.join(sorted((text & can) - have)) if can is not None else ''.join(sorted(text - have))}
print(json.dumps(out, ensure_ascii=False))
`;
let fails = 0; const ok = (c, m) => { console.log((c ? '  OK  ' : '  NG  ') + m); if (!c) fails++; };
let r;
try { r = JSON.parse(execFileSync('python3', ['-c', py, path.join(__dirname, '..')], { encoding: 'utf8' })); }
catch (e) { console.log('  NG  Python/fontTools が使えず書体を検証できない（' + String(e.message).split('\n')[0] + '）'); console.log('検証不能：終了コード2'); process.exit(2); }
let missingSource = 0;
for (const [k, v] of Object.entries(r)) {
  if (v.src) ok(!v.miss, '1 ' + k + '：画面の文字がすべて入っている' + (v.miss ? '（抜け ' + [...v.miss].length + '字：' + v.miss.slice(0, 60) + '）' : ''));
  else { missingSource++; console.log('  --  2 ' + k + '：元の書体がないので参考のみ。同梱に入っていない字 ' + [...v.miss].length); }
}
if (missingSource) console.log('  NG  元の書体 ' + missingSource + ' 種がなく、全書体の合否は未判定');
console.log(fails ? '不合格 ' + fails + ' 件' : missingSource ? '検証不能：終了コード2' : '全て合格');
process.exit(fails ? 1 : missingSource ? 2 : 0);
