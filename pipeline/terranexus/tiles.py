"""ベクタ PMTiles 生成（tippecanoe）。

サブ流域 GeoJSON を MVT ベクタタイルに変換し、単一の PMTiles アーカイブにする。
tippecanoe が未インストールの環境では警告してスキップする（GeoJSON 出力は維持）。
成果物は Cloudflare R2 等の静的配信に置き、MapLibre が range 読みする。
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Optional


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
