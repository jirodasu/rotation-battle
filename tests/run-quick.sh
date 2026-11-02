#!/usr/bin/env bash
# 短いテスト（v5.4.5）：変更ごとに流す。主なテスト（遊びの流れ・文言・設定・戦闘画面の札）と、引数で渡したテストだけ。
#   bash tests/run-quick.sh            # 主なテストだけ（5分前後）
#   bash tests/run-quick.sh v540 v541  # 主なテスト＋変えた所のテスト
# main に入れる前は、必ず全テスト（bash tests/run-all.sh）を流す。合格したら main へ入れる（ユーザーとの取り決め、2026-11-02）
cd "$(dirname "$0")/.." || exit 2
CORE="reg nav wording settings route v538 v539"
LIST="$CORE"; for t in "$@"; do case " $LIST " in *" $t "*) ;; *) LIST="$LIST $t";; esac; done
fail=0; failed=""
for t in $LIST; do
  echo "== $t"
  log="tests/out/$t.log"; mkdir -p tests/out
  timeout 600 node tests/$t.js >"$log" 2>&1
  code=$?
  grep -E "NG|不合格|FAIL|Error" "$log" | head -20
  tail -1 "$log"
  if [ $code -ne 0 ]; then fail=$((fail+1)); failed="$failed $t(exit=$code)"; fi
done
echo
if [ $fail -eq 0 ]; then echo "全て合格（短いテスト）"; else echo "不合格 $fail 本:$failed"; fi
exit $((fail>0))
