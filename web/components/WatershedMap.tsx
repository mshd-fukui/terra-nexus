"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, LngLatBoundsLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import { dataUrl } from "@/lib/basePath";
import type { IndicatorKey, SubBasinProps } from "@/lib/types";
import { RAMP } from "@/lib/types";

interface Props {
  region: string;
  indicator: IndicatorKey;
  ranges: Record<IndicatorKey, { min: number; max: number }> | null;
  onSelect: (p: SubBasinProps | null) => void;
}

const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#e7ece7" } },
  ],
};

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
      "hillshade-exaggeration": 0.5,
    },
  });
}

function bounds(fc: FeatureCollection): LngLatBoundsLike {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  const scan = (co: any) => {
    if (typeof co[0] === "number") {
      minX = Math.min(minX, co[0]); minY = Math.min(minY, co[1]);
      maxX = Math.max(maxX, co[0]); maxY = Math.max(maxY, co[1]);
    } else co.forEach(scan);
  };
  fc.features.forEach((f) => scan((f.geometry as any).coordinates));
  return [[minX, minY], [maxX, maxY]];
}

// 指標値 -> 塗り色（min..max を緑シーケンシャルへ線形補間する式）
function fillColorExpr(
  indicator: IndicatorKey,
  range: { min: number; max: number }
): any {
  const { min, max } = range;
  const stops: any[] = [];
  RAMP.forEach((color, i) => {
    const t = RAMP.length === 1 ? 0 : i / (RAMP.length - 1);
    stops.push(min + t * (max - min || 1), color);
  });
  return ["interpolate", ["linear"], ["get", indicator], ...stops];
}

export default function WatershedMap({ region, indicator, ranges, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const readyRef = useRef(false);

  // 初期化（1 回だけ）
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
        dataUrl(`/data/${region}/watersheds.geojson`)
      ).then((r) => r.json());

      map.addSource("subbasins", { type: "geojson", data: fc });

      map.addLayer({
        id: "sb-fill",
        type: "fill",
        source: "subbasins",
        paint: {
          "fill-color": "#8fbf9f", // 初期色（ranges 到着後に更新）
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.9,
            0.68,
          ],
        },
      });
      map.addLayer({
        id: "sb-line",
        type: "line",
        source: "subbasins",
        paint: {
          "line-color": "#2f4a3c",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.4,
            0.6,
          ],
        },
      });

      try {
        map.fitBounds(bounds(fc), { padding: 60, duration: 0 });
      } catch {
        /* noop */
      }

      let selId: number | undefined;
      const select = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f || f.id === undefined) return;
        if (selId !== undefined)
          map.setFeatureState(
            { source: "subbasins", id: selId },
            { selected: false }
          );
        selId = f.id as number;
        map.setFeatureState(
          { source: "subbasins", id: selId },
          { selected: true }
        );
        // MapLibre は GeoJSON の入れ子プロパティを文字列化するため land_cover を復元
        const props = { ...(f.properties as any) };
        if (typeof props.land_cover === "string") {
          props.land_cover = JSON.parse(props.land_cover);
        }
        onSelect(props as SubBasinProps);
      };
      map.on("click", "sb-fill", select);
      map.on("mouseenter", "sb-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "sb-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      readyRef.current = true;
      applyColor();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  // 指標・レンジが変わったら塗り色を更新
  function applyColor() {
    const map = mapRef.current;
    if (!map || !readyRef.current || !ranges) return;
    if (!map.getLayer("sb-fill")) return;
    map.setPaintProperty(
      "sb-fill",
      "fill-color",
      fillColorExpr(indicator, ranges[indicator])
    );
  }

  useEffect(() => {
    applyColor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicator, ranges]);

  return <div ref={ref} className="map" />;
}
