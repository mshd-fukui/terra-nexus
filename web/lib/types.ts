// パイプラインが出力する stats.json の型

export interface LandCoverEntry {
  lucode: number;
  name: string;
  area_ha: number;
  share: number;
  carbon_mg_c: number;
}

export interface RegionStats {
  region: { name: string; label: string };
  generated: string;
  geometry: {
    outlet_snapped: { lon: number; lat: number };
    area_ha: number;
    area_km2: number;
  };
  natural_capital: {
    land_cover: LandCoverEntry[];
    green_cover_ratio: number;
    forest_ratio: number;
    carbon_storage_mg_c: number;
    carbon_density_mg_c_per_ha: number;
  };
  sources: Record<string, string>;
  notes: string;
}

// ESA WorldCover v200 標準配色（クラス値 -> 色）
export const WORLDCOVER_COLORS: Record<number, string> = {
  10: "#006400", // Tree cover
  20: "#ffbb22", // Shrubland
  30: "#ffff4c", // Grassland
  40: "#f096ff", // Cropland
  50: "#fa0000", // Built-up
  60: "#b4b4b4", // Bare/sparse
  70: "#f0f0f0", // Snow/ice
  80: "#0064c8", // Permanent water
  90: "#0096a0", // Herbaceous wetland
  95: "#00cf75", // Mangroves
  100: "#fae6a0", // Moss/lichen
};
