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
  Image,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  cropMonitoringService,
  CropMonitoringRecord,
} from "@/lib/api/services/cropMonitoring";
import { useQueryClient } from "@tanstack/react-query";
import { formatReportTypeLabel } from "@/lib/crops";
import { DroneAnalysisView } from "../DroneAnalysisView";

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
  const [isUploading, setIsUploading] = useState(false);
  const [expandedPdf, setExpandedPdf] = useState<string | null>(null);
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

  const dronePdfs = activeCycle?.droneAnalysisPdfs || [];

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
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete PDF report.",
        variant: "destructive",
      });
    }
  };

  if (!activeCycle) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No Active Monitoring Cycle</p>
          <p className="text-sm">
            Please start a monitoring cycle in the Basic Info tab before
            uploading drone reports.
          </p>
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
          {/* Upload zone */}
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
              {isUploading
                ? "Uploading to server..."
                : "Upload Drone Analysis PDF"}
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

          {dronePdfs.length === 0 && (
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 text-center">
              <p className="text-sm font-medium text-amber-800">
                At least 1 drone report is required to proceed to the Overview
                tab.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Render each uploaded PDF's data inline */}
      {dronePdfs.map((pdf, idx) => (
        <Card key={pdf._id || idx}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="capitalize">
                    {formatReportTypeLabel(pdf.pdfType || "unknown")}
                  </span>
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2 shrink-0"
                    title="Delete Report"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Report
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the "
                      {formatReportTypeLabel(pdf.pdfType)}" PDF report from the
                      server.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeletePdf(pdf.pdfType)}
                      disabled={isCompleted}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            <DroneAnalysisView
              data={pdf.droneAnalysisData}
              pdfType={pdf.pdfType}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
