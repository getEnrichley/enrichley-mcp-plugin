#!/usr/bin/env bash
set -euo pipefail

mode="${1:---commit}"
expected_name="Enrichley Bot"
expected_email="agent@enrichley.com"
expected_login="enrichley-bot"
expected_remote="https://github.com/getEnrichley/enrichley-mcp-plugin.git"

fail() {
  echo "publisher identity: FAILED ($1)" >&2
  exit 1
}

[ "$(git branch --show-current)" = "main" ] || fail "main-required"
[ "$(git config --local user.name || true)" = "$expected_name" ] || fail "commit-name"
[ "$(git config --local user.email || true)" = "$expected_email" ] || fail "commit-email"
[ "$(git remote get-url origin)" = "$expected_remote" ] || fail "origin-url"

if [ "$mode" = "--push" ]; then
  command -v gh >/dev/null 2>&1 || fail "github-cli-required"
  active_login="$(gh api user --jq .login 2>/dev/null || true)"
  [ "$active_login" = "$expected_login" ] || fail "approved-github-account-required"
elif [ "$mode" != "--commit" ]; then
  fail "unsupported-mode"
fi

echo "publisher identity: OK"
