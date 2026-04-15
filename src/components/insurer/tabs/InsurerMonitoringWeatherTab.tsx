import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, Thermometer, Droplets, Wind, CheckCircle2, Clock } from "lucide-react";
import { CropMonitoringRecord } from "@/lib/api/services/cropMonitoring";

interface InsurerMonitoringWeatherTabProps {
  cycles: CropMonitoringRecord[];
}

export const InsurerMonitoringWeatherTab = ({ cycles }: InsurerMonitoringWeatherTabProps) => {
  const renderWeatherSummary = (weatherData: any) => {
    if (!weatherData) return <p className="text-sm text-muted-foreground italic">No weather data recorded for this cycle.</p>;

    const data = Array.isArray(weatherData)
      ? weatherData
      : weatherData.data || weatherData.list || [];

    if (!Array.isArray(data) || data.length === 0) return <p className="text-sm text-muted-foreground italic">No weather data entries found.</p>;

    // Take first few entries
    const entries = data.slice(0, 6);

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {entries.map((entry: any, idx: number) => {
          const temp = entry.main?.temp
            ? (entry.main.temp - 273.15).toFixed(1)
            : "N/A";
          const humidity = entry.main?.humidity ?? "N/A";
          const windSpeed = entry.wind?.speed ?? "N/A";
          const rain = entry.rain?.["3h"] || entry.rain?.["1h"] || 0;
          const desc = entry.weather?.[0]?.description || "N/A";
          const dt = entry.dt
            ? new Date(entry.dt * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
              })
            : "";

          return (
            <div
              key={idx}
              className="p-3 rounded-lg bg-muted/50 border text-sm space-y-1"
            >
              <p className="font-medium text-xs text-muted-foreground">{dt}</p>
              <p className="capitalize text-sm font-semibold">{desc}</p>
              <div className="flex items-center gap-1 text-xs">
                <Thermometer className="h-3 w-3 text-red-500" />
                {temp}°C
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Droplets className="h-3 w-3 text-blue-500" />
                {humidity}% Humidity
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Wind className="h-3 w-3 text-slate-500" />
                {windSpeed} m/s Wind
              </div>
              {rain > 0 && (
                <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                  <Cloud className="h-3 w-3" />
                  {rain} mm Rain
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {cycles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Cloud className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No Monitoring Cycles Started</p>
            <p className="text-sm">Cannot capture weather data without an active cycle.</p>
          </CardContent>
        </Card>
      ) : (
        cycles.map((cycle) => (
          <Card key={cycle._id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                {cycle.status === "COMPLETED" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-500" />
                )}
                Cycle #{cycle.monitoringNumber}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Recorded: {new Date(cycle.monitoringDate).toLocaleDateString()})
                </span>
              </CardTitle>
              <Badge
                variant="secondary"
                className={
                  cycle.status === "COMPLETED"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }
              >
                {cycle.status === "COMPLETED" ? "Completed" : "In Progress"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="mt-2">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-primary" />
                  Weather at Cycle Start
                </p>
                {renderWeatherSummary(cycle.weatherData)}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
