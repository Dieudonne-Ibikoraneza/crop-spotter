import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FieldMap } from "../FieldMap";
import { RefreshCw, Sprout } from "lucide-react";

interface SatelliteAnalysisTabProps {
  fieldId: string;
  farmerName: string;
  cropType: string;
  area: number;
  season: string;
  region: string;
}

export const SatelliteAnalysisTab = ({ 
  fieldId, 
  farmerName, 
  cropType, 
  area, 
  season, 
  region 
}: SatelliteAnalysisTabProps) => {
  return (
    <div className="space-y-6">
      {/* Field Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Field Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Farmer</p>
            <p className="font-medium">{farmerName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Field ID</p>
            <p className="font-medium">{fieldId}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Crop</p>
            <p className="font-medium">{cropType}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Area</p>
            <p className="font-medium">{area} ha</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Season</p>
            <p className="font-medium">{season}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Region</p>
            <p className="font-medium">{region}</p>
          </div>
        </CardContent>
      </Card>

      {/* Satellite Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Satellite Metrics (EOSDA)</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Healthy Area</p>
            <p className="text-2xl font-bold text-success">2.8 ha</p>
            <p className="text-xs text-muted-foreground mt-1">(82.4%)</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Stress Detected</p>
            <p className="text-2xl font-bold text-warning">0.6 ha</p>
            <p className="text-xs text-muted-foreground mt-1">(17.6%)</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Soil Moisture</p>
            <p className="text-2xl font-bold text-primary">58%</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Overall Health</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-3 h-3 rounded-full bg-success"></span>
              <p className="text-lg font-bold">Healthy</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Map with Controls */}
      <Card>
        <CardHeader>
          <CardTitle>NDVI Heatmap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <FieldMap fieldId={fieldId} showLegend={true} overlayType="ndvi" />
            
            {/* Map Controls Overlay */}
            <div className="absolute bottom-6 left-6 bg-card border border-border rounded-lg p-4 space-y-3 shadow-lg z-10">
              <div className="space-y-2">
                <label className="text-xs font-medium flex items-center gap-2">
                  <Sprout className="h-3 w-3" />
                  Crop Type
                </label>
                <Select defaultValue="maize">
                  <SelectTrigger className="w-[200px] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem value="maize">🌽 Maize</SelectItem>
                    <SelectItem value="wheat">🌾 Wheat</SelectItem>
                    <SelectItem value="rice">🌾 Rice</SelectItem>
                    <SelectItem value="beans">🫘 Beans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium">Growth Stage</label>
                <Select defaultValue="vegetative">
                  <SelectTrigger className="w-[200px] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem value="germination">🌱 Germination</SelectItem>
                    <SelectItem value="seedling">🌿 Seedling Stage</SelectItem>
                    <SelectItem value="vegetative">🌾 Vegetative Growth ⭐</SelectItem>
                    <SelectItem value="flowering">🌸 Flowering</SelectItem>
                    <SelectItem value="fruit">🍇 Fruit Development</SelectItem>
                    <SelectItem value="ripening">🌟 Ripening</SelectItem>
                    <SelectItem value="harvest">🚜 Harvest Ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button variant="outline" size="sm" className="w-full">
                <RefreshCw className="h-3 w-3 mr-2" />
                Refresh Map
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessor Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Assessor Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="Add your satellite analysis notes here..." 
            className="min-h-[120px]"
            defaultValue="Slight stress along northeast edge, likely water imbalance.&#10;&#10;Field showing good overall health. Recommend moisture check in stressed area."
          />
          <div className="flex gap-2">
            <Button>Save Analysis</Button>
            <Button variant="outline">Download Summary JSON</Button>
            <Button variant="outline">Export PDF</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
