#!/usr/bin/env python
"""Container entrypoint: migrate, cache table, collectstatic, then Gunicorn."""

from __future__ import annotations

import os
import subprocess
import sys


def run(cmd: list[str], *, allow_fail: bool = False) -> None:
    print("+", " ".join(cmd), flush=True)
    result = subprocess.run(cmd, check=False)
    if result.returncode != 0 and not allow_fail:
        raise SystemExit(result.returncode)


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    run([sys.executable, "manage.py", "migrate", "--noinput"])

    if os.getenv("DEV_MODE", "false").lower() != "true" and not os.getenv("REDIS_URL", "").strip():
        run([sys.executable, "manage.py", "createcachetable"], allow_fail=True)

    # Ensure /admin login works after fresh Postgres (idempotent create/update).
    run([sys.executable, "manage.py", "bootstrap_admin"])
    if os.getenv("BOOTSTRAP_DEMO_STAFF", "").strip().lower() in {"1", "true", "yes", "on"}:
        run([sys.executable, "manage.py", "bootstrap_demo_staff"])

    run([sys.executable, "manage.py", "collectstatic", "--noinput"])

    port = os.getenv("PORT", "8081")
    workers = os.getenv("WEB_CONCURRENCY", "3")
    timeout = os.getenv("GUNICORN_TIMEOUT", "90")
    print(f"Starting Gunicorn on 0.0.0.0:{port} (workers={workers})", flush=True)
    os.execvp(
        "gunicorn",
        [
            "gunicorn",
            "config.wsgi:application",
            "--bind",
            f"0.0.0.0:{port}",
            "--workers",
            workers,
            "--timeout",
            timeout,
            "--access-logfile",
            "-",
            "--error-logfile",
            "-",
            "--capture-output",
        ],
    )


if __name__ == "__main__":
    main()
