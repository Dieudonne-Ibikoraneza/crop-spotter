import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ShieldCheck, FileText, ArrowRight, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useFarmerClaims,
  useFarmerFarms,
  useFarmerInsuranceRequests,
  useFarmerPolicies,
} from "@/lib/api/hooks/useFarmer";
import type { InsuranceRequest, Farm } from "@/lib/api/types";
import type { Policy } from "@/lib/api/services/policies";
import type { Claim } from "@/lib/api/services/claims";

function refId(ref: unknown): string {
  if (ref == null) return "";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && "_id" in ref) return String((ref as { _id: unknown })._id);
  return String(ref);
}

const FarmerInsurance = () => {
  const { data: farmsData } = useFarmerFarms();
  const { data: policies = [], isLoading: polLoading, error: polError } = useFarmerPolicies();
  const { data: insuranceRequests = [], isLoading: reqLoading } = useFarmerInsuranceRequests();
  const { data: claims = [], isLoading: clmLoading } = useFarmerClaims();

  const farms = farmsData?.items ?? [];
  const farmNameById = new Map(farms.map((f: Farm) => [f.id, f.name?.trim() || "Farm"]));

  if (polLoading) {
    return (
      <div className="p-8 flex justify-center min-h-[320px] items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (polError) {
    return (
      <div className="p-8 text-destructive">
        Could not load insurance. {polError instanceof Error ? polError.message : ""}
      </div>
    );
  }

  const activePolicies = policies.filter((p: Policy) => String(p.status).toUpperCase() === "ACTIVE");
  const pendingAcceptance = policies.filter(
    (p: Policy) => String(p.status).toUpperCase() === "PENDING_ACCEPTANCE",
  );
  const pendingClaims = claims.filter((c: Claim) =>
    ["FILED", "IN_PROGRESS", "UNDER_REVIEW", "SUBMITTED"].includes(String(c.status).toUpperCase()),
  );

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Insurance</h1>
          <p className="text-muted-foreground mt-1">
            Policies and requests. New policies stay pending until you accept them in the portal.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/farmer/claims">
            <FileText className="h-4 w-4" />
            Pending Claims ({clmLoading ? "…" : pendingClaims.length})
          </Link>
        </Button>
      </div>

      {pendingAcceptance.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Awaiting your acceptance ({pendingAcceptance.length})</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You have {pendingAcceptance.length} polic
            {pendingAcceptance.length === 1 ? "y" : "ies"} from your insurer. Open each one to review and accept
            before coverage becomes active.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Policies ({policies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {policies.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No policies yet. Once your farm is insured, your policy will appear here.
              </div>
            ) : (
              <ul className="space-y-3">
                {policies
                  .slice()
                  .sort((a, b) => (a.issuedAt && b.issuedAt ? new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime() : 0))
                  .map((p: Policy) => {
                    const farmId = refId(p.farmId);
                    const farmName = farmNameById.get(farmId);
                    return (
                      <li key={p._id} className="rounded-lg border border-border/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{p.policyNumber}</div>
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                              {farmName && <span className="truncate">Farm: {farmName}</span>}
                              {p.coverageLevel && <span>Coverage: {String(p.coverageLevel)}</span>}
                            </div>
                          </div>
                          <Badge
                            variant={
                              String(p.status).toUpperCase() === "ACTIVE"
                                ? "default"
                                : String(p.status).toUpperCase() === "PENDING_ACCEPTANCE"
                                  ? "outline"
                                  : String(p.status).toUpperCase() === "DECLINED"
                                    ? "destructive"
                                    : "secondary"
                            }
                          >
                            {String(p.status).toUpperCase() === "DECLINED" ? "Declined" : p.status}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {p.startDate && <span>Start {format(new Date(p.startDate), "PP")}</span>}
                          {p.endDate && <span>End {format(new Date(p.endDate), "PP")}</span>}
                          {typeof (p as any).premiumAmount === "number" && (
                            <span>Premium {(p as any).premiumAmount.toLocaleString()}</span>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button asChild size="sm" className="gap-2">
                            <Link to={`/farmer/policies/${p._id}`}>
                              {String(p.status).toUpperCase() === "PENDING_ACCEPTANCE"
                                ? "Review and accept"
                                : "View policy"}
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                          {farmId && (
                            <Button asChild size="sm" variant="outline" className="gap-2">
                              <Link to={`/farmer/farms/${farmId}`}>
                                Open farm <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" />
              Requests ({reqLoading ? "…" : insuranceRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insuranceRequests.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No insurance requests. Requests appear when registration is pending coverage.
              </div>
            ) : (
              <ul className="space-y-2">
                {insuranceRequests.map((r: InsuranceRequest) => (
                  <li
                    key={r._id}
                    className="rounded-md border border-border/60 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{r.status}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.createdAt ? format(new Date(r.createdAt), "PP") : ""}
                      </span>
                    </div>
                    {r.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {r.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {activePolicies.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Coverage tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Keep your farm boundary up to date. Monitoring and assessments rely on mapped field geometry.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FarmerInsurance;

