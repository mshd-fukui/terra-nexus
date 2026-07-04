"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type {
  RegionSummary,
  RegionRef,
  SubBasinProps,
  IndicatorKey,
} from "@/lib/types";
import { dataUrl } from "@/lib/basePath";
import StatsPanel from "./StatsPanel";

const WatershedMap = dynamic(() => import("./WatershedMap"), {
  ssr: false,
  loading: () => <div className="map" style={{ background: "#dfe4df" }} />,
});

export default function MapApp() {
  const [regions, setRegions] = useState<RegionRef[]>([]);
  const [regionName, setRegionName] = useState<string>("kamogawa");
  const [region, setRegion] = useState<RegionSummary | null>(null);
  const [indicator, setIndicator] = useState<IndicatorKey>(
    "carbon_density_mg_c_per_ha"
  );
  const [selected, setSelected] = useState<SubBasinProps | null>(null);

  // 地域一覧
  useEffect(() => {
    fetch(dataUrl("/data/regions.json"))
      .then((r) => r.json())
      .then((rs: RegionRef[]) => setRegions(rs))
      .catch(() => setRegions([{ name: "kamogawa", label: "鴨川流域" }]));
  }, []);

  // 選択地域のサマリ
  useEffect(() => {
    setRegion(null);
    setSelected(null);
    fetch(dataUrl(`/data/${regionName}/region.json`))
      .then((r) => r.json())
      .then(setRegion)
      .catch(() => setRegion(null));
  }, [regionName]);

  return (
    <div className="app">
      <WatershedMap
        region={regionName}
        indicator={indicator}
        ranges={region?.indicator_ranges ?? null}
        bbox={region?.geometry.bbox ?? null}
        onSelect={setSelected}
      />
      <StatsPanel
        regions={regions}
        regionName={regionName}
        onRegion={setRegionName}
        region={region}
        indicator={indicator}
        onIndicator={setIndicator}
        selected={selected}
      />
      <div className="credit">
        DEM・地形: Copernicus GLO-30 ／ 土地被覆: © ESA WorldCover
      </div>
    </div>
  );
}
