"""流域（集水域）の導出。

pysheds で DEM を水文補正し、指定した流出点に流入する集水域を切り出して
ポリゴン化する。流出点は地域設定で明示指定し、集積量の高いセルへスナップする。
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from rasterio import features
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union
from pysheds.grid import Grid

from .config import RegionConfig


@dataclass
class Delineation:
    basin: BaseGeometry  # EPSG:4326 ポリゴン
    outlet_snapped: tuple[float, float]  # lon, lat
    n_cells: int


def delineate(cfg: RegionConfig, dem_path: Path) -> Delineation:
    grid = Grid.from_raster(str(dem_path))
    dem = grid.read_raster(str(dem_path))

    # 水文補正: ピット除去 → 窪地埋め → 平坦地解消
    inflated = grid.resolve_flats(
        grid.fill_depressions(grid.fill_pits(dem))
    )
    fdir = grid.flowdir(inflated)
    acc = grid.accumulation(fdir)

    # 流出点を集積量の高い流路セルへスナップ
    lon, lat = cfg.delineation.outlet
    x, y = grid.snap_to_mask(acc > cfg.delineation.snap_accum_threshold, (lon, lat))

    catch = grid.catchment(x=x, y=y, fdir=fdir, xytype="coordinate")
    mask = np.asarray(catch).astype(np.uint8)
    n_cells = int(mask.sum())
    if n_cells == 0:
        raise RuntimeError(
            "集水域が空です。流出点の座標か snap 閾値を見直してください。"
        )

    polys = [
        shape(geom)
        for geom, val in features.shapes(mask, mask=mask == 1, transform=grid.affine)
        if val == 1
    ]
    basin = unary_union(polys)

    print(
        f"[delineate] outlet(snapped)=({float(x):.4f},{float(y):.4f}) "
        f"cells={n_cells}"
    )
    return Delineation(
        basin=basin, outlet_snapped=(float(x), float(y)), n_cells=n_cells
    )
