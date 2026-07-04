// TNFD レポート用のロジック（集計・指標マッピング）

import type { LandCoverEntry, SubBasinProps, RegionSummary } from "./types";

// 全サブ流域を横断して土地被覆（生態系の広がり）を集計する
export function aggregateLandCover(subs: SubBasinProps[]): LandCoverEntry[] {
  const byCode = new Map<number, LandCoverEntry>();
  for (const s of subs) {
    for (const lc of s.land_cover) {
      const cur = byCode.get(lc.lucode);
      if (cur) cur.area_ha += lc.area_ha;
      else byCode.set(lc.lucode, { ...lc });
    }
  }
  const total = Array.from(byCode.values()).reduce((a, e) => a + e.area_ha, 0);
  return Array.from(byCode.values())
    .map((e) => ({ ...e, share: total ? e.area_ha / total : 0 }))
    .sort((a, b) => b.area_ha - a.area_ha);
}

// TNFD の開示領域と、本レポートで対応づける自然資本指標
export interface TnfdRow {
  realm: string; // TNFD 環境資産／開示テーマ
  metric: string; // 本プロダクトの指標
  value: string; // 値
  basis: string; // 算定根拠
}

export function tnfdMapping(
  region: RegionSummary,
  landCover: LandCoverEntry[]
): TnfdRow[] {
  const t = region.totals;
  const forest = landCover.find((l) => l.lucode === 10);
  const built = landCover.find((l) => l.lucode === 50);
  const water = landCover.filter((l) => l.lucode === 80 || l.lucode === 90);
  const waterHa = water.reduce((a, l) => a + l.area_ha, 0);
  return [
    {
      realm: "生態系の範囲・状態（土地利用）",
      metric: "土地被覆構成",
      value: `森林 ${Math.round(forest?.area_ha ?? 0).toLocaleString()} ha ／ 市街地 ${Math.round(
        built?.area_ha ?? 0
      ).toLocaleString()} ha`,
      basis: "ESA WorldCover 10m",
    },
    {
      realm: "気候（炭素・温室効果ガス関連）",
      metric: "炭素貯留量",
      value: `${(t.carbon_storage_mg_c / 1e6).toFixed(2)} Mt C（${t.carbon_density_mg_c_per_ha} Mg C/ha）`,
      basis: "InVEST Carbon（4 プール）",
    },
    {
      realm: "水（水量・流域調整）",
      metric: "保水指標",
      value: `${t.water_retention.toFixed(2)}（水域・湿地 ${Math.round(
        waterHa
      ).toLocaleString()} ha）`,
      basis: "被覆別 保水係数（SCS-CN 由来）",
    },
    {
      realm: "生物多様性（自然の状態）",
      metric: "生息地質",
      value: `${t.habitat_quality.toFixed(2)}（0–1）`,
      basis: "InVEST Habitat Quality 方式",
    },
  ];
}

// 自然資本の「重要度」評価用に、生態系サービスの総合スコアでサブ流域を並べる
export function rankSubbasins(subs: SubBasinProps[]): SubBasinProps[] {
  // 生息地質・保水・炭素密度（正規化）の平均で総合スコア化
  const cds = subs.map((s) => s.carbon_density_mg_c_per_ha);
  const cmin = Math.min(...cds);
  const cmax = Math.max(...cds);
  const score = (s: SubBasinProps) =>
    (s.habitat_quality +
      s.water_retention +
      (cmax > cmin
        ? (s.carbon_density_mg_c_per_ha - cmin) / (cmax - cmin)
        : 0)) /
    3;
  return [...subs].sort((a, b) => score(b) - score(a));
}

export function overallScore(s: SubBasinProps, subs: SubBasinProps[]): number {
  const cds = subs.map((x) => x.carbon_density_mg_c_per_ha);
  const cmin = Math.min(...cds);
  const cmax = Math.max(...cds);
  return (
    (s.habitat_quality +
      s.water_retention +
      (cmax > cmin
        ? (s.carbon_density_mg_c_per_ha - cmin) / (cmax - cmin)
        : 0)) /
    3
  );
}
