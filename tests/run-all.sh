#!/usr/bin/env bash
# 全テストを「1本ずつ順番に」実行する。並列にすると layout が一時的に失敗することがあるため。
#   bash tests/run-all.sh          # fuzz 以外
#   FUZZ=1 bash tests/run-all.sh   # fuzz も（FUZZ_RUNS=ラン数 既定3 / FUZZ_LIMIT=秒 既定900。打ち切りは不合格として数える）
# 結果のまとめ（2026-11-02）：
#   tests/out/summary.md  … テストごとの時間・合否・落ちた行を1枚に（毎回上書き）。遅い順の上位も出す
#   tests/out/history.tsv … 日時・コミット・テスト・秒・終了コードを1行ずつ足していく（揺れの記録。消さない）
cd "$(dirname "$0")/.." || exit 2
LIST="reg nav tutheal layout phonefit route speed skin expedition expparity gaugeui refill world ux2 sound wording settings trinity display battlesave fixes updates fx audit depth ui522 v530 v531 v532 v533 v534 tune v536 v537 v538 v539 v5310 v540 v541 v542 v543 v544 v545"   # 騎士団の30年専用のテスト(rogue・squads・telemetry)は、モードの削除に合わせて外した
[ -n "$ONLY" ] && LIST="$ONLY"   # ONLY="reg nav" のように、流すテストを絞れる（まとめの確かめ・短いテスト用）
[ -n "$FUZZ" ] && LIST="$LIST fuzz"
LIMIT="${FUZZ_LIMIT:-900}"
mkdir -p tests/out
SUM="tests/out/summary.md"; HIST="tests/out/history.tsv"; ROWS="tests/out/.rows.tsv"; : > "$ROWS"
[ -f "$HIST" ] || printf 'date\tcommit\ttest\tsec\texit\tng\n' > "$HIST"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo '-')$(git diff --quiet 2>/dev/null || echo '+変更あり')"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '-')"
START="$(date '+%Y-%m-%d %H:%M:%S')"; T0=$(date +%s)
fail=0; failed=""
for t in $LIST; do
  echo "== $t"
  log="tests/out/$t.log"
  s=$(date +%s)
  if [ "$t" = fuzz ]; then timeout "$LIMIT" node tests/$t.js "${FUZZ_RUNS:-3}" >"$log" 2>&1; elif [ "$t" = expedition ]; then timeout 900 node tests/$t.js >"$log" 2>&1; else timeout 600 node tests/$t.js >"$log" 2>&1; fi   # expedition は10地点を通しで遊ぶので長い（重い時は9分を超える）
  code=$?
  sec=$(( $(date +%s) - s ))
  # 不合格の行（NG・FAIL・不合格）と末尾を残す。どの画面で落ちたか後から分かる
  grep -E "NG|不合格|FAIL|Error" "$log" | head -20
  tail -3 "$log"
  ng=$(grep -c "  NG" "$log")
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$(date '+%Y-%m-%d %H:%M')" "$COMMIT" "$t" "$sec" "$code" "$ng" >> "$HIST"
  printf '%s\t%s\t%s\t%s\n' "$t" "$sec" "$code" "$ng" >> "$ROWS"
  if [ $code -ne 0 ]; then fail=$((fail+1)); failed="$failed $t(exit=$code)"; fi
done
TOTAL=$(( $(date +%s) - T0 ))
# ---- まとめを書く ----
{
  echo "# テスト結果のまとめ"
  echo
  echo "- 開始：$START　所要：$((TOTAL / 60))分$((TOTAL % 60))秒"
  echo "- ブランチ：$BRANCH　コミット：$COMMIT"
  if [ $fail -eq 0 ]; then echo "- 結果：**全て合格**（$(wc -l < "$ROWS")本）"; else echo "- 結果：**不合格 $fail 本**：$failed"; fi
  echo
  if [ $fail -ne 0 ]; then
    echo "## 落ちたテスト"
    echo
    while IFS=$'\t' read -r t sec code ng; do
      [ "$code" = 0 ] && continue
      why="終了コード $code"; [ "$code" = 124 ] && why="時間切れ"
      echo "### $t（$why・NG $ng 件・${sec}秒）"
      echo
      echo '```'
      { grep -E "  NG|不合格|FAIL|Error|Timeout|exceeded|tests/[a-z0-9]+\.js:[0-9]+" "tests/out/$t.log" | head -8; } | cut -c1-300
      echo '```'
      echo
    done < "$ROWS"
  fi
  echo "## 遅い順（上位10本）"
  echo
  echo "| テスト | 秒 | 結果 |"
  echo "|---|---:|---|"
  sort -t$'\t' -k2,2nr "$ROWS" | head -10 | while IFS=$'\t' read -r t sec code ng; do echo "| $t | $sec | $([ "$code" = 0 ] && echo 合格 || echo "不合格($code)") |"; done
  echo
  echo "## 全部（実行順）"
  echo
  echo "| テスト | 秒 | 結果 | NG |"
  echo "|---|---:|---|---:|"
  while IFS=$'\t' read -r t sec code ng; do echo "| $t | $sec | $([ "$code" = 0 ] && echo 合格 || echo "不合格($code)") | $ng |"; done < "$ROWS"
  echo
  echo "## これまでに落ちた回数（history.tsv より、多い順）"
  echo
  awk -F'\t' 'NR>1 { n[$3]++; if ($5 != 0) f[$3]++ } END { for (t in f) printf "| %s | %d / %d 回 |\n", t, f[t], n[t] }' "$HIST" | sort -t'|' -k3,3nr | head -10 | { echo "| テスト | 落ちた / 流した |"; echo "|---|---|"; cat; }
} > "$SUM"
rm -f "$ROWS"
echo
if [ $fail -eq 0 ]; then echo "全て合格"; else echo "不合格 $fail 本:$failed"; fi
echo "まとめ：$SUM"
exit $((fail>0))
