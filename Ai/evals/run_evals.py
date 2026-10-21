"""Measure triage quality on the golden cases.

    python -m evals.run_evals --mode offline          # rules baseline, free, instant
    python -m evals.run_evals --mode live             # real providers (uses free-tier quota)
    python -m evals.run_evals --mode live --split holdout

The labels are our own judgement on synthetic cases, so the team should read and argue with
them. Goodhart's law: tune prompts on the `dev` split, then check `holdout` once. If you tune
until holdout looks good too, the number stops meaning anything.

What matters most is `dangerous_under_triage` (rated 2+ levels BELOW expected) and
`critical_recall`. A little over-caution is fine here. Under-rating a real emergency is not.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import statistics
import sys
import time
from collections import Counter
from pathlib import Path

from app.config import Settings, get_settings
from app.core.schemas import CaseIn
from app.main import create_app

LEVELS = ["low", "medium", "high", "critical"]
HERE = Path(__file__).parent


def load(split: str) -> list[dict]:
    rows = [json.loads(line) for line in (HERE / "golden_cases.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    return [r for r in rows if split == "all" or r["split"] == split]


async def run(args: argparse.Namespace) -> int:
    base = get_settings() if args.mode != "offline" else Settings(service_keys="eval-key-0123456789abcdef", _env_file=None)
    settings = base.model_copy(update={"mode": args.mode, "service_keys": base.service_keys if base.service_key_list
                                       else Settings(service_keys="eval-key-0123456789abcdef", _env_file=None).service_keys})
    app = create_app(settings)
    rows = load(args.split)
    results: list[dict] = []
    async with app.router.lifespan_context(app):
        engine = app.state.engine
        for i, row in enumerate(rows):
            t0 = time.monotonic()
            env = await engine.triage(CaseIn(**row["case"]), f"eval-{row['id']}")
            results.append({"id": row["id"], "expect": row["expect"], "got": env.data, "env": env,
                            "ms": int((time.monotonic() - t0) * 1000)})
            if args.mode == "live" and i < len(rows) - 1:
                await asyncio.sleep(args.sleep)  # stay under free-tier requests per minute

    n = len(results)
    cat_ok = sum(r["got"].category == r["expect"]["category"] for r in results)
    sev_exact = sum(r["got"].severity == r["expect"]["severity"] for r in results)
    gap = [LEVELS.index(r["got"].severity) - LEVELS.index(r["expect"]["severity"]) for r in results]
    within1 = sum(abs(g) <= 1 for g in gap)
    dangerous = [r for r, g in zip(results, gap, strict=True) if g <= -2]
    crit = [r for r in results if r["expect"]["severity"] == "critical"]
    crit_hit = sum(r["got"].severity == "critical" for r in crit)
    crit_high = sum(r["got"].severity in ("high", "critical") for r in crit)
    sources = Counter(r["env"].source for r in results)
    providers = Counter(r["env"].provider or r["env"].source for r in results)
    lat = sorted(r["ms"] for r in results)
    p95 = lat[min(n - 1, int(n * 0.95))]

    lines = [
        f"# Triage eval ({args.mode}, split={args.split}, n={n})", "",
        "| metric | value |", "|---|---|",
        f"| category accuracy | {cat_ok}/{n} ({cat_ok / n:.0%}) |",
        f"| severity exact | {sev_exact}/{n} ({sev_exact / n:.0%}) |",
        f"| severity within one level | {within1}/{n} ({within1 / n:.0%}) |",
        f"| critical recall (rated critical) | {crit_hit}/{len(crit)} |",
        f"| critical recall (rated high or critical) | {crit_high}/{len(crit)} |",
        f"| **dangerous under-triage (2+ levels low)** | **{len(dangerous)}** |",
        f"| sources | {dict(sources)} |", f"| providers | {dict(providers)} |",
        f"| latency ms p50 / p95 | {int(statistics.median(lat))} / {p95} |", "",
        "| id | expected | got | conf | source |", "|---|---|---|---|---|",
    ]
    for r in results:
        mark = "" if r["got"].severity == r["expect"]["severity"] else " ⚠"
        lines.append(f"| {r['id']} | {r['expect']['category']}/{r['expect']['severity']} | "
                     f"{r['got'].category}/{r['got'].severity}{mark} | {r['got'].confidence:.2f} | "
                     f"{r['env'].provider or r['env'].source} |")
    report = "\n".join(lines)
    print(report)
    (HERE / "last_report.md").write_text(report + "\n", encoding="utf-8")

    if dangerous:
        print(f"\nFAIL: {len(dangerous)} dangerous under-triage case(s): {[r['id'] for r in dangerous]}", file=sys.stderr)
        return 1
    if crit_high < len(crit):
        print("\nFAIL: a critical case was rated below high", file=sys.stderr)
        return 1
    return 0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["live", "offline"], default="live")
    ap.add_argument("--split", choices=["dev", "holdout", "all"], default="dev")
    ap.add_argument("--sleep", type=float, default=2.2, help="seconds between live calls")
    sys.exit(asyncio.run(run(ap.parse_args())))


if __name__ == "__main__":
    main()
