"use client";

import { useEffect, useRef } from "react";
import maplibregl, {
  Map as MLMap,
  LngLatBoundsLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import { dataUrl } from "@/lib/basePath";

interface Props {
  region: string;
  onSelect: () => void;
}

// 起動時のスタイルは背景のみ（外部依存ゼロ）。地形陰影と流域は load 後に追加する。
// こうすることで、地形タイルの取得可否に関わらず load が確実に発火し、流域が描画される。
const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#e7ece7" } },
  ],
};

// 地形陰影（AWS Terrain Tiles）を load 後に追加する。
function addHillshade(map: MLMap) {
  if (map.getSource("terrain-dem")) return;
  map.addSource("terrain-dem", {
    type: "raster-dem",
    tiles: [
      "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
    ],
    encoding: "terrarium",
    tileSize: 256,
    maxzoom: 14,
    attribution: "AWS Terrain Tiles",
  });
  map.addLayer({
    id: "hillshade",
    type: "hillshade",
    source: "terrain-dem",
    paint: {
      "hillshade-shadow-color": "#4a5240",
      "hillshade-highlight-color": "#ffffff",
      "hillshade-accent-color": "#6b7355",
      "hillshade-exaggeration": 0.55,
    },
  });
}

function bounds(fc: FeatureCollection): LngLatBoundsLike {
  let minX = 180,
    minY = 90,
    maxX = -180,
    maxY = -90;
  const scan = (coords: any) => {
    if (typeof coords[0] === "number") {
      minX = Math.min(minX, coords[0]);
      minY = Math.min(minY, coords[1]);
      maxX = Math.max(maxX, coords[0]);
      maxY = Math.max(maxY, coords[1]);
    } else {
      coords.forEach(scan);
    }
  };
  fc.features.forEach((f) => scan((f.geometry as any).coordinates));
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

export default function WatershedMap({ region, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: ref.current,
      style: BASE_STYLE,
      center: [135.77, 35.05],
      zoom: 10,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    map.on("load", async () => {
      map.resize();
      addHillshade(map);

      const fc: FeatureCollection = await fetch(
        dataUrl(`/data/${region}/watershed.geojson`)
      ).then((r) => r.json());

      map.addSource("watershed", {
        type: "geojson",
        data: fc,
        generateId: true,
      });

      map.addLayer({
        id: "watershed-fill",
        type: "fill",
        source: "watershed",
        paint: {
          "fill-color": "#1f7a5a",
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.42,
            0.24,
          ],
        },
      });
      map.addLayer({
        id: "watershed-line",
        type: "line",
        source: "watershed",
        paint: {
          "line-color": "#0f5f45",
          "line-width": 2,
        },
      });

      try {
        map.fitBounds(bounds(fc), { padding: 60, duration: 0 });
      } catch {
        /* noop */
      }

      let selectedId: string | number | undefined;
      const select = (e: maplibregl.MapLayerMouseEvent) => {
        const id = e.features?.[0]?.id;
        if (id === undefined) return;
        if (selectedId !== undefined)
          map.setFeatureState(
            { source: "watershed", id: selectedId },
            { selected: false }
          );
        selectedId = id;
        map.setFeatureState({ source: "watershed", id }, { selected: true });
        onSelect();
      };

      map.on("click", "watershed-fill", select);
      map.on("mouseenter", "watershed-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "watershed-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [region, onSelect]);

  return <div ref={ref} className="map" />;
}
