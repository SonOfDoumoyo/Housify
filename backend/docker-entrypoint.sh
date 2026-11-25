#!/bin/sh
# Housify backend entrypoint: wait for Postgres and Redis, run the Alembic
# migrations, then hand over to the server command.
#
# Migrations MUST run before the app starts: the app creates any missing
# tables on startup, which would otherwise clash with the migrations.
set -e

python - <<'PY'
import os
import socket
import sys
import time
from urllib.parse import urlparse


def wait_for(name, host, port, timeout=60):
    deadline = time.time() + timeout
    while True:
        try:
            with socket.create_connection((host, int(port)), timeout=3):
                print(f"{name} reachable at {host}:{port}", flush=True)
                return
        except OSError:
            if time.time() > deadline:
                print(f"timed out waiting for {name} at {host}:{port}", file=sys.stderr)
                sys.exit(1)
            time.sleep(2)


db_url = os.environ.get("DATABASE_URL", "")
parts = urlparse(db_url)
wait_for("postgres", parts.hostname or "db", parts.port or 5432)
wait_for(
    "redis",
    os.environ.get("REDIS_HOST", "redis"),
    os.environ.get("REDIS_PORT", "6379"),
)
PY

alembic upgrade head

exec "$@"
