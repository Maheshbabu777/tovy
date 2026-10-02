#!/usr/bin/env bash
# Applies the migrations and runs the row security test. Run from the repo root.
#   With DATABASE_URL set (CI): uses that database, which must be empty and disposable.
#   Without it: starts a throwaway local Postgres (needs server binaries, set PG_BIN if not in the default path).
set -euo pipefail

run_tests() {
  psql "$1" -v ON_ERROR_STOP=1 -q -f supabase/tests/local-stubs.sql
  for f in supabase/migrations/*.sql; do psql "$1" -v ON_ERROR_STOP=1 -q -f "$f"; done
  psql "$1" -v ON_ERROR_STOP=1 -q -t -f supabase/tests/notes_rls.sql
  psql "$1" -v ON_ERROR_STOP=1 -q -t -f supabase/tests/tasks_rls.sql
}

if [ -n "${DATABASE_URL:-}" ]; then
  run_tests "$DATABASE_URL"
  exit 0
fi

BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
DIR="$(mktemp -d)"; chmod 777 "$DIR"
PORT="${PGPORT_TEST:-55432}"
RUN="runuser -u postgres --"
cleanup() { $RUN "$BIN/pg_ctl" -D "$DIR/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
$RUN "$BIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
$RUN "$BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR" -l "$DIR/log" -w start >/dev/null
run_tests "host=$DIR port=$PORT user=postgres dbname=postgres"
