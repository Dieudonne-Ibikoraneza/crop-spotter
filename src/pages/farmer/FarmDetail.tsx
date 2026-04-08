import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  Sprout,
  Shield,
  FileWarning,
  ClipboardList,
  Activity,
  Satellite,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FieldMapWithLayers } from "@/components/assessor/FieldMapWithLayers";
import { FarmLocationMap } from "@/components/farmer/FarmLocationMap";
import { FarmWeatherPanel } from "@/components/farmer/FarmWeatherPanel";
import {
  useFarmerFarm,
  useFarmerPolicies,
  useFarmerClaims,
  useFarmerInsuranceRequests,
  useFarmMonitoring,
  useFarmAlertsForFarm,
} from "@/lib/api/hooks/useFarmer";
import type { InsuranceRequest, MonitoringRecord } from "@/lib/api/types";
import type { Policy } from "@/lib/api/services/policies";
import type { Claim } from "@/lib/api/services/claims";
import { formatBackendEnumLabel, formatCropTypeLabel } from "@/lib/crops";

function refId(ref: unknown): string {
  if (ref == null) return "";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && "_id" in ref)
    return String((ref as { _id: unknown })._id);
  return String(ref);
}

function monitoringRecordId(r: MonitoringRecord & { _id?: string }): string {
  return String(r.id ?? r._id ?? "");
}

const ndviTrendLabel = (t: number | undefined) => {
  if (t === -1) return "Declining";
  if (t === 1) return "Improving";
  return "Stable";
};

