import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
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
import { FieldMapWithLayers } from "../FieldMapWithLayers";
import { DroneAnalysisView } from "../DroneAnalysisView";
import { useQuery } from "@tanstack/react-query";
import {
  Upload,
  Calendar,
  Satellite,
  UserCheck,
  FileText,
  Loader2,
  Image,
  Map,
  Trash2,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  assessorService,
  farmService,
  Assessment,
} from "@/lib/api/services/assessor";
import { Farm } from "@/lib/api/types";
import { formatReportTypeLabel } from "@/lib/crops";

interface DroneAnalysisTabProps {
  fieldId: string;
  farmerName: string;
  cropType: string;
  area: number;
  assessmentId?: string;
  status?: string;
  initialNotes?: string;
  /** Admin view: hide uploads, manual checks, and destructive actions */
  readOnly?: boolean;
}

type AssessmentDronePdf = NonNullable<Assessment["droneAnalysisPdfs"]>[number];

function pdfRowLabel(pdfs: Array<{ pdfType: string }>, idx: number): string {
  const pdf = pdfs[idx];
  if (!pdf) return "";
  const label = formatReportTypeLabel(pdf.pdfType);
  const sameType = pdfs.filter((p) => p.pdfType === pdf.pdfType).length;
  if (sameType > 1) {
    const nth = pdfs.slice(0, idx + 1).filter((p) => p.pdfType === pdf.pdfType)
      .length;
    return `${label} (${nth}/${sameType})`;
  }
  return label;
}

function dronePayload(pdf: AssessmentDronePdf) {
  return (pdf as { extractedData?: unknown }).extractedData ?? pdf.droneAnalysisData;
}

function firstMapImageFromPdfs(pdfs: AssessmentDronePdf[]): string | null {
  for (const pdf of pdfs) {
    const d = dronePayload(pdf) as { map_image?: { url?: string } } | null;
    if (d && typeof d === "object" && d.map_image?.url) {
      return d.map_image.url;
    }
  }
  return null;
}

