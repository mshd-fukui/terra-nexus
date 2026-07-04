# pipeline — 地理処理バッチ

対象地域ごとに一度だけ実行し、Web が読む成果物（GeoJSON・統計 JSON、将来 PMTiles）を
生成する Python バッチ。常時稼働はしない。要件は [`../docs/requirements-v1.md`](../docs/requirements-v1.md) 第 5 章。

## セットアップ

```bash
cd pipeline
pip install -r requirements.txt
```

## 実行

```bash
python -m terranexus.run --config config/kamogawa.yaml
```

- DEM タイル（Copernicus GLO-30, 認証不要）は初回に `<repo>/data/raw/` へ自動取得・キャッシュ。
- 成果物は `outputs/<region>/` に出力:
  - `watersheds.geojson` — サブ流域ポリゴン（各 Feature に自然資本の属性）
  - `region.json` — 地域サマリ（合計・面積加重平均・指標レンジ）
  - `<region>_dem.tif` — クリップ済み DEM（Git 管理外）

## 実装済みの処理段階

| 段階 | モジュール | 内容 |
|---|---|---|
| 1 | `acquire.py` | Copernicus GLO-30 DEM のモザイク・クリップ |
| 2 | `delineate.py` | pysheds で水文補正 → 流向 → 集積 → **指定流出点**の集水域を導出。さらに流路合流点で**サブ流域に分割** |
| 3 | `landcover.py` | ESA WorldCover を流域 bbox で 1 回読み込み、サブ流域ごとにゾーン集計 |
| 4 | `carbon.py` | InVEST Carbon 方式（4 プール係数）で炭素蓄積量・密度を算定 |
| 5 | `habitat.py` | InVEST Habitat Quality 方式で生息地質（生物多様性の代理）を算定 |
| 6 | `aggregate.py` | サブ流域 GeoJSON（`watersheds.geojson`）＋ 地域サマリ（`region.json`）を書き出し |

指標: 炭素密度・生息地質・森林率・緑被率。生息地質は市街地/農地を攪乱要因とした
距離減衰で自然の質（0〜1）を評価する（新規データ不要）。サブ流域の分割数は
`config` の `subbasin_accum_threshold` で調整（値を下げると分割が細かくなる）。

## パイロット結果（鴨川流域）

`config/kamogawa.yaml` 実行で得られる実データ結果（`outputs/kamogawa/stats.json`）:

- 面積: **185.6 km²**（既知の鴨川流域面積とオーダー一致）
- 土地被覆: 森林 **77.4%** / 市街地 19.9%（上流の山地＋下流の京都市街を反映）
- 炭素蓄積: **約 375 万 Mg C**（密度 201.8 Mg C/ha）

## 設計上のポイント

- **流出点は設定で明示指定**する。最大集積セルの自動採用では隣接する桂川本流を掴んでしまい、
  鴨川固有の流域にならないため（要件書の未解決論点「集水域の分割粒度」に対応）。
- pysheds 0.5 は numpy 2.x で削除された `np.in1d` を使うため、`terranexus.compat` が
  `np.isin` で補う（numpy のピン留め不要）。
- 炭素係数（`data_tables/carbon_pools.csv`）は温帯代表値の**暫定**。日本向けには森林簿・
  J-クレジット係数での補正を想定。

## 未実装（次段階）

- **NDVI・緑被率の衛星由来精緻化**（Sentinel-2）。
- **流域保水指標**（InVEST Water Yield）。
- **金額換算**（係数の妥当性検証込み）。
- **PMTiles 生成**（tippecanoe / gdal → 陰影・流域タイル）と R2 アップロード。

## テスト

```bash
python -m pytest tests/ -q   # 外部データ不要（炭素・比率ロジックの単体テスト）
```
