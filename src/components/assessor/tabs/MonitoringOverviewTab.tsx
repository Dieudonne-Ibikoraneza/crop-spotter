import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import {
  Loader2,
  Save,
  FileText,
  Upload,
  X,
  Plus,
  CheckCircle2,
  Clock,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import {
  CropMonitoringRecord,
  cropMonitoringService,
} from "@/lib/api/services/cropMonitoring";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MonitoringReportGenerator } from "@/utils/monitoringReportGenerator";
import { formatReportTypeLabel } from "@/lib/crops";

interface MonitoringOverviewTabProps {
  monitoringId: string;
  policyId: string;
  fieldName: string;
  farmerName?: string;
  cropType?: string;
  area?: number;
  location?: string;
  cycles: CropMonitoringRecord[];
  activeCycle?: CropMonitoringRecord;
  readOnly?: boolean;
}

const getPhotoUrl = (url: string) => {
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  let baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
  baseUrl = baseUrl.replace(/\/api\/v1\/?$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const MonitoringOverviewTab = ({
  monitoringId,
  policyId,
  fieldName,
  farmerName = "N/A",
  cropType = "N/A",
  area = 0,
  location = "N/A",
  cycles,
  activeCycle,
  readOnly = false,
}: MonitoringOverviewTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDownloadingFull, setIsDownloadingFull] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------- local editing state ----------
  const [observations, setObservations] = useState<string[]>([]);
  const [newObservation, setNewObservation] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const isCompleted = activeCycle?.status === "COMPLETED";

  // Seed local state from the active cycle
  useEffect(() => {
    if (activeCycle && !initialized) {
      setObservations(activeCycle.observations || []);
      setNotes(activeCycle.notes || "");
      setPhotoUrls(activeCycle.photoUrls || []);
      setInitialized(true);
    }
  }, [activeCycle, initialized]);

  // ---------- mutations ----------
  const updateMutation = useMutation({
    mutationFn: () =>
      cropMonitoringService.updateCycle(activeCycle!._id, {
        observations,
        notes,
        photoUrls,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["crop-monitoring-policy", policyId],
      });
      queryClient.invalidateQueries({ queryKey: ["crop-monitoring"] });
      toast({
        title: "Saved",
        description: "Monitoring data updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to update monitoring data.",
        variant: "destructive",
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: () => cropMonitoringService.generateReport(activeCycle!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["crop-monitoring-policy", policyId],
      });
      queryClient.invalidateQueries({ queryKey: ["crop-monitoring"] });
      setInitialized(false);
      toast({
        title: "Report Generated",
        description:
          "The monitoring report has been generated and the insurer has been notified.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to generate report.",
        variant: "destructive",
      });
    },
  });

  // ---------- handlers ----------
  const addObservation = () => {
    const trimmed = newObservation.trim();
    if (!trimmed) return;
    setObservations((prev) => [...prev, trimmed]);
    setNewObservation("");
  };

  const removeObservation = (index: number) => {
    setObservations((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCycle) return;

    setIsUploading(true);
    try {
      const result = await cropMonitoringService.uploadPhoto(
        activeCycle._id,
        file,
      );
      setPhotoUrls((prev) => [...prev, result.url]);
      toast({ title: "Photo uploaded", description: file.name });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message || "Could not upload photo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const canGenerateReport =
    observations.length > 0 &&
    notes.trim().length > 0 &&
    (activeCycle?.droneAnalysisPdfs?.length || 0) > 0;

  const completedCycles = (cycles || []).filter(
    (c) => c.status === "COMPLETED",
  );

  const handleDownloadFullReport = async () => {
    setIsDownloadingFull(true);
    try {
      const generator = new MonitoringReportGenerator();
      await generator.downloadFullReport({
        farmName: fieldName,
        farmerName,
        cropType,
        area,
        location,
        policyNumber: policyId, // Using Number/ID passed from parent
        cycles: [...cycles].sort((a, b) => b.monitoringNumber - a.monitoringNumber),
      });
      toast({
        title: "Success",
        description: "Full monitoring report downloaded.",
      });
    } catch (err) {
      console.error("Full Report Generation Error:", err);
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingFull(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-primary/10">
        <div>
          <h2 className="text-xl font-bold text-primary">Monitoring Documentation</h2>
          <p className="text-sm text-muted-foreground">
            {completedCycles.length} completed cycles recorded so far.
          </p>
        </div>
        <Button
          onClick={handleDownloadFullReport}
          disabled={isDownloadingFull || completedCycles.length === 0}
          className="bg-primary hover:bg-primary/90 text-white gap-2 h-11 px-6 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          title={completedCycles.length === 0 ? "At least one completed cycle is required to generate a full report." : "Download the complete monitoring history"}
        >
          {isDownloadingFull ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          {isDownloadingFull ? "Generating Dossier..." : "Download Full Monitoring Report"}
        </Button>
      </div>

      {/* Active Cycle Editor */}
      {activeCycle ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Active Cycle: #{activeCycle.monitoringNumber}
            </h3>
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200"
            >
              In Progress
            </Badge>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Observations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Observations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2">
                    {observations.map((obs, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-start gap-3 p-3 rounded-md bg-muted/60 border border-border text-sm group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span className="leading-relaxed text-foreground">
                            {obs}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => removeObservation(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {observations.length === 0 && (
                      <p className="text-sm text-muted-foreground italic text-center p-4 border border-dashed rounded-md">
                        No observations added.
                      </p>
                    )}
                  </div>
                  {!isCompleted && (
                    <div className="flex gap-2">
                      <Input
                        value={newObservation}
                        onChange={(e) => setNewObservation(e.target.value)}
                        placeholder="Add observation..."
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

              {/* Photos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Cycle Photos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {photoUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative group w-24 h-24 rounded-lg border overflow-hidden bg-muted"
                      >
                        <img
                          src={getPhotoUrl(url)}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isCompleted}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isCompleted}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {isUploading ? "Uploading..." : "Add Photo"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notes & Summary */}
            <div className="space-y-6">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Save className="h-4 w-4 text-primary" />
                    Detailed Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide additional details about the field condition..."
                    className="min-h-[250px] resize-none"
                    disabled={isCompleted}
                  />

                  {!isCompleted && (
                    <div className="flex flex-col gap-3 pt-4 border-t">
                      <Button
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700"
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
                            variant="outline"
                            className="w-full"
                            disabled={!canGenerateReport}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Complete Cycle & Generate Report
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Finalize Monitoring Cycle?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will generate the final report for Cycle #
                              {activeCycle.monitoringNumber} of{" "}
                              <strong>{fieldName}</strong> and notify the
                              insurer. You won't be able to edit this cycle
                              further.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.preventDefault();
                                reportMutation.mutate();
                              }}
                              className="bg-green-600 hover:bg-green-700 min-w-[140px]"
                              disabled={reportMutation.isPending}
                            >
                              {reportMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              {reportMutation.isPending ? "Generating..." : "Generate Report"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {!canGenerateReport && (
                        <p className="text-xs text-muted-foreground text-center">
                          Add observations, notes, and at least one drone report
                          to finalize.
                        </p>
                      )}
                    </div>
                  )}
                  {isCompleted && (
                    <div className="pt-4 border-t">
                      <Badge className="w-full justify-center py-2 bg-green-100 text-green-800 border-green-200">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Cycle Finalized
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Plus className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No Active Monitoring Cycle</p>
            <p className="text-sm">
              Start a new cycle in the Basic Info tab to begin your assessment.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Completed Cycles History */}
      {completedCycles.length > 0 && (
        <div className="pt-6 border-t font-bold">
          <h3 className="text-lg mb-4">Completed History</h3>
          <div className="space-y-4">
            {completedCycles.map((cycle) => (
              <Card key={cycle._id} className="bg-muted/50 border-border">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Cycle #{cycle.monitoringNumber}
                    </CardTitle>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Completed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">
                        Date
                      </p>
                      <p className="font-medium">
                        {new Date(cycle.monitoringDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">
                        Report Generated
                      </p>
                      <p className="font-medium">
                        {cycle.reportGeneratedAt
                          ? new Date(
                              cycle.reportGeneratedAt,
                            ).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {cycle.observations && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase mb-1">
                        Observations
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {cycle.observations.map((obs, i) => (
                          <li key={i} className="text-foreground">
                            {obs}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {cycle.notes && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase mb-1">
                        Notes
                      </p>
                      <p className="bg-background/50 p-3 rounded border border-border italic text-foreground">
                        {cycle.notes}
                      </p>
                    </div>
                  )}

                  {cycle.photoUrls && cycle.photoUrls.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase mb-2">
                        Photos
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {cycle.photoUrls.map((url, i) => (
                          <div
                            key={i}
                            className="w-16 h-16 rounded border overflow-hidden"
                          >
                            <img
                              src={getPhotoUrl(url)}
                              alt={`Photo ${i}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
