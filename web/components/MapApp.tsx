"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { RegionStats } from "@/lib/types";
import StatsPanel from "./StatsPanel";

// maplibre-gl は window に触れるため SSR を無効化して読み込む
const WatershedMap = dynamic(() => import("./WatershedMap"), {
  ssr: false,
  loading: () => <div className="map" style={{ background: "#dfe4df" }} />,
});

const REGION = "kamogawa";

export default function MapApp() {
  const [stats, setStats] = useState<RegionStats | null>(null);
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    fetch(`/data/${REGION}/stats.json`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <div className="app">
      <WatershedMap
        region={REGION}
        onSelect={() => setSelected(true)}
      />
      <StatsPanel stats={stats} selected={selected} />
      <div className="credit">
        DEM: Copernicus GLO-30 ／ 土地被覆: © ESA WorldCover ／ 地形: AWS Terrain
        Tiles
      </div>
    </div>
  );
}
