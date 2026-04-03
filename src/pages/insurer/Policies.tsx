import { useMemo, useState } from "react";
import { format, addYears } from "date-fns";
import {
  ShieldCheck,
  Search,
  Loader2,
  Plus,
  Calendar,
  Info,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMyPolicies, useIssuePolicy } from "@/lib/api/hooks/usePolicies";
import { useAssessments } from "@/lib/api/hooks/useAssessor";
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
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { farmService } from "@/lib/api/services/assessor";
import { BasicInfoTab } from "@/components/assessor/tabs/BasicInfoTab";

const InsurerPolicies = () => {
  const [q, setQ] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [isFarmModalOpen, setIsFarmModalOpen] = useState(false);
  const [activeFarmContext, setActiveFarmContext] = useState<{
    farmId: string;
    farmer: any;
  } | null>(null);

  const { data: policiesData, isLoading, error } = useMyPolicies();
  const { data: assessmentsData, isLoading: isAssessmentsLoading } = useAssessments();

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

  const activeFarmId = activeFarmContext?.farmId;

  // Fetch full farm data for the farm detail dialog
  const { data: fullFarm } = useQuery({
    queryKey: ["farm", activeFarmId],
    queryFn: () => farmService.getFarm(activeFarmId!),
    enabled: !!activeFarmId && isFarmModalOpen,
  });

  // Only assessments that are COMPLETED/SUBMITTED and don't have a policy yet
  const completedAssessments = useMemo(() => {
    if (!assessmentsData) return [];
    // The backend might return assessments that already have policies
    // But we should filter for COMPLETED/SUBMITTED status
    return assessmentsData.filter(
      (a) =>
        a.status === "COMPLETED" ||
        a.status === "SUBMITTED" ||
        a.status === "APPROVED",
    );
  }, [assessmentsData]);

  const handleIssuePolicy = async () => {
    if (!selectedAssessmentId || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await issuePolicyMutation.mutateAsync({
        assessmentId: selectedAssessmentId,
        coverageLevel,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      toast.success("Policy issued successfully");
      setIsIssueModalOpen(false);
      // Reset form
      setSelectedAssessmentId("");
      setCoverageLevel("STANDARD");
    } catch (err: any) {
      toast.error(err.message || "Failed to issue policy");
    }
  };

  const rows = useMemo(() => {
    if (!policiesData) return [];
    const query = q.trim().toLowerCase();
    if (!query) return policiesData;
    return policiesData.filter((p: any) => {
      const farmName = typeof p.farmId === "object" ? p.farmId?.name || "" : "";
      const farmerName =
        typeof p.farmerId === "object"
          ? `${p.farmerId?.firstName} ${p.farmerId?.lastName}`
          : "";
      return [p.policyNumber, farmName, farmerName, p.status, p.coverageLevel]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [q, policiesData]);

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Error loading policies. Please try again later.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Policies</h1>
          <p className="text-muted-foreground mt-1">
            Coverage and premium overview for active live policies.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-[300px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search policy, farm, farmer…"
              className="pl-9"
            />
          </div>

          <Dialog open={isIssueModalOpen} onOpenChange={setIsIssueModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Issue Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Issue New Policy</DialogTitle>
                <DialogDescription>
                  Create a new insurance policy for a completed farm assessment.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="assessment">Select Assessment</Label>
                  <Select
                    value={selectedAssessmentId}
                    onValueChange={setSelectedAssessmentId}
                  >
                    <SelectTrigger id="assessment">
                      <SelectValue placeholder="Select a completed assessment" />
                    </SelectTrigger>
                    <SelectContent>
                      {isAssessmentsLoading ? (
                        <div className="p-2 text-center">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </div>
                      ) : completedAssessments.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          No completed assessments found.
                        </div>
                      ) : (
                        completedAssessments.map((a: any) => (
                          <SelectItem key={a._id} value={a._id}>
                            {typeof a.farmId === "object"
                              ? a.farmId.name
                              : "Unknown Farm"}{" "}
                            - Risk: {a.riskScore ?? a.risk_score ?? "N/A"}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="coverage">Coverage Level</Label>
                  <Select
                    value={coverageLevel}
                    onValueChange={setCoverageLevel}
                  >
                    <SelectTrigger id="coverage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BASIC">Basic Coverage</SelectItem>
                      <SelectItem value="STANDARD">
                        Standard Coverage
                      </SelectItem>
                      <SelectItem value="PREMIUM">Premium Coverage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <div className="relative">
                      <Calendar className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="startDate"
                        type="datetime-local"
                        className="pl-9"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <div className="relative">
                      <Calendar className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        id="endDate"
                        type="datetime-local"
                        className="pl-9"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsIssueModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleIssuePolicy}
                  disabled={issuePolicyMutation.isPending}
                >
                  {issuePolicyMutation.isPending
                    ? "Issuing..."
                    : "Issue Policy"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Policies ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-2">Policy Number</th>
                  <th className="py-2 pr-2">Farm Name</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-8 text-center text-muted-foreground italic"
                    >
                      No policies found matching your search.
                    </td>
                  </tr>
                ) : (
                  rows.map((p: any) => (
                    <tr
                      key={p._id}
                      className="border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => setSelectedPolicy(p)}
                    >
                      <td className="py-3 pr-2 font-medium">
                        {p.policyNumber}
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2">
                          <span>
                            {typeof p.farmId === "object"
                              ? p.farmId?.name
                              : "---"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFarmContext({
                                farmId:
                                  typeof p.farmId === "object"
                                    ? p.farmId._id
                                    : p.farmId,
                                farmer: p.farmerId,
                              });
                              setIsFarmModalOpen(true);
                            }}
                          >
                            <Info className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            p.status === "ACTIVE" ? "default" : "secondary"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Sheet
        open={!!selectedPolicy}
        onOpenChange={() => setSelectedPolicy(null)}
      >
        <SheetContent className="sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Policy Details
            </SheetTitle>
            <SheetDescription>
              Comprehensive information for policy{" "}
              {selectedPolicy?.policyNumber}
            </SheetDescription>
          </SheetHeader>

          {selectedPolicy && (
            <div className="mt-8 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Policy Status
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Status</span>
                  <Badge
                    variant={
                      selectedPolicy.status === "ACTIVE"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {selectedPolicy.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Issued At</span>
                  <span className="font-medium">
                    {selectedPolicy.issuedAt
                      ? format(new Date(selectedPolicy.issuedAt), "PPP p")
                      : "---"}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Farmer & Farm
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Farmer Name
                    </Label>
                    <p className="font-medium">
                      {typeof selectedPolicy.farmerId === "object"
                        ? `${selectedPolicy.farmerId?.firstName} ${selectedPolicy.farmerId?.lastName}`
                        : "---"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Farm Name
                    </Label>
                    <div className="flex items-center gap-2 group">
                      <p className="font-medium">
                        {typeof selectedPolicy.farmId === "object"
                          ? selectedPolicy.farmId?.name
                          : "---"}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setActiveFarmContext({
                            farmId:
                              typeof selectedPolicy.farmId === "object"
                                ? selectedPolicy.farmId._id
                                : selectedPolicy.farmId,
                            farmer: selectedPolicy.farmerId,
                          });
                          setIsFarmModalOpen(true);
                          setSelectedPolicy(null);
                        }}
                      >
                        <Info className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Crop Type
                    </Label>
                    <p className="font-medium uppercase">
                      {typeof selectedPolicy.farmId === "object"
                        ? selectedPolicy.farmId?.cropType
                        : "---"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Area (Ha)
                    </Label>
                    <p className="font-medium">
                      {typeof selectedPolicy.farmId === "object"
                        ? selectedPolicy.farmId?.area?.toFixed(2)
                        : "---"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Coverage & Premium
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Coverage Level
                    </Label>
                    <p className="font-medium">
                      {selectedPolicy.coverageLevel}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Premium Amount
                    </Label>
                    <p className="font-bold text-primary">
                      {(selectedPolicy.premiumAmount || 0).toLocaleString()} RWF
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Coverage Period
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Start Date
                    </Label>
                    <p className="font-medium">
                      {selectedPolicy.startDate
                        ? format(new Date(selectedPolicy.startDate), "PPP p")
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      End Date
                    </Label>
                    <p className="font-medium">
                      {selectedPolicy.endDate
                        ? format(new Date(selectedPolicy.endDate), "PPP p")
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Farm Detail Dialog */}
      <Dialog
        open={isFarmModalOpen}
        onOpenChange={(open) => {
          setIsFarmModalOpen(open);
          if (!open) setActiveFarmContext(null);
        }}
      >
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Farm & Field Context
            </DialogTitle>
            <DialogDescription>
              Detailed information and map view for the selected farm.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
            {fullFarm ? (
              <BasicInfoTab
                fieldId={fullFarm.id}
                farmerId={
                  typeof activeFarmContext?.farmer === "object"
                    ? activeFarmContext.farmer._id
                    : activeFarmContext?.farmer
                }
                fieldName={fullFarm.name || "N/A"}
                farmerName={
                  typeof activeFarmContext?.farmer === "object"
                    ? `${activeFarmContext.farmer.firstName} ${activeFarmContext.farmer.lastName}`
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
    </div>
  );
};

export default InsurerPolicies;
