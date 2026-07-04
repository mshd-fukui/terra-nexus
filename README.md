# Terra Nexus

都市（人間）と自然の共進化プラットフォーム。

その第一歩として、**特定地域の自然資本を流域単位で算定し、YAMAP の流域地図のように地図上へ可視化する** Web アプリケーションを開発する。
算定した自然資本（炭素・生物多様性・水・植生）は、地図上のコロプレス表示に加えて、
TNFD LEAP 構造の**自然関連レポート**として出力できる。

## いま作るもの（v1）

> 地域を選ぶ → 地形 DEM から流域（集水域）を描く → 土地被覆を分類する → 流域ごとの自然資本を算定する → 地形が読める地図に重ねて表示する

自然資本は金額換算せず、**生物物理量**（土地被覆構成・炭素蓄積・緑被率・流域保水の代理指標）に留める。数値は自前ロジックで作らず、査読済みの [InVEST](https://naturalcapitalproject.stanford.edu/software/invest) モデルで裏付ける。

詳細は [`docs/requirements-v1.md`](docs/requirements-v1.md) を参照。

## リポジトリ構成

```
/pipeline   Python 地理処理（流域導出・土地被覆・InVEST 算定・タイル化）バッチ
/web        Next.js 地図アプリ（MapLibre GL JS）
/data       生成物・入力データ（Git 管理外）
/docs       要件・アーキテクチャ・データ辞書
```

## 技術スタック（確定）

| レイヤ | 採用 |
|---|---|
| フロント | Next.js + TypeScript / MapLibre GL JS + PMTiles |
| 地理処理 | Python / rasterio・geopandas・**pysheds**・**natcap.invest** |
| 土地被覆 | ESA WorldCover 10m（v1 は既製を利用） |
| タイル | PMTiles（静的・サーバー不要） |
| 静的配信 | Cloudflare R2（エグレス無料）+ CDN |
| フロント配信 | Vercel Hobby |
| 動的サービス（v1.1〜） | Fly.io に FastAPI + TiTiler + PostGIS（**仮置き**） |

設計思想と根拠は [`docs/architecture.md`](docs/architecture.md)。

## 開発ステータス

企画のブラッシュアップを終え、v1 要件定義フェーズ。パイプライン・Web の実装はこれから。

## ライセンス / 出典

利用データの出典・ライセンスは [`docs/data-sources.md`](docs/data-sources.md) に集約する。
