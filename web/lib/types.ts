// パイプラインが出力する成果物の型

export interface RegionRef {
  name: string;
  label: string;
}

export interface LandCoverEntry {
  lucode: number;
  name: string;
  area_ha: number;
  share: number;
}

// watersheds.geojson の各 Feature の properties（サブ流域）
export interface SubBasinProps {
  id: number;
  area_ha: number;
  area_km2: number;
  forest_ratio: number;
  green_cover_ratio: number;
  carbon_density_mg_c_per_ha: number;
  carbon_storage_mg_c: number;
  habitat_quality: number;
  water_retention: number;
  land_cover: LandCoverEntry[];
}

// region.json（地域サマリ）
export interface RegionSummary {
  region: { name: string; label: string };
  generated: string;
  geometry: {
    outlet_snapped: { lon: number; lat: number };
    area_ha: number;
    area_km2: number;
    subbasin_count: number;
    bbox: [number, number, number, number]; // W,S,E,N（地図の初期表示範囲）
  };
  totals: {
    forest_ratio: number;
    green_cover_ratio: number;
    carbon_storage_mg_c: number;
    carbon_density_mg_c_per_ha: number;
    habitat_quality: number;
    water_retention: number;
  };
  indicator_ranges: Record<IndicatorKey, { min: number; max: number }>;
  sources: Record<string, string>;
  notes: string;
}

// コロプレスで塗り分け可能な指標
export type IndicatorKey =
  | "carbon_density_mg_c_per_ha"
  | "habitat_quality"
  | "water_retention"
  | "forest_ratio"
  | "green_cover_ratio";

export interface IndicatorDef {
  key: IndicatorKey;
  label: string;
  unit: string;
  ratio: boolean; // true なら 0..1 を % 表示
}

export const INDICATORS: IndicatorDef[] = [
  { key: "carbon_density_mg_c_per_ha", label: "炭素密度", unit: "Mg C/ha", ratio: false },
  { key: "habitat_quality", label: "生息地質", unit: "指数", ratio: false },
  { key: "water_retention", label: "保水指標", unit: "指数", ratio: false },
  { key: "forest_ratio", label: "森林率", unit: "%", ratio: true },
  { key: "green_cover_ratio", label: "緑被率", unit: "%", ratio: true },
];

// コロプレスの緑シーケンシャル配色（ColorBrewer Greens 5）
export const RAMP = ["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"];

// ESA WorldCover v200 標準配色（クラス値 -> 色）
export const WORLDCOVER_COLORS: Record<number, string> = {
  10: "#006400",
  20: "#ffbb22",
  30: "#ffff4c",
  40: "#f096ff",
  50: "#fa0000",
  60: "#b4b4b4",
  70: "#f0f0f0",
  80: "#0064c8",
  90: "#0096a0",
  95: "#00cf75",
  100: "#fae6a0",
};
