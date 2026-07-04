"""流域（集水域）の導出とサブ流域分割。

pysheds で DEM を水文補正し、指定した流出点に流入する集水域（本流域）を切り出す。
さらに、流路網の合流点ごとに集水域を切り、入れ子の最小集水域へ各セルを割り当てて
サブ流域に分割する（YAMAP 的な複数流域の色分けの基礎）。
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from rasterio import features
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union
from pysheds.grid import Grid

from .config import RegionConfig

# pysheds 既定の D8 方向値 -> (行, 列) オフセット
_OFFSETS: Dict[int, Tuple[int, int]] = {
    64: (-1, 0), 128: (-1, 1), 1: (0, 1), 2: (1, 1),
    4: (1, 0), 8: (1, -1), 16: (0, -1), 32: (-1, -1),
}


@dataclass
class SubBasin:
    id: int
    geometry: BaseGeometry  # EPSG:4326


@dataclass
class Delineation:
    basin: BaseGeometry  # 本流域（サブ流域の和）
    outlet_snapped: Tuple[float, float]  # lon, lat
    subbasins: List[SubBasin]
    n_cells: int


def _polygonize(mask: np.ndarray, affine) -> BaseGeometry:
    polys = [
        shape(geom)
        for geom, val in features.shapes(
            mask.astype(np.uint8), mask=mask, transform=affine
        )
        if val == 1
    ]
    return unary_union(polys)


def delineate(cfg: RegionConfig, dem_path: Path) -> Delineation:
    grid = Grid.from_raster(str(dem_path))
    dem = grid.read_raster(str(dem_path))

    inflated = grid.resolve_flats(grid.fill_depressions(grid.fill_pits(dem)))
    fdir = grid.flowdir(inflated)
    acc = grid.accumulation(fdir)

    # --- 本流域 ---
    lon, lat = cfg.delineation.outlet
    ox, oy = grid.snap_to_mask(
        acc > cfg.delineation.snap_accum_threshold, (lon, lat)
    )
    basin_mask = np.asarray(
        grid.catchment(x=ox, y=oy, fdir=fdir, xytype="coordinate")
    ).astype(bool)
    n_cells = int(basin_mask.sum())
    if n_cells == 0:
        raise RuntimeError(
            "集水域が空です。流出点の座標か snap 閾値を見直してください。"
        )
    basin = _polygonize(basin_mask, grid.affine)

    # --- サブ流域分割 ---
    fd = np.asarray(fdir)
    accn = np.asarray(acc)
    H, W = fd.shape
    streams = (accn > cfg.delineation.subbasin_accum_threshold) & basin_mask

    def downstream(r: int, c: int):
        d = fd[r, c]
        o = _OFFSETS.get(int(d))
        if o is None:
            return None
        nr, nc = r + o[0], c + o[1]
        return (nr, nc) if 0 <= nr < H and 0 <= nc < W else None

    # 流路セルの流入数（合流点 = 2 本以上が流れ込むセル）
    indeg = np.zeros_like(fd, dtype=np.int32)
    for r, c in np.argwhere(streams):
        ds = downstream(int(r), int(c))
        if ds is not None and streams[ds]:
            indeg[ds] += 1
    confluences = [tuple(p) for p in np.argwhere((indeg >= 2) & streams)]

    # 流出点セル（集積量が最大のセル）＋各合流点を pour point とする
    outlet_cell = tuple(
        np.argwhere(basin_mask & (accn == accn[basin_mask].max()))[0]
    )
    pour_points = [outlet_cell] + confluences

    # 各 pour point の集水域を切り、面積の大きい順に塗って「最小の集水域」で分割
    cats = []
    for r, c in pour_points:
        cm = np.asarray(
            grid.catchment(x=int(c), y=int(r), fdir=fdir, xytype="index")
        ).astype(bool)
        cm &= basin_mask
        cats.append(cm)
    order = sorted(range(len(cats)), key=lambda i: -int(cats[i].sum()))
    label = np.full(fd.shape, -1, dtype=np.int32)
    for i in order:
        label[cats[i]] = i

    subbasins: List[SubBasin] = []
    for new_id, raw_id in enumerate(np.unique(label[label >= 0])):
        geom = _polygonize(label == raw_id, grid.affine)
        subbasins.append(SubBasin(id=new_id, geometry=geom))

    print(
        f"[delineate] outlet(snapped)=({float(ox):.4f},{float(oy):.4f}) "
        f"cells={n_cells} subbasins={len(subbasins)}"
    )
    return Delineation(
        basin=basin,
        outlet_snapped=(float(ox), float(oy)),
        subbasins=subbasins,
        n_cells=n_cells,
    )
