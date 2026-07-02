"""地理計算の共通ヘルパー。"""
from __future__ import annotations

from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry
from pyproj import Geod

_GEOD = Geod(ellps="WGS84")


def geographic_area_ha(geom: BaseGeometry) -> float:
    """緯度経度（EPSG:4326）のポリゴン面積を ha で返す（測地線・楕円体基準）。"""
    area_m2, _ = _GEOD.geometry_area_perimeter(geom)
    return abs(area_m2) / 10_000.0


def pixel_area_ha(transform, latitude: float) -> float:
    """緯度経度ラスタの 1 ピクセル面積を ha で近似する（平均緯度の cos 補正）。"""
    import math

    deg_x = abs(transform.a)
    deg_y = abs(transform.e)
    m_per_deg = 111_320.0
    width_m = deg_x * m_per_deg * math.cos(math.radians(latitude))
    height_m = deg_y * m_per_deg
    return width_m * height_m / 10_000.0


def geom_from_mask(geom_dict) -> BaseGeometry:
    return shape(geom_dict)
