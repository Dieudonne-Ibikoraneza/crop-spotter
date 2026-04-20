import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useComprehensiveNotes } from "@/hooks/useComprehensiveNotes";
import {
  calculateOverallRisk,
  type RiskAssessment,
  type WeatherData,
} from "@/utils/riskCalculation";
import {
  agroTempToCelsius,
  extractAgroForecastRows,
} from "@/lib/weatherUnits";
import { ComprehensiveReportGenerator } from "@/utils/reportGenerator";
import { apiClient } from "@/lib/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  Download,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";

interface OverviewTabProps {
  fieldStatus?: string;
  weatherRisk?: string;
  cropHealth?: string;
  recommendation?: string;
  analysisType: "drone" | "satellite";
  fieldId: string;
  assessmentId?: string;
  status?: string;
  initialNotes?: string;
  dronePdfs?: Array<{ pdfType: string; droneAnalysisData?: unknown }>;
  farmDetails?: {
    name: string;
    cropType: string;
    area: number;
    location: string;
    farmerName: string;
  };
  /** Admin / read-only: no saving or submit to insurer */
  readOnly?: boolean;
}

export const OverviewTab = ({
  fieldStatus,
  weatherRisk,
  cropHealth,
  recommendation,
  analysisType,
  fieldId,
  assessmentId,
  status = "IN_PROGRESS",
  initialNotes,
  dronePdfs = [],
  farmDetails,
  readOnly = false,
}: OverviewTabProps) => {
  const queryClient = useQueryClient();
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(
    null,
  );
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [wxLoading, setWxLoading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    async function loadWeather() {
      if (!fieldId) return;
      setWxLoading(true);
      try {
        const today = new Date();
        const end = new Date(today);
        end.setDate(today.getDate() + 7);
        const start = new Date(today);
        start.setDate(today.getDate() - 30);

        const dateStart = start.toISOString().split("T")[0];
        const dateEnd = today.toISOString().split("T")[0];
        const forecastStart = today.toISOString().split("T")[0];
        const forecastEnd = end.toISOString().split("T")[0];

        const [acc, forecastPayload] = await Promise.all([
          apiClient.get<{
            field_id: string;
            date_start: string;
            date_end: string;
            total_rainfall: number;
            avg_temperature: number;
            avg_humidity: number;
            avg_wind_speed: number;
            days_with_rain: number;
          }>(
            `/farms/${fieldId}/weather/accumulated?dateStart=${dateStart}&dateEnd=${dateEnd}`,
          ),
          apiClient.get<unknown>(
            `/farms/${fieldId}/weather/forecast?dateStart=${forecastStart}&dateEnd=${forecastEnd}`,
          ),
        ]);

        const totalRain = Number(acc?.total_rainfall ?? 0);
        const avgTempRaw = Number(acc?.avg_temperature ?? 0);
        /** Accumulated history is averaged in °C; guard if API ever returns Kelvin. */
        const avgTemp = agroTempToCelsius(avgTempRaw);
        const days = 30;
        const avgDaily = days > 0 ? totalRain / days : 0;

        const droughtRiskStr =
          avgDaily < 1 ? "High" : avgDaily < 2 ? "Moderate" : "Low";
        const floodRiskStr =
          avgDaily > 5 ? "High" : avgDaily > 3 ? "Moderate" : "Low";

        const rawPoints = extractAgroForecastRows(forecastPayload) as any[];

        // --- 1. Extract Forecast Table (7 days) ---
        const dailyMap: Record<string, any> = {};
        rawPoints.forEach((p) => {
          const date = new Date(p.dt * 1000).toISOString().split("T")[0];
          if (!dailyMap[date]) {
            dailyMap[date] = {
              dt: p.dt,
              temps: [],
              humidity: [],
              rainfall: 0,
              clouds: [],
              wind: [],
              descriptions: [],
            };
          }
          const d = dailyMap[date];
          if (p.main) {
            d.temps.push(agroTempToCelsius(p.main.temp));
            if (p.main.temp_min) d.temps.push(agroTempToCelsius(p.main.temp_min));
            if (p.main.temp_max) d.temps.push(agroTempToCelsius(p.main.temp_max));
            d.humidity.push(p.main.humidity);
          }
          if (p.rain) {
            d.rainfall += p.rain["3h"] || p.rain["1h"] || 0;
          }
          if (p.clouds) d.clouds.push(p.clouds.all);
          if (p.wind) d.wind.push(p.wind.speed);
          if (p.weather?.[0]) d.descriptions.push(p.weather[0].description);
        });

        const forecastSummaries = Object.values(dailyMap)
          .sort((a, b) => a.dt - b.dt)
          .slice(0, 7)
          .map((d) => ({
            dt: d.dt,
            temp: d.temps.reduce((a: any, b: any) => a + b, 0) / d.temps.length,
            temp_min: Math.min(...d.temps),
            temp_max: Math.max(...d.temps),
            humidity:
              d.humidity.reduce((a: any, b: any) => a + b, 0) /
              d.humidity.length,
            rainfall: d.rainfall,
            clouds:
              d.clouds.reduce((a: any, b: any) => a + b, 0) / d.clouds.length,
            wind: d.wind.reduce((a: any, b: any) => a + b, 0) / d.wind.length,
            description: d.descriptions[0] || "Clear",
          }));

        // --- 2. Extract Current Weather ---
        const first = rawPoints[0];
        const currentWx = first
          ? {
              dt: first.dt,
              temp: agroTempToCelsius(first.main?.temp),
              humidity: first.main?.humidity,
              rainfall: first.rain?.["3h"] || first.rain?.["1h"] || 0,
              clouds: first.clouds?.all || 0,
              wind: first.wind?.speed || 0,
              description: first.weather?.[0]?.description || "Clear",
            }
          : undefined;

        // --- 3. Compute Risk Strings ---
        const maxForecastC =
          forecastSummaries.length > 0
            ? Math.max(...forecastSummaries.map((s) => s.temp_max))
            : NaN;

        const maxTempForStress = Number.isFinite(maxForecastC)
          ? Math.max(avgTemp, maxForecastC)
          : avgTemp;

        const heatStressStr =
          maxTempForStress > 30
            ? "High"
            : maxTempForStress > 25
              ? "Moderate"
              : "Low";

        const wx: WeatherData = {
          temperature: avgTemp,
          humidity: Number(acc?.avg_humidity ?? undefined),
          rainfall: totalRain,
          droughtRisk: droughtRiskStr,
          floodRisk: floodRiskStr,
          heatStress: heatStressStr,
          current: currentWx,
          forecast: forecastSummaries,
        };

        if (!cancelled) setWeatherData(wx);
      } catch (err) {
        console.error("Failed to load/process weather:", err);
        if (!cancelled) setWeatherData(null);
      } finally {
        if (!cancelled) setWxLoading(false);
      }
    }
    loadWeather();
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  // Calculate risk assessment when data changes
  useEffect(() => {
    if (dronePdfs.length > 0 || weatherData) {
      const assessment = calculateOverallRisk(dronePdfs as any, weatherData ?? undefined);
      setRiskAssessment(assessment);
    }
  }, [dronePdfs, weatherData]);

  const isCompleted = status === "SUBMITTED" || status === "APPROVED" || status === "COMPLETED";

  // Enhanced report generation
  const handleGenerateEnhancedReport = async () => {
    if (!assessmentId || !riskAssessment || !farmDetails) {
      return;
    }

    setIsGeneratingReport(true);
    try {
      // First save any pending notes
      if (hasChanges) {
        await saveNotes();
      }

      // Generate the backend report
      const report = await generateReport();

      // Refresh assessment + related lists so status/attachments/notes update immediately in UI
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["assessment", fieldId] }),
        queryClient.invalidateQueries({ queryKey: ["assessment", assessmentId] }),
        queryClient.invalidateQueries({ queryKey: ["assessments"] }),
        queryClient.invalidateQueries({ queryKey: ["assignedFarmers"] }),
      ]);
      await Promise.allSettled([
        queryClient.refetchQueries({ queryKey: ["assessment", fieldId] }),
        queryClient.refetchQueries({ queryKey: ["assignedFarmers"] }),
      ]);

      if (report) {
        toast.success("Assessment submitted. Data refreshed.");
      }
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Download comprehensive report
  const handleDownloadReport = async () => {
    if (!riskAssessment || !farmDetails) {
      console.log("Missing data for report generation:", {
        riskAssessment,
        farmDetails,
      });
      return;
    }

    setIsDownloadingReport(true);
    try {
      const reportGenerator = new ComprehensiveReportGenerator();

      const reportData = {
        assessmentId: assessmentId || "",
        farmDetails,
        dronePdfs: dronePdfs.map((pdf) => ({
          pdfType: pdf.pdfType,
          droneAnalysisData: pdf.droneAnalysisData as unknown,
        })),
        weatherData: weatherData as unknown,
        comprehensiveNotes,
        riskAssessment,
        reportGeneratedAt: new Date(),
      };

      await reportGenerator.downloadReport(reportData);
      toast.success("Assessment report downloaded successfully");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate assessment report");
    } finally {
      setIsDownloadingReport(false);
    }
  };

  // Get risk level color
  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW":
        return "bg-green-100 text-green-800 border-green-200";
      case "MODERATE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get risk icon
  const getRiskIcon = (level: string) => {
    switch (level) {
      case "LOW":
        return <CheckCircle className="h-4 w-4" />;
      case "MODERATE":
        return <AlertCircle className="h-4 w-4" />;
      case "HIGH":
      case "CRITICAL":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const statusBadgeColor = isCompleted ? "bg-green-100 text-green-800 border-green-200" : "bg-amber-100 text-amber-800 border-amber-200";

  return (
    <div className="space-y-6">
      {/* Assessment Documentation Header (monitoring style) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-primary/10">
        <div>
          <h2 className="text-xl font-bold text-primary">Assessment Documentation</h2>
          <p className="text-sm text-muted-foreground">
            Download the comprehensive risk assessment and field documentation.
          </p>
        </div>
        <Button
          onClick={handleDownloadReport}
          disabled={isDownloadingReport || !riskAssessment}
          className="bg-primary hover:bg-primary/90 text-white gap-2 h-11 px-6 shadow-md transition-all active:scale-95"
        >
          {isDownloadingReport ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          {isDownloadingReport ? "Generating..." : "Export assessment report"}
        </Button>
      </div>

      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overall Summary</CardTitle>
            <Badge variant="outline" className={statusBadgeColor}>
              {isCompleted ? "✓ Assessment Submitted" : "🕒 In Progress"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {riskAssessment ? (
            <>
              {/* Risk Score Card */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <span className="font-medium">Overall Risk Score</span>
                    <div className="flex items-center gap-2">
                      <Badge className={getRiskColor(riskAssessment.level)}>
                        {getRiskIcon(riskAssessment.level)}
                        {riskAssessment.score}/100
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <span className="font-medium">Field Status</span>
                    <div className="flex items-center gap-2">
                      <Badge className={getRiskColor(riskAssessment.level)}>
                        {riskAssessment.fieldStatus}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <span className="font-medium">
                      Est. healthy area (drone report)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {riskAssessment.cropHealth}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <span className="font-medium">Weather Risk</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {riskAssessment.weatherRisk}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Risk Components */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-muted-foreground">
                    Risk Components
                  </h4>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>🌿 Plant stress (drone)</span>
                        <span>
                          {Number(
                            riskAssessment.components.cropHealth.toFixed(2),
                          )}
                          %
                        </span>
                      </div>
                      <Progress
                        value={Number(
                          riskAssessment.components.cropHealth.toFixed(2),
                        )}
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>🌦️ Weather</span>
                        <span>
                          {Number(
                            riskAssessment.components.weather.toFixed(2),
                          )}
                          %
                        </span>
                      </div>
                      <Progress
                        value={Number(
                          riskAssessment.components.weather.toFixed(2),
                        )}
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>🌱 Growth Stage</span>
                        <span>
                          {Number(
                            riskAssessment.components.growthStage.toFixed(2),
                          )}
                          %
                        </span>
                      </div>
                      <Progress
                        value={Number(
                          riskAssessment.components.growthStage.toFixed(2),
                        )}
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>🌸 Flowering</span>
                        <span>
                          {Number(
                            riskAssessment.components.flowering.toFixed(2),
                          )}
                          %
                        </span>
                      </div>
                      <Progress
                        value={Number(
                          riskAssessment.components.flowering.toFixed(2),
                        )}
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {riskAssessment.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">
                    Key Recommendations
                  </h4>
                  <div className="space-y-1">
                    {riskAssessment.recommendations
                      .slice(0, 3)
                      .map((rec, index) => (
                        <div
                          key={index}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-xs mt-1">•</span>
                          <span>{rec.replace(/[^\w\s,.!?-]/g, "").trim()}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              {wxLoading
                ? "Loading risk inputs…"
                : "No risk assessment available yet (missing weather and/or drone analysis data)."}
            </div>
          )}

          <div className="mt-6 p-6 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-2">
              Analysis Method
            </p>
            <p className="font-medium capitalize">
              {analysisType === "drone"
                ? "🚁 Drone-based Assessment"
                : "🛰️ Satellite-based Monitoring"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Comprehensive Assessment Notes
            {!readOnly && lastSaved && (
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
            placeholder="Write comprehensive feedback about the field assessment..."
            className="min-h-[200px]"
            disabled={isCompleted || readOnly}
            readOnly={readOnly}
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {!readOnly && (
                <>
                  <Button
                    onClick={saveNotes}
                    disabled={isSaving || !hasChanges || isCompleted}
                    className="flex items-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isSaving ? "Saving..." : "Save Feedback"}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={!canGenerateReport || isSaving || isGeneratingReport || isCompleted}
                        className="flex items-center gap-2 border-primary/50 hover:border-primary"
                      >
                        {isGeneratingReport ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        {isGeneratingReport ? "Submitting..." : "Complete & Submit to Insurer"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Finalize Risk Assessment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will generate the final report for <strong>{farmDetails?.name}</strong> and submit it to the insurer. This action cannot be undone and you will not be able to edit the assessment further.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleGenerateEnhancedReport}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Complete & Submit
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
            {!readOnly && hasChanges && (
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
