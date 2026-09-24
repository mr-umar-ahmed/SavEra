#!/usr/bin/env bash
# Local PostgreSQL 15 + TimescaleDB 2.28.3 without Docker (Windows Git Bash / macOS / Linux with curl+python).
# Installs into $SAVERA_PG_ROOT (default: %LOCALAPPDATA%/savera or ~/.savera) and listens on 127.0.0.1:55432.
#   bash scripts/dev-postgres.sh install   # download + initdb + start
#   bash scripts/dev-postgres.sh start|stop|status|psql
set -euo pipefail

PORT="${SAVERA_PG_PORT:-55432}"
if [ -n "${LOCALAPPDATA:-}" ]; then
  ROOT="${SAVERA_PG_ROOT:-$(cygpath -u "$LOCALAPPDATA")/savera}"
else
  ROOT="${SAVERA_PG_ROOT:-$HOME/.savera}"
fi
PG_ZIP_URL="https://get.enterprisedb.com/postgresql/postgresql-15.14-1-windows-x64-binaries.zip"
TS_ZIP_URL="https://github.com/timescale/timescaledb/releases/download/2.28.3/timescaledb-postgresql-15-windows-amd64.zip"
BIN="$ROOT/pg15/bin"
DATA="$ROOT/pgdata15"
EXE=""
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) EXE=".exe";; esac
winpath() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi; }

install() {
  mkdir -p "$ROOT" && cd "$ROOT"
  if [ -z "$EXE" ]; then
    echo "On macOS/Linux install PostgreSQL 15 + timescaledb with your package manager (brew install timescaledb / apt timescaledb-2-postgresql-15) and point DATABASE_URL at it." >&2
    exit 1
  fi
  if [ ! -x "$BIN/pg_ctl$EXE" ]; then
    echo "-> downloading PostgreSQL 15.14 binaries (~320 MB)"
    curl -L --retry 3 --progress-bar -o pg15.zip "$PG_ZIP_URL"
    rm -rf extract_pg && python -m zipfile -e pg15.zip extract_pg
    rm -rf pg15 && mv extract_pg/pgsql pg15 && rm -rf extract_pg pg15.zip
  fi
  if ! ls "$ROOT"/pg15/lib/timescaledb*.dll >/dev/null 2>&1; then
    echo "-> downloading TimescaleDB 2.28.3 (PG15)"
    curl -L --retry 3 --progress-bar -o ts.zip "$TS_ZIP_URL"
    rm -rf extract_ts && python -m zipfile -e ts.zip extract_ts
    find extract_ts -iname "*.dll" -exec cp {} pg15/lib/ \;
    find extract_ts \( -iname "*.control" -o -iname "*.sql" \) -exec cp {} pg15/share/extension/ \;
    rm -rf extract_ts ts.zip
  fi
  if [ ! -f "$DATA/PG_VERSION" ]; then
    echo "-> initdb"
    echo "postgres" > "$ROOT/pw.txt"
    "$BIN/initdb$EXE" -D "$(winpath "$DATA")" -U postgres --auth=scram-sha-256 --pwfile="$(winpath "$ROOT/pw.txt")" -E UTF8 --locale=C
    rm -f "$ROOT/pw.txt"
    cat >> "$DATA/postgresql.conf" <<CONF

# --- savera local dev ---
listen_addresses = '127.0.0.1'
port = $PORT
shared_preload_libraries = 'timescaledb'
timescaledb.telemetry_level = off
log_min_messages = warning
CONF
  fi
  start
  export PGPASSWORD=postgres
  for db in savera savera_test; do
    "$BIN/psql$EXE" -h 127.0.0.1 -p "$PORT" -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 \
      || "$BIN/psql$EXE" -h 127.0.0.1 -p "$PORT" -U postgres -c "CREATE DATABASE $db"
    "$BIN/psql$EXE" -h 127.0.0.1 -p "$PORT" -U postgres -d "$db" -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" >/dev/null
  done
  echo "READY: postgresql://postgres:postgres@127.0.0.1:$PORT/savera  (tests: /savera_test)"
}

start()  { "$BIN/pg_ctl$EXE" -D "$(winpath "$DATA")" status >/dev/null 2>&1 || "$BIN/pg_ctl$EXE" -D "$(winpath "$DATA")" -l "$(winpath "$ROOT/pg15.log")" -w start; }
stop()   { "$BIN/pg_ctl$EXE" -D "$(winpath "$DATA")" -m fast stop; }
status() { "$BIN/pg_ctl$EXE" -D "$(winpath "$DATA")" status; }
psql_()  { PGPASSWORD=postgres "$BIN/psql$EXE" -h 127.0.0.1 -p "$PORT" -U postgres -d "${2:-savera}"; }

case "${1:-install}" in
  install) install ;;
  start) start ;;
  stop) stop ;;
  status) status ;;
  psql) psql_ "$@" ;;
  *) echo "usage: $0 install|start|stop|status|psql [db]"; exit 1 ;;
esac