export const DroneAnalysisTab = ({
  fieldId,
  farmerName: _farmerName,
  cropType: _cropType,
  area: _area,
  assessmentId,
  status = "IN_PROGRESS",
  initialNotes: _initialNotes,
  readOnly = false,
}: DroneAnalysisTabProps) => {
  const [dataSource, setDataSource] = useState<"drone" | "manual">("drone");
  const [isUploading, setIsUploading] = useState(false);
  const [manualStress, setManualStress] = useState([17.6]);
  const [manualMoisture, setManualMoisture] = useState([58]);
  const [manualWeed, setManualWeed] = useState([7.3]);
  const [manualPest, setManualPest] = useState([4.4]);
  const isCompleted = status === "SUBMITTED" || status === "APPROVED" || status === "COMPLETED";

  useEffect(() => {
    if (readOnly) setDataSource("drone");
  }, [readOnly]);

  // Fetch assessment data to get uploaded PDFs
  const { data: assessmentData, refetch: refetchAssessment } =
    useQuery<Assessment>({
      queryKey: ["assessment", assessmentId],
      queryFn: () =>
        assessmentId
          ? assessorService.getAssessment(assessmentId)
          : Promise.resolve(null as any),
      enabled: !!assessmentId,
    });

  // Get the farmId from assessment
  const farmId = assessmentData?.farmId
    ? typeof assessmentData.farmId === "string"
      ? assessmentData.farmId
      : assessmentData.farmId._id
    : null;

  // Fetch farm data to get boundary
  const { data: farmData } = useQuery<Farm>({
    queryKey: ["farm", farmId],
    queryFn: () =>
      farmId ? farmService.getFarm(farmId) : Promise.resolve(null as any),
    enabled: !!farmId,
  });

  const uploadedPdfs = useMemo(
    () => assessmentData?.droneAnalysisPdfs || [],
    [assessmentData],
  );

  const firstDroneMapUrl = useMemo(
    () => firstMapImageFromPdfs(uploadedPdfs),
    [uploadedPdfs],
  );

  const [showExtractedMap, setShowExtractedMap] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);

  // Polling function to check for analysis data (same as Starhawk)
  const startPollingForData = (assessmentId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingStartTimeRef.current = Date.now();
    const MAX_POLLING_TIME = 3 * 60 * 1000; // 3 minutes max
    const POLL_INTERVAL = 15000; // Poll every 15 seconds

    console.log("🔄 Starting to poll for drone analysis data...");

    pollingIntervalRef.current = setInterval(async () => {
      if (!pollingIntervalRef.current) return;

      const elapsed = Date.now() - (pollingStartTimeRef.current || 0);

      if (elapsed > MAX_POLLING_TIME) {
        console.log("⏱️ Polling timeout reached, stopping...");
        stopPollingForData();
        toast.error(
          "Processing timeout. Please refresh the page or contact support.",
        );
        return;
      }

      try {
        console.log(
          "🔍 Polling for drone analysis data... (elapsed:",
          Math.round(elapsed / 1000),
          "s)",
        );
        const updated = await assessorService.getAssessment(assessmentId);

        // Check if drone analysis data is available
        if (updated.droneAnalysisPdfs && updated.droneAnalysisPdfs.length > 0) {
          const withData = updated.droneAnalysisPdfs.find(
            (p: any) => p.extractedData || p.droneAnalysisData,
          );
          if (withData) {
            console.log("✅ Drone analysis data found!");
            stopPollingForData();
            toast.success(
              "Analysis complete! Drone analysis data is now available.",
            );
            void refetchAssessment();
          }
        }
      } catch (err: any) {
        console.error("❌ Error while polling for drone data:", err);
      }
    }, POLL_INTERVAL);
  };

  // Stop polling function (same as Starhawk)
  const stopPollingForData = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollingStartTimeRef.current = null;
    console.log("🛑 Stopped polling for drone analysis data");
  };

  // Cleanup polling on unmount (same as Starhawk)
  useEffect(() => {
    return () => {
      stopPollingForData();
    };
  }, []);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }

    console.log("DEBUG: handlePdfUpload called, assessmentId:", assessmentId);

    if (!assessmentId) {
      toast.error(
        "No assessment found. Please select a field with an active assessment.",
      );
      return;
    }

    setIsUploading(true);
    try {
      console.log("DEBUG: About to call uploadDronePdf with:", {
        assessmentId,
        fileName: file.name,
        fileSize: file.size,
      });
      const result = await assessorService.uploadDronePdf(
        assessmentId,
        file,
      );
      toast.success("Drone analysis PDF uploaded. Processing on the server…");
      console.log("Backend upload result:", result);

      await refetchAssessment();

      // Start polling for analysis results (same as Starhawk)
      startPollingForData(assessmentId);
    } catch (uploadError: any) {
      console.error("Backend upload error:", uploadError);
      toast.error(uploadError.message || "Failed to upload to backend");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePdf = async (pdfType: string) => {
    if (!assessmentId || !pdfType) return;

    try {
      await assessorService.deletePdf(assessmentId, pdfType);
      toast.success("Drone report removed.");
      await refetchAssessment();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete PDF");
    }
  };

  const isCurrentPdfUploaded = uploadedPdfs.length > 0;

  return (
    <div className="space-y-6">
      {/* Data Source Selector */}
      {!readOnly && (
        <Card>
          <CardHeader>
            <CardTitle>Data Source</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              value={dataSource}
              onValueChange={(v) => setDataSource(v as "drone" | "manual")}
            >
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="drone" className="gap-2">
                  <Satellite className="h-4 w-4" />
                  Drone Upload
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <UserCheck className="h-4 w-4" />
                  Manual Check
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* PATH 1: DRONE UPLOAD */}
      {dataSource === "drone" && (
        <>
          {/* PDF Report Upload */}
          {!readOnly && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Drone analysis report (PDF)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {isCurrentPdfUploaded ? (
                    <>
                      <Check className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium text-green-600">
                        {uploadedPdfs.length} drone report
                        {uploadedPdfs.length !== 1 ? "s" : ""} uploaded
                      </span>
                    </>
                  ) : (
                    <>
                      <X className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        No drone report uploaded yet
                      </span>
                    </>
                  )}
                </div>
              </div>

                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                  ) : (
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium mb-2">
                    {isUploading
                      ? "Uploading to server..."
                      : "Upload drone analysis PDF"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload Agremo (or similar) reports as PDFs. Each file appears below, like crop monitoring and loss assessment.
                  </p>

                  {isCompleted && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Assessment is finalized. No further uploads allowed.
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handlePdfUpload}
                      disabled={isCompleted}
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isCompleted}
                      className="flex items-center gap-2"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {isUploading ? "Uploading..." : "Select PDF File"}
                    </Button>
                  </div>
                </div>
            </CardContent>
          </Card>
          )}

          {/* Stacked reports — same pattern as crop monitoring & loss assessment */}
          <div className="space-y-6">
            {uploadedPdfs.map((pdf, idx) => (
              <Card key={pdf._id ?? `${pdf.pdfType}-${idx}`}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-base flex flex-wrap items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span>{pdfRowLabel(uploadedPdfs, idx)}</span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-green-50 text-green-700 border-green-200"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Uploaded
                        </Badge>
                      </CardTitle>
                      {pdf.uploadedAt && (
                        <p className="text-xs text-muted-foreground font-normal">
                          {new Date(pdf.uploadedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {!readOnly && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2 shrink-0"
                            disabled={isCompleted}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete report
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes &quot;
                              {formatReportTypeLabel(pdf.pdfType)}&quot; from
                              this assessment.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePdf(pdf.pdfType)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <DroneAnalysisView
                    data={dronePayload(pdf)}
                    pdfType={String(pdf.pdfType)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {uploadedPdfs.length === 0 && readOnly && (
            <div className="py-12 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No drone reports for this assessment</p>
            </div>
          )}

          {/* Visual Map with Layer Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Field Visualization</span>
                {firstDroneMapUrl ? (
                  <div className="flex gap-2">
                    <Button
                      variant={showExtractedMap ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowExtractedMap(true)}
                    >
                      <Image className="h-4 w-4 mr-1" />
                      Drone Image
                    </Button>
                    <Button
                      variant={!showExtractedMap ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowExtractedMap(false)}
                    >
                      <Map className="h-4 w-4 mr-1" />
                      Interactive Map
                    </Button>
                  </div>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showExtractedMap && firstDroneMapUrl ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Preview from the first report that includes an extracted map
                    image. Each report above has its own full map and legend.
                  </p>
                  <img
                    src={firstDroneMapUrl}
                    alt="Extracted map preview from drone report"
                    className="w-full rounded-lg border border-border"
                  />
                </div>
              ) : farmData?.boundary ? (
                <div className="relative h-[420px] w-full">
                  <FieldMapWithLayers
                    fieldId={fieldId}
                    boundary={farmData.boundary}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Map className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No field boundary available</p>
                  <p className="text-xs">
                    Field boundary data is required for interactive map
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* PATH 2: MANUAL CHECK */}
      {dataSource === "manual" && (
        <>
          {/* Manual Assessment Date */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Assessment Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Physical Check Date:
                </span>
                <Input
                  type="date"
                  defaultValue="2025-10-28"
                  className="max-w-[200px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Manual Input Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Input Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Stress Detected</label>
                  <span className="text-sm text-primary font-semibold">
                    {manualStress[0]}%
                  </span>
                </div>
                <Slider
                  value={manualStress}
                  onValueChange={setManualStress}
                  max={100}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Soil Moisture</label>
                  <span className="text-sm text-primary font-semibold">
                    {manualMoisture[0]}%
                  </span>
                </div>
                <Slider
                  value={manualMoisture}
                  onValueChange={setManualMoisture}
                  max={100}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">
                    Weed Area (Estimated)
                  </label>
                  <span className="text-sm text-primary font-semibold">
                    {manualWeed[0]}%
                  </span>
                </div>
                <Slider
                  value={manualWeed}
                  onValueChange={setManualWeed}
                  max={100}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">
                    Pest Area (Estimated)
                  </label>
                  <span className="text-sm text-primary font-semibold">
                    {manualPest[0]}%
                  </span>
                </div>
                <Slider
                  value={manualPest}
                  onValueChange={setManualPest}
                  max={100}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Reference Map (No Layer Controls) */}
          <Card>
            <CardHeader>
              <CardTitle>Field Reference Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-[360px] w-full">
                <FieldMapWithLayers
                  fieldId={fieldId}
                  showLayerControls={false}
                  boundary={farmData?.boundary || null}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
