"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { RegionSummary, SubBasinProps, IndicatorKey } from "@/lib/types";
import { dataUrl } from "@/lib/basePath";
import StatsPanel from "./StatsPanel";

const WatershedMap = dynamic(() => import("./WatershedMap"), {
  ssr: false,
  loading: () => <div className="map" style={{ background: "#dfe4df" }} />,
});

const REGION = "kamogawa";

export default function MapApp() {
  const [region, setRegion] = useState<RegionSummary | null>(null);
  const [indicator, setIndicator] = useState<IndicatorKey>(
    "carbon_density_mg_c_per_ha"
  );
  const [selected, setSelected] = useState<SubBasinProps | null>(null);

  useEffect(() => {
    fetch(dataUrl(`/data/${REGION}/region.json`))
      .then((r) => r.json())
      .then(setRegion)
      .catch(() => setRegion(null));
  }, []);

  return (
    <div className="app">
      <WatershedMap
        region={REGION}
        indicator={indicator}
        ranges={region?.indicator_ranges ?? null}
        onSelect={setSelected}
      />
      <StatsPanel
        region={region}
        indicator={indicator}
        onIndicator={setIndicator}
        selected={selected}
      />
      <div className="credit">
        DEM: Copernicus GLO-30 ／ 土地被覆: © ESA WorldCover ／ 地形: AWS Terrain
        Tiles
      </div>
    </div>
  );
}
