"""土地被覆（ESA WorldCover）の読み込みとゾーン集計。

WorldCover タイルを S3 から COG の窓読み（/vsicurl/）で流域 bbox 一括取得し、
サブ流域ごとにポリゴンでゾーン集計してクラス別面積を求める（HTTP 読みは 1 回）。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict

import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.windows import from_bounds
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
class WorldCover:
    """流域 bbox でクリップした WorldCover ラスタ（メモリ上）。"""

    array: np.ndarray
    transform: object

    @staticmethod
    def load(cfg: RegionConfig, basin: BaseGeometry) -> "WorldCover":
        url = _WC_URL.format(tile=cfg.landcover.tile)
        with rasterio.open(url) as wc:
            window = from_bounds(*basin.bounds, wc.transform)
            arr = wc.read(1, window=window)
            tr = wc.window_transform(window)
        print(f"[landcover] WorldCover loaded shape={arr.shape}")
        return WorldCover(array=arr, transform=tr)


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


def zonal_class_areas(wc: WorldCover, geom: BaseGeometry) -> LandCover:
    """ポリゴン内の WorldCover クラス別面積（ha）を求める。"""
    inside = geometry_mask(
        [mapping(geom)], out_shape=wc.array.shape, transform=wc.transform,
        invert=True,
    )
    lc = wc.array[inside]
    lc = lc[lc != 0]
    px_ha = pixel_area_ha(wc.transform, geom.centroid.y)
    vals, counts = np.unique(lc, return_counts=True)
    area = {int(v): float(c) * px_ha for v, c in zip(vals.tolist(), counts.tolist())}
    return LandCover(area_ha_by_class=area)
