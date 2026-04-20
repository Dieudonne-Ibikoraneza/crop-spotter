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
  Download,
  Activity,
} from "lucide-react";
import {
  Claim,
  ClaimAssessment,
  claimsService,
} from "@/lib/api/services/claims";
import { ClaimReportGenerator } from "@/utils/claimReportGenerator";
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
  isInsurer?: boolean;
}

export const LossOverviewTab = ({
  claim,
  fieldName,
  isInsurer = false,
}: LossOverviewTabProps) => {
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
  const [notes, setNotes] = useState("");
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExport = async () => {
    if (!assessment) return;
    setIsExporting(true);
    try {
      const generator = new ClaimReportGenerator();

      // Ensure we use the latest state values in case the assessment object is stale
      const currentData = {
        ...assessment,
        reportText: reportText || assessment.reportText || assessment.notes,
        weatherImpactAnalysis:
          weatherImpactAnalysis || assessment.weatherImpactAnalysis,
        observations:
          observations.length > 0 ? observations : assessment.observations,
      };

      await generator.generate(
        claim,
        currentData,
        assessment.droneAnalysisPdfs || [],
      );
      toast({
        title: "Report Exported",
        description: "Your PDF assessment report is ready.",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Could not generate PDF report.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderParagraphs = (text: string) => {
    if (!text) return null;
    return text
      .split(/\n\s*\n/)
      .filter((p) => p.trim())
      .map((p, i) => (
        <p
          key={i}
          className={`mb-4 leading-relaxed text-base ${isInsurer ? "text-white/80" : "text-slate-700"}`}
        >
          {p.trim()}
        </p>
      ));
  };

  if (isInsurer) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-700">
        {/* Header / Finalization Banner - Ultra Compact */}
        <div className="flex items-center justify-between p-3 bg-white border border-green-100 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Report Finalized & Verified
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="h-7 px-3 text-[10px] font-bold uppercase tracking-wider gap-1.5 border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {isExporting ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <Download className="h-3 w-3 text-primary" />
              )}
              Export Report
            </Button>
            {claim.status === "SUBMITTED" && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 text-[10px] h-5 px-2"
              >
                Pending Approval
              </Badge>
            )}
          </div>
        </div>

        {/* Observations Section */}
        <section className="overflow-hidden rounded-xl shadow-sm">
          <div className="bg-slate-900 px-5 py-3 flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Field Observations
            </h3>
          </div>
          <div className="bg-slate-800 p-6">
            <div className="grid gap-3">
              {observations.length > 0 ? (
                observations.map((obs, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <p className="text-white/90 leading-relaxed text-sm md:text-base font-light">
                      {obs}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-white/40 italic text-sm">
                  No specific field observations recorded.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Weather Impact Section */}
        <section className="overflow-hidden rounded-xl shadow-sm">
          <div className="bg-slate-900 px-5 py-3 flex items-center gap-2.5">
            <CloudLightning className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Weather Impact Analysis
            </h3>
          </div>
          <div className="bg-slate-800 p-6">
            {weatherImpactAnalysis ? (
              <div className="text-white/80 font-serif italic leading-relaxed">
                {renderParagraphs(weatherImpactAnalysis)}
              </div>
            ) : (
              <p className="text-white/80 italic text-sm">
                No weather impact analysis provided.
              </p>
            )}
          </div>
        </section>

        {/* Final Summary Section */}
        <section className="overflow-hidden rounded-xl shadow-sm">
          <div className="bg-slate-900 px-5 py-3 flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Assessment Executive Summary
            </h3>
          </div>
          <div className="bg-slate-800 p-6 min-h-[150px]">
            {reportText ? (
              <div className="text-white/80 leading-8 font-sans">
                {renderParagraphs(reportText)}
              </div>
            ) : (
              <p className="text-white/80 italic text-sm">
                No formal summary has been provided for this assessment.
              </p>
            )}
          </div>
        </section>
      </div>
    );
  }

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
                  {!isCompleted && !isInsurer && (
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

            {!isCompleted && !isInsurer && (
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
              {isInsurer ? (
                <div className="relative p-6 rounded-lg bg-blue-50/50 border border-blue-100/50 text-sm whitespace-pre-wrap min-h-[120px] text-blue-900/80 leading-relaxed font-serif italic shadow-inner">
                  <div className="absolute top-3 right-3 opacity-20">
                    <CloudLightning className="h-8 w-8 text-blue-400" />
                  </div>
                  {weatherImpactAnalysis ||
                    "No weather impact analysis provided for this assessment."}
                </div>
              ) : (
                <Textarea
                  value={weatherImpactAnalysis}
                  onChange={(e) => setWeatherImpactAnalysis(e.target.value)}
                  placeholder="Analyze how weather events contributed to the observed damage..."
                  className="min-h-[100px] resize-none"
                  disabled={isCompleted}
                />
              )}
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
              {isInsurer ? (
                <div className="relative p-8 rounded-lg bg-white border shadow-sm text-sm whitespace-pre-wrap min-h-[250px] text-slate-700 leading-8 font-sans">
                  <div className="absolute top-4 right-4 opacity-10">
                    <FileText className="h-12 w-12 text-slate-400" />
                  </div>
                  {reportText ||
                    "A formal assessment summary has not been provided."}
                </div>
              ) : (
                <Textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Provide a comprehensive summary of the loss evaluation..."
                  className="min-h-[200px] flex-1 resize-none"
                  disabled={isCompleted}
                />
              )}

              <div className="flex flex-col gap-3 pt-4 border-t mt-auto">
                {!isCompleted && !isInsurer ? (
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
                  (isInsurer || isCompleted) && (
                    <div className="flex flex-col items-center gap-2 p-6 bg-green-50/50 border border-green-200/50 rounded-xl shadow-sm">
                      <CheckCircle2 className="h-10 w-10 text-green-600 mb-1" />
                      <p className="text-sm font-bold text-green-900 uppercase tracking-widest">
                        Official Assessment Report Finalized
                      </p>
                      {claim.status === "SUBMITTED" && (
                        <p className="text-xs text-green-700">
                          Pending Insurer Approval
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
