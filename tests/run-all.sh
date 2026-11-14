#!/usr/bin/env bash
# 全テストを2段で流す（v5.5.6。以前は1本ずつ順番に、約50分）
#   1段目：速さ・動きの時間に関係しないテストを、JOBS 本ずつ並べて流す（既定は CPU の数）
#   2段目：速さ・動きの時間を測るテスト（STAGE2）だけを、ほかに何も動いていない状態で1本ずつ流す。並べると揺れるため
#   bash tests/run-all.sh          # 全部（fuzz も入る）
#   NOFUZZ=1 bash tests/run-all.sh # fuzz を外す（既定は入る。FUZZ_RUNS=ラン数 既定2 / FUZZ_LIMIT=秒 既定900。打ち切りは不合格として数える）
#   JOBS=1 bash tests/run-all.sh   # 以前と同じく全部を1本ずつ
# 結果のまとめ（2026-11-02）：
#   tests/out/summary.md  … テストごとの時間・合否・落ちた行を1枚に（毎回上書き）。遅い順の上位も出す
#   tests/out/history.tsv … 日時・コミット・テスト・秒・終了コードを1行ずつ足していく（揺れの記録。消さない）
cd "$(dirname "$0")/.." || exit 2
LIST="reg nav tutheal layout phonefit route speed skin expedition expparity gaugeui refill world ux2 sound wording settings trinity display battlesave fixes updates fx audit depth ui522 v530 v531 v532 v533 v534 tune v536 v537 v538 v539 v5310 v540 v541 v542 v543 v544 v545 v547 v548 v549 v550 v552 v555 v556 v557 v558 v561 v562 v563 v564 v565 v566 v567 v568 v570 v571 v572 v573 v574 v575 v57tip v576 v577 v578 v580 v581 v583 v584 v585 v586 v587 v588 v589 fontcover fuzz"   # 騎士団の30年専用のテスト(rogue・squads・telemetry)は、モードの削除に合わせて外した
[ -n "$ONLY" ] && LIST="$ONLY"   # ONLY="reg nav" のように、流すテストを絞れる（まとめの確かめ・短いテスト用）
# fuzz（でたらめ操作）も既定で流す（2026-11-03。入っていなかったため、壊れても8日間気づかなかった）。NOFUZZ=1 で外せる
[ -n "$NOFUZZ" ] && LIST="${LIST/ fuzz/}"
LIMIT="${FUZZ_LIMIT:-900}"
mkdir -p tests/out
SUM="tests/out/summary.md"; HIST="tests/out/history.tsv"; ROWS="tests/out/.rows.tsv"; : > "$ROWS"
[ -f "$HIST" ] || printf 'date\tcommit\ttest\tsec\texit\tng\n' > "$HIST"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo '-')$(git diff --quiet 2>/dev/null || echo '+変更あり')"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '-')"
START="$(date '+%Y-%m-%d %H:%M:%S')"; T0=$(date +%s)
# 2段目に回す：速さ・時間を測るテスト（speed・fx・v542 の数え上げ0.35秒）、並べると揺れたことのあるテスト（layout）、動きの途中を測るテスト（v537・v538）
STAGE2="${STAGE2:-speed fx layout v537 v538 v542 v578 audit battlesave reg expedition}"
JOBS="${JOBS:-$(nproc 2>/dev/null || echo 2)}"
S1=""; S2=""
for t in $LIST; do case " $STAGE2 " in *" $t "*) S2="$S2 $t";; *) S1="$S1 $t";; esac; done
# 1段目は長いものから流す（並べたときに、最後に長いのが1本だけ残らないように）
S1=" $(for t in fuzz expedition; do case " $S1 " in *" $t "*) printf '%s ' "$t";; esac; done)$(for t in $S1; do case "$t" in fuzz|expedition) ;; *) printf '%s ' "$t";; esac; done)"
run_one() {
  local t="$1" log="tests/out/$1.log" s code sec ng
  s=$(date +%s)
  if [ "$t" = fuzz ]; then timeout "$LIMIT" node tests/$t.js "${FUZZ_RUNS:-2}" >"$log" 2>&1; elif [ "$t" = expedition ]; then timeout 900 node tests/$t.js >"$log" 2>&1; else timeout 600 node tests/$t.js >"$log" 2>&1; fi   # expedition は10地点を通しで遊ぶので長い（重い時は9分を超える）
  code=$?
  sec=$(( $(date +%s) - s ))
  ng=$(grep -c "  NG" "$log")
  # 不合格の行（NG・FAIL・不合格）と末尾を残す。並べて流すので、1本ぶんをまとめて出す
  { echo "== $t（${sec}秒・終了コード $code）"; grep -E "NG|不合格|FAIL|Error" "$log" | head -20; tail -3 "$log"; } 
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$(date '+%Y-%m-%d %H:%M')" "$COMMIT" "$t" "$sec" "$code" "$ng" >> "$HIST"
  printf '%s\t%s\t%s\t%s\n' "$t" "$sec" "$code" "$ng" > "tests/out/.row.$t"
}
echo "-- 1段目（${JOBS}本ずつ並べて）:$S1"
for t in $S1; do
  run_one "$t" &
  while [ "$(jobs -rp | wc -l)" -ge "$JOBS" ]; do wait -n; done
done
wait
echo "-- 2段目（1本ずつ、ほかに何も動かさずに）:$S2"
for t in $S2; do run_one "$t"; done
fail=0; failed=""
for t in $S1 $S2; do f="tests/out/.row.$t"; [ -f "$f" ] || continue; cat "$f" >> "$ROWS"; rm -f "$f"; IFS=$'\t' read -r _ _ code _ < <(cat "$ROWS" | tail -1); if [ "$code" != 0 ]; then fail=$((fail+1)); failed="$failed $t(exit=$code)"; fi; done
TOTAL=$(( $(date +%s) - T0 ))
# ---- まとめを書く ----
{
  echo "# テスト結果のまとめ"
  echo
  echo "- 開始：$START　所要：$((TOTAL / 60))分$((TOTAL % 60))秒"
  echo "- ブランチ：$BRANCH　コミット：$COMMIT　並べた本数：$JOBS（2段目：$S2 ）"
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
