# web — 地図アプリ（Next.js + MapLibre GL JS）

流域と自然資本を YAMAP の流域地図のように表示するフロントエンド。
パイプラインが出力した流域 GeoJSON と統計 JSON を読み込んで地図・パネルに描画する。
画面要件は [`../docs/requirements-v1.md`](../docs/requirements-v1.md) 第 6 章。

## セットアップ・実行

```bash
cd web
npm install
npm run dev      # http://localhost:3000
# 本番ビルド: npm run build && npm start
```

## 実装済み

- **Next.js 14（App Router）+ TypeScript**。
- **MapLibre GL JS** による地図（`components/WatershedMap.tsx`）:
  - 背景のみで起動し、load 後に**地形陰影**（自前の terrain-RGB PMTiles。DEM 由来・外部依存なし）
    と**サブ流域**を追加。
  - **サブ流域コロプレス**: 指標（炭素密度／森林率／緑被率）で塗り分け。凡例つき。
  - サブ流域クリックで選択ハイライト＋詳細表示（feature-state）。
- **サイドパネル**（`components/StatsPanel.tsx`）: 地域セレクタ・指標セレクタ・カラー凡例・
  流域全体サマリ、選択サブ流域の詳細と、ESA WorldCover 標準配色の土地被覆構成。
- **地域切替**: `public/data/regions.json` の一覧から選択。地域を変えると地図を作り直し、
  その地域の PMTiles・サマリを読み込む（現在: 鴨川流域・那珂川流域）。
- **TNFD レポート**（`app/report/page.tsx`）: `/report?region=<name>` で、地域の自然資本を
  TNFD LEAP 構造（所在・評価・重要度・開示）で提示する印刷可能な文書。`subbasins.json` と
  `region.json` を読み、ブラウザの印刷から PDF 保存できる（バックエンド不要）。
- データは `public/data/<region>/` の **`watersheds.pmtiles`**（ベクタタイル）を
  pmtiles プロトコルで range 読みし、`region.json`（サマリ・指標レンジ・bbox）を fetch する。
  PMTiles は単一ファイルで、静的ホスティング（GitHub Pages / Cloudflare R2）がそのまま配信できる。

## 検証状況

- `npm run build` 通過（型・lint・コンパイル）。
- 実データ（鴨川流域）でサイドパネルが正しく描画されることを確認済み
  （面積 185.6 km²・森林率 77%・炭素 3.75 Mt C・土地被覆バー）。
- 地図タイルの実表示はローカル/Vercel で確認する。外部地形タイルへの到達が必要なため、
  ネットワーク制限のある環境では地形が空表示になる（コードの不具合ではない）。

## 配信（予定）

- ホスト: Vercel Hobby（個人開発フェーズ）
- タイル/データ: Cloudflare R2 + CDN（PMTiles 化後）

## 未実装（次段階）

- 複数流域（サブ流域）の色分け＝自然資本コロプレス（現状は単一流域）。
- 指標セレクタ（炭素密度 / 緑被率 で塗り分け切替）。
- PMTiles 化（陰影・流域を R2 から range 読み）。
