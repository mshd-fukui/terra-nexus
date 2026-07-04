"use client";

import { useEffect, useState } from "react";
import { dataUrl, BASE_PATH } from "@/lib/basePath";
import type { RegionSummary, RegionRef, SubBasinProps } from "@/lib/types";
import { WORLDCOVER_COLORS } from "@/lib/types";
import {
  aggregateLandCover,
  tnfdMapping,
  rankSubbasins,
  overallScore,
} from "@/lib/report";

export default function ReportPage() {
  const [regions, setRegions] = useState<RegionRef[]>([]);
  const [regionName, setRegionName] = useState("kamogawa");
  const [region, setRegion] = useState<RegionSummary | null>(null);
  const [subs, setSubs] = useState<SubBasinProps[] | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("region");
    if (q) setRegionName(q);
    fetch(dataUrl("/data/regions.json"))
      .then((r) => r.json())
      .then(setRegions)
      .catch(() => setRegions([]));
  }, []);

  useEffect(() => {
    setRegion(null);
    setSubs(null);
    Promise.all([
      fetch(dataUrl(`/data/${regionName}/region.json`)).then((r) => r.json()),
      fetch(dataUrl(`/data/${regionName}/subbasins.json`)).then((r) => r.json()),
    ])
      .then(([reg, sb]) => {
        setRegion(reg);
        setSubs(sb);
      })
      .catch(() => {});
  }, [regionName]);

  if (!region || !subs) {
    return <div className="report-loading">レポートを読み込んでいます…</div>;
  }

  const t = region.totals;
  const landCover = aggregateLandCover(subs);
  const tnfd = tnfdMapping(region, landCover);
  const ranked = rankSubbasins(subs);

  return (
    <div className="report">
      {/* 画面のみ: ツールバー */}
      <div className="report-toolbar">
        <a className="report-back" href={`${BASE_PATH}/`}>
          ← マップに戻る
        </a>
        <select
          value={regionName}
          onChange={(e) => setRegionName(e.target.value)}
        >
          {regions.map((r) => (
            <option key={r.name} value={r.name}>
              {r.label}
            </option>
          ))}
        </select>
        <button onClick={() => window.print()}>PDF で保存 / 印刷</button>
      </div>

      <article className="sheet">
        <header className="rep-head">
          <div className="rep-brand">TERRA NEXUS</div>
          <h1>自然関連レポート</h1>
          <div className="rep-subtitle">
            {region.region.label} ／ TNFD LEAP 構造準拠（試行版）
          </div>
          <div className="rep-meta">
            対象面積 {region.geometry.area_km2} km²・
            {region.geometry.subbasin_count} サブ流域・生成 {region.generated}
          </div>
        </header>

        {/* サマリ */}
        <section className="rep-kpis">
          <Kpi label="炭素貯留" value={(t.carbon_storage_mg_c / 1e6).toFixed(2)} unit="Mt C" />
          <Kpi label="炭素密度" value={`${t.carbon_density_mg_c_per_ha}`} unit="Mg C/ha" />
          <Kpi label="生息地質" value={t.habitat_quality.toFixed(2)} unit="指数" />
          <Kpi label="保水指標" value={t.water_retention.toFixed(2)} unit="指数" />
          <Kpi label="森林率" value={`${Math.round(t.forest_ratio * 100)}`} unit="%" />
          <Kpi label="緑被率" value={`${Math.round(t.green_cover_ratio * 100)}`} unit="%" />
        </section>

        {/* L — Locate */}
        <section className="rep-section">
          <h2>
            <span className="leap">L</span> 所在（Locate）— 生態系の広がり
          </h2>
          <p>
            本流域は {region.geometry.subbasin_count} のサブ流域からなり、総面積は
            {region.geometry.area_km2} km²。土地被覆（生態系タイプの範囲）の構成は次のとおり。
          </p>
          <div className="lc-bar">
            {landCover.map((e) => (
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
          <table className="rep-table">
            <thead>
              <tr>
                <th>被覆タイプ</th>
                <th className="num">面積 (ha)</th>
                <th className="num">割合</th>
              </tr>
            </thead>
            <tbody>
              {landCover.map((e) => (
                <tr key={e.lucode}>
                  <td>
                    <span
                      className="sw"
                      style={{ background: WORLDCOVER_COLORS[e.lucode] ?? "#ccc" }}
                    />
                    {e.name}
                  </td>
                  <td className="num">{Math.round(e.area_ha).toLocaleString()}</td>
                  <td className="num">{(e.share * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* E — Evaluate */}
        <section className="rep-section">
          <h2>
            <span className="leap">E</span> 評価（Evaluate）— 生態系サービス
          </h2>
          <div className="rep-cards">
            <ServiceCard
              title="気候調整（炭素貯留）"
              value={`${(t.carbon_storage_mg_c / 1e6).toFixed(2)} Mt C`}
              note={`平均 ${t.carbon_density_mg_c_per_ha} Mg C/ha。森林が主要な貯留源。`}
            />
            <ServiceCard
              title="水調整（保水・洪水緩和）"
              value={t.water_retention.toFixed(2)}
              note="被覆別の浸透・貯留特性による保水指標（0–1）。市街化で低下。"
            />
            <ServiceCard
              title="生物多様性（生息地の質）"
              value={t.habitat_quality.toFixed(2)}
              note="自然被覆と攪乱要因の距離減衰による生息地質（0–1）。"
            />
          </div>
        </section>

        {/* A — Assess */}
        <section className="rep-section">
          <h2>
            <span className="leap">A</span> 重要度評価（Assess）— サブ流域の優先順位
          </h2>
          <p>
            生態系サービスの総合スコア（生息地質・保水・炭素密度の平均）でサブ流域を序列化。
            上位は「保全すべき自然資本の中核」、下位は「回復・グリーンインフラ導入の優先候補」。
          </p>
          <table className="rep-table">
            <thead>
              <tr>
                <th>順位</th>
                <th>サブ流域</th>
                <th className="num">面積 km²</th>
                <th className="num">生息地質</th>
                <th className="num">保水</th>
                <th className="num">炭素 Mg C/ha</th>
                <th className="num">総合</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((s, i) => {
                const sc = overallScore(s, subs);
                const cls =
                  i < 3 ? "hi" : i >= ranked.length - 3 ? "lo" : "";
                return (
                  <tr key={s.id} className={cls}>
                    <td>{i + 1}</td>
                    <td>#{s.id}</td>
                    <td className="num">{s.area_km2}</td>
                    <td className="num">{s.habitat_quality.toFixed(2)}</td>
                    <td className="num">{s.water_retention.toFixed(2)}</td>
                    <td className="num">{s.carbon_density_mg_c_per_ha}</td>
                    <td className="num">{sc.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="rep-legend">
            <span className="hi">■</span> 保全優先（上位3）
            <span className="lo">■</span> 回復優先（下位3）
          </div>
        </section>

        {/* P — Prepare */}
        <section className="rep-section">
          <h2>
            <span className="leap">P</span> 開示準備（Prepare）— TNFD 指標マッピング
          </h2>
          <table className="rep-table">
            <thead>
              <tr>
                <th>TNFD 開示テーマ</th>
                <th>本レポートの指標</th>
                <th>値</th>
                <th>算定根拠</th>
              </tr>
            </thead>
            <tbody>
              {tnfd.map((r, i) => (
                <tr key={i}>
                  <td>{r.realm}</td>
                  <td>{r.metric}</td>
                  <td>{r.value}</td>
                  <td className="muted">{r.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="rep-foot">
          <h3>方法・出典・留意事項</h3>
          <p>
            出典: 標高 = Copernicus GLO-30、土地被覆 = ESA WorldCover 10m（CC BY 4.0）。
            炭素・生息地質・保水は InVEST 系の方式に基づき、係数は温帯の代表値（暫定）。
            サブ流域は DEM から流路合流点で分割。
          </p>
          <p className="muted">
            本レポートは公開データからの<strong>指標対応づけの試行</strong>であり、
            第三者検証を経た TNFD 開示書類ではない。スクリーニング・対話の出発点として用いること。
            係数の地域補正・NDVI・金額換算は今後の版で精緻化する。
          </p>
        </footer>
      </article>
    </div>
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
    <div className="rep-kpi">
      <div className="l">{label}</div>
      <div className="v">
        {value}
        <span className="u">{unit}</span>
      </div>
    </div>
  );
}

function ServiceCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="svc">
      <div className="svc-t">{title}</div>
      <div className="svc-v">{value}</div>
      <div className="svc-n">{note}</div>
    </div>
  );
}
