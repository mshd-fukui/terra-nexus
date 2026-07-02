"""DEM の取得・モザイク・クリップ。

Copernicus GLO-30 DEM（AWS Open Data, 認証不要）を対象タイルぶん用意し、
モザイク後に対象地域のバウンディングボックスへ切り出す。
ローカルに ``data/raw/cop_dem_<TILE>.tif`` があればそれを使い、無ければ取得する。
"""
from __future__ import annotations

import re
import urllib.request
from pathlib import Path
from typing import List

import rasterio
from rasterio.merge import merge
from rasterio.windows import from_bounds

from .config import RegionConfig

_COP_URL = (
    "https://copernicus-dem-30m.s3.amazonaws.com/"
    "Copernicus_DSM_COG_10_{n}_00_{e}_00_DEM/"
    "Copernicus_DSM_COG_10_{n}_00_{e}_00_DEM.tif"
)


def _tile_to_ne(tile: str) -> tuple[str, str]:
    """'N34E135' -> ('N34', 'E135')。"""
    m = re.fullmatch(r"([NS]\d{2})([EW]\d{3})", tile)
    if not m:
        raise ValueError(f"unexpected DEM tile name: {tile}")
    return m.group(1), m.group(2)


def _ensure_tile(tile: str, raw_dir: Path) -> Path:
    dst = raw_dir / f"cop_dem_{tile}.tif"
    if dst.exists() and dst.stat().st_size > 0:
        return dst
    n, e = _tile_to_ne(tile)
    url = _COP_URL.format(n=n, e=e)
    raw_dir.mkdir(parents=True, exist_ok=True)
    print(f"[acquire] downloading DEM tile {tile} ...")
    urllib.request.urlretrieve(url, dst)
    return dst


def prepare_dem(cfg: RegionConfig, raw_dir: Path, out_path: Path) -> Path:
    """モザイク → クリップした DEM を out_path に書き出して返す。"""
    tiles: List[Path] = [_ensure_tile(t, raw_dir) for t in cfg.dem.tiles]

    srcs = [rasterio.open(p) for p in tiles]
    try:
        mosaic, transform = merge(srcs)
        profile = srcs[0].profile.copy()
    finally:
        for s in srcs:
            s.close()
    profile.update(
        height=mosaic.shape[1], width=mosaic.shape[2], transform=transform, count=1
    )

    tmp = out_path.parent / f"_{cfg.name}_mosaic.tif"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(tmp, "w", **profile) as dst:
        dst.write(mosaic[0], 1)

    w, s, e, n = cfg.dem.clip_bbox
    with rasterio.open(tmp) as ds:
        window = from_bounds(w, s, e, n, ds.transform)
        clip = ds.read(1, window=window)
        clip_tr = ds.window_transform(window)
        p = ds.profile.copy()
        p.update(height=clip.shape[0], width=clip.shape[1], transform=clip_tr, count=1)
    with rasterio.open(out_path, "w", **p) as dst:
        dst.write(clip, 1)
    tmp.unlink(missing_ok=True)
    print(f"[acquire] DEM ready: {out_path.name} shape={clip.shape}")
    return out_path
