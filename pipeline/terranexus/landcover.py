"""土地被覆（ESA WorldCover）の流域内クリップと集計。

WorldCover タイルを S3 から COG の窓読み（/vsicurl/）で参照し、
流域ポリゴンでマスクしてクラス別面積を求める。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict

import numpy as np
import rasterio
from rasterio.mask import mask as rio_mask
from shapely.geometry import mapping
from shapely.geometry.base import BaseGeometry

from .config import RegionConfig
from .geo import pixel_area_ha

_WC_URL = (
    "/vsicurl/https://esa-worldcover.s3.eu-central-1.amazonaws.com/"
    "v200/2021/map/ESA_WorldCover_10m_2021_v200_{tile}_Map.tif"
)

# ESA WorldCover v200 クラス
WORLDCOVER_CLASSES: Dict[int, str] = {
    10: "Tree cover",
    20: "Shrubland",
    30: "Grassland",
    40: "Cropland",
    50: "Built-up",
    60: "Bare/sparse",
    70: "Snow/ice",
    80: "Permanent water",
    90: "Herbaceous wetland",
    95: "Mangroves",
    100: "Moss/lichen",
}

# 「緑被」に数える自然被覆クラス（市街地・水域・裸地・雪氷を除く）
GREEN_CLASSES = {10, 20, 30, 40, 90, 95, 100}


@dataclass
class LandCover:
    area_ha_by_class: Dict[int, float] = field(default_factory=dict)

    @property
    def total_ha(self) -> float:
        return sum(self.area_ha_by_class.values())

    @property
    def green_ratio(self) -> float:
        if self.total_ha == 0:
            return 0.0
        green = sum(
            ha for c, ha in self.area_ha_by_class.items() if c in GREEN_CLASSES
        )
        return green / self.total_ha

    @property
    def forest_ratio(self) -> float:
        if self.total_ha == 0:
            return 0.0
        return self.area_ha_by_class.get(10, 0.0) / self.total_ha


def classify(cfg: RegionConfig, basin: BaseGeometry) -> LandCover:
    url = _WC_URL.format(tile=cfg.landcover.tile)
    with rasterio.open(url) as wc:
        out, out_tr = rio_mask(wc, [mapping(basin)], crop=True)
    lc = out[0]

    lat = basin.centroid.y
    px_ha = pixel_area_ha(out_tr, lat)

    vals, counts = np.unique(lc[lc != 0], return_counts=True)
    area = {int(v): float(c) * px_ha for v, c in zip(vals.tolist(), counts.tolist())}
    print(f"[landcover] classes={len(area)} total_ha={sum(area.values()):.0f}")
    return LandCover(area_ha_by_class=area)
