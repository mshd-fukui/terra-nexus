# pipeline — 地理処理バッチ

対象地域ごとに一度だけ実行し、Web が読む成果物（タイル・統計）を生成する Python バッチ。
常時稼働はしない。詳細な要件は [`../docs/requirements-v1.md`](../docs/requirements-v1.md) 第 5 章。

## 処理段階

1. DEM 取得・モザイク・投影統一（rasterio）
2. 流域導出（pysheds: 窪地補正 → 流向 → 流量集積 → 集水域ポリゴン）
3. 土地被覆クリップ・整理（ESA WorldCover）
4. 植生指標（Sentinel-2 → NDVI・緑被率）
5. 自然資本算定（natcap.invest: Carbon / Water Yield）
6. 流域 × 指標の集計（統計 JSON）
7. タイル化（陰影: gdaldem → PMTiles / 流域: tippecanoe → PMTiles）

## 成果物

- `hillshade.pmtiles` — 陰影起伏
- `watersheds.pmtiles` — 流域ポリゴン＋自然資本属性
- `stats/<region>.json` — 流域別サマリ

生成後は Cloudflare R2 にアップロードして Web から直読みする。

## 主要ライブラリ（予定）

rasterio, geopandas, shapely, pysheds, natcap.invest, numpy, pyproj

## 対象地域

設定で差し替え可能。最初のテスト対象は **鴨川流域**。

> 実装はこれから。ディレクトリ構成・エントリポイントは初回実装時に確定する。
