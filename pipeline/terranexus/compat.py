"""依存ライブラリの互換シム。

pysheds 0.5 は numpy 2.0 で削除された ``np.in1d`` を内部で呼ぶ。
挙動が同一の ``np.isin`` で補って、numpy 2.x でも動作させる。
"""
import numpy as np

if not hasattr(np, "in1d"):
    np.in1d = np.isin  # type: ignore[attr-defined]
