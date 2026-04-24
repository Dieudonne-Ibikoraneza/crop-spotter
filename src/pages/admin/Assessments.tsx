import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  MapPin,
  UserPlus,
  Eye,
  ExternalLink,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  useAdminAssessors,
  useAdminInsurers,
  useAssignAssessorToFarm,
  usePendingFarms,
} from "@/lib/api/hooks/useAdmin";
import { useAssessments, useFarm } from "@/lib/api/hooks/useAssessor";
import { farmService } from "@/lib/api/services/assessor";
import type { PendingFarmRow } from "@/lib/api/services/admin";
import type { Assessment } from "@/lib/api/services/assessor";
import { BasicInfoTab } from "@/components/assessor/tabs/BasicInfoTab";

function farmerLabel(f: PendingFarmRow["farmer"]) {
  const n = [f.firstName, f.lastName].filter(Boolean).join(" ").trim();
  return n || f.email || f.phoneNumber || "Farmer";
}

function locationHint(f: PendingFarmRow["farmer"]) {
  const fp = f.farmerProfile;
  const parts = [
    fp?.farmDistrict,
    fp?.farmSector,
    f.district,
    f.province,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function refId(ref: unknown): string {
  if (ref == null) return "";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && "_id" in (ref as object)) {
    return String((ref as { _id: string })._id);
  }
  return "";
}

function assessorName(a: Assessment): string {
  const x = a.assessorId;
  if (x && typeof x === "object") {
    return [x.firstName, x.lastName].filter(Boolean).join(" ").trim() || x.email || "—";
  }
  return "—";
}

function farmName(a: Assessment): string {
  const f = a.farmId;
  if (f && typeof f === "object" && "name" in f) return (f as { name?: string }).name || "—";
  return "—";
}

function getSeasonFromSowingDate(sowingDate?: string): string {
  if (!sowingDate) return "Season A";
  const date = new Date(sowingDate);
  if (Number.isNaN(date.getTime())) return "Season A";
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 8 || month <= 1) return `Season ${year} A`;
  if (month >= 2 && month <= 5) return `Season ${year} B`;
  return `Season ${year} C`;
}

