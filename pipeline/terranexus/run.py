"""パイプライン実行のオーケストレーション。

使い方:
    python -m terranexus.run --config config/kamogawa.yaml

段階: DEM 取得/クリップ → 流域導出・サブ流域分割 → 土地被覆（1 回読み）→
各サブ流域のゾーン集計・炭素算定 → 集計・書き出し。
成果物は <output_dir>/watersheds.geojson と <output_dir>/region.json。
"""
from __future__ import annotations

import argparse
from pathlib import Path

from . import compat  # noqa: F401  numpy2 互換シム
from .config import RegionConfig
from .acquire import prepare_dem
from .delineate import delineate
from .landcover import WorldCover, zonal_class_areas
from .carbon import estimate, load_coefficients
from .habitat import habitat_quality_raster, zonal_mean as habitat_zonal_mean
from .aggregate import (
    SubBasinStats,
    build_region,
    write_region,
    write_watersheds,
)
from .geo import geographic_area_ha

_PKG_ROOT = Path(__file__).resolve().parent.parent  # pipeline/


def main() -> None:
    ap = argparse.ArgumentParser(description="Terra Nexus 自然資本パイプライン")
    ap.add_argument("--config", required=True, help="地域設定 YAML のパス")
    ap.add_argument(
        "--raw-dir",
        default=str(_PKG_ROOT.parent / "data" / "raw"),
        help="DEM タイルのキャッシュ先（既定: <repo>/data/raw）",
    )
    args = ap.parse_args()

    cfg = RegionConfig.load(args.config)
    raw_dir = Path(args.raw_dir)
    work = cfg.output_dir
    work.mkdir(parents=True, exist_ok=True)

    print(f"=== {cfg.label} ({cfg.name}) ===")
    dem_path = prepare_dem(cfg, raw_dir, work / f"{cfg.name}_dem.tif")
    dl = delineate(cfg, dem_path)

    wc = WorldCover.load(cfg, dl.basin)
    coeffs = load_coefficients(_PKG_ROOT / "data_tables" / "carbon_pools.csv")
    habitat_q = habitat_quality_raster(wc)  # 生息地質ラスタ（1 回計算）

    subs = []
    for sb in dl.subbasins:
        lc = zonal_class_areas(wc, sb.geometry)
        carbon = estimate(lc, coeffs)
        subs.append(
            SubBasinStats(
                id=sb.id,
                geometry=sb.geometry,
                area_ha=geographic_area_ha(sb.geometry),
                land_cover=lc,
                carbon=carbon,
                habitat_quality=habitat_zonal_mean(habitat_q, wc, sb.geometry),
            )
        )

    write_watersheds(subs, work / "watersheds.geojson")
    region = build_region(cfg, dl, subs)
    write_region(region, work / "region.json")

    print(f"[done] outputs in {work}")
    t = region["totals"]
    print(
        f"  subbasins={region['geometry']['subbasin_count']}  "
        f"area={region['geometry']['area_km2']} km2  "
        f"forest={t['forest_ratio']:.0%}  "
        f"carbon={t['carbon_storage_mg_c']:.0f} Mg C"
    )


if __name__ == "__main__":
    main()
