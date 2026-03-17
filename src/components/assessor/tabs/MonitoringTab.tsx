import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  cropMonitoringService,
  CropMonitoringRecord,
} from "@/lib/api/services/cropMonitoring";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  FileText,
  Upload,
  X,
  Plus,
  CheckCircle2,
  Clock,
  Cloud,
  Droplets,
  Wind,
  Thermometer,
  Image as ImageIcon,
} from "lucide-react";

interface MonitoringTabProps {
  policyId: string;
  fieldName: string;
}

/** Extract the raw _id string from a possibly-populated Mongo reference */
const resolveId = (val: string | { _id: string; [k: string]: unknown }): string =>
  typeof val === "object" && val?._id ? val._id : String(val);

const getPhotoUrl = (url: string) => {
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  let baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
  baseUrl = baseUrl.replace(/\/api\/v1\/?$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const MonitoringTab = ({ policyId, fieldName }: MonitoringTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------- local editing state ----------
  const [observations, setObservations] = useState<string[]>([]);
  const [newObservation, setNewObservation] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // ---------- data fetching ----------
  const {
    data: cycles,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crop-monitoring-policy", policyId],
    queryFn: () => cropMonitoringService.getByPolicy(policyId),
    enabled: !!policyId,
  });

  // Find the active (IN_PROGRESS) cycle  — there can be at most one
  const activeCycle = (cycles || []).find(
    (c) => c.status === "IN_PROGRESS",
  ) as CropMonitoringRecord | undefined;

  const completedCycles = (cycles || []).filter(
    (c) => c.status === "COMPLETED",
  );

  // Seed local state from the active cycle once on first load
  if (activeCycle && !initialized) {
    setObservations(activeCycle.observations || []);
    setNotes(activeCycle.notes || "");
    setPhotoUrls(activeCycle.photoUrls || []);
    setInitialized(true);
  }

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
      toast({ title: "Saved", description: "Monitoring data updated successfully." });
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
      setInitialized(false); // reset so completed state renders
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

  const startMutation = useMutation({
    mutationFn: () => cropMonitoringService.startCycle(policyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crop-monitoring"] });
      queryClient.invalidateQueries({ queryKey: ["crop-monitoring-policy", policyId] });
      toast({
        title: "Monitoring Started",
        description: "A new monitoring cycle has been started successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to start monitoring cycle.",
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
    observations.length > 0 && notes.trim().length > 0;

  // ---------- weather helpers ----------
  const renderWeatherSummary = (weatherData: unknown) => {
    if (!weatherData) return null;

    const data = Array.isArray(weatherData)
      ? weatherData
      : (weatherData as any)?.data || (weatherData as any)?.list || [];

    if (!Array.isArray(data) || data.length === 0) return null;

    // Take first few entries
    const entries = data.slice(0, 6);

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {entries.map((entry: any, idx: number) => {
          const temp = entry.main?.temp
            ? (entry.main.temp - 273.15).toFixed(1)
            : "N/A";
          const humidity = entry.main?.humidity ?? "N/A";
          const windSpeed = entry.wind?.speed ?? "N/A";
          const rain =
            entry.rain?.["3h"] || entry.rain?.["1h"] || 0;
          const desc =
            entry.weather?.[0]?.description || "N/A";
          const dt = entry.dt
            ? new Date(entry.dt * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
              })
            : "";

          return (
            <div
              key={idx}
              className="p-3 rounded-lg bg-muted/50 border text-sm space-y-1"
            >
              <p className="font-medium text-xs text-muted-foreground">{dt}</p>
              <p className="capitalize text-sm">{desc}</p>
              <div className="flex items-center gap-1 text-xs">
                <Thermometer className="h-3 w-3" />
                {temp}°C
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Droplets className="h-3 w-3" />
                {humidity}%
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Wind className="h-3 w-3" />
                {windSpeed} m/s
              </div>
              {rain > 0 && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <Cloud className="h-3 w-3" />
                  {rain} mm rain
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ---------- render ----------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-muted-foreground">Loading monitoring data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
        <p className="font-medium">Failed to load monitoring data</p>
        <p className="text-sm mt-1">
          {(error as any)?.message || "Please try again."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Cycles Overview ---- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            Monitoring Cycles
            <Badge variant="outline" className="font-normal">
              {cycles.length} / 2 cycles
            </Badge>
          </CardTitle>
          <Button
            className="bg-green-600 hover:bg-green-700"
            disabled={cycles.length >= 2 || !!activeCycle || startMutation.isPending}
            onClick={() => startMutation.mutate()}
          >
            {startMutation.isPending ? "Starting..." : "Start Monitoring Cycle"}
          </Button>
        </CardHeader>
        <CardContent>
          {cycles.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No Monitoring Cycles</p>
              <p className="text-sm">Click "Start Monitoring Cycle" to begin.</p>
            </div>
          )}
          <div className="flex gap-4 flex-wrap">
            {cycles.map((cycle) => (
              <div
                key={cycle._id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-background min-w-[200px]"
              >
                {cycle.status === "COMPLETED" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    Cycle #{cycle.monitoringNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(cycle.monitoringDate).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  className={
                    cycle.status === "COMPLETED"
                      ? "bg-green-100 text-green-800 border-green-200 ml-auto"
                      : "bg-amber-100 text-amber-800 border-amber-200 ml-auto"
                  }
                >
                  {cycle.status === "COMPLETED" ? "Completed" : "In Progress"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---- Active Cycle Editor ---- */}
      {activeCycle && (
        <>
          {/* Observations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                📝 Observations
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  (required for report)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2">
                {observations.map((obs, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start gap-3 p-3 rounded-md bg-muted/40 border text-sm group transition-colors hover:bg-muted/80"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="leading-relaxed">{obs}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeObservation(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {observations.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4 border border-dashed rounded-md text-center bg-muted/20">
                    No observations added yet.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newObservation}
                  onChange={(e) => setNewObservation(e.target.value)}
                  placeholder="Add an observation (e.g. 'Healthy green canopy')"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addObservation();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addObservation}
                  disabled={!newObservation.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                📋 Notes
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  (required for report)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detailed assessment notes about the field condition, crop health, soil, recommendations…"
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {notes.length} characters
              </p>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📸 Photos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {photoUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group w-24 h-24 rounded-lg border overflow-hidden bg-muted flex-shrink-0"
                  >
                    <img
                      src={getPhotoUrl(url)}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden w-full h-full flex items-center justify-center absolute inset-0 bg-muted">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                      {url.split("/").pop()}
                    </p>
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
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? "Uploading…" : "Upload Photo"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Max 5 MB per image
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={!canGenerateReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Generate Monitoring Report?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will finalize the monitoring cycle for{" "}
                    <strong>{fieldName}</strong> and notify the insurer. You
                    won't be able to make further edits to this cycle.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      // Save first, then generate report
                      try {
                        await cropMonitoringService.updateCycle(
                          activeCycle._id,
                          { observations, notes, photoUrls },
                        );
                      } catch {
                        // ignore save errors, report gen will also validate
                      }
                      reportMutation.mutate();
                    }}
                    disabled={reportMutation.isPending}
                  >
                    {reportMutation.isPending
                      ? "Generating…"
                      : "Yes, Generate Report"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {!canGenerateReport && (
              <span className="text-xs text-muted-foreground">
                Add observations and notes before generating the report.
              </span>
            )}
          </div>
        </>
      )}

      {/* ---- Completed Cycles Summary ---- */}
      {completedCycles.map((cycle) => (
        <Card key={cycle._id}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Cycle #{cycle.monitoringNumber} — Completed
              <Badge className="bg-green-100 text-green-800 border-green-200 ml-auto">
                Report Generated
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Monitoring Date</p>
                <p className="font-medium">
                  {new Date(cycle.monitoringDate).toLocaleDateString()}
                </p>
              </div>
              {cycle.reportGeneratedAt && (
                <div>
                  <p className="text-muted-foreground">Report Generated</p>
                  <p className="font-medium">
                    {new Date(cycle.reportGeneratedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            {cycle.observations && cycle.observations.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1">Observations</p>
                <div className="flex flex-col gap-2 mt-2">
                  {cycle.observations.map((obs, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm text-foreground">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                      <span className="leading-relaxed">{obs}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {cycle.notes && (
              <div>
                <p className="text-muted-foreground mb-1">Notes</p>
                <p className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap">
                  {cycle.notes}
                </p>
              </div>
            )}
            {cycle.photoUrls && cycle.photoUrls.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-2">Photos</p>
                <div className="flex flex-wrap gap-3">
                  {cycle.photoUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative w-24 h-24 rounded-lg border overflow-hidden bg-muted flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(getPhotoUrl(url), "_blank")}
                    >
                      <img
                        src={getPhotoUrl(url)}
                        alt={`Observation ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden w-full h-full flex items-center justify-center absolute inset-0 bg-muted">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {cycle.weatherData && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-muted-foreground mb-2 flex items-center gap-2 font-medium">
                  <Cloud className="h-4 w-4 text-blue-500" />
                  Weather Data (at cycle start)
                </p>
                {renderWeatherSummary(cycle.weatherData)}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* ---- Active Cycle Weather Data ---- */}
      {activeCycle?.weatherData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-500" />
              Weather Data (at cycle start)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderWeatherSummary(activeCycle.weatherData)}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
