import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Save,
  CheckCircle2,
  FileText,
  AlertCircle,
  X,
  Plus,
  CloudLightning,
  Send,
} from "lucide-react";
import {
  Claim,
  ClaimAssessment,
  claimsService,
} from "@/lib/api/services/claims";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAssessmentById } from "@/lib/api/hooks/useClaims";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LossOverviewTabProps {
  claim: Claim;
  fieldName: string;
}

export const LossOverviewTab = ({ claim, fieldName }: LossOverviewTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const assessmentFromClaim =
    typeof claim.assessmentReportId === "object"
      ? (claim.assessmentReportId as ClaimAssessment)
      : null;

  const assessmentId =
    typeof claim.assessmentReportId === "string"
      ? claim.assessmentReportId
      : assessmentFromClaim?._id;

  const { data: fetchedAssessment, isLoading: isAssessmentLoading } =
    useAssessmentById(assessmentId);

  const assessment = fetchedAssessment || assessmentFromClaim;

  const [observations, setObservations] = useState<string[]>([]);
  const [newObservation, setNewObservation] = useState("");
  const [reportText, setReportText] = useState("");
  const [weatherImpactAnalysis, setWeatherImpactAnalysis] = useState("");
  const [notes, setNotes] = useState(""); // Keeping this for backward compatibility if needed, but mainly we use reportText

  useEffect(() => {
    if (assessment) {
      setObservations(assessment.observations || []);
      setReportText(assessment.reportText || assessment.notes || "");
      setWeatherImpactAnalysis(assessment.weatherImpactAnalysis || "");
      setNotes(assessment.notes || "");
    }
  }, [assessment]);

  const isCompleted = [
    "SUBMITTED",
    "APPROVED",
    "REJECTED",
    "COMPLETED",
  ].includes(claim.status);

  const updateMutation = useMutation({
    mutationFn: (data: any) => claimsService.updateAssessment(claim._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["claims", "detail", claim._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["assessments", "detail", assessmentId],
      });
      toast({
        title: "Progress Saved",
        description: "Assessment notes and observations updated.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to save assessment notes.",
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => claimsService.submitAssessment(claim._id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["claims", "detail", claim._id],
      });
      queryClient.invalidateQueries({ queryKey: ["claims", "assessor"] });
      queryClient.invalidateQueries({
        queryKey: ["assessments", "detail", assessmentId],
      });
      toast({
        title: "Assessment Submitted",
        description: "The claim is now pending insurer approval.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Submission Failed",
        description: err?.message || "Could not submit assessment.",
        variant: "destructive",
      });
    },
  });

  const addObservation = () => {
    const trimmed = newObservation.trim();
    if (!trimmed) return;
    setObservations((prev) => [...prev, trimmed]);
    setNewObservation("");
  };

  const removeObservation = (index: number) => {
    setObservations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    updateMutation.mutate({
      observations,
      reportText,
      weatherImpactAnalysis,
      notes: reportText, // Ensure both are sent for compatibility
    });
  };

  const canSubmit =
    observations.length > 0 &&
    reportText.trim().length > 0 &&
    (assessment?.droneAnalysisPdfs?.length || 0) > 0;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Observations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Field Observations
            </CardTitle>
            <CardDescription>
              Key findings from the physical inspection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {observations.map((obs, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-start gap-3 p-3 rounded-md bg-muted/50 border group"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-sm">{obs}</span>
                  </div>
                  {!isCompleted && (
                    <button
                      onClick={() => removeObservation(idx)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {observations.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center p-6 border border-dashed rounded-md">
                  No observations added.
                </p>
              )}
            </div>

            {!isCompleted && (
              <div className="flex gap-2">
                <Input
                  value={newObservation}
                  onChange={(e) => setNewObservation(e.target.value)}
                  placeholder="e.g. Waterlogging in the NW quadrant"
                  onKeyDown={(e) => e.key === "Enter" && addObservation()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addObservation}
                  disabled={!newObservation.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Notes */}
        <div className="space-y-6 flex flex-col">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CloudLightning className="h-5 w-5 text-primary" />
                Weather Impact Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={weatherImpactAnalysis}
                onChange={(e) => setWeatherImpactAnalysis(e.target.value)}
                placeholder="Analyze how weather events contributed to the observed damage..."
                className="min-h-[100px] resize-none"
                disabled={isCompleted}
              />
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Assessment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <Textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Provide a comprehensive summary of the loss evaluation..."
                className="min-h-[200px] flex-1 resize-none"
                disabled={isCompleted}
              />

              <div className="flex flex-col gap-3 pt-4 border-t mt-auto">
                {!isCompleted ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="w-full"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Progress
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          disabled={!canSubmit || submitMutation.isPending}
                        >
                          {submitMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Complete & Submit to Insurer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Submit Loss Assessment?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will finalize your evaluation for{" "}
                            <strong>{fieldName}</strong> and notify the insurer
                            for payout processing. You won't be able to edit
                            this assessment afterwards.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => submitMutation.mutate()}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Submit Assessment
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {!canSubmit && (
                      <p className="text-xs text-muted-foreground text-center">
                        Add observations, notes, and at least one drone report
                        to submit.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <p className="text-sm font-bold text-green-900 uppercase tracking-wide">
                      Assessment Finalized
                    </p>
                    {claim.status === "SUBMITTED" && (
                      <p className="text-xs text-green-700">
                        Pending Insurer Approval
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
