#!/bin/bash
# PreToolUse hook — injects a harness reminder when Claude edits/writes files.
# Reads the tool input JSON on stdin, matches the file path, prints a pointer.
# Wire-up lives in .claude/settings.json. Adjust path patterns to your stack in Session 0.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

[ -z "$FILE_PATH" ] && exit 0

remind() {
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"additionalContext\":\"REMINDER: $1\"}}"
  exit 0
}

case "$FILE_PATH" in
  *migration*|*/migrations/*)
    remind "DB migration — follow harness/SKILLS.md §add-a-migration (new file only, up+down, round-trip proof)." ;;
  *order*|*payment*|*checkout*|*cart*|*refund*)
    remind "Order/payment/cart file — business rules live in harness/PLAN.md §Business rules. Price snapshots + status windows are contract, not suggestion." ;;
  *.env*|*compose*|Dockerfile*|*/workflows/*)
    remind "Infra file — harness/ENVIRONMENT.md rules apply: no secrets in committed files; sync .env.example." ;;
esac

exit 0
