#!/usr/bin/env bash
# 全テストを「1本ずつ順番に」実行する。並列にすると layout が一時的に失敗することがあるため。
#   bash tests/run-all.sh          # fuzz 以外
#   FUZZ=1 bash tests/run-all.sh   # fuzz も（FUZZ_RUNS=ラン数 既定3 / FUZZ_LIMIT=秒 既定900。打ち切りは不合格として数える）
cd "$(dirname "$0")/.." || exit 2
LIST="reg nav tutheal layout phonefit route speed skin expedition expparity gaugeui refill world ux2 sound wording settings trinity display battlesave fixes"   # 騎士団の30年専用のテスト(rogue・squads・telemetry)は、モードの削除に合わせて外した
[ -n "$FUZZ" ] && LIST="$LIST fuzz"
LIMIT="${FUZZ_LIMIT:-900}"
fail=0; failed=""
for t in $LIST; do
  echo "== $t"
  log="tests/out/$t.log"; mkdir -p tests/out
  if [ "$t" = fuzz ]; then timeout "$LIMIT" node tests/$t.js "${FUZZ_RUNS:-3}" >"$log" 2>&1; else timeout 600 node tests/$t.js >"$log" 2>&1; fi
  code=$?
  # 不合格の行（NG・FAIL・不合格）と末尾を残す。どの画面で落ちたか後から分かる
  grep -E "NG|不合格|FAIL|Error" "$log" | head -20
  tail -3 "$log"
  if [ $code -ne 0 ]; then fail=$((fail+1)); failed="$failed $t(exit=$code)"; fi
done
echo
if [ $fail -eq 0 ]; then echo "全て合格"; else echo "不合格 $fail 本:$failed"; fi
exit $((fail>0))
