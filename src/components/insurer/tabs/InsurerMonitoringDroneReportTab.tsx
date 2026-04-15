import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Loader2,
  Check,
  Satellite,
  Download,
} from "lucide-react";
import { generateDroneDataPDF } from "@/utils/dronePdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { CropMonitoringRecord } from "@/lib/api/services/cropMonitoring";
import { formatReportTypeLabel } from "@/lib/crops";
import { DroneAnalysisView } from "@/components/assessor/DroneAnalysisView";

interface InsurerMonitoringDroneReportTabProps {
  activeCycle?: CropMonitoringRecord;
  cycles?: CropMonitoringRecord[];
}

export const InsurerMonitoringDroneReportTab = ({
  activeCycle,
  cycles = [],
}: InsurerMonitoringDroneReportTabProps) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Flatten all PDFs from all cycles and include the cycle number for each
  const dronePdfs = (cycles || [])
    .flatMap((cycle) =>
      (cycle.droneAnalysisPdfs || []).map((pdf) => ({
        ...pdf,
        cycleNumber: cycle.monitoringNumber,
        cycleId: cycle._id,
      }))
    )
    .sort((a, b) => {
      const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return dateB - dateA; // Newest first
    });

  if (dronePdfs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Satellite className="h-12 w-12 mx-auto mb-4 opacity-20 text-primary" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Waiting for Drone Analytics
          </h3>
          <p className="text-sm max-w-sm mx-auto leading-relaxed">
            No drone analysis reports have been uploaded for this field yet.
            The assessor needs to upload an Agremo PDF to view health insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Render each uploaded PDF's data inline using Assessor's preferred style */}
      <div className="space-y-8">
        {dronePdfs.map((pdf, idx) => (
          <Card key={pdf._id || idx}>
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="capitalize">
                      {formatReportTypeLabel(pdf.pdfType || "unknown")}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs bg-green-50 text-green-700 border-green-200 ml-2"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                    <Badge variant="secondary" className="font-normal text-xs ml-1">
                      Cycle #{pdf.cycleNumber || "?"}
                    </Badge>
                  </CardTitle>
                  {pdf.uploadedAt && (
                    <p className="text-xs text-muted-foreground font-normal ml-6">
                      {new Date(pdf.uploadedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDownloading === pdf._id}
                    className="gap-2"
                    onClick={async () => {
                      setIsDownloading(pdf._id || "downloading");
                      try {
                        await generateDroneDataPDF(
                          pdf.droneAnalysisData as any,
                          formatReportTypeLabel(pdf.pdfType)
                        );
                        toast({ title: "Success", description: "Report downloaded successfully" });
                      } catch (error) {
                        toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
                      } finally {
                        setIsDownloading(null);
                      }
                    }}
                  >
                    {isDownloading === pdf._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <DroneAnalysisView
                data={pdf.droneAnalysisData}
                pdfType={pdf.pdfType}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
