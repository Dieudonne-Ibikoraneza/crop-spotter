import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  FileWarning,
  Search,
  ArrowRight,
  UserPlus,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInsurerClaims } from "@/lib/api/hooks/useClaims";
import { useAssessors } from "@/lib/api/hooks/useUsers";
import { claimsService } from "@/lib/api/services/claims";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { formatBackendEnumLabel } from "@/lib/crops";

const priorityBadge = (status: string) => {
  if (status === "FILED") return "destructive";
  if (status === "SUBMITTED") return "secondary";
  return "outline";
};

const InsurerClaims = () => {
  const [q, setQ] = useState("");
  const [selectedAssessor, setSelectedAssessor] = useState<string>("");
  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [currentClaimId, setCurrentClaimId] = useState<string>("");

  const queryClient = useQueryClient();
  const { data: claimsData, isLoading: isClaimsLoading } = useInsurerClaims();
  const { data: assessors } = useAssessors();

  const assignMutation = useMutation({
    mutationFn: ({
      claimId,
      assessorId,
    }: {
      claimId: string;
      assessorId: string;
    }) => claimsService.assignAssessor(claimId, assessorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims", "insurer"] });
      toast.success("Assessor assigned successfully");
      setIsAssignOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign assessor");
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ claimId, amount }: { claimId: string; amount: number }) =>
      claimsService.approveClaim(claimId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims", "insurer"] });
      toast.success("Claim approved successfully");
      setIsApproveOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve claim");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ claimId, reason }: { claimId: string; reason: string }) =>
      claimsService.rejectClaim(claimId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims", "insurer"] });
      toast.success("Claim rejected successfully");
      setIsRejectOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject claim");
    },
  });

  const claims = useMemo(() => {
    if (!claimsData) return [];
    const query = q.trim().toLowerCase();
    if (!query) return claimsData;
    return claimsData.filter((c: any) => {
      const farmName = typeof c.farmId === "object" ? c.farmId?.name || "" : "";
      const farmerName =
        typeof c.farmerId === "object"
          ? `${c.farmerId?.firstName} ${c.farmerId?.lastName}`
          : "";
      return [farmName, farmerName, c.lossEventType, c.status].some((x) =>
        x.toLowerCase().includes(query),
      );
    });
  }, [q, claimsData]);

  if (isClaimsLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Claims</h1>
          <p className="text-muted-foreground mt-1">
            Review queue and decisions for live claims.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-[320px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search farm, farmer, status…"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-primary" />
            Claim queue ({claims.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {claims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No claims found in the queue.
            </div>
          ) : (
            claims.map((c: any) => (
              <div
                key={c._id}
                className="rounded-lg border border-border/60 p-4 flex flex-wrap items-center justify-between gap-3 bg-card"
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {typeof c.farmId === "object"
                      ? c.farmId?.name
                      : "Unknown Farm"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                    <span>
                      {typeof c.farmerId === "object"
                        ? `${c.farmerId?.firstName} ${c.farmerId?.lastName}`
                        : "Unknown Farmer"}
                    </span>
                    <span>•</span>
                    <span>{formatBackendEnumLabel(c.lossEventType)}</span>
                    <span>•</span>
                    <span>Filed {format(new Date(c.filedAt), "PPp")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={priorityBadge(c.status)}>{c.status}</Badge>

                  {c.status === "FILED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setCurrentClaimId(c._id);
                        setIsAssignOpen(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                      Assign
                    </Button>
                  )}

                  {c.status === "SUBMITTED" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 text-green-600 hover:text-green-700"
                        onClick={() => {
                          setCurrentClaimId(c._id);
                          setIsApproveOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 text-red-600 hover:text-red-700"
                        onClick={() => {
                          setCurrentClaimId(c._id);
                          setIsRejectOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}

                  {["ASSIGNED", "IN_PROGRESS"].includes(c.status) && (
                    <Badge variant="outline" className="text-blue-600">
                      Processing...
                    </Badge>
                  )}

                  <Button asChild size="sm" variant="ghost" className="gap-2">
                    <Link to={`/insurer/claims/${c._id}`}>
                      View <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Assign Assessor Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Assessor</DialogTitle>
            <DialogDescription>
              Select an assessor to evaluate this claim.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              onValueChange={setSelectedAssessor}
              value={selectedAssessor}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assessor" />
              </SelectTrigger>
              <SelectContent>
                {assessors?.map((assessor: any) => (
                  <SelectItem key={assessor.id} value={assessor.id}>
                    {assessor.firstName} {assessor.lastName} ({assessor.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                assignMutation.mutate({
                  claimId: currentClaimId,
                  assessorId: selectedAssessor,
                })
              }
              disabled={!selectedAssessor || assignMutation.isPending}
            >
              {assignMutation.isPending ? "Assigning..." : "Assign Assessor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Claim Dialog */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Claim</DialogTitle>
            <DialogDescription>
              Enter the payout amount for this claim.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payout Amount (RWF)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() =>
                approveMutation.mutate({
                  claimId: currentClaimId,
                  amount: parseFloat(payoutAmount),
                })
              }
              disabled={!payoutAmount || approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving..." : "Approve & Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Claim Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Claim</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this claim.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea
                placeholder="Reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                rejectMutation.mutate({
                  claimId: currentClaimId,
                  reason: rejectionReason,
                })
              }
              disabled={!rejectionReason || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Claim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InsurerClaims;
