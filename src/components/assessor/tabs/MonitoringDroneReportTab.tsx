import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Upload,
  FileText,
  Loader2,
  Check,
  Satellite,
  AlertCircle,
  Trash2,
  Download,
  Eye,
} from "lucide-react";
import { generateDroneDataPDF } from "@/utils/dronePdfGenerator";
import { useToast } from "@/hooks/use-toast";
import {
  cropMonitoringService,
  CropMonitoringRecord,
} from "@/lib/api/services/cropMonitoring";
import { useQueryClient } from "@tanstack/react-query";
import { formatReportTypeLabel } from "@/lib/crops";
import { DroneAnalysisView } from "../DroneAnalysisView";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MonitoringDroneReportTabProps {
  monitoringId: string;
  activeCycle?: CropMonitoringRecord;
  cycles?: CropMonitoringRecord[];
  cropType: string;
  area: number;
  readOnly?: boolean;
}

export const MonitoringDroneReportTab = ({
  monitoringId,
  activeCycle,
  cycles = [],
  cropType,
  area,
  readOnly = false,
}: MonitoringDroneReportTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<any | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCompleted = activeCycle?.status === "COMPLETED";

  const formatValue = (val: any) => {
    if (
      val == null ||
      val === "" ||
      String(val).toLowerCase() === "none" ||
      val === "—"
    )
      return "—";
    return val;
  };

  // Flatten all PDFs from all cycles and include the cycle number for each
  const allDronePdfs = (cycles || []).flatMap((cycle) => 
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

  const dronePdfs = allDronePdfs;

  // Derive pdfType from file name (without extension)
  const getPdfTypeFromFile = (file: File): string => {
    const name = file.name
      .replace(/\.pdf$/i, "")
      .replace(/\s+/g, "_")
      .toLowerCase();
    return name;
  };

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

    const pdfType = getPdfTypeFromFile(file);

    setIsUploading(true);
    try {
      await cropMonitoringService.uploadDronePdf(monitoringId, pdfType, file);

      toast({
        title: "Upload Successful",
        description: `"${file.name}" uploaded. Analysis is in progress.`,
      });

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

  const handleDeletePdf = async (pdfType: string) => {
    try {
      await cropMonitoringService.deletePdf(monitoringId, pdfType);
      toast({
        title: "Delete Successful",
        description: "The PDF report has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["crop-monitoring-policy"] });
      queryClient.invalidateQueries({ queryKey: ["crop-monitoring"] });
      setIsViewerOpen(false);
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete PDF report.",
        variant: "destructive",
      });
    }
  };

  if (allDronePdfs.length === 0 && !activeCycle) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Satellite className="h-12 w-12 mx-auto mb-4 opacity-20 text-primary" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Waiting for Drone Analytics
          </h3>
          <p className="text-sm max-w-sm mx-auto leading-relaxed">
            No drone analysis reports have been uploaded for this field yet.
            {activeCycle 
              ? " Please upload an Agremo PDF to view health insights for the current cycle."
              : " The assessor needs to start a monitoring cycle to begin uploading reports."}
          </p>
          {!readOnly && !activeCycle && (
            <p className="mt-4 text-xs font-medium text-primary uppercase tracking-wider">
              Assessor Action Required
            </p>
          )}
          {!readOnly && activeCycle && (
            <Button 
                variant="outline" 
                size="sm" 
                className="mt-6 gap-2"
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload className="h-4 w-4" />
                Upload First Report
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Satellite className="h-5 w-5 text-primary" />
              Drone Analysis Reports
            </div>
            <Badge variant="outline" className="text-xs">
              {dronePdfs.length} report{dronePdfs.length !== 1 ? "s" : ""}{" "}
              uploaded
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!readOnly && (
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/10 group mb-6"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="h-10 w-10 mx-auto mb-3 text-primary animate-spin" />
              ) : (
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
              <p className="text-base font-semibold mb-1">
                {isUploading ? "Uploading to server..." : "Upload Drone Analysis PDF"}
              </p>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Upload any Agremo analysis report PDF. The file name will be used
                as the report identifier.
              </p>
              {isCompleted && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm flex items-center gap-2 max-w-sm mx-auto">
                  <AlertCircle className="h-4 w-4" />
                  This cycle is completed. No further uploads allowed.
                </div>
              )}
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handlePdfUpload}
                disabled={isCompleted}
              />
              <Button
                variant="outline"
                disabled={isUploading || isCompleted}
                className="group-hover:bg-primary group-hover:text-primary-foreground transition-all"
              >
                Select PDF File
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Repository Grid */}
      {dronePdfs.length > 0 && (
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

                  {!readOnly && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Report?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this report from the monitoring cycle.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeletePdf(pdf.pdfType)}
                            className="bg-destructive hover:bg-destructive"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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
