"""Pre-checked answers for the demo scenarios.

Loaded and validated at startup: a typo in this file should stop the service on your laptop
on Tuesday, not surprise you in front of INSA on Thursday.
"""
from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel

from .schemas import TASK_SCHEMAS


class DemoCache:
    def __init__(self, entries: dict[str, dict[str, BaseModel]]) -> None:
        self._entries = entries

    @classmethod
    def load(cls, path: Path) -> DemoCache:
        raw = json.loads(path.read_text(encoding="utf-8"))
        entries: dict[str, dict[str, BaseModel]] = {}
        for task, items in raw.items():
            if task.startswith("_"):
                continue
            schema = TASK_SCHEMAS[task]  # unknown task name -> KeyError at startup, on purpose
            entries[task] = {key: schema.model_validate(value) for key, value in items.items()}
        return cls(entries)

    def get(self, task: str, key: str) -> BaseModel | None:
        hit = self._entries.get(task, {}).get(key)
        return hit.model_copy(deep=True) if hit else None  # copy: callers may edit it

    def keys(self, task: str) -> list[str]:
        return list(self._entries.get(task, {}))

    def __len__(self) -> int:
        return sum(len(v) for v in self._entries.values())
