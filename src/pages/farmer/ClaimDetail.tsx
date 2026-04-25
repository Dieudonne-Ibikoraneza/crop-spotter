import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  MapPin,
  Shield,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFarmerClaim } from "@/lib/api/hooks/useFarmer";
import { formatBackendEnumLabel, formatCropTypeLabel } from "@/lib/crops";

function refId(ref: unknown): string {
  if (ref == null) return "";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && "_id" in ref)
    return String((ref as { _id: unknown })._id);
  return String(ref);
}

function fullName(ref: unknown): string {
  if (!ref || typeof ref !== "object") return "";
  const r = ref as { firstName?: string; lastName?: string; email?: string };
  const name = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim();
  return name || r.email || "";
}

const mediaUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  let baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
  baseUrl = baseUrl.replace(/\/api\/v1\/?$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

const FarmerClaimDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: claim, isLoading, error } = useFarmerClaim(id);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center min-h-[320px] items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <Button variant="ghost" className="-ml-2 mb-4" asChild>
          <Link to="/farmer/claims">
            <ArrowLeft className="h-4 w-4 mr-2" />
            My claims
          </Link>
        </Button>
        <p className="text-muted-foreground">
          Claim not found or you do not have access.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <Button variant="ghost" className="-ml-2 mb-2" asChild>
          <Link to="/farmer/claims">
            <ArrowLeft className="h-4 w-4 mr-2" />
            My claims
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {formatBackendEnumLabel(claim.lossEventType)}
          </h1>
          <Badge variant="outline">{claim.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Filed {claim.filedAt ? format(new Date(claim.filedAt), "PPp") : "—"}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {claim.lossDescription?.trim() ? (
            <p className="text-muted-foreground whitespace-pre-wrap">
              {claim.lossDescription.trim()}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                <span className="text-muted-foreground">Event</span>
                <span className="font-medium">
                  {formatBackendEnumLabel(claim.lossEventType)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{claim.status}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                <span className="text-muted-foreground">Filed</span>
                <span className="font-medium">
                  {claim.filedAt ? format(new Date(claim.filedAt), "PP") : "—"}
                </span>
              </div>
              {claim.decisionDate && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                  <span className="text-muted-foreground">Decision</span>
                  <span className="font-medium">
                    {format(new Date(claim.decisionDate), "PP")}
                  </span>
                </div>
              )}
            </div>
          )}
          {typeof claim.payoutAmount === "number" && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payout</span>
              <span className="font-medium">
                {claim.payoutAmount.toLocaleString()}
              </span>
            </div>
          )}
          {claim.rejectionReason && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-destructive">
                Rejection reason
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {claim.rejectionReason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Farm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {typeof claim.farmId === "object" && claim.farmId ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-right">
                    {claim.farmId.name || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Crop</span>
                  <span className="font-medium text-right">
                    {formatCropTypeLabel(claim.farmId.cropType)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Area</span>
                  <span className="font-medium text-right">
                    {typeof claim.farmId.area === "number"
                      ? `${claim.farmId.area.toFixed(2)} ha`
                      : "—"}
                  </span>
                </div>
                <div className="pt-1 text-xs text-muted-foreground">
                  {claim.farmId.locationName || ""}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">
                Farm ID:{" "}
                <span className="font-mono text-xs">{refId(claim.farmId)}</span>
              </div>
            )}

            <Button asChild variant="outline" size="sm">
              <Link to={`/farmer/farms/${refId(claim.farmId)}`}>View full details</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {typeof claim.policyId === "object" && claim.policyId ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Policy #</span>
                  <span className="font-medium text-right">
                    {claim.policyId.policyNumber || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Coverage</span>
                  <span className="font-medium text-right">
                    {claim.policyId.coverageLevel || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-right">
                    {claim.policyId.status || "—"}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">
                Policy ID:{" "}
                <span className="font-mono text-xs">
                  {refId(claim.policyId)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(claim.assessmentReportId &&
        typeof claim.assessmentReportId === "object") ||
      (claim.assessorId && typeof claim.assessorId === "object") ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {claim.assessorId && typeof claim.assessorId === "object" && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Assessor</span>
                <span className="font-medium text-right">
                  <Link 
                    to={`/farmer/assessors/${refId(claim.assessorId)}`}
                    className="hover:text-primary hover:underline transition-colors"
                  >
                    {fullName(claim.assessorId) || "—"}
                  </Link>
                </span>
              </div>
            )}

            {claim.assessmentReportId &&
              typeof claim.assessmentReportId === "object" && (
                <>
                  {claim.assessmentReportId.submittedAt && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Submitted</span>
                      <span className="font-medium text-right">
                        {format(
                          new Date(claim.assessmentReportId.submittedAt),
                          "PPp",
                        )}
                      </span>
                    </div>
                  )}

                  {(typeof claim.assessmentReportId.ndviBefore === "number" ||
                    typeof claim.assessmentReportId.ndviAfter === "number") && (
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {typeof claim.assessmentReportId.ndviBefore ===
                        "number" && (
                        <span>
                          NDVI before:{" "}
                          {claim.assessmentReportId.ndviBefore.toFixed(2)}
                        </span>
                      )}
                      {typeof claim.assessmentReportId.ndviAfter ===
                        "number" && (
                        <span>
                          NDVI after:{" "}
                          {claim.assessmentReportId.ndviAfter.toFixed(2)}
                        </span>
                      )}
                      {typeof claim.assessmentReportId.damageArea ===
                        "number" && (
                        <span>
                          Damage area:{" "}
                          {claim.assessmentReportId.damageArea.toFixed(2)} ha
                        </span>
                      )}
                    </div>
                  )}

                  {claim.assessmentReportId.reportText && (
                    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Summary
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {claim.assessmentReportId.reportText}
                      </p>
                    </div>
                  )}

                  {claim.assessmentReportId.weatherImpactAnalysis && (
                    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Weather impact
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {claim.assessmentReportId.weatherImpactAnalysis}
                      </p>
                    </div>
                  )}
                </>
              )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Damage photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Array.isArray(claim.damagePhotos) &&
          claim.damagePhotos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {claim.damagePhotos.map((url, i) => (
                <a
                  key={`${url}-${i}`}
                  href={mediaUrl(url)}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square rounded-lg border overflow-hidden bg-muted group"
                  title="Open full size"
                >
                  <img
                    src={mediaUrl(url)}
                    alt={`Damage photo ${i + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
              No photos attached.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmerClaimDetail;
