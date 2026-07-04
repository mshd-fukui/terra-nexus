"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { dataUrl } from "@/lib/basePath";
import type { IndicatorKey, SubBasinProps } from "@/lib/types";
import { RAMP } from "@/lib/types";

interface Props {
  region: string;
  indicator: IndicatorKey;
  ranges: Record<IndicatorKey, { min: number; max: number }> | null;
  bbox: [number, number, number, number] | null;
  onSelect: (p: SubBasinProps | null) => void;
}

const SRC = "subbasins";
const SRC_LAYER = "subbasins";

// pmtiles プロトコルを一度だけ登録
let pmtilesRegistered = false;
function ensurePmtiles() {
  if (pmtilesRegistered) return;
  maplibregl.addProtocol("pmtiles", new Protocol().tile);
  pmtilesRegistered = true;
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

export default function WatershedMap({
  region,
  indicator,
  ranges,
  bbox,
  onSelect,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    ensurePmtiles();

    const map = new maplibregl.Map({
      container: ref.current,
      style: BASE_STYLE,
      center: [135.77, 35.05],
      zoom: 10,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    map.on("load", () => {
      map.resize();
      addHillshade(map);

      const url = `pmtiles://${window.location.origin}${dataUrl(
        `/data/${region}/watersheds.pmtiles`
      )}`;
      map.addSource(SRC, {
        type: "vector",
        url,
        promoteId: { [SRC_LAYER]: "id" },
      });

      map.addLayer({
        id: "sb-fill",
        type: "fill",
        source: SRC,
        "source-layer": SRC_LAYER,
        paint: {
          "fill-color": "#8fbf9f",
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
        source: SRC,
        "source-layer": SRC_LAYER,
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

      let selId: number | string | undefined;
      const select = (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f || f.id === undefined) return;
        if (selId !== undefined)
          map.setFeatureState(
            { source: SRC, sourceLayer: SRC_LAYER, id: selId },
            { selected: false }
          );
        selId = f.id;
        map.setFeatureState(
          { source: SRC, sourceLayer: SRC_LAYER, id: selId },
          { selected: true }
        );
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
      applyBounds();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  function applyColor() {
    const map = mapRef.current;
    if (!map || !readyRef.current || !ranges || !map.getLayer("sb-fill")) return;
    map.setPaintProperty(
      "sb-fill",
      "fill-color",
      fillColorExpr(indicator, ranges[indicator])
    );
  }

  function applyBounds() {
    const map = mapRef.current;
    if (!map || !readyRef.current || !bbox) return;
    map.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 60, duration: 0 }
    );
  }

  useEffect(() => {
    applyColor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicator, ranges]);

  useEffect(() => {
    applyBounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox]);

  return <div ref={ref} className="map" />;
}
