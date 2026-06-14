#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

mkdir -p "$root/.supabase-home"

status_file="$(mktemp)"
trap 'rm -f "$status_file"' EXIT

if ! HOME="$root/.supabase-home" npx supabase status -o env >"$status_file" 2>/dev/null; then
  HOME="$root/.supabase-home" npx supabase start >/dev/null
  HOME="$root/.supabase-home" npx supabase status -o env >"$status_file"
fi

set -a
eval "$(cat "$status_file")"
set +a

PLAYWRIGHT_TEST_DATA_ENABLED=true \
PLAYWRIGHT_TEST_ENV=local \
PLAYWRIGHT_SKIP_WEBSERVER=true \
TEST_SUPABASE_URL="$API_URL" \
TEST_SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
npm run test:e2e:data
