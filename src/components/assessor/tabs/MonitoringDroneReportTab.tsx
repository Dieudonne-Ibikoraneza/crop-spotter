import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  Loader2, 
  Check, 
  X, 
  Satellite, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cropMonitoringService, CropMonitoringRecord } from "@/lib/api/services/cropMonitoring";
import { useQueryClient } from "@tanstack/react-query";

interface MonitoringDroneReportTabProps {
  monitoringId: string;
  activeCycle?: CropMonitoringRecord;
  cropType: string;
  area: number;
}

export const MonitoringDroneReportTab = ({
  monitoringId,
  activeCycle,
  cropType,
  area,
}: MonitoringDroneReportTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPdfType, setSelectedPdfType] = useState<"plant_health" | "flowering">("plant_health");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dronePdfs = activeCycle?.droneAnalysisPdfs || [];
  const isCurrentPdfUploaded = dronePdfs.some(pdf => pdf.pdfType === selectedPdfType);
  const currentPdfData = dronePdfs.find(pdf => pdf.pdfType === selectedPdfType);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({
        title: "Invalid file",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      await cropMonitoringService.uploadDronePdf(monitoringId, selectedPdfType, file);
      
      toast({
        title: "Upload Successful",
        description: `${selectedPdfType === "plant_health" ? "Plant Health" : "Flowering"} report uploaded and analysis in progress.`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["crop-monitoring-policy"] });
      queryClient.invalidateQueries({ queryKey: ["crop-monitoring"] });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload PDF report.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const renderAnalysisData = (data: any) => {
    if (!data) return (
      <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg border border-dashed">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm font-medium">Analysis in progress...</p>
        <p className="text-xs text-muted-foreground mt-1">Our system is extracting data from your PDF. This may take a few moments.</p>
      </div>
    );

    // Adapted from DroneAnalysisTab.tsx
    const reportInfo = data.report || {};
    const stressLevels = data.stress_levels || data.levels || [];
    const totalAffected = data.total_affected || data.weed_analysis || {};

    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Survey Date</p>
            <p className="text-lg font-bold">{reportInfo.survey_date || "N/A"}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Growing Stage</p>
            <p className="text-lg font-bold">{reportInfo.growing_stage || "N/A"}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Total Affected Area</p>
            <p className="text-lg font-bold">
              {totalAffected.area_hectares || totalAffected.hectares || 0} ha 
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({totalAffected.area_percent || totalAffected.percentage || 0}%)
              </span>
            </p>
          </div>
        </div>

        {stressLevels.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/80">
                  <th className="text-left p-3 font-semibold border-b">Classification</th>
                  <th className="text-right p-3 font-semibold border-b">Percentage</th>
                  <th className="text-right p-3 font-semibold border-b">Area (ha)</th>
                </tr>
              </thead>
              <tbody>
                {stressLevels.map((level: any, idx: number) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          level.name?.toLowerCase().includes("fine") || level.level?.toLowerCase().includes("fine") || level.name?.toLowerCase().includes("healthy") 
                            ? "bg-green-500" 
                            : level.name?.toLowerCase().includes("potential") || level.level?.toLowerCase().includes("moderate")
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`} />
                        {level.name || level.level}
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium">{level.percentage}%</td>
                    <td className="p-3 text-right font-medium">{level.area_hectares || level.hectares}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  if (!activeCycle) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No Active Monitoring Cycle</p>
          <p className="text-sm">Please start a monitoring cycle in the Basic Info tab before uploading drone reports.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Satellite className="h-5 w-5 text-primary" />
            Drone Analysis Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button
              variant={selectedPdfType === "plant_health" ? "default" : "outline"}
              onClick={() => setSelectedPdfType("plant_health")}
              className="flex-1"
            >
              🌱 Plant Stress Report
            </Button>
            <Button
              variant={selectedPdfType === "flowering" ? "default" : "outline"}
              onClick={() => setSelectedPdfType("flowering")}
              className="flex-1"
            >
              🌸 Flowering Report
            </Button>
          </div>

          <div className="flex items-center gap-2 mb-6">
            {isCurrentPdfUploaded ? (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium uppercase">
                  {selectedPdfType.replace("_", " ")} Report Uploaded
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200">
                <X className="h-4 w-4" />
                <span className="text-sm font-medium uppercase">
                  No {selectedPdfType.replace("_", " ")} Report Uploaded
                </span>
              </div>
            )}
          </div>

          {!isCurrentPdfUploaded && (
            <div
              className="border-2 border-dashed border-border rounded-lg p-10 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/10 group"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              ) : (
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
              <p className="text-base font-semibold mb-2">
                {isUploading ? "Uploading to server..." : `Upload ${selectedPdfType.replace("_", " ")} PDF`}
              </p>
              <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                Select the Agremo analysis report PDF for {selectedPdfType.replace("_", " ")}. 
                The system will automatically extract key metrics.
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
                disabled={isUploading}
                className="group-hover:bg-primary group-hover:text-primary-foreground transition-all"
              >
                Select File
              </Button>
            </div>
          )}

          {isCurrentPdfUploaded && (
            <div className="space-y-6 pt-4 border-t">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Analysis Results</h3>
                {currentPdfData?.pdfUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={currentPdfData.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-2" />
                      View Uploaded PDF
                    </a>
                  </Button>
                )}
              </div>
              {renderAnalysisData(currentPdfData?.droneAnalysisData)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
