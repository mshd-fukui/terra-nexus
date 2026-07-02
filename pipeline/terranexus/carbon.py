"""炭素蓄積量の算定（InVEST Carbon モデル方式）。

土地被覆クラスごとの 4 プール係数（地上部・地下部・土壌・枯死）を面積に乗じて、
流域全体の炭素蓄積量と密度を求める。係数は data_tables/carbon_pools.csv。
"""
from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Dict

from .landcover import LandCover


@dataclass
class CarbonPools:
    c_above: float
    c_below: float
    c_soil: float
    c_dead: float

    @property
    def total(self) -> float:
        return self.c_above + self.c_below + self.c_soil + self.c_dead


@dataclass
class CarbonResult:
    total_mg_c: float          # 流域全体の炭素蓄積量（Mg C）
    density_mg_c_per_ha: float  # 平均密度（Mg C/ha）
    by_class_mg_c: Dict[int, float]


def load_coefficients(csv_path: Path) -> Dict[int, CarbonPools]:
    coeffs: Dict[int, CarbonPools] = {}
    with open(csv_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(_strip_comments(f)):
            coeffs[int(row["lucode"])] = CarbonPools(
                c_above=float(row["c_above"]),
                c_below=float(row["c_below"]),
                c_soil=float(row["c_soil"]),
                c_dead=float(row["c_dead"]),
            )
    return coeffs


def _strip_comments(lines):
    for line in lines:
        if not line.lstrip().startswith("#"):
            yield line


def estimate(lc: LandCover, coeffs: Dict[int, CarbonPools]) -> CarbonResult:
    by_class: Dict[int, float] = {}
    total = 0.0
    for code, ha in lc.area_ha_by_class.items():
        pools = coeffs.get(code)
        if pools is None:
            continue
        mg = ha * pools.total
        by_class[code] = mg
        total += mg
    density = total / lc.total_ha if lc.total_ha else 0.0
    print(f"[carbon] total={total:.0f} Mg C  density={density:.1f} Mg C/ha")
    return CarbonResult(
        total_mg_c=total, density_mg_c_per_ha=density, by_class_mg_c=by_class
    )
