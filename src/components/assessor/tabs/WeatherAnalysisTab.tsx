import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Thermometer,
  Droplets,
  Wind,
  Cloud,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { authStorage } from "@/lib/api/client";

interface WeatherData {
  date: string;
  tempHigh: number;
  tempLow: number;
  rain: number;
  humidity: number;
  clouds: number;
  wind: number;
}

// API Response Interfaces
interface ForecastResponse {
  success: boolean;
  message: string;
  data: {
    field_id: string;
    data: Array<{
      dt: number;
      main: {
        temp: number;
        temp_min: number;
        temp_max: number;
        pressure: number;
        humidity: number;
      };
      weather: Array<{
        main: string;
        description: string;
      }>;
      wind: {
        speed: number;
        deg: number;
      };
      clouds: {
        all: number;
      };
      rain?: {
        "3h"?: number;
      };
    }>;
  };
}

interface HistoricalResponse {
  success: boolean;
  message: string;
  data: {
    field_id: string;
    count: number;
    data: Array<{
      dt: number;
      date: string;
      temp: number;
      temp_min: number;
      temp_max: number;
      humidity: number;
      pressure: number;
      wind_speed: number;
      wind_deg: number;
      clouds: number;
      rain?: number;
    }>;
  };
}

interface AccumulatedResponse {
  success: boolean;
  message: string;
  data: {
    field_id: string;
    date_start: string;
    date_end: string;
    total_rainfall: number;
    avg_temperature: number;
    avg_humidity: number;
    avg_wind_speed: number;
    days_with_rain: number;
  };
}

const mockWeatherForecast: WeatherData[] = [
  {
    date: "Oct 23",
    tempHigh: 27,
    tempLow: 16,
    rain: 5.9,
    humidity: 76,
    clouds: 68,
    wind: 2,
  },
  {
    date: "Oct 24",
    tempHigh: 30,
    tempLow: 16,
    rain: 9.1,
    humidity: 75,
    clouds: 66,
    wind: 2,
  },
  {
    date: "Oct 25",
    tempHigh: 24,
    tempLow: 16,
    rain: 29.1,
    humidity: 87,
    clouds: 75,
    wind: 3,
  },
  {
    date: "Oct 26",
    tempHigh: 26,
    tempLow: 17,
    rain: 3.2,
    humidity: 72,
    clouds: 60,
    wind: 2,
  },
  {
    date: "Oct 27",
    tempHigh: 28,
    tempLow: 18,
    rain: 0.5,
    humidity: 65,
    clouds: 45,
    wind: 1,
  },
  {
    date: "Oct 28",
    tempHigh: 29,
    tempLow: 18,
    rain: 0.0,
    humidity: 58,
    clouds: 30,
    wind: 1,
  },
  {
    date: "Oct 29",
    tempHigh: 30,
    tempLow: 19,
    rain: 0.2,
    humidity: 62,
    clouds: 40,
    wind: 2,
  },
];

// Generate historical precipitation data for full year
const generatePrecipitationData = () => {
  const data = [];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= daysInMonth[m]; d += 7) {
      data.push({
        date: `${months[m]} ${d}`,
        precipitation: Math.random() * 35,
      });
    }
  }
  return data;
};

// Generate historical temperature data for full year
const generateTemperatureData = () => {
  const data = [];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= daysInMonth[m]; d += 7) {
      const baseTemp = 20 + Math.sin((m / 12) * Math.PI * 2) * 8;
      data.push({
        date: `${months[m]} ${d}`,
        maxTemp: baseTemp + 5 + Math.random() * 5,
        minTemp: baseTemp - 5 + Math.random() * 5,
      });
    }
  }
  return data;
};

const precipitationData = generatePrecipitationData();
const temperatureData = generateTemperatureData();

interface WeatherAnalysisTabProps {
  fieldId: string;
  farmerName: string;
  cropType: string;
  location: string;
}

