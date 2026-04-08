import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Upload,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Trash2,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { formatReportTypeLabel } from "@/lib/crops";
import { Claim, claimsService } from "@/lib/api/services/claims";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useClaimPdfs } from "@/lib/api/hooks/useClaims";
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
import { DroneAnalysisView } from "../../DroneAnalysisView";

interface LossEvidenceTabProps {
  claim: Claim;
}

const getMediaUrl = (url: string) => {
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  let baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
  baseUrl = baseUrl.replace(/\/api\/v1\/?$/, "");
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const LossEvidenceTab = ({ claim }: LossEvidenceTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isCompleted = [
    "SUBMITTED",
    "APPROVED",
    "REJECTED",
    "COMPLETED",
  ].includes(claim.status);

  const { data: dronePdfs = [], isLoading: isAssessmentLoading } = useClaimPdfs(
    claim._id,
  );

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use filename as pdfType (clean it up)
    const pdfType = file.name
      .split(".")[0]
      .toUpperCase()
      .replace(/[^A-Z0-0]/g, "_");

    setIsUploading(true);
    try {
      await claimsService.uploadDronePdf(claim._id, pdfType, file);
      queryClient.invalidateQueries({
        queryKey: ["claims", "detail", claim._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["claims", "pdfs", claim._id],
      });
      toast({
        title: "Report Uploaded",
        description: `"${file.name}" has been processed.`,
      });
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err?.message || "Could not upload PDF.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeletePdf = async (pdfType: string) => {
    try {
      await claimsService.deletePdf(claim._id, pdfType);
      queryClient.invalidateQueries({
        queryKey: ["claims", "detail", claim._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["claims", "pdfs", claim._id],
      });
      toast({ title: "Deleted", description: "Report removed successfully." });
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err?.message || "Could not delete report.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Farmer Evidence */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Farmer Evidence
            </CardTitle>
            <CardDescription>
              Photos provided by the farmer during claim filing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {claim.damagePhotos && claim.damagePhotos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {claim.damagePhotos.map((url, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg border overflow-hidden bg-muted group relative"
                  >
                    <img
                      src={getMediaUrl(url)}
                      alt={`Evidence ${i + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <a
                      href={getMediaUrl(url)}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="h-6 w-6 text-white" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No photos provided by farmer</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assessor Drone Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Assessor Drone Reports
            </CardTitle>
            <CardDescription>
              Upload Agremo analysis reports for damage quantification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isCompleted ? (
              <div className="p-6 border-2 border-dashed rounded-lg text-center hover:bg-muted/50 transition-colors cursor-pointer group relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handlePdfUpload}
                  disabled={isUploading}
                />
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <Upload className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <p className="font-medium">
                    {isUploading ? "Uploading..." : "Click to upload drone PDF"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports Plant Stress, Waterlogging, Stand Count, etc.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>
                  This claim assessment is finalized. No further uploads
                  allowed.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isAssessmentLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!isAssessmentLoading && dronePdfs.length === 0 && (
        <div className="py-12 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed max-w-2xl mx-auto">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No drone reports uploaded yet</p>
          <p className="text-xs">
            Extracted analysis will appear here after upload.
          </p>
        </div>
      )}

      {/* Render each uploaded PDF's data inline, like in Monitoring */}
      <div className="space-y-6">
        {dronePdfs.map((pdf: any, idx: number) => (
          <Card key={pdf._id || pdf.pdfType || idx}>
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
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
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Uploaded
                  </Badge>
                </CardTitle>
                {pdf.uploadedAt && (
                  <p className="text-xs text-muted-foreground font-normal">
                    {new Date(pdf.uploadedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {!isCompleted && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2 h-8"
                      title="Delete Report"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Report?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the "
                        {formatReportTypeLabel(pdf.pdfType)}" analysis from this
                        claim.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeletePdf(pdf.pdfType)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
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
    </div>
  );
};
