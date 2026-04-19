import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Download,
} from "lucide-react";
import { generateDroneDataPDF } from "@/utils/dronePdfGenerator";
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
import {
  formatBackendEnumLabel,
  formatCropTypeLabel,
  formatReportTypeLabel,
} from "@/lib/crops";
import { LossBasicInfoTab } from "@/components/assessor/tabs/loss/LossBasicInfoTab";
import { LossEvidenceTab } from "@/components/assessor/tabs/loss/LossEvidenceTab";
import { LossDetailsTab } from "@/components/assessor/tabs/loss/LossDetailsTab";
import { LossOverviewTab } from "@/components/assessor/tabs/loss/LossOverviewTab";

const InsurerClaimDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: claim, isLoading, error } = useClaim(id);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
        <div className="flex items-center gap-4">
          <StatusBadge status={claim.status as any} />
          {policy && (
            <div
              onClick={() => {
                const pId = policy._id || policy.policyNumber;
                if (pId) {
                  window.location.href = `/insurer/policies?policyId=${pId}`;
                }
              }}
            >
              <Badge
                variant="outline"
                className="py-1.5 px-4 bg-primary/5 border-primary/20 text-primary font-mono text-sm cursor-pointer hover:bg-primary/10 transition-colors flex items-center gap-2"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Policy: {policy.policyNumber || "N/A"}
                <span className="ml-2 opacity-70 border-l border-primary/30 pl-2 font-sans text-xs">
                  Active Coverage
                </span>
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {/* Claim Actions Dashboard - Full Width Banner */}
        {["FILED", "SUBMITTED", "IN_PROGRESS", "ASSIGNED"].includes(claim.status) && (
          <Card className="border-primary/20 bg-primary/5 shadow-md overflow-hidden animate-in slide-in-from-top duration-500">
            <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Claim Action Required</h3>
                  <p className="text-sm text-muted-foreground italic">
                    {claim.status === "FILED" 
                      ? "This claim requires an assessor assignment to begin the evaluation process."
                      : "The assessment report has been submitted. Please review and finalize the payout."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                {claim.status === "FILED" && (
                  <Button
                    className="flex-1 md:flex-none gap-2 h-11 px-6 shadow-sm"
                    onClick={() => setIsAssignModalOpen(true)}
                  >
                    <UserPlus className="h-4 w-4" /> Assign Assessor
                  </Button>
                )}

                {(claim.status === "SUBMITTED" ||
                  claim.status === "IN_PROGRESS" ||
                  claim.status === "ASSIGNED") && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 md:flex-none border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 gap-2 h-11 px-6"
                      onClick={() => setIsRejectModalOpen(true)}
                    >
                      <Ban className="h-4 w-4" /> Reject Claim
                    </Button>
                    <Button
                      className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white gap-2 h-11 px-8 shadow-lg shadow-green-100"
                      onClick={() => setIsApproveModalOpen(true)}
                    >
                      <BadgeCheck className="h-4 w-4" /> Approve & Payout
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}

        <Tabs defaultValue="basic-info" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="details">Loss Details</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="basic-info" className="mt-0">
            <LossBasicInfoTab
              field={farm}
              claim={claim}
              farmerName={farmer ? `${farmer.firstName} ${farmer.lastName}` : "Unknown Farmer"}
              farmer={farmer}
              policy={policy}
              showFinancials={true}
            />
          </TabsContent>

          <TabsContent value="evidence" className="mt-0">
            <LossEvidenceTab claim={claim} isInsurer={true} />
          </TabsContent>

          <TabsContent value="details" className="mt-0">
            <LossDetailsTab claim={claim} isInsurer={true} />
          </TabsContent>

          <TabsContent value="overview" className="mt-0">
            <LossOverviewTab 
              claim={claim} 
              fieldName={farm?.name || "Field"} 
              isInsurer={true} 
            />
          </TabsContent>
        </Tabs>

        {/* Dialogs and Modals */}
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
                className="bg-green-600 hover:bg-green-700 text-white"
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
    </div>
  );
};

export default InsurerClaimDetail;


