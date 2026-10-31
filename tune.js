/* 調整モード（v5.3.5）：画面の部品をタップで選び、大きさ・色をその場で変える開発用の道具。
   開き方：URLの最後に ?tune（ホーム画面のアプリでは、一度 ?tune で開けば次からも出る。「終える」で消える）
   変更はこの端末にだけ保存（localStorage 'rb-tune-css'）。遊ぶ人の画面には出ない。
   「書き出し」の文字を開発者に渡すと、本体に正式に反映できる。ゲームの数値・動きには触れない */
(() => {
  'use strict';
  if (window.__tune) return; window.__tune = true;
  const KEY = 'rb-tune-css', ON = 'rb-tune';
  try { localStorage.setItem(ON, '1'); } catch (e) { /* 保存できない環境 */ }
  const load = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return { vars: o.vars || {}, rules: o.rules || {} }; } catch (e) { return { vars: {}, rules: {} }; } };
  let S = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* */ } };

  /* ---------- 反映 ---------- */
  const styleEl = document.createElement('style'); styleEl.id = 'tuneCSS'; document.head.appendChild(styleEl);
  function cssText() {
    const v = Object.keys(S.vars);
    let t = v.length ? ':root {\n' + v.map((k) => '  ' + k + ': ' + S.vars[k] + ';').join('\n') + '\n}\n' : '';
    Object.keys(S.rules).forEach((sel) => { const r = S.rules[sel], ks = Object.keys(r); if (ks.length) t += sel + ' {\n' + ks.map((k) => '  ' + k + ': ' + r[k] + ';').join('\n') + '\n}\n'; });
    return t;
  }
  function apply() {
    // 変数は :root の style に直接（どの見た目の層よりも強い）。部品は !important 付きの規則で
    const root = document.documentElement;
    [...root.style].filter((k) => k.startsWith('--')).forEach((k) => { if (!(k in S.vars)) root.style.removeProperty(k); });
    Object.keys(S.vars).forEach((k) => root.style.setProperty(k, S.vars[k]));
    styleEl.textContent = Object.keys(S.rules).map((sel) => { const r = S.rules[sel], ks = Object.keys(r); return ks.length ? sel + ' { ' + ks.map((k) => k + ': ' + r[k] + ' !important').join('; ') + ' }' : ''; }).join('\n');
    save();
  }
  apply();

  /* ---------- 見た目 ---------- */
  const css = document.createElement('style');
  css.textContent = `
#tnFab { position: fixed; left: 8px; bottom: calc(8px + env(safe-area-inset-bottom, 0px)); z-index: 2147483000; width: 46px; height: 46px; border-radius: 50%; border: 0;
  background: #c39338; color: #281804; font: 800 18px/1 serif; box-shadow: 0 3px 0 #7a5414, 0 6px 14px rgba(0,0,0,.4); touch-action: manipulation; }
#tnFab:active { transform: scale(.94); }
#tnPanel { position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483001; max-height: 46vh; display: flex; flex-direction: column;
  background: #1b1f2a; color: #f1e3c5; font: 14px/1.4 system-ui, sans-serif; box-shadow: 0 -8px 24px rgba(0,0,0,.5); border-radius: 16px 16px 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0px); }
#tnPanel.tn-top { bottom: auto; top: 0; border-radius: 0 0 16px 16px; padding-bottom: 0; padding-top: env(safe-area-inset-top, 0px); }
#tnPanel[hidden] { display: none; }
#tnPanel * { box-sizing: border-box; }
.tn-head { display: flex; gap: 6px; align-items: center; padding: 8px 10px; border-bottom: 1px solid #333a4a; flex: none; }
.tn-head button, .tn-body button { min-height: 36px; padding: 0 10px; border: 0; border-radius: 9px; background: #2c3344; color: #f1e3c5; font: 700 13px system-ui; touch-action: manipulation; }
.tn-head button.on, .tn-body button.pri { background: #c39338; color: #281804; }
.tn-head .sp { flex: 1; }
.tn-body { overflow-y: auto; padding: 10px 12px 14px; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
.tn-row { display: grid; grid-template-columns: 7.5em 1fr 4.2em 2em; align-items: center; gap: 8px; min-height: 40px; }
.tn-row label { font-size: 13px; color: #c4ad89; }
.tn-row input[type=range] { width: 100%; height: 32px; }
.tn-row input[type=color] { width: 100%; height: 34px; border: 0; padding: 0; background: none; }
.tn-row output { font: 12px ui-monospace, monospace; text-align: right; color: #f1e3c5; }
.tn-row .x { min-height: 30px; padding: 0; width: 2em; background: transparent; color: #c4ad89; font-size: 16px; }
.tn-sel { font: 12px ui-monospace, monospace; color: #ead08a; word-break: break-all; margin: 2px 0 8px; }
.tn-note { font-size: 12px; color: #9a8c7d; margin: 4px 0 8px; }
.tn-btns { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 10px; }
.tn-body textarea { width: 100%; height: 150px; font: 12px ui-monospace, monospace; background: #0f1218; color: #f1e3c5; border: 1px solid #333a4a; border-radius: 8px; padding: 8px; }
#tnBox { position: fixed; z-index: 2147482999; pointer-events: none; border: 2px solid #ff5ad1; box-shadow: 0 0 0 9999px rgba(0,0,0,.18); border-radius: 4px; display: none; }
body.tn-picking, body.tn-picking * { cursor: crosshair !important; }
#tnTip { position: fixed; left: 50%; top: 10px; transform: translateX(-50%); z-index: 2147483002; background: #ff5ad1; color: #fff; font: 700 13px system-ui; padding: 8px 12px; border-radius: 10px; display: none; }
`;
  document.head.appendChild(css);

  const el = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };
  const fab = el('<button id="tnFab" type="button" aria-label="調整モード">調</button>');
  const box = el('<div id="tnBox"></div>'), tip = el('<div id="tnTip">調整したい部品をタップ</div>');
  const panel = el(`<div id="tnPanel" hidden role="dialog" aria-label="調整モード">
  <div class="tn-head"><button data-tab="part" class="on">部品</button><button data-tab="color">全体の色</button><button data-tab="out">書き出し</button><span class="sp"></span><button id="tnFlip" aria-label="パネルを上下に移す">⇅</button><button id="tnClose" aria-label="閉じる">×</button></div>
  <div class="tn-body" id="tnBody"></div></div>`);
  document.body.append(box, tip, panel, fab);

  /* ---------- 部品を選ぶ ---------- */
  let picking = false, target = null, sel = null, tab = 'part', hit = null;
  const inTool = (n) => n && n.closest && n.closest('#tnPanel, #tnFab, #tnTip');
  function selectorOf(n) {
    if (n.id) return '#' + n.id;
    const cls = [...n.classList].filter((c) => !/^(on|sel|hit|ghost|drop|done|now|healed|show|off|busy|big|charge|maybe|ko)$/.test(c)).slice(0, 2);
    const own = n.tagName.toLowerCase() + cls.map((c) => '.' + c).join('');
    const anc = n.parentElement && n.parentElement.closest('[id]');
    return (anc && anc !== document.body ? '#' + anc.id + ' ' : '') + own;
  }
  function onPick(ev) {
    if (!picking || inTool(ev.target)) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    if (ev.type !== 'click') return;
    picking = false; document.body.classList.remove('tn-picking'); tip.style.display = 'none';
    // 指が当たるのは、ボタンの中の文字のことが多い。まずはボタン・札など「押せるもの」全体を選ぶ（中の文字だけにも切り替えられる）
    hit = ev.target;
    choose(ev.target.closest('button, a, [role="button"], input, select, .rv-card, .ticket, .chip, .slot') || ev.target);
  }
  ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click'].forEach((t) => document.addEventListener(t, onPick, { capture: true, passive: false }));
  function choose(n) {
    target = n; sel = selectorOf(n); panel.hidden = false; show('part');
    // 選んだ部品が見えるように、パネルを反対側（下の部品なら上）へ
    const r = n.getBoundingClientRect(); panel.classList.toggle('tn-top', r.top + r.height / 2 > innerHeight / 2);
  }
  // 選んだ部品を枠で示す（画面が動いても追う）
  (function track() {
    const t = target && document.contains(target) ? target : (sel ? document.querySelector(sel) : null);
    if (t && tab === 'part' && !panel.hidden) { const r = t.getBoundingClientRect(); Object.assign(box.style, { display: 'block', left: r.left - 2 + 'px', top: r.top - 2 + 'px', width: r.width + 4 + 'px', height: r.height + 4 + 'px' }); }
    else box.style.display = 'none';
    requestAnimationFrame(track);
  })();

  /* ---------- 部品の調整 ---------- */
  const PROPS = [
    { k: 'zoom', l: '全体の大きさ', min: 50, max: 200, step: 1, u: '%', get: (cs) => Math.round((parseFloat(cs.zoom) || 1) * 100) },
    { k: 'font-size', l: '文字の大きさ', min: 6, max: 64, step: 0.5, u: 'px' },
    { k: 'width', l: '幅', min: 0, max: 600, step: 1, u: 'px' },
    { k: 'height', l: '高さ', min: 0, max: 600, step: 1, u: 'px' },
    { k: 'padding', l: '内側の余白', min: 0, max: 40, step: 1, u: 'px', get: (cs) => parseFloat(cs.paddingTop) || 0 },
    { k: 'margin', l: '外側の余白', min: -20, max: 40, step: 1, u: 'px', get: (cs) => parseFloat(cs.marginTop) || 0 },
    { k: 'border-radius', l: '角の丸み', min: 0, max: 40, step: 1, u: 'px', get: (cs) => parseFloat(cs.borderTopLeftRadius) || 0 },
    { k: 'letter-spacing', l: '字間', min: -2, max: 8, step: 0.1, u: 'px', get: (cs) => parseFloat(cs.letterSpacing) || 0 },
    { k: 'opacity', l: '濃さ', min: 0, max: 1, step: 0.05, u: '' }
  ];
  const COLORS = [{ k: 'color', l: '文字の色' }, { k: 'background-color', l: '背景の色' }, { k: 'border-color', l: '縁の色' }];
  const toHex = (c) => { const m = String(c).match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/); if (m) return '#' + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join(''); return /^#[0-9a-f]{6}$/i.test(c) ? c : /^#[0-9a-f]{3}$/i.test(c) ? '#' + c.slice(1).split('').map((x) => x + x).join('') : '#000000'; };
  function setRule(k, v) { S.rules[sel] = S.rules[sel] || {}; if (v == null) delete S.rules[sel][k]; else S.rules[sel][k] = v; if (!Object.keys(S.rules[sel]).length) delete S.rules[sel]; apply(); }
  function partHTML() {
    if (!sel) return '<div class="tn-btns"><button class="pri" id="tnPick">画面の部品を選ぶ</button></div><p class="tn-note">押してから、変えたい部品をタップ。ボタンや文字、カードなど、どれでも選べる。</p>' + listHTML();
    const t = document.querySelector(sel), cs = t ? getComputedStyle(t) : null, n = document.querySelectorAll(sel).length, cur = S.rules[sel] || {};
    let h = '<div class="tn-btns"><button class="pri" id="tnPick">別の部品を選ぶ</button><button id="tnUp">ひとつ外側へ</button>' + (hit && hit !== t && t && t.contains(hit) ? '<button id="tnIn2">タップした文字だけ</button>' : '') + '<button id="tnReset">この部品を元に戻す</button></div>';
    h += '<div class="tn-sel">' + sel + '</div><p class="tn-note">同じ部品 ' + n + '個に効く。' + (t ? '' : '（いまは画面に無い）') + '</p>';
    PROPS.forEach((p) => {
      const set = p.k in cur, v = set ? parseFloat(cur[p.k]) * (p.k === 'zoom' ? 100 : 1) : cs ? (p.get ? p.get(cs) : parseFloat(cs[p.k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())]) || 0) : 0;
      h += '<div class="tn-row"><label>' + p.l + '</label><input type="range" data-p="' + p.k + '" min="' + p.min + '" max="' + p.max + '" step="' + p.step + '" value="' + v + '"><output>' + (+v).toFixed(p.step < 1 ? 1 : 0) + p.u + '</output><button class="x" data-x="' + p.k + '" aria-label="元に戻す"' + (set ? '' : ' style="visibility:hidden"') + '>↺</button></div>';
    });
    COLORS.forEach((c) => {
      const set = c.k in cur, v = set ? cur[c.k] : cs ? toHex(cs[c.k.replace(/-([a-z])/g, (_, x) => x.toUpperCase())]) : '#000000';
      h += '<div class="tn-row"><label>' + c.l + '</label><input type="color" data-c="' + c.k + '" value="' + toHex(v) + '"><output>' + (set ? '変更' : '') + '</output><button class="x" data-x="' + c.k + '" aria-label="元に戻す"' + (set ? '' : ' style="visibility:hidden"') + '>↺</button></div>';
    });
    return h + listHTML();
  }
  function listHTML() {
    const ks = Object.keys(S.rules);
    return ks.length ? '<p class="tn-note" style="margin-top:12px">変えた部品（タップで選び直す）</p><div class="tn-btns">' + ks.map((s) => '<button data-go="' + s.replace(/"/g, '&quot;') + '">' + s + '</button>').join('') + '</div>' : '';
  }

  /* ---------- 全体の色 ---------- */
  const VARS = [['--accent', '金（押せるもの）'], ['--accent-deep', '金の影'], ['--accent-ink', '金の上の文字'], ['--gold-hi', '金の明るい所'], ['--ink', '文字'], ['--ink-soft', '薄い文字'],
    ['--paper', '札の地'], ['--paper-2', '札の地（2）'], ['--paper-line', '札の縁'], ['--vellum', '紙の地'], ['--vellum-hi', '紙の明るい所'], ['--rule', '罫線'], ['--rubric', '朱（大事な語）'],
    ['--danger-strong', '赤（受けるダメージ）'], ['--danger', '赤（薄）'], ['--on-danger', '赤の上の文字'], ['--shield', '青（防御）'], ['--hp', 'HP'], ['--hp-low', 'HPが少ない'],
    ['--row0', '攻撃列の地'], ['--row1', '補助列の地'], ['--row2', '回復列の地'], ['--atk', '職業色：攻撃'], ['--sup', '職業色：補助'], ['--heal', '職業色：回復'], ['--tank', '職業色：盾']];
  function colorHTML() {
    const cs = getComputedStyle(document.documentElement);
    return '<p class="tn-note">ゲーム全体で使う色。変えると、その色を使う所がすべて変わる。</p>' + VARS.map(([k, l]) => {
      const raw = cs.getPropertyValue(k).trim(); if (!raw) return '';
      const set = k in S.vars;
      return '<div class="tn-row"><label>' + l + '</label><input type="color" data-v="' + k + '" value="' + toHex(raw) + '"><output>' + (set ? '変更' : '') + '</output><button class="x" data-xv="' + k + '" aria-label="元に戻す"' + (set ? '' : ' style="visibility:hidden"') + '>↺</button></div>';
    }).join('');
  }

  /* ---------- 書き出し ---------- */
  function outHTML() {
    return '<p class="tn-note">この文字をコピーして開発者に渡すと、本体に反映できる。下の欄に貼って「読み込む」で、別の端末にも移せる。</p>' +
      '<textarea id="tnOut" readonly>' + (cssText() || '/* まだ何も変えていない */') + '</textarea>' +
      '<div class="tn-btns"><button class="pri" id="tnCopy">コピー</button><button id="tnAll">すべて元に戻す</button><button id="tnQuit">調整モードを終える</button></div>' +
      '<textarea id="tnIn" placeholder="書き出した文字を貼る"></textarea><div class="tn-btns"><button id="tnImport">読み込む</button></div>';
  }
  // 書き出した CSS を読み戻す（:root の変数と、セレクタごとの規則）
  function parseCSS(t) {
    const out = { vars: {}, rules: {} };
    String(t).replace(/\/\*[\s\S]*?\*\//g, '').replace(/([^{}]+)\{([^}]*)\}/g, (_, s, body) => {
      s = s.trim(); const decl = {};
      body.split(';').forEach((d) => { const i = d.indexOf(':'); if (i > 0) decl[d.slice(0, i).trim()] = d.slice(i + 1).replace('!important', '').trim(); });
      if (s === ':root') Object.assign(out.vars, decl); else if (s) out.rules[s] = Object.assign(out.rules[s] || {}, decl);
    });
    return out;
  }

  /* ---------- パネル ---------- */
  const body = panel.querySelector('#tnBody');
  function show(t) {
    tab = t; panel.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
    body.innerHTML = t === 'part' ? partHTML() : t === 'color' ? colorHTML() : outHTML();
  }
  fab.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) show(tab); });
  panel.querySelector('#tnClose').addEventListener('click', () => { panel.hidden = true; });
  panel.querySelector('#tnFlip').addEventListener('click', () => panel.classList.toggle('tn-top'));
  panel.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  body.addEventListener('input', (ev) => {
    const i = ev.target;
    if (i.dataset.p) { const p = PROPS.find((x) => x.k === i.dataset.p), v = +i.value; setRule(p.k, p.k === 'zoom' ? String(v / 100) : p.u ? v + p.u : String(v)); i.nextElementSibling.textContent = v.toFixed(p.step < 1 ? 1 : 0) + p.u; i.parentElement.querySelector('.x').style.visibility = 'visible'; }
    else if (i.dataset.c) { setRule(i.dataset.c, i.value); i.nextElementSibling.textContent = '変更'; i.parentElement.querySelector('.x').style.visibility = 'visible'; }
    else if (i.dataset.v) { S.vars[i.dataset.v] = i.value; apply(); i.nextElementSibling.textContent = '変更'; i.parentElement.querySelector('.x').style.visibility = 'visible'; }
  });
  body.addEventListener('click', async (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'tnPick') { picking = true; document.body.classList.add('tn-picking'); tip.style.display = 'block'; panel.hidden = true; return; }
    if (b.id === 'tnUp') { const t = (target && document.contains(target) ? target : document.querySelector(sel)); if (t && t.parentElement && t.parentElement !== document.body) choose(t.parentElement); return; }
    if (b.id === 'tnIn2') { if (hit && document.contains(hit)) choose(hit); return; }
    if (b.id === 'tnReset') { delete S.rules[sel]; apply(); show('part'); return; }
    if (b.dataset.go) { sel = b.dataset.go; target = document.querySelector(sel); show('part'); return; }
    if (b.dataset.x) { setRule(b.dataset.x, null); show('part'); return; }
    if (b.dataset.xv) { delete S.vars[b.dataset.xv]; apply(); show('color'); return; }
    if (b.id === 'tnCopy') { const t = body.querySelector('#tnOut'); try { await navigator.clipboard.writeText(t.value); b.textContent = 'コピーした'; } catch (e) { t.removeAttribute('readonly'); t.select(); document.execCommand && document.execCommand('copy'); b.textContent = '選択した（長押しでコピー）'; } return; }
    if (b.id === 'tnAll') { if (b.dataset.sure) { S = { vars: {}, rules: {} }; apply(); sel = null; target = null; show('out'); } else { b.dataset.sure = '1'; b.textContent = 'もう一度押すと全部戻る'; } return; }
    if (b.id === 'tnImport') { const o = parseCSS(body.querySelector('#tnIn').value); S.vars = Object.assign(S.vars, o.vars); S.rules = Object.assign(S.rules, o.rules); apply(); show('out'); return; }
    if (b.id === 'tnQuit') { try { localStorage.removeItem(ON); } catch (e) { /* */ } location.href = location.pathname; }
  });
})();
