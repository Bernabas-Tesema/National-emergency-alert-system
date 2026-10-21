"""Loads versioned prompt files. Changing a prompt = new folder (v2) + AI_PROMPT_VERSION=v2,
so old outputs in the audit log can always be traced to the exact wording that produced them."""
from __future__ import annotations

from pathlib import Path

TASKS = ("triage", "summary", "rank", "area", "draft", "resources")


class Prompts:
    def __init__(self, root: Path, version: str, woreda_ids: list[str]) -> None:
        base = root / version
        if not base.is_dir():
            raise RuntimeError(f"prompt version folder not found: {base}")
        self.version = version
        self._system = (base / "_system.md").read_text(encoding="utf-8").strip()
        ids = ", ".join(woreda_ids)
        self._tasks = {
            t: (base / f"{t}.md").read_text(encoding="utf-8").replace("{{WOREDA_IDS}}", ids).strip()
            for t in TASKS
        }

    def system(self, task: str) -> str:
        return f"{self._system}\n\n{self._tasks[task]}"
