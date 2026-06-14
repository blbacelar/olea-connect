#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -eq 0 ]]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 2
fi

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

export PLAYWRIGHT_TEST_DATA_ENABLED=true
export PLAYWRIGHT_TEST_ENV=local
export TEST_SUPABASE_URL="$API_URL"
export TEST_SUPABASE_PUBLISHABLE_KEY="$ANON_KEY"
export TEST_SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$ANON_KEY"

exec "$@"
