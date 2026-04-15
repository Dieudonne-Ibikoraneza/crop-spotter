import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  Download,
} from "lucide-react";
import { CropMonitoringRecord } from "@/lib/api/services/cropMonitoring";
import { useToast } from "@/hooks/use-toast";
import { MonitoringReportGenerator } from "@/utils/monitoringReportGenerator";

interface InsurerMonitoringOverviewTabProps {
  monitoringId: string;
  policyId: string;
  fieldName: string;
  farmerName?: string;
  cropType?: string;
  area?: number;
  location?: string;
  cycles: CropMonitoringRecord[];
}

const getPhotoUrl = (url: string) => {
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  let baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
  baseUrl = baseUrl.replace(/\/api\/v1\/?$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const InsurerMonitoringOverviewTab = ({
  fieldName,
  farmerName = "N/A",
  cropType = "N/A",
  area = 0,
  location = "N/A",
  policyId,
  cycles,
}: InsurerMonitoringOverviewTabProps) => {
  const { toast } = useToast();
  const [isDownloadingFull, setIsDownloadingFull] = useState(false);

  const completedCycles = (cycles || []).filter(
    (c) => c.status === "COMPLETED",
  );

  const handleDownloadFullReport = async () => {
    setIsDownloadingFull(true);
    try {
      const generator = new MonitoringReportGenerator();
      await generator.downloadFullReport({
        farmName: fieldName,
        farmerName,
        cropType,
        area,
        location,
        policyNumber: policyId,
        cycles: [...cycles].sort((a, b) => b.monitoringNumber - a.monitoringNumber),
      });
      toast({
        title: "Success",
        description: "Full monitoring report downloaded.",
      });
    } catch (err) {
      console.error("Full Report Generation Error:", err);
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingFull(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-primary/10">
        <div>
          <h2 className="text-xl font-bold text-primary">Monitoring Documentation</h2>
          <p className="text-sm text-muted-foreground">
            {completedCycles.length} completed cycles recorded so far.
          </p>
        </div>
        <Button
          onClick={handleDownloadFullReport}
          disabled={isDownloadingFull || cycles.length === 0}
          className="bg-primary hover:bg-primary/90 text-white gap-2 h-11 px-6 shadow-md transition-all active:scale-95"
        >
          {isDownloadingFull ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          {isDownloadingFull ? "Generating..." : "Download Full Monitoring Report"}
        </Button>
      </div>

      {/* Completed Cycles History */}
      {completedCycles.length > 0 ? (
        <div className="pt-2 font-bold">
          <h3 className="text-lg mb-4">Completed History</h3>
          <div className="space-y-4">
            {completedCycles.map((cycle) => (
              <Card key={cycle._id} className="bg-muted/50 border-border">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Cycle #{cycle.monitoringNumber}
                    </CardTitle>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Completed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">
                        Date
                      </p>
                      <p className="font-medium">
                        {new Date(cycle.monitoringDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">
                        Report Generated
                      </p>
                      <p className="font-medium">
                        {cycle.reportGeneratedAt
                          ? new Date(
                              cycle.reportGeneratedAt,
                            ).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {cycle.observations && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase mb-1">
                        Observations
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        {cycle.observations.map((obs, i) => (
                          <li key={i} className="text-foreground">
                            {obs}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {cycle.notes && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase mb-1">
                        Notes
                      </p>
                      <p className="bg-background/50 p-3 rounded border border-border italic text-foreground">
                        {cycle.notes}
                      </p>
                    </div>
                  )}

                  {cycle.photoUrls && cycle.photoUrls.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase mb-2">
                        Photos
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {cycle.photoUrls.map((url, i) => (
                          <div
                            key={i}
                            className="w-16 h-16 rounded border overflow-hidden"
                          >
                            <img
                              src={getPhotoUrl(url)}
                              alt={`Photo ${i}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No Completed Cycles</p>
            <p className="text-sm">
              Assessors have not finalized any cycles yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
