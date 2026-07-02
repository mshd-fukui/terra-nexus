"""パイプライン実行のオーケストレーション。

使い方:
    python -m terranexus.run --config config/kamogawa.yaml

段階: DEM 取得/クリップ → 流域導出 → 土地被覆 → 炭素算定 → 集計・書き出し。
成果物は <output_dir>/watershed.geojson と <output_dir>/stats.json。
"""
from __future__ import annotations

import argparse
from pathlib import Path

from . import compat  # noqa: F401  numpy2 互換シム
from .config import RegionConfig
from .acquire import prepare_dem
from .delineate import delineate
from .landcover import classify
from .carbon import estimate, load_coefficients
from .aggregate import build_stats, write_geojson, write_stats

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
    lc = classify(cfg, dl.basin)
    coeffs = load_coefficients(_PKG_ROOT / "data_tables" / "carbon_pools.csv")
    carbon = estimate(lc, coeffs)

    write_geojson(cfg, dl, work / "watershed.geojson")
    stats = build_stats(cfg, dl, lc, carbon)
    write_stats(stats, work / "stats.json")

    print(f"[done] outputs in {work}")
    print(
        f"  area={stats['geometry']['area_km2']} km2  "
        f"forest={stats['natural_capital']['forest_ratio']:.0%}  "
        f"carbon={stats['natural_capital']['carbon_storage_mg_c']:.0f} Mg C"
    )


if __name__ == "__main__":
    main()
