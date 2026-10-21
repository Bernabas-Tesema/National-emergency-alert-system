"""The woredas the AI is allowed to name. Anything else it invents gets dropped."""
from __future__ import annotations

import json
from pathlib import Path


class Regions:
    def __init__(self, data_dir: Path) -> None:
        raw = json.loads((data_dir / "regions_bole.json").read_text(encoding="utf-8"))
        self.woredas: list[dict] = raw["woredas"]
        self.ids: list[str] = [w["id"] for w in self.woredas]
        self.id_set: set[str] = set(self.ids)
