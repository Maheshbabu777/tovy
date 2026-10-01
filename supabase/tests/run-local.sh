#!/usr/bin/env bash
# Runs the migrations and the row security test on a throwaway local Postgres.
# Needs Postgres server binaries (for example /usr/lib/postgresql/16/bin). Run from the repo root.
set -euo pipefail
BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
DIR="$(mktemp -d)"; chmod 777 "$DIR"
PORT="${PGPORT_TEST:-55432}"
RUN="runuser -u postgres --"
cleanup() { $RUN "$BIN/pg_ctl" -D "$DIR/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
$RUN "$BIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
$RUN "$BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR" -l "$DIR/log" -w start >/dev/null
PSQL="psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -f supabase/tests/local-stubs.sql
for f in supabase/migrations/*.sql; do $PSQL -f "$f"; done
$PSQL -t -f supabase/tests/notes_rls.sql
