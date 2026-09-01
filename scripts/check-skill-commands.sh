#!/usr/bin/env bash
# Every /enrichley:<command> referenced in a skill must resolve to an actual
# skill directory: skills/<command>/SKILL.md.
set -euo pipefail
cd "$(dirname "$0")/.."

missing=0
while IFS= read -r cmd; do
  if [ ! -f "skills/${cmd}/SKILL.md" ]; then
    echo "MISSING: /enrichley:${cmd} referenced in skills but skills/${cmd}/SKILL.md does not exist" >&2
    missing=1
  fi
done < <(grep -rhoE '/enrichley:[a-z0-9][a-z0-9_-]*' skills/ 2>/dev/null | sed 's|/enrichley:||' | sort -u)

if [ "$missing" -ne 0 ]; then
  exit 1
fi
echo "check-skill-commands: OK"
