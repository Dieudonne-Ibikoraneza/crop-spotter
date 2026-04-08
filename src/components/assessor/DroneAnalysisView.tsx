import { Loader2 } from "lucide-react";
import {
  analysisLevelHectares,
  fieldAreaHectares,
  rxAreaHectaresDisplay,
  totalAffectedHectares,
} from "@/utils/droneAreaDisplay";

interface DroneAnalysisViewProps {
  data: any;
  pdfType: string;
}

const formatValue = (val: any) => {
  if (val == null || val === "" || String(val).toLowerCase() === "none" || val === "—") return "—";
  return val;
};

export const DroneAnalysisView = ({ data, pdfType }: DroneAnalysisViewProps) => {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg border border-dashed">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm font-medium">Analysis in progress...</p>
        <p className="text-xs text-muted-foreground mt-1">
          Our system is extracting data from your PDF. This may take a few moments.
        </p>
      </div>
    );
  }

  const reportData = data.report || {};
  const fieldData = data.field || {};
  const analysisSection = data.analysis || {};
  const levels = analysisSection.levels || [];
  const fieldHa = fieldAreaHectares(fieldData);

  return (
    <div className="space-y-5">
      {/* Top metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {fieldData.crop && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Crop</p>
            <p className="text-lg font-bold">{fieldData.crop}</p>
          </div>
        )}
        {fieldHa != null && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Field Area</p>
            <p className="text-lg font-bold">{fieldHa.toFixed(2)} ha</p>
          </div>
        )}
        {fieldData.growing_stage && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Growing Stage</p>
            <p className="text-lg font-bold">{fieldData.growing_stage}</p>
          </div>
        )}
        {reportData.survey_date && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Survey Date</p>
            <p className="text-lg font-bold">{reportData.survey_date}</p>
          </div>
        )}
        {reportData.provider && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Provider</p>
            <p className="text-lg font-bold">{reportData.provider}</p>
          </div>
        )}
      </div>

      {/* Additional Info */}
      {data.additional_info && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs uppercase font-semibold text-primary/70 mb-1">Additional Information</p>
          <p className="text-sm font-medium text-foreground">{data.additional_info}</p>
        </div>
      )}

      {/* Analysis Levels Table */}
      {levels.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Analysis Levels</h4>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-3 font-semibold">Level</th>
                  <th className="text-right p-3 font-semibold">%</th>
                  <th className="text-right p-3 font-semibold">Hectares (ha)</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((level: any, idx: number) => (
                  <tr key={idx} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${idx === 0 ? "bg-green-500" : idx === 1 ? "bg-yellow-500" : "bg-red-500"}`} />
                        {level.level || level.name}
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium">{parseFloat(level.percentage || 0).toFixed(2)}%</td>
                    <td className="p-3 text-right font-medium">
                      {analysisLevelHectares(level).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Total Affected Area */}
      {totalAffectedHectares(analysisSection) > 0 && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <p className="text-sm text-muted-foreground mb-1">Total Affected Area:</p>
          <p className="text-2xl font-bold text-destructive">
            {totalAffectedHectares(analysisSection).toFixed(2)} ha = {analysisSection.total_area_percent || 0}% field
          </p>
        </div>
      )}

      {/* Stand Count Analysis */}
      {data.stand_count_analysis && (() => {
        const sc = data.stand_count_analysis;
        const items = [
          sc.plants_counted != null && { label: "Plants Counted", value: sc.plants_counted.toLocaleString() },
          sc.average_plant_density != null && { label: "Avg Plant Density", value: `${sc.average_plant_density} ${sc.plant_density_unit || ""}`.trim() },
          sc.planned_plants != null && { label: "Planned Plants", value: sc.planned_plants.toLocaleString() },
          sc.difference_percent != null && { label: "Difference", value: `${sc.difference_percent}% ${sc.difference_type || ""}`.trim() },
          sc.difference_plants != null && { label: "Difference (Plants)", value: sc.difference_plants.toLocaleString() },
        ].filter(Boolean);
        if (items.length === 0) return null;
        return (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">🌾 Stand Count Analysis</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((item: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* RX Spraying Analysis */}
      {data.rx_spraying_analysis && (() => {
        const rx = data.rx_spraying_analysis;
        const hasRates = rx.rates && rx.rates.length > 0;
        const items = [
          rx.planned_date && { label: "Planned Date", value: rx.planned_date },
          rx.pesticide_type && { label: "Pesticide Type", value: rx.pesticide_type },
          rx.total_pesticide_amount != null && { label: "Total Amount", value: String(rx.total_pesticide_amount) },
          rx.average_pesticide_amount != null && { label: "Avg Amount", value: String(rx.average_pesticide_amount) },
        ].filter(Boolean);
        if (items.length === 0 && !hasRates) return null;
        return (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">🧪 RX Spraying Analysis</h4>
            {items.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {items.map((item: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">{item.label}</p>
                    <p className="text-sm font-bold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
            {hasRates && (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-medium">Zone</th>
                      <th className="text-right p-3 font-medium">Rate</th>
                      <th className="text-right p-3 font-medium">Area (ha)</th>
                      {rx.rates[0]?.percentage != null && <th className="text-right p-3 font-medium">%</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rx.rates.map((rate: any, i: number) => {
                      const zoneColors = ["bg-green-500", "bg-lime-400", "bg-yellow-400", "bg-orange-400", "bg-red-400", "bg-red-600"];
                      const dotColor = zoneColors[i] || "bg-gray-400";
                      return (
                        <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded ${dotColor}`} />
                              {rate.zone || rate.name || `Zone ${i+1}`}
                            </div>
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatValue(rate.rate != null ? rate.rate : (rate.amount != null ? rate.amount : null))}
                            {rate.rate_unit ? ` ${rate.rate_unit.replace(/_/g, "/")}` : ""}
                          </td>
                          <td className="p-3 text-right font-medium">{rxAreaHectaresDisplay(rate)}</td>
                          {rx.rates[0]?.percentage != null && (
                            <td className="p-3 text-right font-medium">
                              {formatValue(rate.percentage != null ? `${rate.percentage}%` : null)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* Zonation Analysis */}
      {data.zonation_analysis && (() => {
        const za = data.zonation_analysis;
        const hasZones = za.zones && za.zones.length > 0;
        const items = [
          za.tile_size != null && { label: "Tile Size", value: String(za.tile_size) },
          za.num_zones != null && { label: "Number of Zones", value: String(za.num_zones) },
        ].filter(Boolean);
        if (items.length === 0 && !hasZones) return null;
        return (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">📊 Zonation Analysis</h4>
            {items.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                {items.map((item: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">{item.label}</p>
                    <p className="text-sm font-bold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
            {hasZones && (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-medium">Zone</th>
                      <th className="text-right p-3 font-medium">Area (ha)</th>
                      <th className="text-right p-3 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {za.zones.map((zone: any, i: number) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-3">{zone.name || zone.zone || `Zone ${i+1}`}</td>
                        <td className="p-3 text-right font-medium">{zone.area_hectares || zone.hectares || "—"}</td>
                        <td className="p-3 text-right font-medium">{zone.percentage || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* Map Image */}
      {data.map_image?.url && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">📸 Extracted Map Image</h4>
          <img src={data.map_image.url} alt="Extracted drone map" className="w-full rounded-lg border border-border" />
          {levels.length > 0 && (
            <div className="flex flex-wrap gap-6 justify-center text-sm">
              {levels.map((level: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${idx === 0 ? "bg-green-500" : idx === 1 ? "bg-yellow-500" : "bg-red-500"}`} />
                  <span className="text-muted-foreground">{level.level || level.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Raw JSON */}
      <details className="border rounded-lg">
        <summary className="p-3 text-sm font-medium cursor-pointer hover:bg-muted/30 transition-colors">
          View Raw Extracted Data (JSON)
        </summary>
        <pre className="p-4 bg-muted text-xs overflow-auto max-h-64 text-foreground rounded-b-lg">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
};
