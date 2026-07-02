"use client";

import type { RegionStats } from "@/lib/types";
import { WORLDCOVER_COLORS } from "@/lib/types";

interface Props {
  stats: RegionStats | null;
  selected: boolean;
}

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

export default function StatsPanel({ stats, selected }: Props) {
  if (!stats) {
    return (
      <div className="panel">
        <h1>Terra Nexus</h1>
        <div className="sub">流域自然資本マップ</div>
        <div className="hint">データを読み込んでいます…</div>
      </div>
    );
  }

  const nc = stats.natural_capital;
  const lc = nc.land_cover;

  return (
    <div className="panel">
      <h1>{stats.region.label}</h1>
      <div className="sub">
        流域面積 {stats.geometry.area_km2} km²・生成 {stats.generated}
      </div>

      {!selected && (
        <div className="hint">
          地図上の流域（緑）をクリックすると、その流域の自然資本の詳細が表示されます。
        </div>
      )}

      <div className="kpis">
        <div className="kpi">
          <div className="label">森林率</div>
          <div className="value">
            {Math.round(nc.forest_ratio * 100)}
            <span className="unit">%</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">緑被率</div>
          <div className="value">
            {Math.round(nc.green_cover_ratio * 100)}
            <span className="unit">%</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">炭素蓄積</div>
          <div className="value">
            {(nc.carbon_storage_mg_c / 1e6).toFixed(2)}
            <span className="unit">Mt C</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">炭素密度</div>
          <div className="value">
            {nc.carbon_density_mg_c_per_ha}
            <span className="unit">Mg C/ha</span>
          </div>
        </div>
      </div>

      <div className="section-title">土地被覆構成</div>
      <div className="lc-bar" role="img" aria-label="土地被覆構成">
        {lc.map((e) => (
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
        {lc.map((e) => (
          <div className="lc-row" key={e.lucode}>
            <span
              className="swatch"
              style={{ background: WORLDCOVER_COLORS[e.lucode] ?? "#ccc" }}
            />
            <span className="nm">{e.name}</span>
            <span className="pct">
              {(e.share * 100).toFixed(1)}% ・ {fmt(Math.round(e.area_ha))} ha
            </span>
          </div>
        ))}
      </div>

      <div className="notes">{stats.notes}</div>
    </div>
  );
}
