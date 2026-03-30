import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Activity, Leaf, ChevronRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  useFarmerAlerts,
  useFarmerFarms,
  useFarmMonitoring,
} from "@/lib/api/hooks/useFarmer";
import type { MonitoringRecord } from "@/lib/api/types";

type FarmListItem = {
  id: string;
  name?: string | null;
  cropType?: string | null;
  area?: number | string | null;
  status?: string | null;
};

function FarmHealthRow({ farm }: { farm: FarmListItem }) {
  const { data: monitoring, isLoading } = useFarmMonitoring(farm.id);
  const monitoringData =
    monitoring && typeof monitoring === "object" && "data" in monitoring && Array.isArray((monitoring as any).data)
      ? ((monitoring as any).data as MonitoringRecord[])
      : (Array.isArray(monitoring) ? (monitoring as MonitoringRecord[]) : []);

  const latestWithNdvi = monitoringData
    .filter((r) => typeof r.currentNdvi === "number" && Number.isFinite(r.currentNdvi))
    .sort((a, b) => new Date(b.monitoredAt).getTime() - new Date(a.monitoredAt).getTime())[0];

  const healthPercent =
    latestWithNdvi?.currentNdvi != null ? Math.round(latestWithNdvi.currentNdvi * 100) : null;

  const latestDate = latestWithNdvi?.monitoredAt
    ? format(new Date(latestWithNdvi.monitoredAt), "PP")
    : "";

  return (
    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/10 last:border-0 hover:bg-muted/30 transition-all group">
      <div className="flex items-center gap-4 min-w-0">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500/10 to-primary/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
          <Leaf className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-base text-foreground truncate">
            {farm.name?.trim() || "Unnamed farm"}
          </h3>
          <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground mt-1">
            {farm.cropType && (
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground hover:bg-muted font-medium px-2 py-0"
              >
                {farm.cropType}
              </Badge>
            )}
            {farm.area != null && !Number.isNaN(Number(farm.area)) && (
              <span>{Number(farm.area).toFixed(1)} ha</span>
            )}
            {latestDate && <span>• Updated {latestDate}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0">
        <div className="flex flex-col gap-2 min-w-[170px] bg-background/50 p-2 px-3 rounded-lg border border-border/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium uppercase tracking-wider text-[9px]">
              NDVI Health
            </span>
            <span
              className={cn(
                "font-bold text-sm",
                isLoading ? "animate-pulse text-muted-foreground" : "text-emerald-600",
              )}
            >
              {isLoading ? "..." : healthPercent !== null ? `${healthPercent}%` : "N/A"}
            </span>
          </div>
          <Progress value={healthPercent || 0} className="h-1.5 opacity-80" />
        </div>

        <Button asChild variant="ghost" size="icon" className="h-9 w-9" aria-label="Open farm health">
          <Link to={`/farmer/farms/${farm.id}#monitoring`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

const FarmerHealthReports = () => {
  const { data: farmsData, isLoading, error } = useFarmerFarms();
  const { data: alerts = [] } = useFarmerAlerts();
  const farms = farmsData?.items ?? [];

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center min-h-[320px] items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-destructive">
        Could not load farms. {error instanceof Error ? error.message : ""}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Health reports</h1>
          <p className="text-muted-foreground mt-1">
            NDVI-based health snapshots and monitoring shortcuts per farm.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/farmer/dashboard#recent-alerts">
            <AlertTriangle className="h-4 w-4" />
            Alerts ({alerts.length})
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Farm health summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {farms.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              No farms registered yet.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {farms.map((f) => (
                <FarmHealthRow key={f.id} farm={f} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerHealthReports;

