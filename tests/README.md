# テスト

Playwright（Chromium）でゲームを実際に動かして確かめる。`tests/out/` に画像と結果が出る（Git管理外）。

| ファイル | 内容 |
|---|---|
| `reg.js` | 本番の1戦を最後まで・チュートリアル全手順 |
| `nav.js` | タイトルへ戻る・ボタンの有効無効などの画面遷移 |
| `tutheal.js` | チュートリアルの回復の手順 |
| `layout.js` | 8つの画面サイズ（スマホ横・縦、PC 16:9/16:10、小ウィンドウ、1080p）× 主要画面の撮影と合格判定 |

```
node tests/reg.js && node tests/nav.js && node tests/tutheal.js && node tests/layout.js
node tools/sim.mjs && node tools/runsim.mjs 200
```

Playwright と Chromium の場所は環境変数 `PLAYWRIGHT_PATH` と `CHROME_PATH` で変えられる。
