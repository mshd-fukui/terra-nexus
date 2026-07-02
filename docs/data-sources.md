# データソース辞書

最終更新: 2026-07-02

v1 で利用する公開データの出典・ライセンス・帰属表記を集約する。
UI のクレジット表示はこの表を正とする。取得時に各提供元の最新の利用条件を再確認すること。

---

## 1. 地形・標高（DEM）

- **名称**: 基盤地図情報 数値標高モデル（DEM 5m / 10m）
- **提供**: 国土地理院
- **用途**: 流域（集水域）導出、陰影起伏生成
- **形式**: JPGIS (GML) / GeoTIFF 変換
- **帰属表記例**: 「この地図は国土地理院の基盤地図情報（数値標高モデル）を加工して作成」
- **メモ**: 利用にあたり測量法に基づく申請が必要な場合がある。要確認。

## 2. 土地被覆

- **名称**: ESA WorldCover
- **提供**: European Space Agency (ESA) / Copernicus
- **解像度**: 10m
- **用途**: 被覆構成比、炭素・保水モデルの入力
- **ライセンス**: CC BY 4.0
- **帰属表記例**: 「© ESA WorldCover project / Contains modified Copernicus data」

## 3. 植生指標（NDVI）

- **名称**: Sentinel-2 L2A
- **提供**: Copernicus / ESA
- **解像度**: 10m（可視・近赤外）
- **用途**: NDVI・緑被率の算出
- **ライセンス**: Copernicus データ（無償・再利用可、帰属表記要）
- **取得経路候補**: Copernicus Data Space Ecosystem / Microsoft Planetary Computer (STAC)
- **帰属表記例**: 「Contains modified Copernicus Sentinel data [年]」

## 4. 河川

- **名称**: 国土数値情報 河川データ
- **提供**: 国土交通省
- **用途**: 流域導出結果の妥当性確認、水系名ラベル
- **ライセンス**: 国土数値情報 利用約款（帰属表記で利用可）
- **帰属表記例**: 「国土交通省 国土数値情報（河川データ）を加工して作成」

## 5. 自然資本モデルと係数

- **名称**: InVEST（Integrated Valuation of Ecosystem Services and Tradeoffs）
- **提供**: Natural Capital Project（Stanford 他）
- **用途**: 炭素蓄積（Carbon）、水収量/保水（Water Yield）等の算定
- **ライセンス**: OSS（3-Clause BSD 系）。Python API `natcap.invest`
- **メモ**: 係数テーブルは付属デフォルト値を出発点とし、日本向けには
  森林簿・J-クレジット制度の係数等で補正することを検討（未解決論点）。

## 6. （将来 / v1.1 以降）

- 国土数値情報 流域界データ（既製流域ポリゴンとの比較用）
- 国勢調査 / 社人研 将来人口推計（MODULE D）
- 固定資産・建物現況（MODULE D）

---

## クレジット表示の運用

- UI フッター/クレジットに、上記のうち v1 で実際に使用したデータの帰属表記をまとめて掲示する。
- データ更新時は取得日・バージョンを本ファイルに追記し、成果物のメタデータにも記録する。
