"use client";

import type {
  RegionSummary,
  RegionRef,
  SubBasinProps,
  IndicatorKey,
} from "@/lib/types";
import { INDICATORS, RAMP, WORLDCOVER_COLORS } from "@/lib/types";

interface Props {
  regions: RegionRef[];
  regionName: string;
  onRegion: (name: string) => void;
  region: RegionSummary | null;
  indicator: IndicatorKey;
  onIndicator: (k: IndicatorKey) => void;
  selected: SubBasinProps | null;
}

function fmtIndicator(key: IndicatorKey, v: number): string {
  const def = INDICATORS.find((d) => d.key === key)!;
  return def.ratio ? `${Math.round(v * 100)}%` : `${v}`;
}

export default function StatsPanel({
  regions,
  regionName,
  onRegion,
  region,
  indicator,
  onIndicator,
  selected,
}: Props) {
  return (
    <div className="panel">
      <div className="brand">Terra Nexus — 流域自然資本マップ</div>
      <select
        className="region-select"
        value={regionName}
        onChange={(e) => onRegion(e.target.value)}
      >
        {regions.map((r) => (
          <option key={r.name} value={r.name}>
            {r.label}
          </option>
        ))}
      </select>
      {!region ? (
        <div className="hint">データを読み込んでいます…</div>
      ) : (
        <RegionBody
          region={region}
          indicator={indicator}
          onIndicator={onIndicator}
          selected={selected}
        />
      )}
    </div>
  );
}

function RegionBody({
  region,
  indicator,
  onIndicator,
  selected,
}: {
  region: RegionSummary;
  indicator: IndicatorKey;
  onIndicator: (k: IndicatorKey) => void;
  selected: SubBasinProps | null;
}) {
  const def = INDICATORS.find((d) => d.key === indicator)!;
  const range = region.indicator_ranges[indicator];

  return (
    <>
      <div className="sub">
        {region.geometry.area_km2} km²・{region.geometry.subbasin_count}
        サブ流域・生成 {region.generated}
      </div>

      {/* 指標セレクタ */}
      <div className="section-title">色分けの指標</div>
      <div className="seg">
        {INDICATORS.map((d) => (
          <button
            key={d.key}
            className={d.key === indicator ? "seg-btn on" : "seg-btn"}
            onClick={() => onIndicator(d.key)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* カラー凡例 */}
      <div
        className="legend-bar"
        style={{
          background: `linear-gradient(90deg, ${RAMP.join(",")})`,
        }}
      />
      <div className="legend-scale">
        <span>{fmtIndicator(indicator, range.min)}</span>
        <span>{def.unit === "%" ? "" : def.unit}</span>
        <span>{fmtIndicator(indicator, range.max)}</span>
      </div>

      {/* 選択サブ流域 or 全体サマリ */}
      {selected ? (
        <SubBasinDetail sub={selected} />
      ) : (
        <RegionTotals region={region} />
      )}

      <div className="notes">{region.notes}</div>
    </>
  );
}

function RegionTotals({ region }: { region: RegionSummary }) {
  const t = region.totals;
  return (
    <>
      <div className="hint">
        地図上のサブ流域をクリックすると、その流域の詳細が表示されます。
      </div>
      <div className="section-title">流域全体</div>
      <div className="kpis">
        <Kpi
          label="炭素密度"
          value={`${t.carbon_density_mg_c_per_ha}`}
          unit="Mg C/ha"
        />
        <Kpi label="生息地質" value={t.habitat_quality.toFixed(2)} unit="指数" />
        <Kpi label="保水指標" value={t.water_retention.toFixed(2)} unit="指数" />
        <Kpi label="森林率" value={`${Math.round(t.forest_ratio * 100)}`} unit="%" />
      </div>
    </>
  );
}

function SubBasinDetail({ sub }: { sub: SubBasinProps }) {
  return (
    <>
      <div className="section-title">サブ流域 #{sub.id}</div>
      <div className="kpis">
        <Kpi label="面積" value={`${sub.area_km2}`} unit="km²" />
        <Kpi
          label="炭素密度"
          value={`${sub.carbon_density_mg_c_per_ha}`}
          unit="Mg C/ha"
        />
        <Kpi label="生息地質" value={sub.habitat_quality.toFixed(2)} unit="指数" />
        <Kpi label="保水指標" value={sub.water_retention.toFixed(2)} unit="指数" />
      </div>

      <div className="section-title">土地被覆構成</div>
      <div className="lc-bar" role="img" aria-label="土地被覆構成">
        {sub.land_cover.map((e) => (
          <span
            key={e.lucode}
            title={`${e.name} ${(e.share * 100).toFixed(1)}%`}
            style={{
              width: `${e.share * 100}%`,
              background: WORLDCOVER_COLORS[e.lucode] ?? "#ccc",
            }}
          />
        ))}
      </div>
      <div className="lc-legend">
        {sub.land_cover
          .filter((e) => e.share >= 0.01)
          .map((e) => (
            <div className="lc-row" key={e.lucode}>
              <span
                className="swatch"
                style={{ background: WORLDCOVER_COLORS[e.lucode] ?? "#ccc" }}
              />
              <span className="nm">{e.name}</span>
              <span className="pct">{(e.share * 100).toFixed(1)}%</span>
            </div>
          ))}
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">
        {value}
        <span className="unit">{unit}</span>
      </div>
    </div>
  );
}
