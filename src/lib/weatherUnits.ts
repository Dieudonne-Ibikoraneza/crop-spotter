/**
 * Agromonitoring / OpenWeather Agro forecast uses Kelvin for `main.temp`, `temp_min`, `temp_max`.
 * Historical endpoints typically return Celsius. Values > 100 are treated as Kelvin.
 */
export function agroTempToCelsius(t: number): number {
  if (typeof t !== "number" || !Number.isFinite(t)) return t;
  return t > 100 ? t - 273.15 : t;
}

/** Normalize a forecast API payload to a flat list of hourly/daily points. */
export function extractAgroForecastRows(response: unknown): unknown[] {
  if (!response || typeof response !== "object") return [];
  const r = response as Record<string, unknown>;
  if (Array.isArray(r.data)) return r.data;
  const inner = r.data;
  if (
    inner &&
    typeof inner === "object" &&
    Array.isArray((inner as Record<string, unknown>).data)
  ) {
    return (inner as { data: unknown[] }).data;
  }
  if (Array.isArray(response)) return response;
  return [];
}
