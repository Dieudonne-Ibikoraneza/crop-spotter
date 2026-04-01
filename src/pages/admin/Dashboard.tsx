import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Users,
  Building2,
  FileWarning,
  ArrowRight,
  ShieldCheck,
  Tractor,
  Sprout,
  ClipboardList,
  Loader2,
  Leaf,
  HeartPulse,
  Database,
  Cloud,
  Satellite,
  HardDrive,
  Cpu,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  useAdminStatistics,
  usePendingFarms,
  useAdminRecentClaims,
  useAdminSystemHealth,
} from "@/lib/api/hooks/useAdmin";
import type { AdminSystemStatistics } from "@/lib/api/services/admin";
import type { Claim } from "@/lib/api/services/claims";
import { cn } from "@/lib/utils";

function insurerCount(stats: AdminSystemStatistics | undefined): number {
  if (!stats?.usersByRole) return 0;
  return stats.usersByRole.INSURER ?? stats.usersByRole["INSURER"] ?? 0;
}

function farmerLabel(c: Claim): string {
  const f = c.farmerId;
  if (f && typeof f === "object") {
    const n = [f.firstName, f.lastName].filter(Boolean).join(" ").trim();
    return n || f.email || "Farmer";
  }
  return "Farmer";
}

function farmLabel(c: Claim): string {
  const f = c.farmId;
  if (f && typeof f === "object" && f.name) return f.name;
  return "Farm";
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  error,
  highlight,
}: {
  title: string;
  value: ReactNode;
  icon: ComponentType<{ className?: string }>;
  loading?: boolean;
  error?: boolean;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        highlight && "border-amber-500/40",
        error && "border-destructive/40",
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-2">
        {loading ? (
          <Skeleton className="h-9 w-20" />
        ) : error ? (
          <span className="text-sm text-destructive">Failed to load</span>
        ) : (
          <div className="text-3xl font-bold tabular-nums">{value}</div>
        )}
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

function HealthRow({
  icon: Icon,
  label,
  ok,
  meta,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  ok: boolean;
  meta?: string;
  detail?: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-border/70 bg-card/80 p-3 text-sm">
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 mt-0.5",
          ok ? "text-emerald-600" : "text-destructive",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium leading-tight">{label}</span>
          {ok ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive shrink-0" />
          )}
        </div>
        {meta ? (
          <p className="text-xs text-muted-foreground mt-1">{meta}</p>
        ) : null}
        {detail && !ok ? (
          <p className="text-xs text-destructive/90 mt-1 break-words">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}

const AdminDashboard = () => {
  const { data: pendingFarms, isLoading: pendingLoading } = usePendingFarms();
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useAdminStatistics();
  const {
    data: recentClaims,
    isLoading: claimsLoading,
    isError: claimsError,
  } = useAdminRecentClaims(6);
  const {
    data: health,
    isLoading: healthLoading,
    isError: healthError,
  } = useAdminSystemHealth();

  const pendingCount = pendingFarms?.length ?? 0;
  const ov = stats?.overview;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Admin dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Live metrics from{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              /admin/statistics
            </code>
            , pending farm queue, and latest claims.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="default" className="gap-2">
            <Link to="/admin/assessments">
              <Tractor className="h-4 w-4" />
              Assessments
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/admin/users">
              <Users className="h-4 w-4" />
              Users
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Pending farms"
          value={pendingLoading ? null : pendingCount}
          icon={Tractor}
          loading={pendingLoading}
          highlight={!pendingLoading && pendingCount > 0}
        />
        <StatCard
          title="Total users"
          value={ov?.totalUsers ?? 0}
          icon={Users}
          loading={statsLoading}
          error={statsError}
        />
        <StatCard
          title="Insurer accounts"
          value={insurerCount(stats)}
          icon={Building2}
          loading={statsLoading}
          error={statsError}
        />
        <StatCard
          title="Open claims"
          value={ov?.activeClaims ?? 0}
          icon={FileWarning}
          loading={statsLoading}
          error={statsError}
        />
        <StatCard
          title="Active policies"
          value={ov?.activePolicies ?? 0}
          icon={ClipboardList}
          loading={statsLoading}
          error={statsError}
        />
      </div>

      {(statsLoading || stats) && !statsError && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-muted-foreground">
          <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2 flex items-center gap-2">
            <Sprout className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Farms:{" "}
              <strong className="text-foreground">
                {stats.overview.totalFarms}
              </strong>
            </span>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary shrink-0" />
            <span>
              Assessments:{" "}
              <strong className="text-foreground">
                {stats.overview.totalAssessments}
              </strong>
            </span>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2 flex items-center gap-2">
            <FileWarning className="h-4 w-4 shrink-0" />
            <span>
              Claims (all):{" "}
              <strong className="text-foreground">
                {stats.overview.totalClaims}
              </strong>
            </span>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0" />
            <span>
              Policies:{" "}
              <strong className="text-foreground">
                {stats.overview.totalPolicies}
              </strong>
            </span>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Recent claims</CardTitle>
            <span className="text-xs text-muted-foreground">
              Latest by filed date
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {claimsLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading claims…
              </div>
            ) : claimsError ? (
              <p className="text-sm text-destructive text-center py-8">
                Could not load claims.
              </p>
            ) : !recentClaims?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No claims filed yet.
              </p>
            ) : (
              recentClaims.map((c) => (
                <div
                  key={c._id}
                  className="rounded-lg border border-border/60 p-3 bg-card flex flex-col gap-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {c.lossEventType || "Claim"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-normal">
                        {c.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {c.filedAt ? format(new Date(c.filedAt), "PPp") : "—"}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {farmerLabel(c)} · {farmLabel(c)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              asChild
              variant="outline"
              className="justify-between h-auto py-3"
            >
              <Link to="/admin/assessments">
                <span className="flex items-center gap-2">
                  <Tractor className="h-4 w-4" />
                  Assessments hub
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="justify-between h-auto py-3"
            >
              <Link to="/admin/policies">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Policies
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="justify-between h-auto py-3"
            >
              <Link to="/admin/claims">
                <span className="flex items-center gap-2">
                  <FileWarning className="h-4 w-4" />
                  Claims
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="justify-between h-auto py-3"
            >
              <Link to="/admin/crop-monitoring">
                <span className="flex items-center gap-2">
                  <Leaf className="h-4 w-4" />
                  Crop monitoring
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="justify-between h-auto py-3"
            >
              <Link to="/admin/users">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  User directory
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-card to-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-emerald-600" />
            System health
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Live probes from{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              /admin/health
            </code>{" "}
            (database, AGROmonitoring weather, EOSDA field API, uploads, Node
            heap). Complement with infra monitoring in production.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {healthLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              Checking services…
            </div>
          ) : healthError || !health ? (
            <p className="text-sm text-destructive py-2">
              Could not load system health. Ensure the API is running and you
              are signed in as admin.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Overall
                  </p>
                  <p className="font-semibold capitalize">{health.overall}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Checked {format(new Date(health.checkedAt), "PPpp")}
                  </p>
                </div>
                <Badge
                  variant={
                    health.overall === "healthy"
                      ? "secondary"
                      : health.overall === "degraded"
                        ? "outline"
                        : "destructive"
                  }
                  className="text-sm"
                >
                  {health.overall === "healthy"
                    ? "All probes OK"
                    : health.overall}
                </Badge>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <HealthRow
                  icon={Database}
                  label="Database (MongoDB)"
                  ok={health.database.status === "ok"}
                  meta={
                    health.database.latencyMs != null
                      ? `${health.database.latencyMs} ms ping`
                      : undefined
                  }
                  detail={health.database.detail}
                />
                <HealthRow
                  icon={Cloud}
                  label="AGROmonitoring (weather API)"
                  ok={health.agromonitoring.status === "ok"}
                  meta={
                    health.agromonitoring.latencyMs != null
                      ? `${health.agromonitoring.latencyMs} ms`
                      : undefined
                  }
                  detail={health.agromonitoring.detail}
                />
                <HealthRow
                  icon={Satellite}
                  label="EOSDA / field registry (AGRO fields)"
                  ok={health.eosdaFields.status === "ok"}
                  meta={
                    health.eosdaFields.fieldCount != null
                      ? `${health.eosdaFields.fieldCount} remote fields`
                      : health.eosdaFields.latencyMs != null
                        ? `${health.eosdaFields.latencyMs} ms`
                        : undefined
                  }
                  detail={health.eosdaFields.detail}
                />
                <HealthRow
                  icon={HardDrive}
                  label="Local storage (uploads)"
                  ok={health.storage.status === "ok"}
                  meta={health.storage.usedLabel ?? undefined}
                  detail={health.storage.detail}
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  Node.js process memory
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Heap used</p>
                    <p className="font-mono tabular-nums">
                      {health.process.heapUsedMb} MB
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Heap total</p>
                    <p className="font-mono tabular-nums">
                      {health.process.heapTotalMb} MB
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">RSS</p>
                    <p className="font-mono tabular-nums">
                      {health.process.rssMb} MB
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">External</p>
                    <p className="font-mono tabular-nums">
                      {health.process.externalMb} MB
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Heap utilization</span>
                    <span>
                      {health.process.heapTotalMb > 0
                        ? `${Math.min(100, Math.round((health.process.heapUsedMb / health.process.heapTotalMb) * 100))}%`
                        : "—"}
                    </span>
                  </div>
                  <Progress
                    value={
                      health.process.heapTotalMb > 0
                        ? Math.min(
                            100,
                            (health.process.heapUsedMb /
                              health.process.heapTotalMb) *
                              100,
                          )
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                Dashboard data load: statistics &amp; claims{" "}
                {!statsError && !claimsError ? (
                  <span className="text-emerald-700 dark:text-emerald-400">
                    OK
                  </span>
                ) : (
                  <span className="text-destructive">degraded</span>
                )}
                .
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
