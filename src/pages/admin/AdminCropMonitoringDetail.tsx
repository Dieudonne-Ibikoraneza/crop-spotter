import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Cloud,
  Droplets,
  Wind,
  Thermometer,
  Image as ImageIcon,
  BarChart3,
  CheckCircle2,
  Clock,
  Activity,
  FileDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { cropMonitoringService } from "@/lib/api/services/cropMonitoring";
import type { CropMonitoringRecord } from "@/lib/api/services/cropMonitoring";
import { AdminFarmDetailDialog } from "@/components/admin/AdminFarmDetailDialog";
import { DroneAnalysisView } from "@/components/assessor/DroneAnalysisView";
import {
  displayFarmName,
  displayPolicyRef,
  displayUserName,
  refIdString,
} from "@/lib/utils/adminDisplay";
import { resolveUploadsUrl } from "@/lib/utils/assetUrl";
import { authService } from "@/lib/api/services/auth";

function WeatherPreview({ weatherData }: { weatherData: unknown }) {
  if (!weatherData) return null;

  const data = Array.isArray(weatherData)
    ? weatherData
    : (weatherData as { data?: unknown[]; list?: unknown[] })?.data ||
      (weatherData as { list?: unknown[] })?.list ||
      [];

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-auto max-h-48">
        {JSON.stringify(weatherData, null, 2)}
      </pre>
    );
  }

  const entries = data.slice(0, 8);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {entries.map((entry: Record<string, unknown>, idx: number) => {
        const main = entry.main as { temp?: number; humidity?: number } | undefined;
        const temp = main?.temp
          ? typeof main.temp === "number" && main.temp > 200
            ? (main.temp - 273.15).toFixed(1)
            : String(main.temp)
          : "—";
        const humidity = main?.humidity ?? "—";
        const windSpeed = (entry.wind as { speed?: number } | undefined)?.speed ?? "—";
        const rain =
          ((entry.rain as Record<string, number> | undefined)?.["3h"] as number) ||
          ((entry.rain as Record<string, number> | undefined)?.["1h"] as number) ||
          0;
        const desc = Array.isArray(entry.weather)
          ? (entry.weather as { description?: string }[])[0]?.description
          : "—";
        const dt = entry.dt
          ? new Date(Number(entry.dt) * 1000).toLocaleString(undefined, {
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
            <p className="capitalize text-sm">{String(desc)}</p>
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
            {Number(rain) > 0 && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <Cloud className="h-3 w-3" />
                {rain} mm
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type DronePdf = NonNullable<CropMonitoringRecord["droneAnalysisPdfs"]>[number];

const AdminCropMonitoringDetail = () => {
  const { policyId } = useParams<{ policyId: string }>();

  const {
    data: cycles,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crop-monitoring-policy", policyId],
    queryFn: () => cropMonitoringService.getByPolicy(policyId!),
    enabled: !!policyId && authService.isAuthenticated(),
  });

  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  useEffect(() => {
    if (!cycles?.length) return;
    setSelectedCycleId((prev) => {
      if (prev && cycles.some((c) => c._id === prev)) return prev;
      const active = cycles.find((c) => c.status === "IN_PROGRESS");
      return active?._id ?? cycles[0]._id;
    });
  }, [cycles]);

  const data =
    cycles?.find((c) => c._id === selectedCycleId) ??
    (cycles?.length ? cycles[0] : undefined);

  const [farmDialog, setFarmDialog] = useState<{
    farmId: string;
    farmerNameHint?: string;
  } | null>(null);

  const [selectedReport, setSelectedReport] = useState<DronePdf | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const openFarm = (record: CropMonitoringRecord) => {
    const farmId = refIdString(record.farmId);
    if (!farmId) return;
    const policy = record.policyId;
    let farmerNameHint: string | undefined;
    if (policy && typeof policy === "object" && "farmerId" in policy) {
      const n = displayUserName((policy as { farmerId?: unknown }).farmerId);
      if (n !== "—") farmerNameHint = n;
    }
    setFarmDialog({ farmId, farmerNameHint });
  };

  const openExtractedDialog = (pdf: DronePdf) => {
    setSelectedReport(pdf);
    setIsReportDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error || !cycles?.length || !data) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" asChild>
          <Link to="/admin/crop-monitoring">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to list
          </Link>
        </Button>
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-destructive">
            {error
              ? "Could not load monitoring for this policy."
              : "No monitoring cycles for this policy."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const pdfs = data.droneAnalysisPdfs || [];
  const photos = data.photoUrls || [];
  const observations = data.observations || [];
  const policyLabel = displayPolicyRef(data.policyId);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" asChild>
          <Link to="/admin/crop-monitoring">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to list
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Crop monitoring
        </h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          Policy {policyLabel}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base">Monitoring cycles</CardTitle>
          <Badge variant="outline">{cycles.length} / 2 max</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {cycles.map((cycle) => (
              <button
                key={cycle._id}
                type="button"
                onClick={() => setSelectedCycleId(cycle._id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border bg-background min-w-[200px] text-left transition-colors",
                  selectedCycleId === cycle._id
                    ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                    : "hover:bg-muted/50",
                )}
              >
                {cycle.status === "COMPLETED" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    Cycle #{cycle.monitoringNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cycle.monitoringDate
                      ? format(new Date(cycle.monitoringDate), "PP")
                      : "—"}
                  </p>
                </div>
                <Badge
                  className={cn(
                    "ml-auto shrink-0",
                    cycle.status === "COMPLETED"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-amber-100 text-amber-800 border-amber-200",
                  )}
                >
                  {cycle.status === "COMPLETED" ? "Completed" : "In progress"}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cycle summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Policy</p>
              <p>{policyLabel}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Farm</p>
              {refIdString(data.farmId) ? (
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => openFarm(data)}
                >
                  {displayFarmName(data.farmId)}
                </button>
              ) : (
                "—"
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assessor</p>
              <p>{displayUserName(data.assessorId)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Monitoring date
              </p>
              <p>
                {data.monitoringDate
                  ? format(new Date(data.monitoringDate), "PPpp")
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Report</p>
              <p>
                {data.reportGenerated
                  ? data.reportGeneratedAt
                    ? format(new Date(data.reportGeneratedAt), "PPpp")
                    : "Yes"
                  : "Not generated"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Record id</p>
              <p className="font-mono text-xs break-all">{data._id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud className="h-5 w-5 text-sky-600" />
            Weather snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.weatherData ? (
            <WeatherPreview weatherData={data.weatherData} />
          ) : (
            <p className="text-sm text-muted-foreground">No weather data stored.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            NDVI / vegetation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.ndviData != null ? (
            <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-auto max-h-64">
              {JSON.stringify(data.ndviData, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">No NDVI data stored.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Observations</CardTitle>
        </CardHeader>
        <CardContent>
          {observations.length === 0 ? (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          ) : (
            <ul className="space-y-2">
              {observations.map((obs, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm p-3 rounded-md bg-muted/40 border"
                >
                  <span className="text-muted-foreground">•</span>
                  {obs}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Photos ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No photos uploaded.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((url, i) => (
                <a
                  key={i}
                  href={resolveUploadsUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border overflow-hidden bg-muted/30 hover:opacity-90 transition-opacity"
                >
                  <img
                    src={resolveUploadsUrl(url)}
                    alt={`Monitoring ${i + 1}`}
                    className="w-full h-40 object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {data.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {data.notes}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Report repository — same interaction pattern as insurer claim detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <FileDown className="h-5 w-5" />
            Report repository
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {pdfs.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4" />
                CROP MONITORING REPORTS
              </h3>
              <p className="text-xs text-muted-foreground">
                Cycle #{data.monitoringNumber} — open a report to view extracted analysis
                data.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pdfs.map((pdf, idx) => (
                  <Button
                    key={`${pdf.pdfType}-${idx}`}
                    variant="outline"
                    className="justify-start gap-3 h-auto py-3 px-4 transition-all hover:bg-primary/5 hover:border-primary/30"
                    onClick={() => openExtractedDialog(pdf)}
                  >
                    <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="text-sm font-medium truncate capitalize">
                        {pdf.pdfType.replace(/_/g, " ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Monitoring #{data.monitoringNumber} •{" "}
                        {pdf.uploadedAt
                          ? format(new Date(pdf.uploadedAt), "PP")
                          : data.monitoringDate
                            ? format(new Date(data.monitoringDate), "PP")
                            : "—"}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center bg-muted/20 rounded-lg border border-dashed">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground italic">
                No drone analysis reports for this cycle.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden gap-0">
          <DialogHeader className="p-6 pb-2 border-b bg-muted/5 shrink-0">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 capitalize">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              {selectedReport?.pdfType?.replace(/_/g, " ") || "Report"} details
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Analysis data extracted from uploaded drone report
            </p>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 scroll-smooth">
            {selectedReport && (
              <DroneAnalysisView
                data={selectedReport.droneAnalysisData}
                pdfType={selectedReport.pdfType}
              />
            )}
          </div>

          <div className="p-4 border-t bg-muted/30 flex justify-end shrink-0">
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Close report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AdminFarmDetailDialog
        open={!!farmDialog}
        onOpenChange={(o) => !o && setFarmDialog(null)}
        farmId={farmDialog?.farmId ?? null}
        farmerNameHint={farmDialog?.farmerNameHint}
      />
    </div>
  );
};

export default AdminCropMonitoringDetail;
