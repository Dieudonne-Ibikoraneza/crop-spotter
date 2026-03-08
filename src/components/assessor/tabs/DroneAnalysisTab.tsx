import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  assessorService,
  farmService,
  PdfType,
  Assessment,
} from "@/lib/api/services/assessor";
import { Farm } from "@/lib/api/types";

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
}: DroneAnalysisTabProps) => {
  const [dataSource, setDataSource] = useState<"drone" | "manual">("drone");
  const [selectedPdfType, setSelectedPdfType] =
    useState<PdfType>("plant_health");
  const [isUploading, setIsUploading] = useState(false);
  const [manualStress, setManualStress] = useState([17.6]);
  const [manualMoisture, setManualMoisture] = useState([58]);
  const [manualWeed, setManualWeed] = useState([7.3]);
  const [manualPest, setManualPest] = useState([4.4]);

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

  // Process assessment data when it changes
  useEffect(() => {
    if (assessmentData?.droneAnalysisPdfs) {
      console.log(
        "Processing uploaded PDFs:",
        assessmentData.droneAnalysisPdfs,
      );

      const newUploadedPdfs = { plant_health: false, flowering: false };

      assessmentData.droneAnalysisPdfs.forEach((pdf) => {
        const pdfType = pdf.pdfType as PdfType;
        newUploadedPdfs[pdfType] = true;

        // Get the analysis data from either extractedData or droneAnalysisData
        const analysisData =
          (pdf as any).extractedData || pdf.droneAnalysisData;

        if (analysisData) {
          console.log("Processing PDF type:", pdfType, "data:", analysisData);

          // Backend response has different structure - parse accordingly
          // Field info from analysisData.field or analysisData.report
          const fieldData = analysisData.field || {};
          const reportData = analysisData.report || {};

          // Get stress/weed levels from weed_analysis or stress_analysis
          const weedData =
            analysisData.weed_analysis || analysisData.stress_analysis || {};
          const levelsData = weedData.levels || weedData.stress_levels || [];

          // Transform levels to match frontend format
          const stressLevels = levelsData.map((level: any) => ({
            name: level.level || level.name || "Unknown",
            percentage: parseFloat(level.percentage) || 0,
            hectares: parseFloat(level.area_hectares || level.hectares) || 0,
          }));

          // Get survey date from different possible locations
          const surveyDate =
            reportData.survey_date || analysisData.survey_date || "";

          // Get analysis name
          const analysisName =
            reportData.analysis_name ||
            (pdfType === "plant_health" ? "PLANT STRESS" : "FLOWERING");

          // Get total affected
          const totalAffected = {
            hectares: parseFloat(weedData.total_area_hectares) || 0,
            percentage: parseFloat(weedData.total_area_percent) || 0,
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
              growing_stage: fieldData.growing_stage || "Not specified",
              survey_date: surveyDate,
              analysis_name: analysisName,
            },
            stress_levels: stressLevels,
            total_affected: totalAffected,
          };

          console.log("Parsed data:", parsedData);

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

  // Current displayed data - prefer local parsed data if parsing, otherwise use backend data
  const displayData = isParsing ? parsedData : currentData;

  // Calculate values from parsed data
  const totalArea = displayData?.report_info.field_area_ha ?? area;
  const fineLevel = displayData?.stress_levels.find(
    (s) => s.name.toLowerCase() === "fine",
  );
  const healthyHa = fineLevel?.hectares ?? 2.8;
  const totalAffectedHa = displayData?.total_affected.hectares ?? 0;
  const totalAffectedPercent = displayData?.total_affected.percentage ?? 0;

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
              {/* Show upload status badge */}
              <div className="flex items-center gap-2 mb-4">
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

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Flight Date:
                </span>
                <Input
                  type="date"
                  defaultValue={
                    displayData?.report_info.survey_date
                      ?.split("-")
                      .reverse()
                      .join("-") || "2025-10-22"
                  }
                  className="max-w-[200px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Parsed/Drone Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>
                {displayData
                  ? displayData.report_info.analysis_name
                  : "Drone Metrics"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Info */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Crop</p>
                  <p className="text-xl font-bold">
                    {displayData?.report_info.crop || cropType}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">
                    Field Area
                  </p>
                  <p className="text-xl font-bold">{totalArea} Hectare</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">
                    Growing Stage
                  </p>
                  <p className="text-xl font-bold">
                    {displayData?.report_info.growing_stage || "N/A"}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">
                    Analysis Name
                  </p>
                  <p className="text-xl font-bold">
                    {displayData?.report_info.analysis_name || "N/A"}
                  </p>
                </div>
              </div>

              {/* Stress Level Table */}
              {displayData && displayData.stress_levels.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Stress Level Table
                  </h4>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 text-sm font-medium">
                            Stress Level
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
                        {displayData.stress_levels.map((level, idx) => (
                          <tr key={idx} className="border-t border-border">
                            <td className="p-3 flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded ${
                                  idx === 0
                                    ? "bg-green-500"
                                    : idx === 1
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total Affected Area */}
              {displayData && displayData.total_affected.hectares > 0 && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Area{" "}
                    {displayData.report_info.analysis_name.toUpperCase()}:
                  </p>
                  <p className="text-2xl font-bold text-destructive">
                    {displayData.total_affected.hectares.toFixed(2)} ha ={" "}
                    {displayData.total_affected.percentage.toFixed(0)}% field
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parsed JSON Output */}
          {displayData && (
            <Card>
              <CardHeader>
                <CardTitle>Extracted JSON Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-64">
                  {JSON.stringify(displayData, null, 2)}
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
              ) : (
                <FieldMapWithLayers
                  fieldId={fieldId}
                  boundary={farmData!.boundary}
                />
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

      {/* Assessor Notes (Common to both paths) */}
      <Card>
        <CardHeader>
          <CardTitle>Assessor Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Add your analysis notes here..."
            className="min-h-[100px]"
            defaultValue="Weed clusters in north. Pest minimal."
          />
          <div className="flex gap-2">
            <Button>Save Analysis</Button>
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
        </CardContent>
      </Card>
    </div>
  );
};
