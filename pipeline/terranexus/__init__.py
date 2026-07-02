"""Terra Nexus 地理処理パイプライン。

対象地域ごとに DEM → 流域導出 → 土地被覆 → 自然資本算定 → 集計 を実行し、
Web が読む成果物（GeoJSON / 統計 JSON）を生成するバッチ。
"""
from . import compat  # noqa: F401  numpy2 互換シムを副作用として適用

__all__ = ["compat"]
