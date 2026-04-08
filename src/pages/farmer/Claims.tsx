import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { FileText, ArrowRight, Image as ImageIcon, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useFarmerClaims,
  useFarmerFarms,
  useFarmerPolicies,
  useFileClaim,
} from "@/lib/api/hooks/useFarmer";
import type { Claim } from "@/lib/api/services/claims";
import { formatBackendEnumLabel } from "@/lib/crops";

function refId(ref: unknown): string {
  if (ref == null) return "";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && "_id" in ref)
    return String((ref as { _id: unknown })._id);
  return String(ref);
}

const statusBadgeVariant = (status: string | undefined) => {
  const s = (status || "").toUpperCase();
  if (["APPROVED", "PAID"].includes(s)) return "default";
  if (["REJECTED"].includes(s)) return "destructive";
  if (["IN_PROGRESS", "UNDER_REVIEW"].includes(s)) return "secondary";
  return "outline";
};

const FarmerClaims = () => {
  const { data: claims = [], isLoading, error } = useFarmerClaims();
  const { data: policies = [] } = useFarmerPolicies();
  const { data: farmsData } = useFarmerFarms();
  const fileClaim = useFileClaim();
  const [open, setOpen] = useState(false);
  const [policyId, setPolicyId] = useState<string>("");
  const [lossEventType, setLossEventType] = useState<
    | "DROUGHT"
    | "FLOOD"
    | "PEST_INFESTATION"
    | "DISEASE"
    | "HAIL"
    | "FIRE"
    | "STORM"
    | "OTHER"
  >("FLOOD");
  const [lossDescription, setLossDescription] = useState("");
  const [damagePhotoUrls, setDamagePhotoUrls] = useState("");

  const activePolicies = useMemo(
    () =>
      policies.filter((p) => String(p.status).toUpperCase() === "ACTIVE"),
    [policies],
  );

  const farmNameById = useMemo(() => {
    const items = farmsData?.items ?? [];
    return new Map(items.map((f) => [f.id, f.name?.trim() || "Farm"]));
  }, [farmsData]);

  const policyFarmName = (farmRef: unknown) => {
    const farmId =
      typeof farmRef === "string"
        ? farmRef
        : farmRef && typeof farmRef === "object" && "_id" in farmRef
          ? String((farmRef as { _id: unknown })._id)
          : "";
    return farmNameById.get(farmId);
  };

  const claimFarmName = (farmRef: unknown) => {
    const farmId = refId(farmRef);
    return farmNameById.get(farmId);
  };

  const claimPolicyNumber = (policyRef: unknown) => {
    if (!policyRef || typeof policyRef !== "object") return undefined;
    return (policyRef as { policyNumber?: string }).policyNumber;
  };

  const claimPreview = (c: Claim) => {
    const desc = c.lossDescription?.trim();
    if (desc) return desc;
    const reportText =
      c.assessmentReportId && typeof c.assessmentReportId === "object"
        ? (c.assessmentReportId as { reportText?: string }).reportText?.trim()
        : "";
    if (reportText) return reportText;
    return "";
  };

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
        Could not load claims. {error instanceof Error ? error.message : ""}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My claims</h1>
          <p className="text-muted-foreground mt-1">
            Track filed claims, statuses, and decisions.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              File new claim
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>File a claim</DialogTitle>
              <DialogDescription>
                Select the policy and describe the loss event. (Photo upload is not supported yet — you can paste URLs if you have them.)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Policy</p>
                <Select value={policyId} onValueChange={setPolicyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select policy" />
                  </SelectTrigger>
                  <SelectContent>
                    {activePolicies.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.policyNumber}
                        {policyFarmName(p.farmId) ? ` · ${policyFarmName(p.farmId)}` : ""}
                        {p.coverageLevel ? ` · ${String(p.coverageLevel).toUpperCase()}` : ""}
                      </SelectItem>
                    ))}
                    {activePolicies.length === 0 && (
                      <SelectItem value="__none" disabled>
                        No active policies
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Loss event</p>
                <Select
                  value={lossEventType}
                  onValueChange={(v) => setLossEventType(v as typeof lossEventType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "DROUGHT",
                        "FLOOD",
                        "PEST_INFESTATION",
                        "DISEASE",
                        "HAIL",
                        "FIRE",
                        "STORM",
                        "OTHER",
                      ] as const
                    ).map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatBackendEnumLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Description (optional)</p>
                <Textarea
                  value={lossDescription}
                  onChange={(e) => setLossDescription(e.target.value)}
                  placeholder="What happened? When? Which part of the field? Any observations?"
                  className="min-h-[120px]"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Damage photo URLs (optional)</p>
                <Input
                  value={damagePhotoUrls}
                  onChange={(e) => setDamagePhotoUrls(e.target.value)}
                  placeholder="Paste URLs separated by commas"
                />
                <p className="text-xs text-muted-foreground">
                  Example: `https://.../photo1.jpg, https://.../photo2.jpg`
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={fileClaim.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const urls = damagePhotoUrls
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  await fileClaim.mutateAsync({
                    policyId,
                    lossEventType,
                    lossDescription: lossDescription.trim() || undefined,
                    damagePhotos: urls.length ? urls : undefined,
                  });
                  setLossDescription("");
                  setDamagePhotoUrls("");
                  setPolicyId("");
                  setLossEventType("FLOOD");
                  setOpen(false);
                }}
                disabled={
                  fileClaim.isPending || !policyId || policyId === "__none"
                }
              >
                {fileClaim.isPending ? "Submitting…" : "Submit claim"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {claims.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              No claims yet
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            When you file a claim, it will appear here with its review status.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {claims
            .slice()
            .sort(
              (a, b) =>
                new Date(b.filedAt).getTime() - new Date(a.filedAt).getTime(),
            )
            .map((c) => (
              <Card key={c._id} className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {formatBackendEnumLabel(c.lossEventType)}
                    </span>
                    <Badge variant={statusBadgeVariant(c.status)} className="shrink-0">
                      {c.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {c.claimType === "HARVEST_AUTO_SUBMISSION" ? (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold border-blue-200 bg-blue-50 text-blue-700 h-5 px-1.5">
                        Scheduled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold border-amber-200 bg-amber-50 text-amber-700 h-5 px-1.5">
                        Farmer Reported
                      </Badge>
                    )}
                    {claimFarmName(c.farmId) && (
                      <Badge variant="secondary" className="font-medium h-5 px-1.5">
                        {claimFarmName(c.farmId)}
                      </Badge>
                    )}
                    {claimPolicyNumber(c.policyId) && (
                      <span className="font-mono text-[10px] opacity-70">
                        {claimPolicyNumber(c.policyId)}
                      </span>
                    )}
                  </div>
                  {claimPreview(c) ? (
                    <p className="text-muted-foreground line-clamp-2">
                      {claimPreview(c)}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>
                        Filed{" "}
                        {c.filedAt ? format(new Date(c.filedAt), "PPp") : "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <ImageIcon className="h-3.5 w-3.5" />
                        {Array.isArray(c.damagePhotos) ? c.damagePhotos.length : 0}
                      </span>
                    </div>
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link to={`/farmer/claims/${c._id}`}>
                        View
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
};

export default FarmerClaims;

