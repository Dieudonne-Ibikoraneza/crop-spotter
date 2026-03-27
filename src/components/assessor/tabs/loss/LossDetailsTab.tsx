import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  Save, 
  AlertCircle, 
  TrendingDown, 
  Layers, 
  Percent,
  CheckCircle2,
  Sparkles,
  Microscope
} from "lucide-react";
import { Claim, ClaimAssessment, claimsService } from "@/lib/api/services/claims";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAssessmentById } from "@/lib/api/hooks/useClaims";

interface LossDetailsTabProps {
  claim: Claim;
}

export const LossDetailsTab = ({ claim }: LossDetailsTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const assessmentFromClaim = typeof claim.assessmentReportId === 'object' 
    ? claim.assessmentReportId as ClaimAssessment 
    : null;

  const assessmentId = typeof claim.assessmentReportId === 'string' 
    ? claim.assessmentReportId 
    : assessmentFromClaim?._id;

  const { data: fetchedAssessment, isLoading: isAssessmentLoading } = useAssessmentById(assessmentId);
  
  const assessment = fetchedAssessment || assessmentFromClaim;

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [ndviBefore, setNdviBefore] = useState<string>("");
  const [ndviAfter, setNdviAfter] = useState<string>("");
  const [damageArea, setDamageArea] = useState<string>("");
  const [yieldImpact, setYieldImpact] = useState<string>("");

  useEffect(() => {
    if (assessment) {
      const savedNdviBefore = assessment.ndviBefore != null ? String(assessment.ndviBefore) : "";
      const savedNdviAfter = assessment.ndviAfter != null ? String(assessment.ndviAfter) : "";
      const savedDamageArea = assessment.damageArea != null ? String(assessment.damageArea) : "";
      const savedYieldImpact = assessment.yieldImpact != null ? String(assessment.yieldImpact) : "";

      setNdviBefore(savedNdviBefore);
      setNdviAfter(savedNdviAfter);
      
      // Auto-extraction from drone reports if saved values are empty
      let extractedArea = "";
      let extractedYield = "";

      if (assessment.droneAnalysisPdfs && assessment.droneAnalysisPdfs.length > 0) {
        for (const pdf of assessment.droneAnalysisPdfs) {
          const data = pdf.droneAnalysisData;
          if (!data) continue;

          if (data.analysis?.total_area_hectares != null && !extractedArea) {
            extractedArea = String(data.analysis.total_area_hectares);
          }

          if (data.analysis?.total_area_percent != null && !extractedYield) {
            extractedYield = String(data.analysis.total_area_percent);
          }
        }
      }

      setDamageArea(savedDamageArea || extractedArea);
      setYieldImpact(savedYieldImpact || extractedYield);

      // If NDVI is missing, trigger an automated analysis fetch
      if (!savedNdviBefore || !savedNdviAfter) {
        handleGetAnalysis();
      }
    }
  }, [assessment]);

  const handleGetAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const analysis = await claimsService.getDamageAnalysis(claim._id);
      if (analysis) {
        if (!ndviBefore) setNdviBefore(String(analysis.ndviBefore.toFixed(2)));
        if (!ndviAfter) setNdviAfter(String(analysis.ndviAfter.toFixed(2)));
        if (!damageArea && analysis.estimatedDamageArea) setDamageArea(String(analysis.estimatedDamageArea.toFixed(2)));
      }
    } catch (error) {
      console.error("Failed to fetch damage analysis:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isCompleted = ["SUBMITTED", "APPROVED", "REJECTED", "COMPLETED"].includes(claim.status);

  const updateMutation = useMutation({
    mutationFn: (data: any) => claimsService.updateAssessment(claim._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims", "detail", claim._id] });
      queryClient.invalidateQueries({ queryKey: ["assessments", "detail", assessmentId] });
      toast({ title: "Saved", description: "Loss quantification updated successfully." });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to update loss details.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      ndviBefore: parseFloat(ndviBefore) || 0,
      ndviAfter: parseFloat(ndviAfter) || 0,
      damageArea: parseFloat(damageArea) || 0,
      yieldImpact: parseFloat(yieldImpact) || 0,
    });
  };

  const ndviChange = parseFloat(ndviBefore) && parseFloat(ndviAfter) 
    ? ((parseFloat(ndviAfter) - parseFloat(ndviBefore)) / parseFloat(ndviBefore) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg">NDVI Analysis</CardTitle>
              <CardDescription>Comparison of vegetation health before and after the event</CardDescription>
            </div>
            {!isCompleted && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGetAnalysis}
                disabled={isAnalyzing}
                className="h-8 gap-2"
              >
                {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Microscope className="h-3 w-3" />}
                Analyze Satellite Data
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ndvi-before">NDVI (Before)</Label>
                <Input
                  id="ndvi-before"
                  type="number"
                  step="0.01"
                  value={ndviBefore}
                  onChange={(e) => setNdviBefore(e.target.value)}
                  disabled={isCompleted}
                  placeholder="e.g. 0.75"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ndvi-after">NDVI (After)</Label>
                <Input
                  id="ndvi-after"
                  type="number"
                  step="0.01"
                  value={ndviAfter}
                  onChange={(e) => setNdviAfter(e.target.value)}
                  disabled={isCompleted}
                  placeholder="e.g. 0.45"
                />
              </div>
            </div>

            {ndviChange && (
              <div className="p-4 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">Vegetation Health Impact</span>
                </div>
                <span className="text-xl font-bold text-orange-700">{ndviChange}% Change</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Loss Quantification</CardTitle>
            <CardDescription>Estimated damage area and impact on expected yield</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="damage-area">Affected Area (Hectares)</Label>
                <div className="relative">
                  <Layers className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="damage-area"
                    type="number"
                    step="0.1"
                    className="pl-9"
                    value={damageArea}
                    onChange={(e) => setDamageArea(e.target.value)}
                    disabled={isCompleted}
                    placeholder="Area in HA"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yield-impact">Yield Impact Percentage</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="yield-impact"
                    type="number"
                    className="pl-9"
                    value={yieldImpact}
                    onChange={(e) => setYieldImpact(e.target.value)}
                    disabled={isCompleted}
                    placeholder="0-100"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleSave} 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={updateMutation.isPending || isCompleted}
                >
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Metrics
                </Button>
              </div>
          </CardContent>
        </Card>
      </div>

      {(ndviBefore === "" || damageArea === "") && assessment?.droneAnalysisPdfs?.length ? (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary-900">
              Drone data is available. Fields have been auto-populated from your reports.
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => toast({ title: "Auto-filled", description: "Metrics extracted from reports." })}>
            Dismiss
          </Button>
        </div>
      ) : null}

      <div className="p-4 bg-muted/40 rounded-lg border border-dashed flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground mb-1">Assessor Tip</p>
          Metrics are automatically extracted from your drone PDF reports if they contain zonation or damage analysis. 
          You can manually override them here to match your physical field observations.
        </div>
      </div>
    </div>
  );
};
