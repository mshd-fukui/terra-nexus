"""生息地質（Habitat Quality）の算定 — InVEST Habitat Quality モデル方式。

土地被覆から生息地の適性 H を与え、市街地・農地を「攪乱要因（threat）」として
距離減衰で劣化 D を評価し、質 Q = H * (1 - D^z/(D^z+k^z)) を求める。
新規データは不要（WorldCover と距離計算のみ）。係数は温帯代表値の暫定。
"""
from __future__ import annotations

from typing import List, Tuple

import numpy as np
from rasterio.features import geometry_mask
from scipy.signal import fftconvolve
from shapely.geometry import mapping
from shapely.geometry.base import BaseGeometry

from .landcover import WorldCover

# WorldCover クラス -> 生息地適性 H（0..1、自然ほど高い）
HABITAT_SUITABILITY = {
    10: 1.0, 20: 0.8, 30: 0.6, 40: 0.3, 50: 0.0, 60: 0.2,
    70: 0.0, 80: 0.9, 90: 1.0, 95: 1.0, 100: 0.5,
}

# 攪乱要因: (WorldCover クラス, 重み, 最大到達距離 m, 減衰種別)
THREATS: List[Tuple[int, float, float, str]] = [
    (50, 1.0, 1000.0, "exp"),     # 市街地
    (40, 0.5, 500.0, "linear"),   # 農地
]

_PIXEL_M = 10.0  # WorldCover 解像度（近似。緯度により経度方向はやや小さい）
_Z = 2.5         # 半飽和の指数


def _decay_kernel(dmax_m: float, kind: str) -> np.ndarray:
    r = int(round(dmax_m / _PIXEL_M))
    y, x = np.ogrid[-r : r + 1, -r : r + 1]
    dist = np.hypot(x, y) * _PIXEL_M
    if kind == "exp":
        k = np.exp(-2.99 * dist / dmax_m)
    else:
        k = 1.0 - dist / dmax_m
    k[dist > dmax_m] = 0.0
    return k.astype(np.float32)


def habitat_quality_raster(wc: WorldCover) -> np.ndarray:
    """WorldCover 配列から生息地質 Q（0..1）を計算。データ外は NaN。"""
    arr = wc.array
    suit = np.zeros(arr.shape, dtype=np.float32)
    for code, h in HABITAT_SUITABILITY.items():
        suit[arr == code] = h
    sens = suit  # 感度 ≒ 自然度

    wsum = sum(t[1] for t in THREATS)
    degradation = np.zeros(arr.shape, dtype=np.float32)
    for cls, w, dmax, kind in THREATS:
        infl = fftconvolve(
            (arr == cls).astype(np.float32), _decay_kernel(dmax, kind), mode="same"
        )
        infl = np.clip(infl, 0.0, None)
        m = infl.max()
        if m > 0:
            infl /= m
        degradation += (w / wsum) * sens * infl

    k = 0.5 * float(degradation.max() or 1.0)
    q = suit * (1.0 - (degradation ** _Z) / (degradation ** _Z + k ** _Z))
    q = q.astype(np.float32)
    q[arr == 0] = np.nan
    print(f"[habitat] Q mean={np.nanmean(q):.3f}")
    return q


def zonal_mean(q: np.ndarray, wc: WorldCover, geom: BaseGeometry) -> float:
    """ポリゴン内の生息地質の平均（0..1）。"""
    inside = geometry_mask(
        [mapping(geom)], out_shape=q.shape, transform=wc.transform, invert=True
    )
    vals = q[inside]
    vals = vals[~np.isnan(vals)]
    return float(vals.mean()) if vals.size else 0.0