const FarmerFarmDetail = () => {
  const { id: farmId } = useParams<{ id: string }>();

  const { data: farm, isLoading, error } = useFarmerFarm(farmId);
  const { data: policies = [] } = useFarmerPolicies();
  const { data: claims = [] } = useFarmerClaims();
  const { data: insuranceRequests = [] } = useFarmerInsuranceRequests();
  const { data: monitoring = [], isLoading: monLoading } = useFarmMonitoring(
    farmId ?? "",
  );
  const { data: farmAlerts = [] } = useFarmAlertsForFarm(farmId);

  const policiesForFarm = policies.filter(
    (p: Policy) => refId(p.farmId) === farmId,
  );
  const claimsForFarm = claims.filter((c: Claim) => refId(c.farmId) === farmId);
  const requestsForFarm = insuranceRequests.filter(
    (r: InsuranceRequest) => refId(r.farmId) === farmId,
  );

  const mapCenter =
    farm?.location?.coordinates?.length === 2
      ? ([farm.location.coordinates[1], farm.location.coordinates[0]] as [
          number,
          number,
        ])
      : undefined;

  const hasBoundary =
    !!farm?.boundary?.coordinates &&
    Array.isArray(farm.boundary.coordinates) &&
    farm.boundary.coordinates.length > 0;

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center min-h-[50vh] items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !farm) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <Button variant="ghost" className="-ml-2 mb-4" asChild>
          <Link to="/farmer/farms">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All farms
          </Link>
        </Button>
        <p className="text-muted-foreground">
          Farm not found or you do not have access.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" className="-ml-2 mb-2" asChild>
            <Link to="/farmer/farms">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All farms
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {farm.name?.trim() || "Farm registration"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{farm.status}</Badge>
            {farm.cropType && (
              <span className="flex items-center gap-1">
                <Sprout className="h-3.5 w-3.5" />
                {formatCropTypeLabel(farm.cropType)}
              </span>
            )}
            {farm.locationName && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {farm.locationName}
              </span>
            )}
          </div>
        </div>
      </div>

      <Card className="overflow-hidden p-6">
        <CardHeader className="p-0 mb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Field map
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0 mb-4">
          {hasBoundary && farm.boundary ? (
            <div className="relative h-[420px] w-full border-t border-border">
              <FieldMapWithLayers
                fieldId={farm.id}
                boundary={
                  farm.boundary as { type: string; coordinates: number[][][] }
                }
                center={mapCenter}
              />
            </div>
          ) : mapCenter ? (
            <div className="px-4 pb-4 pt-0 border-t border-border">
              <FarmLocationMap
                lat={mapCenter[0]}
                lng={mapCenter[1]}
                label={farm.name || "Farm centroid"}
              />
              <p className="text-xs text-muted-foreground px-1 pt-2">
                Boundary not uploaded yet — map shows the planned centroid.
              </p>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm border-t border-border">
              No map data yet. Complete registration with your assessor to add
              field geometry.
            </div>
          )}
        </CardContent>
        <FarmWeatherPanel
          farmId={farm.id}
          farmName={farm.name?.trim() || "Farm"}
          locationName={farm.locationName}
        />
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Farm record
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <DetailRow
            label="Farm ID"
            value={`FARM-${farm.id.slice(0, 3).toUpperCase()}`}
            mono
          />
          {farm.area != null && !Number.isNaN(Number(farm.area)) && (
            <DetailRow
              label="Area"
              value={`${Number(farm.area).toFixed(5)} ha`}
            />
          )}
          {farm.sowingDate && (
            <DetailRow
              label="Sowing date"
              value={format(new Date(farm.sowingDate), "PPP")}
            />
          )}
          {farm.eosdaFieldId && (
            <DetailRow
              label="EOSDA field"
              value={farm.eosdaFieldId}
              mono
              icon={
                <Satellite className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              }
            />
          )}
          <DetailRow
            label="Created"
            value={
              farm.createdAt ? format(new Date(farm.createdAt), "PPp") : "—"
            }
          />
          {farm.location?.coordinates?.length === 2 && (
            <DetailRow label="Location" value={`${farm.locationName}`} mono />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Policies ({policiesForFarm.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {policiesForFarm.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No policies for this farm.
              </p>
            ) : (
              <ul className="space-y-3">
                {policiesForFarm.map((p) => (
                  <li
                    key={refId(p)}
                    className="rounded-lg border border-border/60 p-3 text-sm"
                  >
                    <div className="font-medium">{p.policyNumber}</div>
                    <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span>{p.status}</span>
                      {p.startDate && (
                        <span>Start {format(new Date(p.startDate), "PP")}</span>
                      )}
                      {p.endDate && (
                        <span>End {format(new Date(p.endDate), "PP")}</span>
                      )}
                      {typeof p.premiumAmount === "number" && (
                        <span>Premium {p.premiumAmount.toLocaleString()}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-primary" />
              Claims ({claimsForFarm.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {claimsForFarm.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No claims for this farm.
              </p>
            ) : (
              <ul className="space-y-3">
                {claimsForFarm.map((c) => (
                  <li
                    key={refId(c)}
                    className="rounded-lg border border-border/60 p-3 text-sm"
                  >
                    <div className="font-medium">
                      {formatBackendEnumLabel(c.lossEventType)}
                    </div>
                    <div className="text-muted-foreground mt-1 line-clamp-2">
                      {c.lossDescription}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{c.status}</Badge>
                      {c.filedAt && (
                        <span>Filed {format(new Date(c.filedAt), "PP")}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            Insurance requests ({requestsForFarm.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requestsForFarm.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No insurance requests for this farm.
            </p>
          ) : (
            <ul className="space-y-2">
              {requestsForFarm.map((r) => (
                <li
                  key={refId(r)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{r.status}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.createdAt ? format(new Date(r.createdAt), "PPp") : ""}
                  </span>
                  {r.notes && (
                    <p className="w-full text-xs text-muted-foreground">
                      {r.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : monitoring.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No monitoring records yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-2">Date</th>
                    <th className="pb-2 pr-2">NDVI</th>
                    <th className="pb-2 pr-2">Trend</th>
                    <th className="pb-2">Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoring.slice(0, 20).map((row) => (
                    <tr
                      key={monitoringRecordId(row)}
                      className="border-b border-border/40"
                    >
                      <td className="py-2 pr-2">
                        {row.monitoredAt
                          ? format(new Date(row.monitoredAt), "PP")
                          : "—"}
                      </td>
                      <td className="py-2 pr-2">
                        {row.currentNdvi != null
                          ? row.currentNdvi.toFixed(3)
                          : "—"}
                      </td>
                      <td className="py-2 pr-2">
                        {ndviTrendLabel(row.ndviTrend)}
                      </td>
                      <td className="py-2">
                        {row.thresholdsExceeded ? (
                          <Badge variant="destructive" className="text-xs">
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Unread alerts for this farm</CardTitle>
        </CardHeader>
        <CardContent>
          {farmAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No unread alerts.</p>
          ) : (
            <ul className="space-y-3">
              {farmAlerts.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-border/50 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline">{a.type}</Badge>
                    <Badge variant="secondary">{a.severity}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(a.createdAt), "PPp")}
                    </span>
                  </div>
                  <p>{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function DetailRow({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <Separator className="my-1 sm:hidden" />
      <span
        className={
          mono ? "font-mono text-xs break-all text-right" : "text-right"
        }
      >
        {value}
      </span>
    </div>
  );
}

export default FarmerFarmDetail;
