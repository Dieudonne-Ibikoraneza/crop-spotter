import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Calendar,
  Hash,
  Sprout,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { toast } from "sonner";
import {
  useFarmerAcknowledgePolicy,
  useFarmerPolicy,
  useFarmerRejectPolicy,
} from "@/lib/api/hooks/useFarmer";
import type { Policy } from "@/lib/api/services/policies";

function refId(ref: unknown): string {
  if (ref == null) return "";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && "_id" in ref)
    return String((ref as { _id: unknown })._id);
  return String(ref);
}

function farmLabel(p: Policy): string {
  const f = p.farmId;
  if (f && typeof f === "object" && "name" in f && (f as { name?: string }).name) {
    return String((f as { name: string }).name);
  }
  return "Your farm";
}

const FarmerPolicyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: policy, isLoading, error, refetch } = useFarmerPolicy(id);
  const acknowledgeMutation = useFarmerAcknowledgePolicy();
  const rejectMutation = useFarmerRejectPolicy();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const pending =
    policy &&
    String(policy.status).toUpperCase() === "PENDING_ACCEPTANCE" &&
    !policy.farmerAcknowledgedAt;

  const handleAccept = async () => {
    if (!id) return;
    try {
      await acknowledgeMutation.mutateAsync(id);
      toast.success("Policy accepted. Your coverage is now active.");
      setConfirmOpen(false);
      await refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not accept policy");
    }
  };

  const handleReject = async () => {
    if (!id) return;
    const trimmed = rejectReason.trim();
    if (trimmed.length < 5) {
      toast.error("Please explain why you are declining (at least 5 characters).");
      return;
    }
    try {
      await rejectMutation.mutateAsync({ policyId: id, reason: trimmed });
      toast.success("You have declined this policy.");
      setRejectOpen(false);
      setRejectReason("");
      await refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not decline policy");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center min-h-[320px] items-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <Button variant="ghost" className="-ml-2 mb-4" asChild>
          <Link to="/farmer/insurance">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Insurance
          </Link>
        </Button>
        <p className="text-muted-foreground">Policy not found or you do not have access.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <Button variant="ghost" className="-ml-2 mb-2" asChild>
          <Link to="/farmer/insurance">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Insurance
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              {policy.policyNumber}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{farmLabel(policy)}</p>
          </div>
          <Badge
            variant={
              String(policy.status).toUpperCase() === "ACTIVE"
                ? "default"
                : String(policy.status).toUpperCase() === "DECLINED"
                  ? "destructive"
                  : "outline"
            }
            className={`text-sm px-3 py-1 ${
              String(policy.status).toUpperCase() === "PENDING_ACCEPTANCE"
                ? "border-amber-500 text-amber-600 bg-amber-50/30 dark:bg-amber-900/10"
                : ""
            }`}
          >
            {(() => {
              const s = String(policy.status).toUpperCase();
              if (s === "PENDING_ACCEPTANCE") return "Issued (Pending)";
              if (s === "DECLINED") return "Declined";
              if (s === "ACTIVE") return "Active / Coverage On";
              return policy.status;
            })()}
          </Badge>
        </div>
      </div>

      {pending && (
        <Card className="border-amber-500/40 bg-transparent shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-500">
              <CheckCircle2 className="h-5 w-5" />
              Action required
            </CardTitle>
            <CardDescription className="text-amber-700/80 dark:text-amber-400/80 font-medium">
              Your insurer has issued this policy. Review the terms below and accept to activate coverage.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button 
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white border-0" 
              onClick={() => setConfirmOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Review and accept policy
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800" 
              onClick={() => setRejectOpen(true)}
            >
              Decline policy
            </Button>
          </CardContent>
        </Card>
      )}

      {String(policy.status).toUpperCase() === "DECLINED" && policy.farmerRejectionReason && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Declined</CardTitle>
            <CardDescription>You declined this policy on{" "}
              {policy.farmerRejectedAt
                ? format(new Date(policy.farmerRejectedAt), "PPP")
                : "—"}
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium text-muted-foreground mb-1">Your reason</p>
            <p className="whitespace-pre-wrap">{policy.farmerRejectionReason}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Coverage summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Coverage level
            </span>
            <span className="font-medium">{policy.coverageLevel || "—"}</span>
          </div>
          <Separator />
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-2">
              <Sprout className="h-4 w-4" />
              Premium
            </span>
            <span className="font-medium">
              {typeof policy.premiumAmount === "number"
                ? `${policy.premiumAmount.toLocaleString()} RWF`
                : "—"}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Start
            </span>
            <span className="font-medium">
              {policy.startDate ? format(new Date(policy.startDate), "PPP") : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              End
            </span>
            <span className="font-medium">
              {policy.endDate ? format(new Date(policy.endDate), "PPP") : "—"}
            </span>
          </div>
          {policy.issuedAt && (
            <>
              <Separator />
              <div className="flex justify-between gap-4 text-xs text-muted-foreground">
                <span>Issued</span>
                <span>{format(new Date(policy.issuedAt), "PPp")}</span>
              </div>
            </>
          )}
          {policy.insurerAcknowledgedAt && (
            <div className="flex justify-between gap-4 text-xs text-muted-foreground">
              <span>Insurer confirmed</span>
              <span>{format(new Date(policy.insurerAcknowledgedAt), "PPp")}</span>
            </div>
          )}
          {policy.farmerAcknowledgedAt && (
            <div className="flex justify-between gap-4 text-xs text-muted-foreground">
              <span>You accepted</span>
              <span>{format(new Date(policy.farmerAcknowledgedAt), "PPp")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) setRejectReason("");
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this policy?</AlertDialogTitle>
            <AlertDialogDescription>
              This tells your insurer you do not accept the proposed coverage. The policy will not be active.
              Please give a short reason (required).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="reject-reason">Reason for declining</Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g. Premium is too high for my farm size…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="resize-y min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                void handleReject();
              }}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Decline policy"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept this policy?</AlertDialogTitle>
            <AlertDialogDescription>
              By accepting, you agree to the coverage period, premium, and terms associated with{" "}
              <strong>{policy.policyNumber}</strong>. Your farm will be marked as insured once you confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleAccept();
              }}
              disabled={acknowledgeMutation.isPending}
            >
              {acknowledgeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Accept policy"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FarmerPolicyDetail;
