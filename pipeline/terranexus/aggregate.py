"""成果物の組み立て（流域 GeoJSON ＋ 自然資本サマリ JSON）。"""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any, Dict

from shapely.geometry import mapping

from .carbon import CarbonResult
from .config import RegionConfig
from .delineate import Delineation
from .geo import geographic_area_ha
from .landcover import LandCover, WORLDCOVER_CLASSES


def write_geojson(cfg: RegionConfig, dl: Delineation, path: Path) -> None:
    feature = {
        "type": "Feature",
        "properties": {"name": cfg.name, "label": cfg.label},
        "geometry": mapping(dl.basin),
    }
    fc = {"type": "FeatureCollection", "features": [feature]}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")


def build_stats(
    cfg: RegionConfig, dl: Delineation, lc: LandCover, carbon: CarbonResult
) -> Dict[str, Any]:
    area_ha = geographic_area_ha(dl.basin)
    land_cover = [
        {
            "lucode": code,
            "name": WORLDCOVER_CLASSES.get(code, str(code)),
            "area_ha": round(ha, 1),
            "share": round(ha / lc.total_ha, 4) if lc.total_ha else 0.0,
            "carbon_mg_c": round(carbon.by_class_mg_c.get(code, 0.0), 0),
        }
        for code, ha in sorted(
            lc.area_ha_by_class.items(), key=lambda kv: kv[1], reverse=True
        )
    ]
    return {
        "region": {"name": cfg.name, "label": cfg.label},
        "generated": date.today().isoformat(),
        "geometry": {
            "outlet_snapped": {
                "lon": round(dl.outlet_snapped[0], 5),
                "lat": round(dl.outlet_snapped[1], 5),
            },
            "area_ha": round(area_ha, 1),
            "area_km2": round(area_ha / 100, 2),
        },
        "natural_capital": {
            "land_cover": land_cover,
            "green_cover_ratio": round(lc.green_ratio, 4),
            "forest_ratio": round(lc.forest_ratio, 4),
            "carbon_storage_mg_c": round(carbon.total_mg_c, 0),
            "carbon_density_mg_c_per_ha": round(carbon.density_mg_c_per_ha, 1),
        },
        "sources": {
            "dem": cfg.dem.source,
            "landcover": cfg.landcover.source,
            "carbon_method": "InVEST Carbon (4-pool lookup)",
        },
        "notes": (
            "自然資本は生物物理量。炭素係数は温帯代表値（暫定）。"
            "金額換算・NDVI・保水指標は後続バージョンで追加予定。"
        ),
    }


def write_stats(stats: Dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8"
    )