export const WeatherAnalysisTab = ({
  fieldId,
  farmerName,
  cropType,
  location,
}: WeatherAnalysisTabProps) => {
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(
    null,
  );
  const [historicalData, setHistoricalData] =
    useState<HistoricalResponse | null>(null);
  const [accumulatedData, setAccumulatedData] =
    useState<AccumulatedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [farmData, setFarmData] = useState<any>(null);

  // Calculate risk levels based on real weather data
  const calculateDroughtRisk = (totalRainfall: number, days: number) => {
    const avgDailyRainfall = totalRainfall / days;
    if (avgDailyRainfall < 1)
      return {
        level: "High",
        color: "text-destructive",
        bgColor: "bg-destructive",
      };
    if (avgDailyRainfall < 2)
      return {
        level: "Moderate",
        color: "text-warning",
        bgColor: "bg-warning",
      };
    return { level: "Low", color: "text-success", bgColor: "bg-success" };
  };

  const calculateHeatStress = (avgTemp: number, forecastData: any[]) => {
    const maxTemp =
      forecastData.length > 0
        ? Math.max(...forecastData.map((d) => d.tempHigh))
        : avgTemp;

    if (avgTemp > 30 || maxTemp > 35)
      return {
        level: "High",
        color: "text-destructive",
        bgColor: "bg-destructive",
      };
    if (avgTemp > 25 || maxTemp > 30)
      return {
        level: "Moderate",
        color: "text-warning",
        bgColor: "bg-warning",
      };
    return { level: "Low", color: "text-success", bgColor: "bg-success" };
  };

  const calculateFloodRisk = (totalRainfall: number, days: number) => {
    const avgDailyRainfall = totalRainfall / days;
    if (avgDailyRainfall > 5)
      return {
        level: "High",
        color: "text-destructive",
        bgColor: "bg-destructive",
      };
    if (avgDailyRainfall > 3)
      return {
        level: "Moderate",
        color: "text-warning",
        bgColor: "bg-warning",
      };
    return { level: "Low", color: "text-success", bgColor: "bg-success" };
  };

  const calculateHumidityRisk = (avgHumidity: number) => {
    if (avgHumidity > 85)
      return {
        level: "High",
        color: "text-destructive",
        bgColor: "bg-destructive",
      };
    if (avgHumidity > 75)
      return {
        level: "Moderate",
        color: "text-warning",
        bgColor: "bg-warning",
      };
    return { level: "Normal", color: "text-success", bgColor: "bg-success" };
  };

  const calculateOverallScore = (
    droughtRisk: any,
    floodRisk: any,
    heatStress: any,
    humidityRisk: any,
  ) => {
    const riskScores = {
      Low: 1,
      Moderate: 2.5,
      High: 4,
    };

    const maxRisk = Math.max(
      riskScores[droughtRisk.level] || 0,
      riskScores[floodRisk.level] || 0,
      riskScores[heatStress.level] || 0,
      riskScores[humidityRisk.level] || 0,
    );

    const score = 5 - (maxRisk - 1) * 1.25; // Convert to 1-5 scale
    const level = maxRisk >= 4 ? "HIGH" : maxRisk >= 2.5 ? "MODERATE" : "LOW";

    return { score: score.toFixed(1), level };
  };

  // Format field ID as FLD-{three capitalized characters}
  const formatFieldId = (id: string) => {
    if (!id || id.length < 3) return id;
    return `FLD-${id.substring(0, 3).toUpperCase()}`;
  };

  // API base URL - adjust to your backend URL
  const API_BASE = "http://localhost:3000/api/v1";

  // Fetch weather data from backend
  const fetchWeatherData = useCallback(async () => {
    if (!fieldId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 7);
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);

      const token = authStorage.getToken();

      // First, fetch farm details to get locationName
      const farmResponse = await fetch(`${API_BASE}/farms/${fieldId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (farmResponse.ok) {
        const farm = await farmResponse.json();
        setFarmData(farm);
      }

      // Fetch forecast data
      const forecastResponse = await fetch(
        `${API_BASE}/farms/${fieldId}/weather/forecast?dateStart=${today.toISOString().split("T")[0]}&dateEnd=${endDate.toISOString().split("T")[0]}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (forecastResponse.ok) {
        const forecast = await forecastResponse.json();
        setForecastData(forecast);
      } else {
        const errorText = await forecastResponse.text();
        setError(`Forecast failed: ${forecastResponse.status}`);
      }

      // Fetch historical data
      const historicalResponse = await fetch(
        `${API_BASE}/farms/${fieldId}/weather/historical?dateStart=${startDate.toISOString().split("T")[0]}&dateEnd=${today.toISOString().split("T")[0]}`,
        {
          headers: {
            Authorization: `Bearer ${authStorage.getToken()}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (historicalResponse.ok) {
        const historical = await historicalResponse.json();
        setHistoricalData(historical);
      }

      // Fetch accumulated data
      const accumulatedResponse = await fetch(
        `${API_BASE}/farms/${fieldId}/weather/accumulated?dateStart=${startDate.toISOString().split("T")[0]}&dateEnd=${today.toISOString().split("T")[0]}`,
        {
          headers: {
            Authorization: `Bearer ${authStorage.getToken()}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (accumulatedResponse.ok) {
        const accumulated = await accumulatedResponse.json();
        setAccumulatedData(accumulated);
      }
    } catch (err) {
      setError("Failed to fetch weather data");
      console.error("Weather API Error:", err);
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  // Load data on component mount
  useEffect(() => {
    fetchWeatherData();
  }, [fieldId, fetchWeatherData]);

  // Convert to array and take first 7 days
  const transformForecastData = (response: { data: any[] }): WeatherData[] => {
    if (!response?.data || !Array.isArray(response.data)) return [];

    // Group by date and take the first entry per day for 7-day forecast
    const dailyData = new Map<
      string,
      { dt: number; main: any; rain?: any; clouds: any; wind: any }
    >();

    response.data.forEach((item) => {
      const date = new Date(item.dt * 1000).toLocaleDateString();
      if (!dailyData.has(date)) {
        dailyData.set(date, item);
      }
    });

    // Convert to array and take first 7 days
    return Array.from(dailyData.values())
      .slice(0, 7)
      .map((item, index) => ({
        date: new Date(item.dt * 1000).toLocaleDateString(),
        tempHigh: Math.round(item.main.temp_max),
        tempLow: Math.round(item.main.temp_min),
        rain: item.rain?.["3h"] || 0,
        humidity: item.main.humidity,
        clouds: item.clouds.all,
        wind: Math.round(item.wind.speed * 10) / 10, // Convert to more readable format
      }));
  };

  const transformHistoricalData = (
    response: HistoricalResponse,
  ): WeatherData[] => {
    if (!response?.data?.data) return [];

    return response.data.data.map((item) => ({
      date: item.date,
      tempHigh: Math.round(item.temp_max),
      tempLow: Math.round(item.temp_min),
      rain: item.rain || 0,
      humidity: item.humidity,
      clouds: item.clouds,
      wind: Math.round(item.wind_speed * 10) / 10,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading weather data...</span>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchWeatherData} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Field Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Field Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Farmer</p>
            <p className="font-medium">{farmerName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Field ID</p>
            <p className="font-medium">{formatFieldId(fieldId)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Crop Type</p>
            <p className="font-medium">{cropType}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-medium">{farmData?.locationName || location}</p>
          </div>
          {accumulatedData?.data && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Rainfall (30d)
                </p>
                <p className="font-medium">
                  {accumulatedData.data.total_rainfall}mm
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Temperature</p>
                <p className="font-medium">
                  {Math.round(accumulatedData.data.avg_temperature)}°C
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rainy Days</p>
                <p className="font-medium">
                  {accumulatedData.data.days_with_rain} days
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Humidity</p>
                <p className="font-medium">
                  {Math.round(accumulatedData.data.avg_humidity)}%
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Current Weather */}
      <Card>
        <CardHeader>
          <CardTitle>Current Weather</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {forecastData?.data?.[0] ? (
            <>
              <div className="flex items-center gap-3">
                <Thermometer className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Temperature</p>
                  <p className="text-lg font-semibold">
                    {Math.round(forecastData.data[0].main.temp)}°C
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Droplets className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Precipitation</p>
                  <p className="text-lg font-semibold">
                    {forecastData.data[0].rain?.["3h"] || 0} mm
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Droplets className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Humidity</p>
                  <p className="text-lg font-semibold">
                    {forecastData.data[0].main.humidity}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Cloud className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Clouds</p>
                  <p className="text-lg font-semibold">
                    {forecastData.data[0].clouds.all}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Wind className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Wind</p>
                  <p className="text-lg font-semibold">
                    {Math.round(forecastData.data[0].wind.speed * 10) / 10} m/s
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-5 text-center text-muted-foreground">
              Loading current weather...
            </div>
          )}
        </CardContent>
      </Card>

      {/* 7-Day Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>7-Day Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Temp (°C)</TableHead>
                <TableHead>Rain (mm)</TableHead>
                <TableHead>Humidity</TableHead>
                <TableHead>Clouds</TableHead>
                <TableHead>Wind</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecastData
                ? transformForecastData(forecastData).map((day, index) => {
                    const highTempRisk = day.tempHigh > 30;
                    const rainRisk = day.rain > 20;
                    return (
                      <TableRow key={`${day.date}-${index}`}>
                        <TableCell className="font-medium">
                          {day.date}
                        </TableCell>
                        <TableCell
                          className={
                            highTempRisk ? "text-destructive font-semibold" : ""
                          }
                        >
                          {day.tempHigh} / {day.tempLow}
                        </TableCell>
                        <TableCell
                          className={
                            rainRisk ? "text-destructive font-semibold" : ""
                          }
                        >
                          {day.rain}
                        </TableCell>
                        <TableCell>{day.humidity}%</TableCell>
                        <TableCell>{day.clouds}%</TableCell>
                        <TableCell>{day.wind} m/s</TableCell>
                      </TableRow>
                    );
                  })
                : mockWeatherForecast.map((day) => {
                    const highTempRisk = day.tempHigh > 30;
                    const rainRisk = day.rain > 20;
                    return (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">
                          {day.date}
                        </TableCell>
                        <TableCell
                          className={
                            highTempRisk ? "text-destructive font-semibold" : ""
                          }
                        >
                          {day.tempHigh} / {day.tempLow}
                        </TableCell>
                        <TableCell
                          className={
                            rainRisk ? "text-destructive font-semibold" : ""
                          }
                        >
                          {day.rain}
                        </TableCell>
                        <TableCell>{day.humidity}%</TableCell>
                        <TableCell>{day.clouds}%</TableCell>
                        <TableCell>{day.wind} m/s</TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Historical Weather Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Weather Charts (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Daily Precipitation Chart */}
          <div>
            <h3 className="text-sm font-medium mb-4">
              Daily precipitation, mm
            </h3>
            <ChartContainer
              config={{
                precipitation: {
                  label: "Last 30 Days",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[350px]"
            >
              <BarChart
                data={
                  historicalData
                    ? transformHistoricalData(historicalData).map((item) => ({
                        date: item.date,
                        precipitation: item.rain,
                      }))
                    : precipitationData
                }
                margin={{ bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  label={{
                    value: "Precipitation (mm)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "hsl(var(--muted-foreground))",
                  }}
                  domain={[0, 40]}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  cursor={{ fill: "hsl(var(--muted) / 0.2)" }}
                />
                <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                <Bar
                  dataKey="precipitation"
                  fill="hsl(var(--primary))"
                  name="Last 30 Days"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>

          {/* BBCH Growth Stage Strip */}
          <div className="mt-2 flex h-6 rounded overflow-hidden">
            <div className="bg-yellow-500 flex-1 flex items-center justify-center text-xs font-medium text-black">
              Germination
            </div>
            <div className="bg-lime-400 flex-1 flex items-center justify-center text-xs font-medium text-black">
              Seedling
            </div>
            <div className="bg-green-500 flex-1 flex items-center justify-center text-xs font-medium text-white">
              Vegetative
            </div>
            <div className="bg-emerald-600 flex-1 flex items-center justify-center text-xs font-medium text-white">
              Flowering
            </div>
            <div className="bg-amber-600 flex-1 flex items-center justify-center text-xs font-medium text-white">
              Fruit Dev
            </div>
            <div className="bg-orange-700 flex-1 flex items-center justify-center text-xs font-medium text-white">
              Ripening
            </div>
          </div>

          {/* Daily Temperature Chart */}
          <div>
            <h3 className="text-sm font-medium mb-4">Daily temperatures, °C</h3>
            <ChartContainer
              config={{
                maxTemp: {
                  label: "Max t°C",
                  color: "hsl(var(--primary))",
                },
                minTemp: {
                  label: "Min t°C",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[350px]"
            >
              <LineChart
                data={
                  historicalData
                    ? transformHistoricalData(historicalData).map((item) => ({
                        date: item.date,
                        maxTemp: item.tempHigh,
                        minTemp: item.tempLow,
                      }))
                    : temperatureData
                }
                margin={{ bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 11,
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  label={{
                    value: "Temperature (°C)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "hsl(var(--muted-foreground))",
                  }}
                  domain={[10, 40]}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  cursor={{ stroke: "hsl(var(--muted))", strokeWidth: 1 }}
                />
                <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                <Line
                  type="monotone"
                  dataKey="maxTemp"
                  stroke="hsl(var(--primary))"
                  name="Max t°C"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="minTemp"
                  stroke="hsl(var(--chart-2))"
                  name="Min t°C"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </div>

          {/* BBCH Growth Stage Strip */}
          <div className="mt-2 flex h-6 rounded overflow-hidden">
            <div className="bg-yellow-500 flex-1 flex items-center justify-center text-xs font-medium text-black">
              Germination
            </div>
            <div className="bg-lime-400 flex-1 flex items-center justify-center text-xs font-medium text-black">
              Seedling
            </div>
            <div className="bg-green-500 flex-1 flex items-center justify-center text-xs font-medium text-white">
              Vegetative
            </div>
            <div className="bg-emerald-600 flex-1 flex items-center justify-center text-xs font-medium text-white">
              Flowering
            </div>
            <div className="bg-amber-600 flex-1 flex items-center justify-center text-xs font-medium text-white">
              Fruit Dev
            </div>
            <div className="bg-orange-700 flex-1 flex items-center justify-center text-xs font-medium text-white">
              Ripening
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {accumulatedData?.data ? (
            <>
              <div className="flex items-center justify-between py-2 border-b">
                <span>Drought Risk</span>
                <span className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${calculateDroughtRisk(accumulatedData.data.total_rainfall, 30).bgColor}`}
                  ></span>
                  <span
                    className={`font-medium ${calculateDroughtRisk(accumulatedData.data.total_rainfall, 30).color}`}
                  >
                    {
                      calculateDroughtRisk(
                        accumulatedData.data.total_rainfall,
                        30,
                      ).level
                    }
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span>Flood Risk</span>
                <span className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${calculateFloodRisk(accumulatedData.data.total_rainfall, 30).bgColor}`}
                  ></span>
                  <span
                    className={`font-medium ${calculateFloodRisk(accumulatedData.data.total_rainfall, 30).color}`}
                  >
                    {
                      calculateFloodRisk(
                        accumulatedData.data.total_rainfall,
                        30,
                      ).level
                    }
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span>Heat Stress</span>
                <span className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${calculateHeatStress(accumulatedData.data.avg_temperature, transformForecastData(forecastData)).bgColor}`}
                  ></span>
                  <span
                    className={`font-medium ${calculateHeatStress(accumulatedData.data.avg_temperature, transformForecastData(forecastData)).color}`}
                  >
                    {
                      calculateHeatStress(
                        accumulatedData.data.avg_temperature,
                        transformForecastData(forecastData),
                      ).level
                    }
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span>Humidity Risk</span>
                <span className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${calculateHumidityRisk(accumulatedData.data.avg_humidity).bgColor}`}
                  ></span>
                  <span
                    className={`font-medium ${calculateHumidityRisk(accumulatedData.data.avg_humidity).color}`}
                  >
                    {
                      calculateHumidityRisk(accumulatedData.data.avg_humidity)
                        .level
                    }
                  </span>
                </span>
              </div>
              <div className="pt-4 mt-4 border-t">
                <p className="text-lg font-semibold">
                  Overall Weather Score:{" "}
                  <span className="text-success">
                    {
                      calculateOverallScore(
                        calculateDroughtRisk(
                          accumulatedData.data.total_rainfall,
                          30,
                        ),
                        calculateFloodRisk(
                          accumulatedData.data.total_rainfall,
                          30,
                        ),
                        calculateHeatStress(
                          accumulatedData.data.avg_temperature,
                          transformForecastData(forecastData),
                        ),
                        calculateHumidityRisk(
                          accumulatedData.data.avg_humidity,
                        ),
                      ).score
                    }{" "}
                    / 5 (
                    {
                      calculateOverallScore(
                        calculateDroughtRisk(
                          accumulatedData.data.total_rainfall,
                          30,
                        ),
                        calculateFloodRisk(
                          accumulatedData.data.total_rainfall,
                          30,
                        ),
                        calculateHeatStress(
                          accumulatedData.data.avg_temperature,
                          transformForecastData(forecastData),
                        ),
                        calculateHumidityRisk(
                          accumulatedData.data.avg_humidity,
                        ),
                      ).level
                    }
                    )
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Total Rainfall: {accumulatedData.data.total_rainfall}mm | Avg
                  Temp: {Math.round(accumulatedData.data.avg_temperature)}°C |
                  Days with Rain: {accumulatedData.data.days_with_rain}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Loading accumulated data...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessor Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Assessor Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Add your weather analysis notes here..."
            className="min-h-[100px]"
            defaultValue={
              historicalData?.success
                ? `Weather analysis completed. ${historicalData.data.count} days of data analyzed. ${
                    accumulatedData?.success
                      ? `Total rainfall: ${accumulatedData.data.total_rainfall}mm, avg temp: ${accumulatedData.data.avg_temperature}°C`
                      : "Accumulated data loading..."
                  }`
                : "Loading weather data..."
            }
          />
          <div className="flex gap-2">
            <Button onClick={fetchWeatherData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <Button variant="outline">Save Assessment</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
