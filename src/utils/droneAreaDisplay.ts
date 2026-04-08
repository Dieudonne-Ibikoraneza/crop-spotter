/** 1 international acre → hectares */
export const ACRES_TO_HECTARES = 0.40468564224;

export function fieldAreaHectares(field: Record<string, unknown>): number | null {
  const ha = parseFloat(String(field.area_hectares ?? ""));
  if (Number.isFinite(ha) && ha > 0) return ha;
  const ac = parseFloat(String(field.area_acres ?? ""));
  if (Number.isFinite(ac) && ac > 0) return ac * ACRES_TO_HECTARES;
  return null;
}

export function totalAffectedHectares(analysis: Record<string, unknown>): number {
  const ha = parseFloat(String(analysis.total_area_hectares ?? ""));
  if (Number.isFinite(ha) && ha > 0) return ha;
  const ac = parseFloat(String(analysis.total_area_acres ?? ""));
  if (Number.isFinite(ac) && ac > 0) return ac * ACRES_TO_HECTARES;
  return 0;
}

export function analysisLevelHectares(level: Record<string, unknown>): number {
  const ha = parseFloat(String(level.area_hectares ?? level.hectares ?? 0));
  if (Number.isFinite(ha) && ha > 0) return ha;
  const ac = parseFloat(String(level.area_acres ?? 0));
  if (Number.isFinite(ac) && ac > 0) return ac * ACRES_TO_HECTARES;
  return 0;
}

/** RX zone area shown only in hectares (converts common units when needed). */
export function rxAreaHectaresDisplay(rate: Record<string, unknown>): string {
  const fromHa = parseFloat(String(rate.area_hectares ?? ""));
  if (Number.isFinite(fromHa) && fromHa > 0) return `${fromHa.toFixed(2)} ha`;
  const a = parseFloat(String(rate.area ?? ""));
  if (!Number.isFinite(a)) return "—";
  const u = String(rate.area_unit ?? "").toLowerCase();
  if (u.includes("ha") || u.includes("hectare")) return `${a.toFixed(2)} ha`;
  if (u.includes("acre") || u === "ac") return `${(a * ACRES_TO_HECTARES).toFixed(2)} ha`;
  if (u.includes("m2") || u.includes("m²") || u.includes("sq m") || u === "sqm")
    return `${(a / 10000).toFixed(2)} ha`;
  if (!rate.area_unit) return `${a.toFixed(2)} ha`;
  return `${a.toFixed(2)} ha`;
}
