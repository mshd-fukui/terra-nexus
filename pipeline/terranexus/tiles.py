"""ベクタ PMTiles 生成（tippecanoe）。

サブ流域 GeoJSON を MVT ベクタタイルに変換し、単一の PMTiles アーカイブにする。
tippecanoe が未インストールの環境では警告してスキップする（GeoJSON 出力は維持）。
成果物は Cloudflare R2 等の静的配信に置き、MapLibre が range 読みする。
"""
from __future__ import annotations

import shutil
import sqlite3
import subprocess
from pathlib import Path
from typing import Optional

import rasterio


def build_pmtiles(
    geojson_path: Path,
    out_path: Path,
    layer: str = "subbasins",
    minzoom: int = 5,
    maxzoom: int = 13,
) -> Optional[Path]:
    tippecanoe = shutil.which("tippecanoe")
    if not tippecanoe:
        print(
            "[tiles] tippecanoe が見つかりません。PMTiles 生成をスキップします"
            "（GeoJSON は出力済み）。"
        )
        return None

    subprocess.run(
        [
            tippecanoe,
            "-o", str(out_path),
            "-l", layer,
            "-Z", str(minzoom),
            "-z", str(maxzoom),
            "--no-tile-size-limit",
            "--no-feature-limit",
            "--force",
            str(geojson_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"[tiles] PMTiles 生成: {out_path.name}")
    return out_path


def build_terrain_pmtiles(
    dem_path: Path, out_path: Path, minzoom: int = 8, maxzoom: int = 12
) -> Optional[Path]:
    """DEM を terrain-RGB（mapbox エンコード）のラスタ PMTiles に変換する。

    MapLibre の raster-dem ソースで動的陰影に使う（外部地形タイルへの依存を排除）。
    maxzoom=12 は 30m DEM の解像度（約 38m/px）に見合う上限。
    rio-rgbify / pmtiles-convert が無い環境ではスキップする。
    """
    if not (shutil.which("rio") and shutil.which("pmtiles-convert")):
        print("[tiles] rio-rgbify/pmtiles-convert 未導入。地形 PMTiles をスキップ")
        return None

    mbt = out_path.with_suffix(".mbtiles")
    try:
        subprocess.run(
            [
                "rio", "rgbify", "-b", "-10000", "-i", "0.1",
                "--min-z", str(minzoom), "--max-z", str(maxzoom),
                "--format", "png", str(dem_path), str(mbt),
            ],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        # rio-rgbify は minzoom/maxzoom/bounds を書かないため補う（pmtiles-convert が要求）
        with rasterio.open(dem_path) as ds:
            b = ds.bounds
        con = sqlite3.connect(mbt)
        rows = [
            ("minzoom", str(minzoom)), ("maxzoom", str(maxzoom)),
            ("format", "png"),
            ("bounds", f"{b.left},{b.bottom},{b.right},{b.top}"),
            ("center", f"{(b.left + b.right) / 2},{(b.bottom + b.top) / 2},{minzoom + 3}"),
        ]
        con.executemany(
            "INSERT OR REPLACE INTO metadata(name,value) VALUES(?,?)", rows
        )
        con.commit()
        con.close()
        subprocess.run(
            ["pmtiles-convert", str(mbt), str(out_path)],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError as e:
        print(f"[tiles] 地形 PMTiles 生成に失敗（スキップ）: {e}")
        return None
    finally:
        mbt.unlink(missing_ok=True)

    print(f"[tiles] 地形 PMTiles 生成: {out_path.name}")
    return out_path
