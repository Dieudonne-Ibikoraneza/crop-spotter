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

  const dronePdfs = activeCycle?.droneAnalysisPdfs || [];

  // Derive pdfType from file name (without extension)
  const getPdfTypeFromFile = (file: File): string => {
    const name = file.name.replace(/\.pdf$/i, "").replace(/\s+/g, "_").toLowerCase();
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

  // --------------- Full analysis data renderer ---------------
  const renderAnalysisData = (pdf: any) => {
    const data = pdf.droneAnalysisData;

    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg border border-dashed">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm font-medium">Analysis in progress...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Our system is extracting data from your PDF. This may take a few
            moments.
          </p>
        </div>
      );
    }

    const reportData = data.report || {};
    const fieldData = data.field || {};
    const analysisSection = data.analysis || {};
    const levels = analysisSection.levels || [];

    return (
      <div className="space-y-5">
        {/* Top metric cards – only show non-null */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {fieldData.crop && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                Crop
              </p>
              <p className="text-lg font-bold">{fieldData.crop}</p>
            </div>
          )}
          {fieldData.area_hectares != null && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                Field Area
              </p>
              <p className="text-lg font-bold">
                {fieldData.area_hectares} ha
              </p>
            </div>
          )}
          {fieldData.area_acres != null && fieldData.area_acres > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                Field Area (Acres)
              </p>
              <p className="text-lg font-bold">{fieldData.area_acres} ac</p>
            </div>
          )}
          {fieldData.growing_stage && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                Growing Stage
              </p>
              <p className="text-lg font-bold">{fieldData.growing_stage}</p>
            </div>
          )}
          {reportData.survey_date && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                Survey Date
              </p>
              <p className="text-lg font-bold">{reportData.survey_date}</p>
            </div>
          )}
          {reportData.analysis_name && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                Analysis Name
              </p>
              <p className="text-lg font-bold">{reportData.analysis_name}</p>
            </div>
          )}
          {reportData.provider && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                Provider
              </p>
              <p className="text-lg font-bold">{reportData.provider}</p>
            </div>
          )}
        </div>

        {/* Additional Info */}
        {data.additional_info && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs uppercase font-semibold text-primary/70 mb-1">
              Additional Information
            </p>
            <p className="text-sm font-medium text-foreground">
              {data.additional_info}
            </p>
          </div>
        )}

        {/* Analysis Levels Table */}
        {levels.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Analysis Levels
            </h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-semibold">Level</th>
                    <th className="text-right p-3 font-semibold">%</th>
                    <th className="text-right p-3 font-semibold">Hectare</th>
                    {levels[0]?.area_acres != null && (
                      <th className="text-right p-3 font-semibold">Acres</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {levels.map((level: any, idx: number) => (
                    <tr
                      key={idx}
                      className="border-t border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded ${
                              idx === 0
                                ? "bg-green-500"
                                : idx === 1
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                          />
                          {level.level || level.name}
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium">
                        {parseFloat(level.percentage || 0).toFixed(2)}%
                      </td>
                      <td className="p-3 text-right font-medium">
                        {parseFloat(level.area_hectares || 0).toFixed(2)}
                      </td>
                      {levels[0]?.area_acres != null && (
                        <td className="p-3 text-right font-medium">
                          {parseFloat(level.area_acres || 0).toFixed(2)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* Total Affected Area */}
        {analysisSection.total_area_hectares > 0 && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-muted-foreground mb-1">
              Total Affected Area:
            </p>
            <p className="text-2xl font-bold text-destructive">
              {analysisSection.total_area_hectares} ha ={" "}
              {analysisSection.total_area_percent || 0}% field
              {analysisSection.total_area_acres && (
                <span className="text-base font-normal text-muted-foreground ml-2">
                  ({analysisSection.total_area_acres} acres)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Stand Count Analysis */}
        {data.stand_count_analysis &&
          (() => {
            const sc = data.stand_count_analysis;
            const items = [
              sc.plants_counted != null && {
                label: "Plants Counted",
                value: sc.plants_counted.toLocaleString(),
              },
              sc.average_plant_density != null && {
                label: "Avg Plant Density",
                value: `${sc.average_plant_density} ${sc.plant_density_unit || ""}`.trim(),
              },
              sc.planned_plants != null && {
                label: "Planned Plants",
                value: sc.planned_plants.toLocaleString(),
              },
              sc.difference_percent != null && {
                label: "Difference",
                value: `${sc.difference_percent}% ${sc.difference_type || ""}`.trim(),
              },
              sc.difference_plants != null && {
                label: "Difference (Plants)",
                value: sc.difference_plants.toLocaleString(),
              },
            ].filter(Boolean);
            if (items.length === 0) return null;
            return (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  🌾 Stand Count Analysis
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {items.map((item: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                        {item.label}
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        {/* RX Spraying Analysis */}
        {data.rx_spraying_analysis &&
          (() => {
            const rx = data.rx_spraying_analysis;
            const hasRates = rx.rates && rx.rates.length > 0;
            const items = [
              rx.planned_date && { label: "Planned Date", value: rx.planned_date },
              rx.pesticide_type && { label: "Pesticide Type", value: rx.pesticide_type },
              rx.total_pesticide_amount != null && {
                label: "Total Amount",
                value: String(rx.total_pesticide_amount),
              },
              rx.average_pesticide_amount != null && {
                label: "Avg Amount",
                value: String(rx.average_pesticide_amount),
              },
            ].filter(Boolean);
            if (items.length === 0 && !hasRates) return null;
            return (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  🧪 RX Spraying Analysis
                </h4>
                {items.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {items.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-muted/50 border"
                      >
                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                          {item.label}
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {item.value}
                        </p>
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
                      // Zone colors 1-6
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
                            {rate.rate != null ? rate.rate : (rate.amount != null ? rate.amount : "—")}
                            {rate.rate_unit ? ` ${rate.rate_unit.replace(/_/g, "/")}` : ""}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {rate.area != null ? rate.area : (rate.area_hectares != null ? rate.area_hectares : "—")}
                            {rate.area_unit ? ` ${rate.area_unit}` : ""}
                          </td>
                          {rx.rates[0]?.percentage != null && (
                            <td className="p-3 text-right font-medium">
                              {rate.percentage != null ? `${rate.percentage}%` : "—"}
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

        {/* Zonation Analysis */}
        {data.zonation_analysis &&
          (() => {
            const za = data.zonation_analysis;
            const hasZones = za.zones && za.zones.length > 0;
            const items = [
              za.tile_size != null && {
                label: "Tile Size",
                value: String(za.tile_size),
              },
              za.num_zones != null && {
                label: "Number of Zones",
                value: String(za.num_zones),
              },
            ].filter(Boolean);
            if (items.length === 0 && !hasZones) return null;
            return (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  📊 Zonation Analysis
                </h4>
                {items.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {items.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-muted/50 border"
                      >
                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                          {item.label}
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {item.value}
                        </p>
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
                          <th className="text-right p-3 font-medium">
                            Area (ha)
                          </th>
                          <th className="text-right p-3 font-medium">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {za.zones.map((zone: any, i: number) => (
                          <tr key={i} className="border-t border-border">
                            <td className="p-3">
                              {zone.name || zone.zone || `Zone ${i + 1}`}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {zone.area_hectares || zone.hectares || "—"}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {zone.percentage || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

        {/* Map Image */}
        {data.map_image?.url && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              📸 Extracted Map Image
            </h4>
            <img
              src={data.map_image.url}
              alt="Extracted drone map"
              className="w-full rounded-lg border border-border"
            />
            {levels.length > 0 && (
              <div className="flex flex-wrap gap-6 justify-center text-sm mt-3">
                {levels.map((level: any, idx: number) => (
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
                      {level.level || level.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Extraction Metadata */}
        {data.metadata &&
          (() => {
            const m = data.metadata;
            const items = [
              m.extracted_at && {
                label: "Extracted At",
                value: new Date(m.extracted_at).toLocaleString(),
              },
              m.total_pages != null && {
                label: "Total Pages",
                value: String(m.total_pages),
              },
              m.extractor_version && {
                label: "Extractor Version",
                value: m.extractor_version,
              },
            ].filter(Boolean);
            if (items.length === 0) return null;
            return (
              <div className="pt-4 border-t">
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                  Extraction Metadata
                </h4>
                <div className="flex flex-wrap gap-4">
                  {items.map((item: any, i: number) => (
                    <div key={i} className="text-xs">
                      <span className="text-muted-foreground">
                        {item.label}:{" "}
                      </span>
                      <span className="font-medium text-foreground">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        {/* Raw JSON (collapsible) */}
        <details className="border rounded-lg">
          <summary className="p-3 text-sm font-medium cursor-pointer hover:bg-muted/30 transition-colors">
            View Raw Extracted Data (JSON)
          </summary>
          <pre className="p-4 bg-muted text-xs overflow-auto max-h-64 text-foreground rounded-b-lg">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    );
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
                    {(pdf.pdfType || "unknown").replace(/_/g, " ")}
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
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the "{pdf.pdfType.replace(/_/g, " ")}" PDF report from the server.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeletePdf(pdf.pdfType)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>{renderAnalysisData(pdf)}</CardContent>
        </Card>
      ))}
    </div>
  );
};
