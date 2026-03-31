import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const InsurerReports = () => {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Portfolio analytics (mock placeholder — we’ll integrate later).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Coming soon
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This will include loss ratios, claims turnaround time, risk heatmaps by district, and assessor performance.
        </CardContent>
      </Card>
    </div>
  );
};

export default InsurerReports;

