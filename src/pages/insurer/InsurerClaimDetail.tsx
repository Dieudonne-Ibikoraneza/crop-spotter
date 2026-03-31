import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  FileWarning,
  BadgeCheck,
  Calendar,
  User,
  MapPin,
  ClipboardCheck,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Info,
  UserPlus,
  Ban,
  DollarSign,
  FileText,
  Activity,
  ShieldAlert,
  FileDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useClaim } from "@/lib/api/hooks/useClaims";
import { useAssessors } from "@/lib/api/hooks/useUsers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cropMonitoringService } from "@/lib/api/services/cropMonitoring";
import { assessorService, farmService } from "@/lib/api/services/assessor";
import { usersService } from "@/lib/api/services/users";
import { claimsService } from "@/lib/api/services/claims";
import { DroneAnalysisView } from "@/components/assessor/DroneAnalysisView";
import { BasicInfoTab } from "@/components/assessor/tabs/BasicInfoTab";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

const InsurerClaimDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: claim, isLoading, error } = useClaim(id);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Helper function to calculate season from sowing date (Rwanda specific)
  const getSeasonFromSowingDate = (sowingDate?: string): string => {
    if (!sowingDate) return "Season A";
    const date = new Date(sowingDate);
    if (isNaN(date.getTime())) return "Season A";
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();
    // Season A: Sep-Feb | Season B: Mar-Jun | Season C: Jul-Aug
    if (month >= 8 || month <= 1) {
      return `Season ${year} A`;
    } else if (month >= 2 && month <= 5) {
      return `Season ${year} B`;
    } else {
      return `Season ${year} C`;
    }
  };

  // New modal states
  const [isFarmModalOpen, setIsFarmModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Input states
  const [selectedAssessorId, setSelectedAssessorId] = useState<string>("");
  const [payoutAmountInput, setPayoutAmountInput] = useState<string>("");
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>("");

  const farmId =
    typeof claim?.farmId === "object" ? claim.farmId._id : claim?.farmId;
  const policyId =
    typeof claim?.policyId === "object" ? claim.policyId._id : claim?.policyId;

  // Fetch full farm data for the farm detail dialog
  const { data: fullFarm } = useQuery({
    queryKey: ["farm", farmId],
    queryFn: () => farmService.getFarm(farmId!),
    enabled: !!farmId && isFarmModalOpen,
  });

  // Fetch list of assessors for assignment
  const { data: assessors } = useAssessors();

  // Mutations
  const assignMutation = useMutation({
    mutationFn: (assessorId: string) =>
      claimsService.assignAssessor(id!, assessorId),
    onSuccess: () => {
      toast.success("Assessor assigned successfully");
      setIsAssignModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["claims", "detail", id] });
    },
    onError: () => toast.error("Failed to assign assessor"),
  });

  const approveMutation = useMutation({
    mutationFn: (amount: number) => claimsService.approveClaim(id!, amount),
    onSuccess: () => {
      toast.success("Claim approved successfully");
      setIsApproveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["claims", "detail", id] });
    },
    onError: () => toast.error("Failed to approve claim"),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => claimsService.rejectClaim(id!, reason),
    onSuccess: () => {
      toast.success("Claim rejected successfully");
      setIsRejectModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["claims", "detail", id] });
    },
    onError: () => toast.error("Failed to reject claim"),
  });

  // Fetch Crop Monitoring reports
  const { data: monitoringRecords } = useQuery({
    queryKey: ["monitoring-reports", policyId],
    queryFn: () => cropMonitoringService.getByPolicy(policyId!),
    enabled: !!policyId,
  });

  // Fetch ALL Risk Assessment reports for this farm
  const { data: allAssessments } = useQuery({
    queryKey: ["all-assessments"],
    queryFn: () => assessorService.getAssessments(),
  });

  const farmAssessments = allAssessments?.filter(
    (a) => (typeof a.farmId === "object" ? a.farmId._id : a.farmId) === farmId,
  );

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="p-8 text-center text-red-500">
        Error loading claim details. Please try again later.
      </div>
    );
  }

  const farm = typeof claim.farmId === "object" ? claim.farmId : null;
  const farmer = typeof claim.farmerId === "object" ? claim.farmerId : null;
  const policy = typeof claim.policyId === "object" ? claim.policyId : null;
  const assessment =
    typeof claim.assessmentReportId === "object"
      ? claim.assessmentReportId
      : null;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/insurer/claims">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Claim Details
            </h1>
            <Badge variant="outline" className="text-xs">
              {claim._id}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Reviewing claim for {farm?.name || "Unknown Farm"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-primary" />
                Loss Event Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-semibold">
                    Event Type
                  </label>
                  <p className="text-lg font-bold text-primary">
                    {claim.lossEventType}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-semibold">
                    Filed Date
                  </label>
                  <p className="font-medium">
                    {format(new Date(claim.filedAt), "PPP")}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase font-semibold">
                  Description
                </label>
                <p className="mt-1 text-sm leading-relaxed">
                  {claim.lossDescription || "No description provided."}
                </p>
              </div>

              {claim.damagePhotos && claim.damagePhotos.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-semibold">
                    Damage Photos
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {claim.damagePhotos.map((photo, i) => (
                      <div
                        key={i}
                        className="aspect-video rounded-md overflow-hidden bg-muted border"
                      >
                        <img
                          src={
                            photo.startsWith("http")
                              ? photo
                              : `http://localhost:3000${photo}`
                          }
                          alt={`Damage photo ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Assessment Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {claim.status === "FILED" ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground italic">
                    No assessment has been assigned yet.
                  </p>
                </div>
              ) : claim.status === "ASSIGNED" ||
                (claim.status === "IN_PROGRESS" && !assessment) ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground italic">
                    Assessment is currently in progress.
                  </p>
                </div>
              ) : assessment ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-muted-foreground uppercase font-semibold">
                          Observations
                        </label>
                        {assessment.observations &&
                        assessment.observations.length > 0 ? (
                          <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                            {assessment.observations.map((obs, i) => (
                              <li key={i}>{obs}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No observations recorded.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase font-semibold">
                          Weather Impact Analysis
                        </label>
                        <p className="text-sm mt-1">
                          {assessment.weatherImpactAnalysis ||
                            "No weather impact analysis provided."}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase font-semibold">
                          Assessor Summary
                        </label>
                        <p className="text-sm mt-1">
                          {assessment.reportText ||
                            assessment.notes ||
                            "No summary provided."}
                        </p>
                      </div>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-lg border">
                      <h4 className="font-semibold text-sm mb-2">
                        Satellite Analysis (NDVI)
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span>Before Event</span>
                          <span className="font-bold">
                            {assessment.ndviBefore || "---"}
                          </span>
                        </div>
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-green-500 h-full"
                            style={{
                              width: `${(assessment.ndviBefore || 0) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>After Event</span>
                          <span className="font-bold text-red-500">
                            {assessment.ndviAfter || "---"}
                          </span>
                        </div>
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-red-500 h-full"
                            style={{
                              width: `${(assessment.ndviAfter || 0) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <div className="pt-2 flex justify-between items-center border-t">
                          <span className="text-xs font-semibold">
                            Damage Estimate
                          </span>
                          <Badge variant="destructive">
                            {assessment.ndviBefore && assessment.ndviAfter
                              ? `${(((assessment.ndviBefore - assessment.ndviAfter) / assessment.ndviBefore) * 100).toFixed(1)}% Loss`
                              : "--- % Loss"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground italic">
                    Assessment report not found.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Repository */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <FileDown className="h-5 w-5" />
                Report Repository
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Crop Monitoring Section */}
              {monitoringRecords &&
                monitoringRecords.some(
                  (m) => m.droneAnalysisPdfs && m.droneAnalysisPdfs.length > 0,
                ) && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                      <Activity className="h-4 w-4" />
                      CROP MONITORING REPORTS
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {monitoringRecords.flatMap((m) =>
                        (m.droneAnalysisPdfs || []).map((pdf, idx) => (
                          <Button
                            key={`${m._id}-${idx}`}
                            variant="outline"
                            className="justify-start gap-3 h-auto py-3 px-4 transition-all hover:bg-primary/5 hover:border-primary/30"
                            onClick={() => {
                              setSelectedReport(pdf);
                              setIsDialogOpen(true);
                            }}
                          >
                            <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="text-left overflow-hidden">
                              <p className="text-sm font-medium truncate capitalize">
                                {pdf.pdfType.replace(/_/g, " ")}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Monitoring #{m.monitoringNumber} •{" "}
                                {format(new Date(m.monitoringDate), "PP")}
                              </p>
                            </div>
                          </Button>
                        )),
                      )}
                    </div>
                  </div>
                )}

              {/* Risk Assessment Section */}
              {farmAssessments &&
                farmAssessments.some(
                  (a) => a.droneAnalysisPdfs && a.droneAnalysisPdfs.length > 0,
                ) && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                      <ShieldAlert className="h-4 w-4" />
                      RISK ASSESSMENT REPORTS
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {farmAssessments.flatMap((a) =>
                        (a.droneAnalysisPdfs || []).map((pdf, idx) => (
                          <Button
                            key={`risk-${a._id}-${idx}`}
                            variant="outline"
                            className="justify-start gap-3 h-auto py-3 px-4 transition-all hover:bg-primary/5 hover:border-primary/30"
                            onClick={() => {
                              setSelectedReport(pdf);
                              setIsDialogOpen(true);
                            }}
                          >
                            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                              <ShieldAlert className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="text-left overflow-hidden">
                              <p className="text-sm font-medium truncate capitalize">
                                {pdf.pdfType.replace(/_/g, " ")}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Assessment •{" "}
                                {format(new Date(pdf.uploadedAt), "PP")}
                              </p>
                            </div>
                          </Button>
                        )),
                      )}
                    </div>
                  </div>
                )}

              {/* Loss Assessment Section (Redundant but grouped here for portal feel) */}
              {assessment?.droneAnalysisPdfs &&
                assessment.droneAnalysisPdfs.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase">
                      <FileWarning className="h-4 w-4" />
                      Current Loss Assessment
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {assessment.droneAnalysisPdfs.map((pdf, idx) => (
                        <Button
                          key={`loss-${idx}`}
                          variant="outline"
                          className="justify-start gap-3 h-auto py-3 px-4 transition-all hover:bg-primary/5 hover:border-primary/30"
                          onClick={() => {
                            setSelectedReport(pdf);
                            setIsDialogOpen(true);
                          }}
                        >
                          <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-red-600" />
                          </div>
                          <div className="text-left overflow-hidden">
                            <p className="text-sm font-medium truncate capitalize">
                              {pdf.pdfType.replace(/_/g, " ")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              Claim Evidence Report •{" "}
                              {pdf.uploadedAt
                                ? format(new Date(pdf.uploadedAt), "PP")
                                : "N/A"}
                            </p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Fallback if no reports at all */}
              {!(
                (monitoringRecords &&
                  monitoringRecords.some(
                    (m) =>
                      m.droneAnalysisPdfs && m.droneAnalysisPdfs.length > 0,
                  )) ||
                (farmAssessments &&
                  farmAssessments.some(
                    (a) =>
                      a.droneAnalysisPdfs && a.droneAnalysisPdfs.length > 0,
                  )) ||
                (assessment?.droneAnalysisPdfs &&
                  assessment.droneAnalysisPdfs.length > 0)
              ) && (
                <div className="py-12 text-center bg-muted/20 rounded-lg border border-dashed">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground italic">
                    No satellite or drone analysis reports available for this
                    claim.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
              <DialogHeader className="p-6 pb-2 border-b bg-muted/5 shrink-0">
                <DialogTitle className="text-2xl font-bold flex items-center gap-3 capitalize">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  {selectedReport?.pdfType?.replace(/_/g, " ") || "Report"}{" "}
                  Details
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Analysis data extracted from uploaded drone report
                </p>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {selectedReport && (
                  <DroneAnalysisView
                    data={selectedReport.droneAnalysisData}
                    pdfType={selectedReport.pdfType}
                  />
                )}
              </div>

              <div className="p-4 border-t bg-muted/30 flex justify-end shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Close Report
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Farm Detail Dialog */}
          <Dialog open={isFarmModalOpen} onOpenChange={setIsFarmModalOpen}>
            <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
              <DialogHeader className="p-6 border-b shrink-0">
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Farm & Field Context
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
                {fullFarm ? (
                  <BasicInfoTab
                    fieldId={fullFarm.id}
                    farmerId={
                      typeof claim.farmerId === "object"
                        ? claim.farmerId._id
                        : claim.farmerId
                    }
                    fieldName={fullFarm.name || "N/A"}
                    farmerName={
                      farmer
                        ? `${farmer.firstName} ${farmer.lastName}`
                        : "Unknown"
                    }
                    cropType={fullFarm.cropType || "N/A"}
                    area={fullFarm.area || 0}
                    season={getSeasonFromSowingDate(fullFarm.sowingDate)}
                    location={fullFarm.locationName || "Unknown"}
                    sowingDate={
                      fullFarm.sowingDate
                        ? format(new Date(fullFarm.sowingDate), "PP")
                        : "N/A"
                    }
                    boundary={fullFarm.boundary}
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

          {/* Assign Modal */}
          <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Assessor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Available Assessors</Label>
                  <Select
                    onValueChange={setSelectedAssessorId}
                    value={selectedAssessorId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an assessor" />
                    </SelectTrigger>
                    <SelectContent>
                      {assessors?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.firstName} {a.lastName} ({a.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAssignModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => assignMutation.mutate(selectedAssessorId)}
                  disabled={!selectedAssessorId || assignMutation.isPending}
                >
                  {assignMutation.isPending
                    ? "Assigning..."
                    : "Confirm Assignment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Approve Modal */}
          <Dialog
            open={isApproveModalOpen}
            onOpenChange={setIsApproveModalOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Approve Claim</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="payout">Final Payout Amount (RWF)</Label>
                  <Input
                    id="payout"
                    type="number"
                    placeholder="Enter amount"
                    value={payoutAmountInput}
                    onChange={(e) => setPayoutAmountInput(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsApproveModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() =>
                    approveMutation.mutate(Number(payoutAmountInput))
                  }
                  disabled={!payoutAmountInput || approveMutation.isPending}
                >
                  {approveMutation.isPending
                    ? "Approving..."
                    : "Confirm Approval"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reject Modal */}
          <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Claim</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Rejection</Label>
                  <Textarea
                    id="reason"
                    placeholder="Provide details for the rejection"
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsRejectModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => rejectMutation.mutate(rejectionReasonInput)}
                  disabled={!rejectionReasonInput || rejectMutation.isPending}
                >
                  {rejectMutation.isPending
                    ? "Rejecting..."
                    : "Confirm Rejection"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase flex items-center justify-between">
                Status
                <StatusBadge status={claim.status as any} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                {claim.status === "APPROVED" ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : claim.status === "REJECTED" ? (
                  <XCircle className="h-6 w-6 text-red-500" />
                ) : (
                  <div className="h-6 w-6 rounded-sm bg-primary/20 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                )}
                <span className="text-xl font-bold">{claim.status}</span>
              </div>

              {/* Claim Actions Section */}
              {["FILED", "SUBMITTED", "IN_PROGRESS", "ASSIGNED"].includes(
                claim.status,
              ) && (
                <div className="space-y-2 mt-4 pt-4 border-t">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">
                    Available Actions
                  </p>

                  {claim.status === "FILED" && (
                    <Button
                      className="w-full justify-start gap-2 h-9"
                      onClick={() => setIsAssignModalOpen(true)}
                    >
                      <UserPlus className="h-4 w-4" /> Assign Assessor
                    </Button>
                  )}

                  {(claim.status === "SUBMITTED" ||
                    claim.status === "IN_PROGRESS" ||
                    claim.status === "ASSIGNED") && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 gap-2 h-9"
                        onClick={() => setIsApproveModalOpen(true)}
                      >
                        <BadgeCheck className="h-4 w-4" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 gap-2 h-9"
                        onClick={() => setIsRejectModalOpen(true)}
                      >
                        <Ban className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Separator className="my-4" />
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Claim ID</span>
                  <span className="font-mono text-xs">
                    {claim._id.substring(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Priority</span>
                  <Badge variant="secondary">High</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">
                Farmer & Farm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {farmer
                      ? `${farmer.firstName} ${farmer.lastName}`
                      : "Unknown Farmer"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {farmer?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 group">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {farm?.name || "Unknown Farm"}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setIsFarmModalOpen(true)}
                    >
                      <Info className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]">
                    {farm?.cropType} • {farm?.area} Ha
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BadgeCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">
                    Policy {policy?.policyNumber || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {policy?.coverageLevel} Coverage
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-primary uppercase">
                Financials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Policy Premium</span>
                <span className="font-semibold">
                  {policy?.premiumAmount?.toLocaleString()} RWF
                </span>
              </div>
              {claim.payoutAmount !== undefined &&
                claim.payoutAmount !== null && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Payout Decided
                      </span>
                      <span className="font-semibold text-green-600">
                        {claim.payoutAmount.toLocaleString()} RWF
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-bold">Total Payout</span>
                      <span className="text-xl font-bold text-primary">
                        {claim.payoutAmount.toLocaleString()} RWF
                      </span>
                    </div>
                  </>
                )}
              {!claim.payoutAmount && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground italic">
                    Payout pending decision...
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InsurerClaimDetail;
