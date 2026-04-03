import { Droplets, MapPin } from "lucide-react";
import { useFarmWeather } from "@/lib/api/hooks/useFarmer";
import type { WeatherForecastDataPoint } from "@/lib/api/types";
import {
  dailyForecastPoints,
  openWeatherTempToCelsius,
  unwrapWeather,
} from "@/utils/weatherDisplay";

function closestPointToDate(
  points: WeatherForecastDataPoint[],
  target: Date,
): WeatherForecastDataPoint | null {
  if (points.length === 0) return null;
  const targetMs = target.getTime();
  let best = points[0];
  let bestDiff = Math.abs(points[0].dt * 1000 - targetMs);
  for (let i = 1; i < points.length; i++) {
    const diff = Math.abs(points[i].dt * 1000 - targetMs);
    if (diff < bestDiff) {
      best = points[i];
      bestDiff = diff;
    }
  }
  return best;
}

const AbstractWeatherPattern = () => (
  <svg
    width="200"
    height="200"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <circle cx="150" cy="50" r="100" stroke="currentColor" strokeWidth="2" strokeDasharray="4 8" />
    <circle cx="150" cy="50" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
    <circle cx="150" cy="50" r="60" stroke="currentColor" strokeWidth="0.5" />
  </svg>
);

type FarmWeatherPanelProps = {
  farmId: string;
  farmName: string;
  locationName?: string;
};

/**
 * Dashboard-style weather block (gradient, current + daily strip) for a single farm.
 * No carousel — used on farm detail below the field map.
 */
export function FarmWeatherPanel({
  farmId,
  farmName,
  locationName,
}: FarmWeatherPanelProps) {
  const today = new Date().toISOString().split("T")[0];
  const endSevenDays = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: weatherRaw, isLoading } = useFarmWeather(
    farmId,
    today,
    endSevenDays,
  );

  if (isLoading) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 px-6 py-6 text-white shadow-inner border-t border-white/10">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <AbstractWeatherPattern />
        </div>
        <div className="relative z-10 animate-pulse space-y-4">
          <div className="h-6 w-1/2 max-w-[200px] bg-white/20 rounded" />
          <div className="h-4 w-1/3 bg-white/20 rounded" />
          <div className="flex items-end justify-between pt-4">
            <div className="h-14 w-24 bg-white/20 rounded" />
            <div className="h-10 w-16 bg-white/20 rounded" />
          </div>
          <div className="grid grid-cols-7 gap-2 pt-4 border-t border-white/10">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-12 bg-white/15 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const points = unwrapWeather(weatherRaw);
  const current = closestPointToDate(points, new Date());
  const temp = current ? Math.round(openWeatherTempToCelsius(current.main.temp)) : "--";
  const desc =
    current && current.weather && current.weather[0]
      ? current.weather[0].main
      : "Unknown";
  const humidity = current ? current.main.humidity : "--";

  const forecastDays = dailyForecastPoints(points);
  const iconCode =
    current && current.weather && current.weather[0]
      ? current.weather[0].icon
      : "01d";
  const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 px-5 py-6 sm:px-6 text-white shadow-inner border-t border-white/10">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <AbstractWeatherPattern />
      </div>

      <div className="relative z-10 flex flex-col justify-between text-white drop-shadow-sm min-h-[200px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-lg sm:text-xl truncate">{farmName}</h2>
            <p className="text-blue-200/90 flex items-center text-xs mt-1 bg-white/10 w-max max-w-full px-2 py-0.5 rounded-full backdrop-blur-sm">
              <MapPin className="h-3 w-3 mr-1 shrink-0" />
              <span className="truncate">{locationName || "Location"}</span>
            </p>
          </div>
          <div className="bg-white/10 p-1 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg shrink-0">
            <img
              src={iconUrl}
              alt={desc}
              className="h-10 w-10 filter drop-shadow-lg invert brightness-200"
            />
          </div>
        </div>

        <div className="flex items-end justify-between mt-5 mb-4 pl-0.5">
          <div>
            <div className="flex items-start">
              <span className="text-5xl sm:text-6xl font-black tracking-tighter leading-none">
                {temp}
              </span>
              <span className="text-lg font-bold mt-1 ml-0.5 text-blue-200">°C</span>
            </div>
            <span className="text-blue-100 font-medium tracking-wide mt-1 block drop-shadow text-sm">
              {desc}
            </span>
          </div>
          <div className="text-right pb-1">
            <div className="flex items-center justify-end text-sm font-semibold bg-white/10 px-2.5 py-1.5 rounded-lg backdrop-blur-sm border border-white/5">
              <Droplets className="h-3.5 w-3.5 mr-1.5 text-blue-300" />
              {humidity}%
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <p className="uppercase tracking-widest text-[9px] font-bold text-blue-200/80 mb-2">
            7-day outlook
          </p>
          {forecastDays.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2 uppercase tracking-widest text-[9px] font-bold">
              {forecastDays.map((d, i) => {
                const date = new Date(d.dt * 1000);
                const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                const dayIcon = d.weather?.[0]?.icon ?? "01d";
                const dayIconUrl = `https://openweathermap.org/img/wn/${dayIcon}.png`;
                return (
                  <div
                    key={`${d.dt}-${i}`}
                    className="text-center rounded-lg hover:bg-white/10 p-1 sm:p-1.5 transition-colors cursor-default"
                  >
                    <div className="mb-0.5 opacity-60 truncate">{dayName}</div>
                    <img
                      src={dayIconUrl}
                      alt=""
                      className="h-6 w-6 mx-auto mb-0.5 opacity-90 invert brightness-200"
                    />
                    <div className="text-xs sm:text-sm font-black">
                      {Math.round(openWeatherTempToCelsius(d.main.temp))}°
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center opacity-50 lowercase tracking-normal text-xs py-2">
              No extended forecast available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
