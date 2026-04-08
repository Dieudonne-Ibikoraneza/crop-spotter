import type { MonitoringRecord } from "@/lib/api/types";

/** Latest finite NDVI from monitoring records (0–1 scale), most recent date first. */
export function latestNdviFromMonitoring(
  records: MonitoringRecord[] | undefined | null,
): number | null {
  if (!records?.length) return null;
  const sorted = [...records].sort(
    (a, b) =>
      new Date(b.monitoredAt).getTime() - new Date(a.monitoredAt).getTime(),
  );
  for (const r of sorted) {
    const v = r.currentNdvi;
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

/** Mean NDVI (0–1) across farms from per-farm latest values; null if none. */
export function averageNdviAcrossFarms(
  perFarmNdvi: (number | null)[],
): number | null {
  const vals = perFarmNdvi.filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Parse EOSDA /ndvi series entries (various shapes) into numeric NDVI list. */
export function ndviValuesFromSeriesResponse(data: unknown): number[] {
  if (!Array.isArray(data)) return [];
  const out: number[] = [];
  for (const row of data) {
    if (row == null || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const dataObj = r.data;
    const nestedMean =
      dataObj && typeof dataObj === "object"
        ? (dataObj as Record<string, unknown>).mean
        : undefined;
    const n = r.ndvi ?? nestedMean ?? r.mean;
    if (typeof n === "number" && Number.isFinite(n)) out.push(n);
  }
  return out;
}

export function meanOrLatestNdvi(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
