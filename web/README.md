# web — 地図アプリ（Next.js + MapLibre GL JS）

流域と自然資本を YAMAP の流域地図のように表示する Web フロントエンド。
成果物タイル（PMTiles）と統計 JSON を Cloudflare R2 から直読みする。静的配信・サーバー不要。
画面要件は [`../docs/requirements-v1.md`](../docs/requirements-v1.md) 第 6 章。

## 構成（予定）

- Next.js + TypeScript
- MapLibre GL JS + `pmtiles` プロトコルプラグイン
- レイヤ: 陰影起伏（ラスタ PMTiles）→ 流域境界 → 自然資本コロプレス
- 流域クリックで詳細パネル（土地被覆構成・炭素蓄積・緑被率・保水）

## 配信

- ホスト: Vercel Hobby（個人開発フェーズ）
- タイル/データ: Cloudflare R2 + CDN

> 実装はこれから。`create-next-app` での初期化は初回実装時に行う。