const AdminAssessments = () => {
  const location = useLocation();
  const { data: farms, isLoading, error, refetch, isFetching } = usePendingFarms();
  const { data: assessments, isLoading: assLoading } = useAssessments();
  const { data: assessors, isLoading: assessorsLoading } = useAdminAssessors();
  const { data: insurers, isLoading: insurersLoading } = useAdminInsurers();
  const assignMutation = useAssignAssessorToFarm();

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPending, setSelectedPending] = useState<PendingFarmRow | null>(null);
  const [assessorId, setAssessorId] = useState("");
  const [insurerId, setInsurerId] = useState<string>("none");

  const [farmModalOpen, setFarmModalOpen] = useState(false);
  const [farmModalContext, setFarmModalContext] = useState<PendingFarmRow | null>(null);

  const [assessmentSheet, setAssessmentSheet] = useState<Assessment | null>(null);

  const farmIdForModal = farmModalContext?.id ?? null;
  const { data: fullFarm } = useQuery({
    queryKey: ["farm", farmIdForModal],
    queryFn: () => farmService.getFarm(farmIdForModal!),
    enabled: !!farmIdForModal && farmModalOpen,
  });

  const assessmentFarmId = assessmentSheet ? refId(assessmentSheet.farmId) : null;
  const { data: farmForAssessment } = useFarm(assessmentFarmId || undefined);

  const openAssign = (farm: PendingFarmRow) => {
    setSelectedPending(farm);
    setAssessorId("");
    setInsurerId(farm.insurerId || "none");
    setAssignOpen(true);
  };

  const openFarmModal = (farm: PendingFarmRow) => {
    setFarmModalContext(farm);
    setFarmModalOpen(true);
  };

  const handleAssign = () => {
    if (!selectedPending || !assessorId) return;
    assignMutation.mutate(
      {
        farmId: selectedPending.id,
        assessorId,
        insurerId: insurerId && insurerId !== "none" ? insurerId : undefined,
      },
      {
        onSuccess: () => {
          setAssignOpen(false);
          setSelectedPending(null);
        },
      },
    );
  };

  const list = farms ?? [];
  const farmerIdForLinks = farmForAssessment?.farmerId
    ? refId(farmForAssessment.farmerId)
    : "";

  const riskHref =
    assessmentFarmId && farmerIdForLinks
      ? `/assessor/risk-assessment/${farmerIdForLinks}/${assessmentFarmId}`
      : null;
  const monitorHref =
    assessmentFarmId && farmerIdForLinks
      ? `/assessor/crop-monitoring/${farmerIdForLinks}/${assessmentFarmId}`
      : null;

  useEffect(() => {
    if (location.hash === "#all-assessments") {
      requestAnimationFrame(() => {
        document.getElementById("all-assessments")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.hash, location.pathname]);

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Pending fields at the top — assign assessors to create assessments. All assessments
            below; open one for links into assessor workflows.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Refresh queue
        </Button>
      </div>

      {/* —— Pending farms —— */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Pending farms
        </h2>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Awaiting assessor assignment</CardTitle>
            <Badge variant="secondary">{list.length}</Badge>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading…
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive text-sm">
                Could not load pending farms.
              </div>
            ) : list.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No pending farms.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field ID</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead className="hidden sm:table-cell">Crop</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((farm) => (
                    <TableRow key={farm.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="text-left font-mono text-xs hover:text-primary hover:underline"
                          onClick={() => openFarmModal(farm)}
                        >
                          {farm.id}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div>{farmerLabel(farm.farmer)}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {farm.farmer.email || farm.farmer.phoneNumber || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{farm.cropType || "—"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => openFarmModal(farm)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button size="sm" className="gap-1 shadow-lg shadow-primary/10" onClick={() => openAssign(farm)}>
                          <UserPlus className="h-4 w-4" />
                          Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* —— All assessments —— */}
      <section id="all-assessments" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Risk & field assessments
        </h2>
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            {assLoading ? (
              <div className="flex justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading assessments…
              </div>
            ) : !assessments?.length ? (
              <p className="text-center py-12 text-muted-foreground text-sm">No assessments yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Farm</TableHead>
                    <TableHead className="hidden md:table-cell">Assessor</TableHead>
                    <TableHead className="hidden lg:table-cell">Updated</TableHead>
                    <TableHead className="text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((a) => (
                    <TableRow
                      key={a._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setAssessmentSheet(a)}
                    >
                      <TableCell>
                        <Badge variant="outline">{a.status}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{farmName(a)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {assessorName(a)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {a.updatedAt ? format(new Date(a.updatedAt), "PPp") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssessmentSheet(a);
                          }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign assessor</DialogTitle>
            <DialogDescription>
              {selectedPending ? (
                <>
                  {selectedPending.name?.trim() || "Unnamed field"} — {farmerLabel(selectedPending.farmer)}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Assessor</Label>
              <Select
                value={assessorId}
                onValueChange={setAssessorId}
                disabled={assessorsLoading || assignMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder={assessorsLoading ? "Loading…" : "Select assessor"} />
                </SelectTrigger>
                <SelectContent>
                  {(assessors ?? []).map((a) => {
                    const label =
                      [a.firstName, a.lastName].filter(Boolean).join(" ").trim() || a.email;
                    const sub = a.district ? ` — ${a.district}` : "";
                    return (
                      <SelectItem key={a.id} value={a.id}>
                        {`${label}${sub}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Insurer</Label>
                {selectedPending?.insurerId && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] uppercase font-bold">
                    Farmer's Choice
                  </Badge>
                )}
              </div>
              <Select
                value={insurerId}
                onValueChange={setInsurerId}
                disabled={insurersLoading || assignMutation.isPending || !!selectedPending?.insurerId}
              >
                <SelectTrigger className={cn(insurerId === "none" && "border-destructive/50")}>
                  <SelectValue placeholder={insurersLoading ? "Loading…" : "Select insurer"} />
                </SelectTrigger>
                <SelectContent>
                  {!selectedPending?.insurerId && (
                    <SelectItem value="none">Select an insurer...</SelectItem>
                  )}
                  {(insurers ?? []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.insurerProfile?.companyName || [i.firstName, i.lastName].filter(Boolean).join(" ") || i.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {insurerId === "none" && (
                <p className="text-[10px] text-destructive font-bold flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-destructive" />
                  Selecting an insurer is mandatory
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!assessorId || insurerId === "none" || assignMutation.isPending}
              className="gap-2"
            >
              {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Farm detail dialog */}
      <Dialog
        open={farmModalOpen}
        onOpenChange={(o) => {
          setFarmModalOpen(o);
          if (!o) setFarmModalContext(null);
        }}
      >
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0">
            <DialogTitle>Farm details</DialogTitle>
            <DialogDescription>
              Field context (same view as insurer portal). Use assign above to attach an assessor.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
            {fullFarm && farmModalContext ? (
              <BasicInfoTab
                fieldId={fullFarm.id}
                farmerId={farmModalContext.farmer.id}
                fieldName={fullFarm.name || "N/A"}
                farmerName={farmerLabel(farmModalContext.farmer)}
                cropType={fullFarm.cropType || "N/A"}
                area={fullFarm.area || 0}
                season={getSeasonFromSowingDate(fullFarm.sowingDate)}
                location={fullFarm.locationName || "Unknown"}
                sowingDate={
                  fullFarm.sowingDate
                    ? format(new Date(fullFarm.sowingDate), "PP")
                    : "N/A"
                }
                boundary={fullFarm.boundary as { type: string; coordinates: number[][][] }}
                locationCoords={fullFarm.location?.coordinates}
                showActions={false}
              />
            ) : (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assessment detail sheet */}
      <Sheet open={!!assessmentSheet} onOpenChange={() => setAssessmentSheet(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Assessment
            </SheetTitle>
            <SheetDescription>
              {assessmentSheet ? (
                <span className="font-mono text-xs">{assessmentSheet._id}</span>
              ) : null}
            </SheetDescription>
          </SheetHeader>
          {assessmentSheet && (
            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Status</span>
                <Badge>{assessmentSheet.status}</Badge>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Risk score</span>
                <span>{assessmentSheet.riskScore ?? "—"}</span>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Farm</p>
                <p className="font-medium">{farmName(assessmentSheet)}</p>
                <p className="font-mono text-xs text-muted-foreground">{refId(assessmentSheet.farmId)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Assessor</p>
                <p>{assessorName(assessmentSheet)}</p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                {riskHref && (
                  <Button variant="outline" size="sm" className="justify-between" asChild>
                    <Link to={riskHref} target="_blank" rel="noreferrer">
                      Open risk assessment
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {monitorHref && (
                  <Button variant="outline" size="sm" className="justify-between" asChild>
                    <Link to={monitorHref} target="_blank" rel="noreferrer">
                      Open crop monitoring
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {!riskHref && assessmentFarmId && (
                  <p className="text-xs text-muted-foreground">
                    Load farm context to enable deep links (farmer id required).
                  </p>
                )}
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Created {assessmentSheet.createdAt ? format(new Date(assessmentSheet.createdAt), "PPp") : "—"}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminAssessments;
