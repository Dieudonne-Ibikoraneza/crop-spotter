import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Check,
  X,
  Save,Trash2
} from "lucide-react";
import { toast } from "sonner";
import {
  assessorService,
  farmService,
  PdfType,
  Assessment,
} from "@/lib/api/services/assessor";
import { Farm } from "@/lib/api/types";
import { useComprehensiveNotes } from "@/hooks/useComprehensiveNotes";

// Import pdfjs for PDF parsing
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";

// Define PDF extraction result interface
interface PdfExtractionResult {
  text: string;
  pageImages: string[];
}

interface DroneAnalysisTabProps {
  fieldId: string;
  farmerName: string;
  cropType: string;
  area: number;
  assessmentId?: string;
  initialNotes?: string;
}

interface StressLevel {
  name: string;
  percentage: number;
  hectares: number;
}

interface ParsedReportData {
  report_info: {
    crop: string;
    field_area_ha: number;
    growing_stage: string;
    survey_date: string;
    analysis_name: string;
  };
  stress_levels: StressLevel[];
  total_affected: {
    hectares: number;
    percentage: number;
  };
}

export const DroneAnalysisTab = ({
  fieldId,
  farmerName,
  cropType,
  area,
  assessmentId,
  initialNotes,
}: DroneAnalysisTabProps) => {
  const [dataSource, setDataSource] = useState<"drone" | "manual">("drone");
  const [selectedPdfType, setSelectedPdfType] =
    useState<PdfType>("plant_health");
  const [isUploading, setIsUploading] = useState(false);
  const [manualStress, setManualStress] = useState([17.6]);
  const [manualMoisture, setManualMoisture] = useState([58]);
  const [manualWeed, setManualWeed] = useState([7.3]);
  const [manualPest, setManualPest] = useState([4.4]);

  // Shared notes functionality
  const {
    comprehensiveNotes,
    setComprehensiveNotes,
    saveNotes,
    generateReport,
    isSaving,
    lastSaved,
    hasChanges,
    canGenerateReport,
  } = useComprehensiveNotes({
    assessmentId,
    initialNotes,
  });

  // State to store data for each PDF type separately
  const [plantHealthData, setPlantHealthData] =
    useState<ParsedReportData | null>(null);
  const [floweringData, setFloweringData] = useState<ParsedReportData | null>(
    null,
  );

  // Track images separately for each PDF type
  const [plantHealthImages, setPlantHealthImages] = useState<string[]>([]);
  const [floweringImages, setFloweringImages] = useState<string[]>([]);

  // Track which PDFs have been uploaded
  const [uploadedPdfs, setUploadedPdfs] = useState<{
    plant_health: boolean;
    flowering: boolean;
  }>({
    plant_health: false,
    flowering: false,
  });

  // Current displayed data based on selected PDF type
  const currentData =
    selectedPdfType === "plant_health" ? plantHealthData : floweringData;
  const currentImages =
    selectedPdfType === "plant_health" ? plantHealthImages : floweringImages;

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

  // Store the raw backend data for display
  const [plantHealthRawData, setPlantHealthRawData] = useState<any>(null);
  const [floweringRawData, setFloweringRawData] = useState<any>(null);
  const currentRawData =
    selectedPdfType === "plant_health" ? plantHealthRawData : floweringRawData;

  // Process assessment data when it changes
  useEffect(() => {
    if (assessmentData?.droneAnalysisPdfs) {
      const newUploadedPdfs = { plant_health: false, flowering: false };

      assessmentData.droneAnalysisPdfs.forEach((pdf) => {
        const pdfType = pdf.pdfType as PdfType;
        newUploadedPdfs[pdfType] = true;

        // Get the analysis data from either extractedData or droneAnalysisData
        const analysisData =
          (pdf as any).extractedData || pdf.droneAnalysisData;

        // Store raw data for JSON view
        if (pdfType === "plant_health") {
          setPlantHealthRawData(analysisData || null);
        } else {
          setFloweringRawData(analysisData || null);
        }

        if (analysisData) {
          // Use correct backend structure:
          // analysisData.field  -> { crop, growing_stage, area_hectares, area_acres }
          // analysisData.report -> { survey_date, analysis_name, detected_report_type }
          // analysisData.analysis -> { total_area_hectares, total_area_percent, levels[] }
          const fieldData = analysisData.field || {};
          const reportData = analysisData.report || {};
          const analysisSection = analysisData.analysis || {};

          // Get levels from analysisData.analysis.levels (correct path)
          const levelsData = analysisSection.levels || [];

          // Transform levels to match frontend format
          const stressLevels = levelsData.map((level: any) => ({
            name: level.level || level.name || "Unknown",
            percentage: parseFloat(level.percentage) || 0,
            hectares: parseFloat(level.area_hectares || level.hectares) || 0,
          }));

          // Get survey date
          const surveyDate = reportData.survey_date || "";

          // Get analysis name
          const analysisName =
            reportData.analysis_name ||
            (pdfType === "plant_health" ? "Plant Stress" : "Flowering");

          // Get total affected from analysisData.analysis
          const totalAffected = {
            hectares: parseFloat(analysisSection.total_area_hectares) || 0,
            percentage: parseFloat(analysisSection.total_area_percent) || 0,
          };

          // Get map image URL
          const mapImageUrl = analysisData.map_image?.url || null;
          if (mapImageUrl) {
            if (pdfType === "plant_health") {
              setPlantHealthImages([mapImageUrl]);
            } else {
              setFloweringImages([mapImageUrl]);
            }
          }

          const parsedData: ParsedReportData = {
            report_info: {
              crop: fieldData.crop || cropType,
              field_area_ha: parseFloat(fieldData.area_hectares) || area,
              growing_stage: fieldData.growing_stage || "",
              survey_date: surveyDate,
              analysis_name: analysisName,
            },
            stress_levels: stressLevels,
            total_affected: totalAffected,
          };

          if (pdfType === "plant_health") {
            setPlantHealthData(parsedData);
          } else {
            setFloweringData(parsedData);
          }
        }
      });

      setUploadedPdfs(newUploadedPdfs);
    }
  }, [assessmentData, cropType, area]);

  // PDF parsing states
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedReportData | null>(null);
  const [rawPdfText, setRawPdfText] = useState<string>("");
  const [showExtractedMap, setShowExtractedMap] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Polling state for backend analysis (same as Starhawk)
  const [pollingForData, setPollingForData] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);

  // Polling function to check for analysis data (same as Starhawk)
  const startPollingForData = (assessmentId: string) => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setPollingForData(true);
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
          const pdf = updated.droneAnalysisPdfs.find(
            (p: any) => p.pdfType === selectedPdfType,
          );
          if (pdf && (pdf.extractedData || pdf.droneAnalysisData)) {
            console.log("✅ Drone analysis data found!");
            stopPollingForData();
            toast.success(
              "Analysis complete! Drone analysis data is now available.",
            );

            // Update the parsedData with backend results
            const backendData = pdf.extractedData || pdf.droneAnalysisData;
            if (backendData) {
              setParsedData({
                report_info: {
                  crop: backendData.report?.crop || cropType,
                  field_area_ha: backendData.report?.field_area_ha || area,
                  growing_stage:
                    backendData.report?.growing_stage || "Not specified",
                  survey_date: backendData.report?.survey_date || "",
                  analysis_name:
                    backendData.report?.analysis_name || "Analysis",
                },
                stress_levels: backendData.stress_levels || [],
                total_affected: backendData.total_affected || {
                  hectares: 0,
                  percentage: 0,
                },
              });
            }
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
    setPollingForData(false);
    pollingStartTimeRef.current = null;
    console.log("🛑 Stopped polling for drone analysis data");
  };

  // Cleanup polling on unmount (same as Starhawk)
  useEffect(() => {
    return () => {
      stopPollingForData();
    };
  }, []);

  // Extract text and images from PDF using pdfjs-dist
  const extractFromPdf = async (file: File): Promise<PdfExtractionResult> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    const pageImages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);

      // Extract text
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";

      // Render page to canvas for image extraction
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      // For page 2 (map page), crop out header and footer branding
      if (i === 2) {
        const cropTop = Math.floor(viewport.height * 0.08); // Remove top 8%
        const cropBottom = Math.floor(viewport.height * 0.08); // Remove bottom 8%
        const croppedHeight = viewport.height - cropTop - cropBottom;

        const croppedCanvas = document.createElement("canvas");
        const croppedContext = croppedCanvas.getContext("2d")!;
        croppedCanvas.width = viewport.width;
        croppedCanvas.height = croppedHeight;

        croppedContext.drawImage(
          canvas,
          0,
          cropTop,
          viewport.width,
          croppedHeight,
          0,
          0,
          viewport.width,
          croppedHeight,
        );

        pageImages.push(croppedCanvas.toDataURL("image/png"));
      } else {
        pageImages.push(canvas.toDataURL("image/png"));
      }
    }

    return { text: fullText, pageImages };
  };

  // Parse extracted text to structured JSON
  const parseReportText = (text: string): ParsedReportData => {
    // Remove branding/metadata
    const cleanText = text
      .replace(/Powered by[:\s]*agremo/gi, "")
      .replace(/app\.agremo\.com/gi, "")
      .replace(/Walk through your map on/gi, "")
      .replace(/Agremo/gi, "");

    console.log("Cleaned PDF text:", cleanText);

    // Extract crop type
    const cropMatch = cleanText.match(
      /Crop[:\s]+([a-zA-Z\s]+?)(?:\s*Field area|\s*Growing|\s*Analysis|\s*\d|\n)/i,
    );
    const crop = cropMatch ? cropMatch[1].trim() : "Unknown";

    // Extract field area
    const areaMatch = cleanText.match(
      /Field area[:\s]*(\d+\.?\d*)\s*(?:Hectare|ha)?/i,
    );
    const fieldAreaHa = areaMatch ? parseFloat(areaMatch[1]) : 0;

    // Extract survey date
    const dateMatch = cleanText.match(
      /Survey date[:\s]*(\d{2}[-/]\d{2}[-/]\d{4})/i,
    );
    const surveyDate = dateMatch ? dateMatch[1].replace(/\//g, "-") : "";

    // Extract growing stage (BBCH)
    const stageMatch = cleanText.match(/(?:Growing stage[:\s]*)?BBCH\s*(\d+)/i);
    const growingStage = stageMatch ? `BBCH ${stageMatch[1]}` : "Not specified";

    // Extract analysis name (e.g., "Plant Stress", "Weed Detection", etc.)
    const analysisMatch = cleanText.match(
      /Analysis name[:\s]*([a-zA-Z\s]+?)(?:\s*STRESS|\s*LEVEL|\s*TABLE|\n)/i,
    );
    const analysisName = analysisMatch ? analysisMatch[1].trim() : "Analysis";

    // Extract stress level table - dynamic parsing
    // Look for patterns like "Fine 30.87% 9.84" or "Plant Stress 69.13% 22.04"
    const stressLevels: StressLevel[] = [];

    // Match all stress level rows: "Name Percentage% Hectares"
    const stressTableRegex =
      /(?:^|\s)(Fine|Potential\s*(?:Plant)?\s*Stress|Plant\s+Stress|Weed\s*(?:Area)?|Pest\s*(?:Area)?|Healthy|Moderate|Stressed|Low|Medium|High)\s+(\d+\.?\d*)\s*%?\s+(\d+\.?\d*)/gi;
    let match;
    while ((match = stressTableRegex.exec(cleanText)) !== null) {
      const name = match[1].trim().replace(/\s+/g, " ");
      stressLevels.push({
        name,
        percentage: parseFloat(match[2]),
        hectares: parseFloat(match[3]),
      });
    }

    // Extract total affected area
    const totalMatch = cleanText.match(
      /Total\s*(?:area)?\s*(?:PLANT\s*STRESS|WEED|PEST|AFFECTED)[:\s]*(\d+\.?\d*)\s*ha\s*=?\s*(\d+\.?\d*)?\s*%?\s*field/i,
    );
    const totalAffected = {
      hectares: totalMatch ? parseFloat(totalMatch[1]) : 0,
      percentage: totalMatch && totalMatch[2] ? parseFloat(totalMatch[2]) : 0,
    };

    // If no total found, calculate from non-Fine stress levels
    if (totalAffected.hectares === 0 && stressLevels.length > 0) {
      const nonFine = stressLevels.filter(
        (s) => s.name.toLowerCase() !== "fine",
      );
      totalAffected.hectares = nonFine.reduce((sum, s) => sum + s.hectares, 0);
      totalAffected.percentage = nonFine.reduce(
        (sum, s) => sum + s.percentage,
        0,
      );
    }

    console.log("Parsed values:", {
      crop,
      fieldAreaHa,
      surveyDate,
      growingStage,
      analysisName,
      stressLevels,
      totalAffected,
    });

    return {
      report_info: {
        crop,
        field_area_ha: fieldAreaHa,
        growing_stage: growingStage,
        survey_date: surveyDate,
        analysis_name: analysisName,
      },
      stress_levels: stressLevels,
      total_affected: totalAffected,
    };
  };

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
        pdfType: selectedPdfType,
        fileName: file.name,
        fileSize: file.size,
      });
      const result = await assessorService.uploadDronePdf(
        assessmentId,
        selectedPdfType,
        file,
      );
      toast.success(
        `${selectedPdfType === "plant_health" ? "Plant Health" : "Flowering"} PDF uploaded successfully to backend. Analysis in progress...`,
      );
      console.log("Backend upload result:", result);

      // Refresh assessment data to get the updated PDFs
      refetchAssessment();

      // Start polling for analysis results (same as Starhawk)
      startPollingForData(assessmentId);
    } catch (uploadError: any) {
      console.error("Backend upload error:", uploadError);
      toast.error(uploadError.message || "Failed to upload to backend");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePdf = async () => {
    if (!assessmentId) return;
    
    // Clear local parsed data before confirming deletion
    if (selectedPdfType === "plant_health") {
      setPlantHealthData(null);
      setPlantHealthImages([]);
    } else {
      setFloweringData(null);
      setFloweringImages([]);
    }

    try {
      await assessorService.deletePdf(assessmentId, selectedPdfType);
      toast.success(
        `${selectedPdfType === "plant_health" ? "Plant Stress" : "Flowering"} PDF deleted successfully.`,
      );
      refetchAssessment();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete PDF");
    }
  };

  // Current displayed data - prefer local parsed data if parsing, otherwise use backend data
  const displayData = isParsing ? parsedData : currentData;

  // Calculate values from parsed data – no mock fallbacks
  const totalArea = displayData?.report_info.field_area_ha || 0;
  const fineLevel = displayData?.stress_levels.find(
    (s) =>
      s.name.toLowerCase() === "fine" ||
      s.name.toLowerCase().includes("healthy"),
  );
  const healthyHa = fineLevel?.hectares || 0;
  const totalAffectedHa = displayData?.total_affected.hectares || 0;
  const totalAffectedPercent = displayData?.total_affected.percentage || 0;

  // Check if current PDF type is already uploaded
  const isCurrentPdfUploaded = uploadedPdfs[selectedPdfType];

  return (
    <div className="space-y-6">
      {/* Data Source Selector */}
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

      {/* PATH 1: DRONE UPLOAD */}
      {dataSource === "drone" && (
        <>
          {/* PDF Type Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Select Report Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  variant={
                    selectedPdfType === "plant_health" ? "default" : "outline"
                  }
                  onClick={() => setSelectedPdfType("plant_health")}
                  className="flex-1"
                >
                  🌱 Plant Stress Report
                </Button>
                <Button
                  variant={
                    selectedPdfType === "flowering" ? "default" : "outline"
                  }
                  onClick={() => setSelectedPdfType("flowering")}
                  className="flex-1"
                >
                  🌸 Flowering Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* PDF Report Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload{" "}
                {selectedPdfType === "plant_health"
                  ? "Plant Stress"
                  : "Flowering"}{" "}
                Report (PDF)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {isCurrentPdfUploaded ? (
                    <>
                      <Check className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium text-green-600">
                        {selectedPdfType === "plant_health"
                          ? "Plant Stress"
                          : "Flowering"}{" "}
                        Report Uploaded
                      </span>
                    </>
                  ) : (
                    <>
                      <X className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        No{" "}
                        {selectedPdfType === "plant_health"
                          ? "Plant Stress"
                          : "Flowering"}{" "}
                        Report uploaded
                      </span>
                    </>
                  )}
                </div>
                {isCurrentPdfUploaded && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Report
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the {selectedPdfType === "plant_health" ? "Plant Stress" : "Flowering"} PDF report from the server.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePdf}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {/* Hide upload section if already uploaded */}
              {!isCurrentPdfUploaded && (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isParsing || isUploading ? (
                    <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                  ) : (
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium mb-2">
                    {isParsing
                      ? "Parsing PDF..."
                      : isUploading
                        ? "Uploading to server..."
                        : `Upload ${selectedPdfType === "plant_health" ? "Plant Stress" : "Flowering"} PDF Report`}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {selectedPdfType === "plant_health"
                      ? "Supports plant stress analysis reports (Agremo format)"
                      : "Supports flowering analysis reports (Agremo format)"}
                  </p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handlePdfUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isParsing || isUploading}
                  >
                    Select PDF File
                  </Button>
                </div>
              )}

              {/* Show parsed data info if available */}
              {displayData && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-success mb-2">
                    ✓ Report Parsed Successfully
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Survey Date: {displayData.report_info.survey_date} | Crop:{" "}
                    {displayData.report_info.crop} | Area:{" "}
                    {displayData.report_info.field_area_ha} ha
                  </p>
                </div>
              )}

              {/* Show flight date only if we have data */}
              {displayData?.report_info.survey_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Flight Date:
                  </span>
                  <Input
                    type="date"
                    defaultValue={
                      displayData.report_info.survey_date
                        ?.split("-")
                        .reverse()
                        .join("-") || ""
                    }
                    className="max-w-[200px]"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parsed/Drone Metrics */}
          {displayData ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {displayData.report_info.analysis_name || "Drone Metrics"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Report Info - only show non-empty fields */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {displayData.report_info.crop && (
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm text-muted-foreground mb-1">Crop</p>
                      <p className="text-xl font-bold">
                        {displayData.report_info.crop}
                      </p>
                    </div>
                  )}
                  {totalArea > 0 && (
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm text-muted-foreground mb-1">
                        Field Area
                      </p>
                      <p className="text-xl font-bold">{totalArea} Hectare</p>
                    </div>
                  )}
                  {displayData.report_info.growing_stage && (
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm text-muted-foreground mb-1">
                        Growing Stage
                      </p>
                      <p className="text-xl font-bold">
                        {displayData.report_info.growing_stage}
                      </p>
                    </div>
                  )}
                  {displayData.report_info.analysis_name && (
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm text-muted-foreground mb-1">
                        Analysis Name
                      </p>
                      <p className="text-xl font-bold">
                        {displayData.report_info.analysis_name}
                      </p>
                    </div>
                  )}
                </div>

                {/* Additional Info from raw backend data */}
                {currentRawData?.additional_info && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs uppercase font-semibold text-primary/70 mb-1">
                      Additional Information
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {currentRawData.additional_info}
                    </p>
                  </div>
                )}

                {/* Stress Level Table */}
                {displayData.stress_levels.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      Analysis Levels
                    </h4>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left p-3 text-sm font-medium">
                              Level
                            </th>
                            <th className="text-right p-3 text-sm font-medium">
                              %
                            </th>
                            <th className="text-right p-3 text-sm font-medium">
                              Hectare
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayData.stress_levels.map((level, idx) => {
                            // Fixed position-based colors: 1st=green, 2nd=yellow, 3rd=red
                            const dotColor =
                              idx === 0
                                ? "bg-green-500"
                                : idx === 1
                                  ? "bg-yellow-500"
                                  : "bg-red-500";

                            return (
                              <tr
                                key={idx}
                                className="border-t border-border hover:bg-muted/30 transition-colors"
                              >
                                <td className="p-3 flex items-center gap-2">
                                  <div
                                    className={`w-3 h-3 rounded ${dotColor}`}
                                  />
                                  {level.name}
                                </td>
                                <td className="p-3 text-right font-medium">
                                  {level.percentage.toFixed(2)}%
                                </td>
                                <td className="p-3 text-right font-medium">
                                  {level.hectares.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-lg border border-amber-200 bg-amber-50/50 text-center">
                    <p className="text-sm font-medium text-amber-800">
                      No analysis levels were extracted from this report.
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      The PDF may not contain level data or the extraction may
                      have failed.
                    </p>
                  </div>
                )}

                {/* Total Affected Area */}
                {totalAffectedHa > 0 && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Area{" "}
                      {displayData.report_info.analysis_name.toUpperCase()}:
                    </p>
                    <p className="text-2xl font-bold text-destructive">
                      {totalAffectedHa.toFixed(2)} ha ={" "}
                      {totalAffectedPercent.toFixed(0)}% field
                    </p>
                  </div>
                )}

                {/* Report Metadata (provider, type, detected type) */}
                {currentRawData?.report && (() => {
                  const r = currentRawData.report;
                  const items = [
                    r.provider && { label: "Provider", value: r.provider },
                    r.type && { label: "Report Type", value: r.type },
                    r.detected_report_type && { label: "Detected Type", value: r.detected_report_type.replace(/_/g, " ") },
                  ].filter(Boolean);
                  if (items.length === 0) return null;
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {items.map((item: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">{item.label}</p>
                          <p className="text-sm font-medium text-foreground capitalize">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Area in Acres (if available) */}
                {currentRawData?.field?.area_acres && currentRawData.field.area_acres > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50 border inline-block">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Field Area (Acres)</p>
                    <p className="text-lg font-bold text-foreground">{currentRawData.field.area_acres} Acres</p>
                  </div>
                )}

                {/* Stand Count Analysis (when non-null) */}
                {currentRawData?.stand_count_analysis && (() => {
                  const sc = currentRawData.stand_count_analysis;
                  const items = [
                    sc.plants_counted != null && { label: "Plants Counted", value: sc.plants_counted.toLocaleString() },
                    sc.average_plant_density != null && { label: "Avg Plant Density", value: `${sc.average_plant_density} ${sc.plant_density_unit || ""}`.trim() },
                    sc.planned_plants != null && { label: "Planned Plants", value: sc.planned_plants.toLocaleString() },
                    sc.difference_percent != null && { label: "Difference", value: `${sc.difference_percent}% ${sc.difference_type || ""}`.trim() },
                    sc.difference_plants != null && { label: "Difference (Plants)", value: sc.difference_plants.toLocaleString() },
                  ].filter(Boolean);
                  if (items.length === 0) return null;
                  return (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">🌾 Stand Count Analysis</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {items.map((item: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">{item.label}</p>
                            <p className="text-sm font-bold text-foreground">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* RX Spraying Analysis (when non-null) */}
                {currentRawData?.rx_spraying_analysis && (() => {
                  const rx = currentRawData.rx_spraying_analysis;
                  const hasRates = rx.rates && rx.rates.length > 0;
                  const items = [
                    rx.planned_date && { label: "Planned Date", value: rx.planned_date },
                    rx.pesticide_type && { label: "Pesticide Type", value: rx.pesticide_type },
                    rx.total_pesticide_amount != null && { label: "Total Amount", value: String(rx.total_pesticide_amount) },
                    rx.average_pesticide_amount != null && { label: "Avg Amount", value: String(rx.average_pesticide_amount) },
                  ].filter(Boolean);
                  if (items.length === 0 && !hasRates) return null;
                  return (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">🧪 RX Spraying Analysis</h4>
                      {items.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          {items.map((item: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">{item.label}</p>
                              <p className="text-sm font-bold text-foreground">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {hasRates && (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="text-left p-3 font-medium">Zone</th>
                                <th className="text-right p-3 font-medium">Rate</th>
                                <th className="text-right p-3 font-medium">Area</th>
                                {rx.rates[0]?.percentage != null && (
                                  <th className="text-right p-3 font-medium">%</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {rx.rates.map((rate: any, i: number) => {
                                const zoneColors = [
                                  "bg-green-500",
                                  "bg-lime-400",
                                  "bg-yellow-400",
                                  "bg-orange-400",
                                  "bg-red-400",
                                  "bg-red-600",
                                ];
                                const dotColor = zoneColors[i] || "bg-gray-400";
                                return (
                                  <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded ${dotColor}`} />
                                        {rate.zone || rate.name || `Zone ${i + 1}`}
                                      </div>
                                    </td>
                                    <td className="p-3 text-right font-medium">
                                      {rate.rate != null ? rate.rate : (rate.amount != null ? rate.amount : "\u2014")}
                                      {rate.rate_unit ? ` ${rate.rate_unit.replace(/_/g, "/")}` : ""}
                                    </td>
                                    <td className="p-3 text-right font-medium">
                                      {rate.area != null ? rate.area : (rate.area_hectares != null ? rate.area_hectares : "\u2014")}
                                      {rate.area_unit ? ` ${rate.area_unit}` : ""}
                                    </td>
                                    {rx.rates[0]?.percentage != null && (
                                      <td className="p-3 text-right font-medium">
                                        {rate.percentage != null ? `${rate.percentage}%` : "\u2014"}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Zonation Analysis (when non-null) */}
                {currentRawData?.zonation_analysis && (() => {
                  const za = currentRawData.zonation_analysis;
                  const hasZones = za.zones && za.zones.length > 0;
                  const items = [
                    za.tile_size != null && { label: "Tile Size", value: String(za.tile_size) },
                    za.num_zones != null && { label: "Number of Zones", value: String(za.num_zones) },
                  ].filter(Boolean);
                  if (items.length === 0 && !hasZones) return null;
                  return (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">📊 Zonation Analysis</h4>
                      {items.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {items.map((item: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">{item.label}</p>
                              <p className="text-sm font-bold text-foreground">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {hasZones && (
                        <div className="border border-border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="text-left p-3 font-medium">Zone</th>
                                <th className="text-right p-3 font-medium">Area (ha)</th>
                                <th className="text-right p-3 font-medium">%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {za.zones.map((zone: any, i: number) => (
                                <tr key={i} className="border-t border-border">
                                  <td className="p-3">{zone.name || zone.zone || `Zone ${i + 1}`}</td>
                                  <td className="p-3 text-right font-medium">{zone.area_hectares || zone.hectares || "—"}</td>
                                  <td className="p-3 text-right font-medium">{zone.percentage || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Extraction Metadata */}
                {currentRawData?.metadata && (() => {
                  const m = currentRawData.metadata;
                  const items = [
                    m.extracted_at && { label: "Extracted At", value: new Date(m.extracted_at).toLocaleString() },
                    m.total_pages != null && { label: "Total Pages", value: String(m.total_pages) },
                    m.extractor_version && { label: "Extractor Version", value: m.extractor_version },
                  ].filter(Boolean);
                  if (items.length === 0) return null;
                  return (
                    <div className="pt-4 border-t">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase">Extraction Metadata</h4>
                      <div className="flex flex-wrap gap-4">
                        {items.map((item: any, i: number) => (
                          <div key={i} className="text-xs">
                            <span className="text-muted-foreground">{item.label}: </span>
                            <span className="font-medium text-foreground">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ) : isCurrentPdfUploaded ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm font-medium">
                  Processing analysis data...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please wait while the system extracts metrics from your PDF.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Backend Raw Data Output */}
          {currentRawData && (
            <Card>
              <CardHeader>
                <CardTitle>Extracted Analysis Data (Backend)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-64 text-foreground">
                  {JSON.stringify(currentRawData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Visual Map with Layer Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Field Visualization</span>
                {/* Only show tabs if current PDF type has uploaded image */}
                {uploadedPdfs[selectedPdfType] ? (
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
              {showExtractedMap && uploadedPdfs[selectedPdfType] ? (
                <div className="space-y-4">
                  {currentImages.length > 0 ? (
                    <>
                      <img
                        src={currentImages[0]}
                        alt="Extracted Stress Map from Drone Report"
                        className="w-full rounded-lg border border-border"
                      />
                      {/* Legend for stress levels */}
                      {displayData && displayData.stress_levels.length > 0 && (
                        <div className="flex flex-wrap gap-6 justify-center text-sm">
                          {displayData.stress_levels.map((level, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded ${
                                  idx === 0
                                    ? "bg-green-500"
                                    : idx === 1
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                              />
                              <span className="text-muted-foreground">
                                {level.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No drone image available</p>
                      <p className="text-xs">
                        Upload a drone report to see the extracted map
                      </p>
                    </div>
                  )}
                </div>
              ) : farmData?.boundary ? (
                <FieldMapWithLayers
                  fieldId={fieldId}
                  boundary={farmData.boundary}
                />
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
              <FieldMapWithLayers
                fieldId={fieldId}
                showLayerControls={false}
                boundary={farmData?.boundary || null}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Comprehensive Assessment Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Comprehensive Assessment Notes
            {lastSaved && (
              <span className="text-sm font-normal text-muted-foreground">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={comprehensiveNotes}
            onChange={(e) => setComprehensiveNotes(e.target.value)}
            placeholder="Write comprehensive feedback about the field assessment including drone analysis..."
            className="min-h-[150px]"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={saveNotes}
                disabled={isSaving || !hasChanges}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? "Saving..." : "Save Notes"}
              </Button>
              <Button
                variant="outline"
                onClick={generateReport}
                disabled={!canGenerateReport || isSaving}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Generate Report
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (displayData) {
                    const blob = new Blob(
                      [JSON.stringify(displayData, null, 2)],
                      {
                        type: "application/json",
                      },
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `field-${fieldId}-analysis.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("JSON downloaded");
                  } else {
                    toast.info("No parsed data to download");
                  }
                }}
              >
                Download Summary JSON
              </Button>
            </div>
            {hasChanges && (
              <span className="text-sm text-muted-foreground">
                Unsaved changes
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
