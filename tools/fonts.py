# 書体の切り出し（v5.6.0）。index.html に出てくる文字＋かな・英数・よく使う記号を、元の書体から woff に切り出す。
# 使い方：python3 tools/fonts.py [元の書体のフォルダ]（既定 ~/.local/share/fonts）
# 文言を足したら必ず回す。tests/fontcover.js が、画面の文字が書体に入っているかを確かめる。
import os, sys
from fontTools import subset
from fontTools.ttLib import TTFont
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/.local/share/fonts')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MAP = {'ShipporiMincho-700': 'ShipporiMinchoB1-Bold', 'ShipporiMincho-800': 'ShipporiMinchoB1-ExtraBold',
       'ZenKaku-500': 'ZenKakuGothicNew-Medium', 'ZenKaku-700': 'ZenKakuGothicNew-Bold', 'ZenKaku-900': 'ZenKakuGothicNew-Black'}
text = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
base = ''.join(chr(c) for c in list(range(0x20, 0x7f)) + list(range(0x3000, 0x3040)) + list(range(0x3041, 0x3097)) + list(range(0x30a0, 0x3100)))
chars = ''.join(sorted(set(text + base + '・…―─「」『』【】〈〉《》→←↑↓×÷±％○●◎◇◆□■△▲▽▼☆★♪♭✓※')))
for out, src in MAP.items():
    f = TTFont(os.path.join(SRC, src + '.ttf'))
    opt = subset.Options(); opt.flavor = 'woff'; opt.name_IDs = ['*']; opt.notdef_outline = True
    s = subset.Subsetter(opt); s.populate(text=chars); s.subset(f)
    p = os.path.join(ROOT, 'fonts', out + '.woff'); f.flavor = 'woff'; f.save(p)
    print(out, os.path.getsize(p))
