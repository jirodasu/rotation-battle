// ページ内で実行：見えている文字の色とその背景のコントラスト、文字の大きさ、タップ領域を調べる
module.exports = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(',').map((x) => parseFloat(x)); return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = (el) => { const stack = []; let e = el; while (e && e.nodeType === 1) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/url/.test(cs.backgroundImage)) { const m = cs.backgroundImage.match(/rgba?\([^)]+\)/); if (m) { const c = parse(m[0]); if (c) stack.push(c); } } const c = parse(cs.backgroundColor); if (c && c.a > 0) stack.push(c); if (stack.length && stack[stack.length - 1].a >= 0.99) break; e = e.parentElement; }
    let col = { r: 21, g: 28, b: 42, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) col = blend(stack[i], col); return col; };
  const out = { lowContrast: [], tiny: [], smallTap: [] };
  const visible = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false; let e = el; while (e) { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.35) return false; e = e.parentElement; } return true; };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) { const t = walker.currentNode; if (!t.textContent.trim()) continue; const el = t.parentElement; if (!el || seen.has(el) || el.closest('svg') || el.closest('[aria-hidden="true"]')) continue; seen.add(el); if (!visible(el)) continue;
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize), fg = parse(cs.color); if (!fg) continue; const bg = bgOf(el), f2 = blend(fg, bg);
    const ratio = (Math.max(lum(f2), lum(bg)) + 0.05) / (Math.min(lum(f2), lum(bg)) + 0.05), big = fs >= 18.66 || (fs >= 14 && +cs.fontWeight >= 700);
    const txt = el.textContent.trim().slice(0, 18);
    if (ratio < (big ? 3 : 4.5)) out.lowContrast.push(txt + ' ' + ratio.toFixed(1) + ' ' + fs + 'px');
    if (fs < 10.5) out.tiny.push(txt + ' ' + fs + 'px'); }
  document.querySelectorAll('button, [role=button], a, input').forEach((b) => { if (!visible(b) || b.disabled) return; const r = b.getBoundingClientRect(), af = getComputedStyle(b, '::after'), ex = af.content !== 'none' && af.position === 'absolute' ? -parseFloat(af.top || 0) * 2 : 0; if (r.width + ex < 40 || r.height + ex < 40) out.smallTap.push((b.id || b.className || b.tagName).toString().slice(0, 24) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
  return out;
};
