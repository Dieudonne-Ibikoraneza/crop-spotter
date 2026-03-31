import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ClipboardList, Search, Loader2, UserPlus, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useInsuranceRequests,
  useCreateAssessment,
} from "@/lib/api/hooks/useAssessor";
import { useAssessors } from "@/lib/api/hooks/useUsers";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const InsuranceRequests = () => {
  const [q, setQ] = useState("");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [selectedAssessorId, setSelectedAssessorId] = useState<string>("");

  const { data: requestsData, isLoading, error } = useInsuranceRequests();
  const { data: assessorsData, isLoading: isAssessorsLoading } = useAssessors();
  const createAssessmentMutation = useCreateAssessment();

  const handleAssignAssessor = async () => {
    if (!selectedFarmId || !selectedAssessorId) {
      toast.error("Please select an assessor");
      return;
    }

    try {
      await createAssessmentMutation.mutateAsync({
        farmId: selectedFarmId,
        assessorId: selectedAssessorId,
      });
      toast.success("Assessment request created and assessor assigned");
      setIsAssignModalOpen(false);
      setSelectedRequestId("");
      setSelectedFarmId("");
      setSelectedAssessorId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create assessment");
    }
  };

  const filteredRequests = useMemo(() => {
    if (!requestsData) return [];
    const query = q.trim().toLowerCase();
    const requests = Array.isArray(requestsData) ? requestsData : [];

    if (!query) return requests;

    return requests.filter((r: any) => {
      const farmName = typeof r.farmId === "object" ? r.farmId?.name || "" : "";
      const farmerName =
        typeof r.farmerId === "object"
          ? `${r.farmerId?.firstName} ${r.farmerId?.lastName}`
          : "";
      return [farmName, farmerName, r.status, r.notes]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [q, requestsData]);

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
        Error loading insurance requests. Please try again later.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Insurance Requests
          </h1>
          <p className="text-muted-foreground mt-1">
            Review requests from farmers and assign assessors.
          </p>
        </div>
        <div className="relative w-full sm:w-[340px]">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search farm, farmer, notes…"
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Pending Requests ({filteredRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground italic">
                No insurance requests found.
              </div>
            ) : (
              filteredRequests.map((r: any) => (
                <div
                  key={r._id}
                  className="rounded-lg border border-border/60 p-4 bg-card flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">
                        {typeof r.farmId === "object"
                          ? r.farmId.name
                          : "Unknown Farm"}
                      </span>
                      <Badge
                        variant={
                          r.status === "PENDING" ? "secondary" : "default"
                        }
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Farmer:{" "}
                        {typeof r.farmerId === "object"
                          ? `${r.farmerId.firstName} ${r.farmerId.lastName}`
                          : "---"}
                      </span>
                      <span>
                        Requested: {format(new Date(r.createdAt), "PPp")}
                      </span>
                    </div>
                    {r.notes && (
                      <div className="mt-2 p-2 bg-muted/30 rounded text-sm italic flex items-start gap-2">
                        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span>{r.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {r.status === "PENDING" && (
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setSelectedRequestId(r._id);
                          setSelectedFarmId(
                            typeof r.farmId === "object"
                              ? r.farmId._id
                              : r.farmId,
                          );
                          setIsAssignModalOpen(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4" />
                        Assign Assessor
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Assessor</DialogTitle>
            <DialogDescription>
              Select an assessor to perform the initial risk assessment for this
              farm.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="assessor">Select Assessor</Label>
              <Select
                value={selectedAssessorId}
                onValueChange={setSelectedAssessorId}
              >
                <SelectTrigger id="assessor">
                  <SelectValue placeholder="Select an available assessor" />
                </SelectTrigger>
                <SelectContent>
                  {isAssessorsLoading ? (
                    <div className="p-2 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : !assessorsData || assessorsData.length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      No assessors found.
                    </div>
                  ) : (
                    assessorsData.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.firstName} {a.lastName} ({a.email})
                      </SelectItem>
                    ))
                  )}
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
              onClick={handleAssignAssessor}
              disabled={
                createAssessmentMutation.isPending || !selectedAssessorId
              }
            >
              {createAssessmentMutation.isPending
                ? "Assigning..."
                : "Assign & Create Assessment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InsuranceRequests;
