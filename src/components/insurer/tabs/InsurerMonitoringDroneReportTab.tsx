import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Loader2,
  Satellite,
  Download,
  Eye,
} from "lucide-react";
import { generateDroneDataPDF } from "@/utils/dronePdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { CropMonitoringRecord } from "@/lib/api/services/cropMonitoring";
import { formatReportTypeLabel } from "@/lib/crops";
import { DroneAnalysisView } from "@/components/assessor/DroneAnalysisView";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [selectedPdf, setSelectedPdf] = useState<any | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Flatten all PDFs from all cycles and include the cycle number for each
  const dronePdfs = (cycles || []).flatMap((cycle) => 
    (cycle.droneAnalysisPdfs || []).map(pdf => ({
      ...pdf,
      cycleNumber: cycle.monitoringNumber,
      cycleId: cycle._id
    }))
  ).sort((a, b) => {
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
      {/* Report Repository Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Report Repository
          </h3>
          <Badge variant="outline">{dronePdfs.length} Reports Available</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dronePdfs.map((pdf, idx) => (
            <Card 
              key={pdf._id || idx}
              className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-md overflow-hidden relative"
              onClick={() => {
                setSelectedPdf(pdf);
                setIsViewerOpen(true);
              }}
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div 
                  className="p-1.5 rounded-full bg-primary/10 text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPdf(pdf);
                    setIsViewerOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </div>
              </div>

              <CardHeader className="p-4 pb-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <CardTitle className="text-sm font-bold truncate">
                      {formatReportTypeLabel(pdf.pdfType)}
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Cycle #{pdf.cycleNumber || "?"} • Analysis
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-0 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {pdf.uploadedAt ? new Date(pdf.uploadedAt).toLocaleDateString() : "No date"}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Report Viewer Dialog */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
            <div className="flex items-center justify-between pr-8">
              <div className="space-y-1">
                <DialogTitle className="text-xl">
                  {selectedPdf && formatReportTypeLabel(selectedPdf.pdfType)}
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="font-normal">
                    Cycle #{selectedPdf?.cycleNumber || "?"}
                  </Badge>
                  <span>•</span>
                  <span>
                    Uploaded at: {selectedPdf?.uploadedAt && new Date(selectedPdf.uploadedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {selectedPdf && (
              <DroneAnalysisView
                data={selectedPdf.droneAnalysisData}
                pdfType={selectedPdf.pdfType}
              />
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-white gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setIsViewerOpen(false)}
              className="h-11 px-6"
            >
              Close Viewer
            </Button>
            {selectedPdf && (
              <Button
                variant="default"
                disabled={!!isDownloading}
                className="bg-primary hover:bg-primary/90 gap-2 h-11 px-8 shadow-md"
                onClick={async () => {
                  setIsDownloading(selectedPdf._id || "downloading");
                  try {
                    await generateDroneDataPDF(
                      selectedPdf.droneAnalysisData as any,
                      formatReportTypeLabel(selectedPdf.pdfType),
                    );
                    toast({
                      title: "Success",
                      description: "Report downloaded successfully",
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to generate PDF",
                      variant: "destructive",
                    });
                  } finally {
                    setIsDownloading(null);
                  }
                }}
              >
                {isDownloading === (selectedPdf._id || "downloading") ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
