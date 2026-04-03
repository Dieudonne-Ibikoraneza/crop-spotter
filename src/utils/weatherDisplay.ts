import { format } from "date-fns";
import type { WeatherForecastDataPoint } from "@/lib/api/types";

/**
 * Our farm weather API returns OpenWeather-style payloads: `main.temp` is usually **Kelvin**
 * unless the backend is configured with `units=metric` (then it would already be °C).
 */
export function openWeatherTempToCelsius(temp: number): number {
  if (temp > 200 && temp < 340) return temp - 273.15;
  return temp;
}

export function unwrapWeather(raw: unknown): WeatherForecastDataPoint[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as WeatherForecastDataPoint[];
  if (
    typeof raw === "object" &&
    raw !== null &&
    "data" in raw &&
    Array.isArray((raw as { data: unknown }).data)
  ) {
    return (raw as { data: WeatherForecastDataPoint[] }).data;
  }
  return [];
}

/** One representative point per calendar day (prefers time closest to local midday). Up to 7 days. */
export function dailyForecastPoints(points: WeatherForecastDataPoint[]): WeatherForecastDataPoint[] {
  const byDay = new Map<string, WeatherForecastDataPoint[]>();
  for (const p of points) {
    const key = format(new Date(p.dt * 1000), "yyyy-MM-dd");
    const arr = byDay.get(key);
    if (arr) arr.push(p);
    else byDay.set(key, [p]);
  }

  const days = Array.from(byDay.keys()).sort();
  const out: WeatherForecastDataPoint[] = [];
  for (const day of days) {
    const pts = byDay.get(day) ?? [];
    if (pts.length === 0) continue;

    let best = pts[0];
    let bestScore = Math.abs(new Date(pts[0].dt * 1000).getHours() - 12);
    for (let i = 1; i < pts.length; i++) {
      const score = Math.abs(new Date(pts[i].dt * 1000).getHours() - 12);
      if (score < bestScore) {
        best = pts[i];
        bestScore = score;
      }
    }

    out.push(best);
    if (out.length >= 7) break;
  }
  return out;
}
