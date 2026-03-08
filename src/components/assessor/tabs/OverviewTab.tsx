import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface OverviewTabProps {
  fieldStatus: string;
  weatherRisk: string;
  cropHealth: string;
  recommendation: string;
  analysisType: "drone" | "satellite";
}

export const OverviewTab = ({ 
  fieldStatus, 
  weatherRisk, 
  cropHealth, 
  recommendation,
  analysisType 
}: OverviewTabProps) => {
  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <span className="font-medium">Field Status</span>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-success"></span>
                  <span className="font-semibold">{fieldStatus}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <span className="font-medium">Weather Risk</span>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-success"></span>
                  <span className="font-semibold">{weatherRisk}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <span className="font-medium">Crop Health</span>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-success"></span>
                  <span className="font-semibold">{cropHealth}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <span className="font-medium">Recommendation</span>
                <span className="font-semibold">{recommendation}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-6 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-2">Analysis Method</p>
            <p className="font-medium capitalize">
              {analysisType === "drone" ? "🚁 Drone-based Assessment" : "🛰️ Satellite-based Monitoring"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Comprehensive Assessment Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="Write comprehensive feedback about the field assessment..." 
            className="min-h-[200px]"
          />
          <div className="flex gap-2">
            <Button>Save Feedback</Button>
            <Button variant="outline">Generate Full Report</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
