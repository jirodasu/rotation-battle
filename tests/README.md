# テスト

本番は「遠征」。騎士団の30年は画面から削除した（内部のコードは整理前で、まだ残っている。`rogue.js`・`squads.js`・`telemetry.js` はその30年モード専用のため外した）。

Playwright（Chromium）でゲームを実際に動かして確かめる。`tests/out/` に画像・結果・各テストのログ（`<名前>.log`）が出る（Git管理外）。

**テストは1本ずつ順番に実行する**（同時に回すと `layout` が一時的に失敗することがあった）。まとめて回すには:

```
bash tests/run-all.sh            # fuzz 以外を順番に実行。1本でも失敗すれば終了コード1
FUZZ=1 bash tests/run-all.sh     # fuzz も実行（FUZZ_RUNS=ラン数 既定3、FUZZ_LIMIT=秒 既定900。打ち切りは不合格）
```

| ファイル | 内容 |
|---|---|
| `reg.js` | 本番の1戦を最後まで・チュートリアル全手順 |
| `nav.js` | タイトルへ戻る・ボタンの有効無効などの画面遷移 |
| `tutheal.js` | チュートリアルの回復の手順 |
| `layout.js` | 8つの画面サイズ（スマホ横・縦、PC 16:9/16:10、小ウィンドウ、1080p）× 主要画面の撮影と合格判定 |
| `route.js` | 地図の道（分岐・合流・行き止まりなし）、選択、保存と古い形式の読み込み |
| `speed.js` | 戦闘 ×2 速ボタン（時間が短くなる・設定が保存される） |
| `skin.js` | 10月だけ選べるハロウィン版の見た目（**見た目で判定**。11月はボタンが見えないこと） |
| `expedition.js` | 試作：遠征（4人・3列×2マス・第1章）：入口・縛り・報酬・別の途中保存と再開・最後まで遊べること・30年モードに戻ると盤が戻ること |
| `expparity.js` | 遠征の戦闘が自動対戦 `tools/expsim.mjs` と同じ結果になること（回転レリック4種・突入技の強化・縛り） |
| `fuzz.js` | でたらめな操作で本番を通しで遊び、エラー・止まり・状態の矛盾を探す（`node tests/fuzz.js [ラン数] [seed]`） |

自動対戦（勝てるかの測定。面白さは測れない）:

```
node tools/sim.mjs && node tools/runsim.mjs 200   # 戦闘とラン全体のクリア率
node tools/rogue.mjs 200                          # 店・地方・語り継がれる者の影響
node tools/jobs.mjs 120                           # 職業の入れ替えによるクリア率の変化
node tools/expsim.mjs 200                         # 遠征（第1章）の突破率と、事前に決めた合格線の判定
node tools/expdepth.mjs 200                       # 遠征の攻略性（考えずに勝てないか）と期待値（戦う／休む・報酬）の測定
```

Playwright と Chromium の場所は環境変数 `PLAYWRIGHT_PATH` と `CHROME_PATH` で変えられる。
