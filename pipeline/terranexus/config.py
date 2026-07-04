"""地域設定（YAML）の読み込み。"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import yaml


@dataclass(frozen=True)
class DemConfig:
    source: str
    tiles: List[str]
    clip_bbox: Tuple[float, float, float, float]  # W, S, E, N


@dataclass(frozen=True)
class DelineationConfig:
    outlet: Tuple[float, float]  # lon, lat
    snap_accum_threshold: int
    subbasin_accum_threshold: int


@dataclass(frozen=True)
class LandcoverConfig:
    source: str
    tile: str


@dataclass(frozen=True)
class RegionConfig:
    name: str
    label: str
    output_dir: Path
    dem: DemConfig
    delineation: DelineationConfig
    landcover: LandcoverConfig

    @staticmethod
    def load(path: str | Path) -> "RegionConfig":
        path = Path(path)
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
        base = path.resolve().parent.parent  # config/ の一つ上（pipeline/）
        return RegionConfig(
            name=raw["name"],
            label=raw["label"],
            output_dir=(base / raw["output_dir"]).resolve(),
            dem=DemConfig(
                source=raw["dem"]["source"],
                tiles=list(raw["dem"]["tiles"]),
                clip_bbox=tuple(raw["dem"]["clip_bbox"]),  # type: ignore[arg-type]
            ),
            delineation=DelineationConfig(
                outlet=tuple(raw["delineation"]["outlet"]),  # type: ignore[arg-type]
                snap_accum_threshold=int(raw["delineation"]["snap_accum_threshold"]),
                subbasin_accum_threshold=int(
                    raw["delineation"]["subbasin_accum_threshold"]
                ),
            ),
            landcover=LandcoverConfig(
                source=raw["landcover"]["source"],
                tile=raw["landcover"]["tile"],
            ),
        )
