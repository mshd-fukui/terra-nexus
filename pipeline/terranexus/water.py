"""保水指標（Water Retention Index）の算定。

土地被覆クラス別の保水係数（SCS カーブナンバー由来＋湿地・水域の貯留補正）を
面積で加重平均し、サブ流域の保水力（0..1、高いほど水を保持・浸透）を求める。
係数は data_tables/water_retention.csv。新規データ不要（WorldCover のみ）。
"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict

from .landcover import LandCover


def load_coefficients(csv_path: Path) -> Dict[int, float]:
    coeffs: Dict[int, float] = {}
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in (r for r in csv.DictReader(_strip_comments(f))):
            coeffs[int(row["lucode"])] = float(row["retention"])
    return coeffs


def _strip_comments(lines):
    for line in lines:
        if not line.lstrip().startswith("#"):
            yield line


def retention_index(lc: LandCover, coeffs: Dict[int, float]) -> float:
    """土地被覆構成から面積加重の保水指標（0..1）を求める。"""
    total = lc.total_ha
    if total == 0:
        return 0.0
    weighted = sum(
        coeffs.get(code, 0.0) * ha for code, ha in lc.area_ha_by_class.items()
    )
    return weighted / total
