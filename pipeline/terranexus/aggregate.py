"""成果物の組み立て（サブ流域 GeoJSON ＋ 地域サマリ JSON）。"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Dict, List

from shapely.geometry import mapping
from shapely.geometry.base import BaseGeometry

from .carbon import CarbonResult
from .config import RegionConfig
from .delineate import Delineation
from .geo import geographic_area_ha
from .landcover import LandCover, WORLDCOVER_CLASSES


@dataclass
class SubBasinStats:
    """1 サブ流域ぶんの算定結果。"""

    id: int
    geometry: BaseGeometry
    area_ha: float
    land_cover: LandCover
    carbon: CarbonResult
    habitat_quality: float
    water_retention: float


def _land_cover_list(lc: LandCover) -> List[Dict[str, Any]]:
    return [
        {
            "lucode": code,
            "name": WORLDCOVER_CLASSES.get(code, str(code)),
            "area_ha": round(ha, 1),
            "share": round(ha / lc.total_ha, 4) if lc.total_ha else 0.0,
        }
        for code, ha in sorted(
            lc.area_ha_by_class.items(), key=lambda kv: kv[1], reverse=True
        )
    ]


def subbasin_feature(s: SubBasinStats) -> Dict[str, Any]:
    return {
        "type": "Feature",
        "id": s.id,
        "properties": {
            "id": s.id,
            "area_ha": round(s.area_ha, 1),
            "area_km2": round(s.area_ha / 100, 2),
            "forest_ratio": round(s.land_cover.forest_ratio, 4),
            "green_cover_ratio": round(s.land_cover.green_ratio, 4),
            "carbon_density_mg_c_per_ha": round(s.carbon.density_mg_c_per_ha, 1),
            "carbon_storage_mg_c": round(s.carbon.total_mg_c, 0),
            "habitat_quality": round(s.habitat_quality, 3),
            "water_retention": round(s.water_retention, 3),
            "land_cover": _land_cover_list(s.land_cover),
        },
        "geometry": mapping(s.geometry),
    }


def write_watersheds(subs: List[SubBasinStats], path: Path) -> None:
    fc = {
        "type": "FeatureCollection",
        "features": [subbasin_feature(s) for s in subs],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")


def write_subbasins_summary(subs: List[SubBasinStats], path: Path) -> None:
    """幾何なしの per-サブ流域プロパティ配列（レポート・表用の軽量データ）。"""
    data = [subbasin_feature(s)["properties"] for s in subs]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def _range(values: List[float]) -> Dict[str, float]:
    return {"min": round(min(values), 3), "max": round(max(values), 3)}


def build_region(
    cfg: RegionConfig, dl: Delineation, subs: List[SubBasinStats]
) -> Dict[str, Any]:
    total_area_ha = sum(s.area_ha for s in subs)
    w, s_, e, n = dl.basin.bounds  # 地図の初期表示範囲（PMTiles には座標情報が要る）
    total_carbon = sum(s.carbon.total_mg_c for s in subs)
    # 面積加重平均
    forest_w = (
        sum(s.land_cover.forest_ratio * s.area_ha for s in subs) / total_area_ha
        if total_area_ha
        else 0.0
    )
    green_w = (
        sum(s.land_cover.green_ratio * s.area_ha for s in subs) / total_area_ha
        if total_area_ha
        else 0.0
    )
    return {
        "region": {"name": cfg.name, "label": cfg.label},
        "generated": date.today().isoformat(),
        "geometry": {
            "outlet_snapped": {
                "lon": round(dl.outlet_snapped[0], 5),
                "lat": round(dl.outlet_snapped[1], 5),
            },
            "area_ha": round(total_area_ha, 1),
            "area_km2": round(total_area_ha / 100, 2),
            "subbasin_count": len(subs),
            "bbox": [round(w, 5), round(s_, 5), round(e, 5), round(n, 5)],
        },
        "totals": {
            "forest_ratio": round(forest_w, 4),
            "green_cover_ratio": round(green_w, 4),
            "carbon_storage_mg_c": round(total_carbon, 0),
            "carbon_density_mg_c_per_ha": round(
                total_carbon / total_area_ha, 1
            )
            if total_area_ha
            else 0.0,
            "habitat_quality": round(
                sum(s.habitat_quality * s.area_ha for s in subs) / total_area_ha,
                3,
            )
            if total_area_ha
            else 0.0,
            "water_retention": round(
                sum(s.water_retention * s.area_ha for s in subs) / total_area_ha,
                3,
            )
            if total_area_ha
            else 0.0,
        },
        # Web のコロプレス配色レンジ（サブ流域間の指標の分布）
        "indicator_ranges": {
            "forest_ratio": _range([s.land_cover.forest_ratio for s in subs]),
            "green_cover_ratio": _range(
                [s.land_cover.green_ratio for s in subs]
            ),
            "carbon_density_mg_c_per_ha": _range(
                [s.carbon.density_mg_c_per_ha for s in subs]
            ),
            "habitat_quality": _range([s.habitat_quality for s in subs]),
            "water_retention": _range([s.water_retention for s in subs]),
        },
        "sources": {
            "dem": cfg.dem.source,
            "landcover": cfg.landcover.source,
            "carbon_method": "InVEST Carbon (4-pool lookup)",
        },
        "notes": (
            "自然資本は生物物理量。炭素・保水・生息地質の係数は温帯代表値（暫定）。"
            "サブ流域は流路合流点で分割。金額換算・NDVI は後続バージョンで追加予定。"
        ),
    }


def write_region(region: Dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(region, ensure_ascii=False, indent=2), encoding="utf-8"
    )
