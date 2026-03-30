import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { RegisterFarmDialog } from "@/components/farmer/register-farm-dialog";
import { 
  Sprout, 
  ShieldCheck, 
  AlertCircle, 
  Droplets, 
  CloudSun,
  TrendingUp,
  MapPin,
  Clock,
  ExternalLink,
  Leaf,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFarmerDashboardStats, useFarmerFarms, useFarmerAlerts, useFarmMonitoring, useFarmWeather } from "@/lib/api/hooks/useFarmer";
import { format } from "date-fns";
import type { MonitoringRecord, WeatherForecastDataPoint } from "@/lib/api/types";

const FarmerDashboard = () => {
  const [registerFarmOpen, setRegisterFarmOpen] = useState(false);
  const { data: stats, isLoading: statsLoading } = useFarmerDashboardStats();
  const { data: farmsData, isLoading: farmsLoading } = useFarmerFarms();
  const { data: alerts, isLoading: alertsLoading } = useFarmerAlerts();

  const isLoading = statsLoading || farmsLoading || alertsLoading;
  const farms = farmsData?.items || [];

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening on your farms today.</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" className="hidden sm:flex border-primary/20 hover:bg-primary/5" asChild>
                <Link to="/farmer/claims">
                  <Clock className="mr-2 h-4 w-4" />
                  History
                </Link>
            </Button>
            <Button
              type="button"
              className="shadow-lg shadow-primary/20"
              onClick={() => setRegisterFarmOpen(true)}
            >
              <Sprout className="mr-2 h-4 w-4" />
              Register New Farm
            </Button>
        </div>
      </div>

      <RegisterFarmDialog open={registerFarmOpen} onOpenChange={setRegisterFarmOpen} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Farms"
          value={stats?.totalFarms || 0}
          icon={MapPin}
          description="Registered land parcels"
          className="bg-card/50 backdrop-blur-sm border-primary/10 shadow-sm"
        />
        <StatCard
          title="Active Policies"
          value={stats?.activePolicies || 0}
          icon={ShieldCheck}
          description="Currently insured"
          className="bg-card/50 backdrop-blur-sm border-primary/10 shadow-sm"
        />
        <StatCard
          title="Pending Claims"
          value={stats?.pendingClaims || 0}
          icon={AlertCircle}
          description="Awaiting assessment"
          className="bg-card/50 backdrop-blur-sm border-primary/10 shadow-sm"
        />
        <StatCard
          title="Average Health"
          value={
            stats?.averageHealth != null && stats.averageHealth > 0
              ? `${(stats.averageHealth * 100).toFixed(0)}%`
              : "N/A"
          }
          icon={TrendingUp}
          description="NDVI (see farm rows below)"
          className="bg-card/50 backdrop-blur-sm border-primary/10 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Farm Health Summary */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden bg-gradient-to-br from-card to-muted/20">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <h2 className="font-bold text-xl flex items-center gap-2">
                <Sprout className="h-5 w-5 text-primary" />
                Farm Health Summary
              </h2>
              <Button variant="ghost" size="sm" className="text-primary hover:text-black" asChild>
                <Link to="/farmer/farms">
                  View All <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="p-0">
              <div className="divide-y divide-border/50">
                {farms && farms.length > 0 ? (
                  farms.map((farm) => (
                    <FarmHealthRow key={farm.id} farm={farm} />
                  ))
                ) : (
                  <div className="p-20 text-center text-muted-foreground/60 italic border-t border-border/10 bg-muted/5">
                    <div className="mb-4 flex justify-center opacity-20">
                        <Leaf className="h-12 w-12" />
                    </div>
                    No farms registered yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Widgets (Weather & Alerts) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Weather Widget */}
          <WeatherCarousel farms={farms} />

          {/* Recent Alerts */}
          <div id="recent-alerts" className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col scroll-mt-24">
            <div className="p-5 border-b border-border/50 bg-muted/30">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Recent Alerts
              </h2>
            </div>
            <div className="flex-1 max-h-[400px] overflow-auto">
              {alerts && alerts.length > 0 ? (
                  <div className="divide-y divide-border/30">
                    {alerts.map((alert) => (
                      <div key={alert.id} className={cn("p-4 hover:bg-muted/20 transition-colors", !alert.read && "bg-amber-500/5")}>
                          <div className="flex justify-between items-start mb-1">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                alert.severity === 'high' || alert.severity === 'critical' ? "bg-destructive/10 text-destructive" :
                                alert.severity === 'medium' ? "bg-amber-500/10 text-amber-600" :
                                "bg-blue-500/10 text-blue-600"
                              )}>
                                {alert.type.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{format(new Date(alert.createdAt), 'MMM dd, HH:mm')}</span>
                          </div>
                          <p className="text-sm font-medium line-clamp-2">{alert.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center">
                              <MapPin className="h-2 w-2 mr-1" />
                              {alert.farmName}
                          </p>
                      </div>
                    ))}
                  </div>
              ) : (
                <div className="p-10 text-center flex flex-col items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="h-8 w-8 opacity-20" />
                    <p className="text-sm italic">All farms are safe.</p>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-border/50 text-center">
                <Button variant="link" size="sm" className="text-xs h-auto p-0 text-muted-foreground hover:text-primary" asChild>
                    <Link to="/farmer/dashboard#recent-alerts">View all notifications</Link>
                </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

type FarmListItem = {
  id: string;
  name?: string | null;
  cropType?: string | null;
  area?: number | string | null;
  locationName?: string | null;
  status?: string | null;
};

function FarmHealthRow({ farm }: { farm: FarmListItem }) {
  const { data: monitoring, isLoading } = useFarmMonitoring(farm.id);
  
  // Handle both wrapped {data: T} and direct array responses
  const monitoringData = (monitoring && 'data' in monitoring && Array.isArray(monitoring.data)) 
    ? (monitoring.data as MonitoringRecord[]) 
    : (Array.isArray(monitoring) ? (monitoring as MonitoringRecord[]) : []);

  const latestWithNdvi = monitoringData
    .filter((r) => typeof r.currentNdvi === "number" && Number.isFinite(r.currentNdvi))
    .sort(
      (a, b) =>
        new Date(b.monitoredAt).getTime() - new Date(a.monitoredAt).getTime(),
    )[0];

  const healthPercent =
    latestWithNdvi?.currentNdvi !== undefined
      ? Math.round(latestWithNdvi.currentNdvi * 100)
      : null;

  return (
    <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/10 last:border-0 hover:bg-muted/30 transition-all hover:pl-7 group">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500/10 to-primary/10 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-110 transition-transform">
          <Leaf className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-bold text-base text-foreground group-hover:text-emerald-600 transition-colors">
            {farm.name?.trim() || "Unnamed farm"}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted font-medium px-2 py-0">
              {farm.cropType}
            </Badge>
            <span>•</span>
            <span>
              {farm.area != null && !Number.isNaN(Number(farm.area))
                ? `${Number(farm.area).toFixed(1)} hectares`
                : "Area pending"}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 min-w-[150px] bg-background/50 p-2 px-3 rounded-lg border border-border/40 shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium uppercase tracking-wider text-[9px]">NDVI Health</span>
          <span className={cn("font-bold text-sm", isLoading ? "animate-pulse text-muted-foreground" : "text-emerald-600")}>
            {isLoading ? "..." : healthPercent !== null ? `${healthPercent}%` : "N/A"}
          </span>
        </div>
        <Progress value={healthPercent || 0} className="h-1.5 opacity-80" />
      </div>
      <div className="flex items-center gap-3 w-full sm:w-[140px] justify-between sm:justify-end shrink-0">
        {farm.status === 'INSURED' ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-none font-semibold">
            <ShieldCheck className="mr-1 h-3 w-3" />
            Protected
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground border-border/50 uppercase text-[10px]">
            {farm.status}
          </Badge>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 shrink-0" asChild>
          <Link to={`/farmer/farms/${farm.id}`} aria-label="Open farm">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

const WeatherCarousel = ({ farms }: { farms: FarmListItem[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!farms || farms.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % farms.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [farms]);

  if (!farms || farms.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-xl shadow-blue-500/10 min-h-[240px] flex items-center justify-center">
        <p className="opacity-70 flex flex-col items-center">
             <CloudSun className="h-12 w-12 mb-3 opacity-50" />
             No farms registered yet
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 shadow-xl shadow-blue-500/20 border border-white/10 group">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <AbstractWeatherPattern />
      </div>
      {farms.map((farm, index) => {
          let positionClasses = "translate-x-full opacity-0"; // To the right
          
          if (index === currentIndex) {
              positionClasses = "translate-x-0 opacity-100 relative z-10"; // Active
          } else if (index === (currentIndex - 1 + farms.length) % farms.length) {
              positionClasses = "-translate-x-full opacity-0"; // Passed, to the left
          }

          return (
            <div
              key={farm.id}
              className={cn(
                "absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] w-full h-full",
                positionClasses
              )}
            >
              <WeatherWidget farm={farm} />
            </div>
          );
      })}
      
      {/* Carousel Dots */}
      {farms.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
            {farms.map((_, i) => (
                <div 
                    key={i} 
                    className={cn(
                        "h-1.5 rounded-full transition-all duration-300", 
                        i === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/30"
                    )}
                />
            ))}
        </div>
      )}
    </div>
  );
};

const AbstractWeatherPattern = () => (
    <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="150" cy="50" r="100" stroke="white" strokeWidth="2" strokeDasharray="4 8"/>
      <circle cx="150" cy="50" r="80" stroke="white" strokeWidth="1" strokeDasharray="2 4"/>
      <circle cx="150" cy="50" r="60" stroke="white" strokeWidth="0.5"/>
    </svg>
);

function unwrapWeather(raw: unknown): WeatherForecastDataPoint[] {
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

const WeatherWidget = ({ farm }: { farm: FarmListItem }) => {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const { data: weather, isLoading } = useFarmWeather(farm.id, today, nextWeek);
  
  if (isLoading) {
    return (
        <div className="p-6 h-full flex flex-col justify-between">
            <div className="animate-pulse space-y-4">
                <div className="h-6 w-1/2 bg-white/20 rounded"></div>
                <div className="h-4 w-1/3 bg-white/20 rounded"></div>
            </div>
            <div className="animate-pulse space-y-4">
                 <div className="h-12 w-20 bg-white/20 rounded"></div>
                 <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/10">
                     {[1,2,3,4].map(i => <div key={i} className="h-10 bg-white/20 rounded"></div>)}
                 </div>
            </div>
        </div>
    );
  }
  
  const points = unwrapWeather(weather);
  
  const closestPointToDate = (
    arr: WeatherForecastDataPoint[],
    target: Date,
  ): WeatherForecastDataPoint | null => {
    if (!arr || arr.length === 0) return null;
    const targetMs = target.getTime();
    let best = arr[0];
    let bestDiff = Math.abs(arr[0].dt * 1000 - targetMs);
    for (let i = 1; i < arr.length; i++) {
      const diff = Math.abs(arr[i].dt * 1000 - targetMs);
      if (diff < bestDiff) {
        best = arr[i];
        bestDiff = diff;
      }
    }
    return best;
  };

  const dailyMiddayPoints = (
    arr: WeatherForecastDataPoint[],
  ): WeatherForecastDataPoint[] => {
    const byDay = new Map<string, WeatherForecastDataPoint[]>();
    for (const p of arr || []) {
      const key = format(new Date(p.dt * 1000), "yyyy-MM-dd");
      const bucket = byDay.get(key);
      if (bucket) bucket.push(p);
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
  };
  
  // Ensure we find the closest point to current time (not always points[0])
  const current = closestPointToDate(points, new Date());
  
  // Convert from Kelvin to Celsius
  const temp = current ? Math.round(current.main.temp - 273.15) : "--";
  const desc = current && current.weather && current.weather[0] ? current.weather[0].main : "Unknown";
  const humidity = current ? current.main.humidity : "--";
  
  // One representative point per day, preferring midday, up to 7 days.
  const forecastDays = dailyMiddayPoints(points);

  const iconCode = current && current.weather && current.weather[0] ? current.weather[0].icon : "01d";
  const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

  return (
    <div className="p-6 h-full flex flex-col justify-between text-white drop-shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-xl truncate max-w-[200px]">{farm.name}</h2>
          <p className="text-blue-200/90 flex items-center text-xs mt-1 bg-white/10 w-max px-2 py-0.5 rounded-full backdrop-blur-sm">
            <MapPin className="h-3 w-3 mr-1" />
            {farm.locationName || 'Eastern Province'}
          </p>
        </div>
        <div className="bg-white/10 p-1 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg shrink-0">
             <img src={iconUrl} alt={desc} className="h-10 w-10 filter drop-shadow-lg invert brightness-200" />
        </div>
      </div>

      <div className="flex items-end justify-between mt-6 mb-5 pl-1">
          <div>
              <div className="flex items-start">
                  <span className="text-6xl font-black tracking-tighter leading-none">{temp}</span>
                  <span className="text-xl font-bold mt-1 ml-0.5 text-blue-200">°C</span>
              </div>
              <span className="text-blue-100 font-medium tracking-wide mt-1 block drop-shadow">{desc}</span>
          </div>
          <div className="text-right pb-1">
              <div className="flex items-center justify-end text-sm font-semibold bg-white/10 px-2.5 py-1.5 rounded-lg backdrop-blur-sm border border-white/5">
                  <Droplets className="h-3.5 w-3.5 mr-1.5 text-blue-300" />
                  {humidity}%
              </div>
          </div>
      </div>

      <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/10 uppercase tracking-widest text-[9px] font-bold">
        {forecastDays.length > 0 ? forecastDays.map((d, i) => {
            const date = new Date(d.dt * 1000);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            return (
              <div key={i} className="text-center rounded-lg hover:bg-white/10 p-1.5 transition-colors cursor-default">
                <div className="mb-1.5 opacity-60">{dayName}</div>
                <div className="text-sm font-black">{Math.round(d.main.temp - 273.15)}°</div>
              </div>
            );
        }) : (
            <div className="col-span-4 text-center opacity-50 lowercase tracking-normal text-xs py-2">No extended forecast available</div>
        )}
      </div>
    </div>
  );
};

export default FarmerDashboard;
