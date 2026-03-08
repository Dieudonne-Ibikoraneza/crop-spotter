import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FieldMapProps {
  fieldId?: string;
  showLegend?: boolean;
  overlayType?: "none" | "ndvi" | "damage";
}

export const FieldMap = ({ fieldId, showLegend = false, overlayType = "none" }: FieldMapProps) => {
  return (
    <Card className="h-full">
      <CardContent className="p-4 h-full">
        <div className="relative h-full min-h-[400px] bg-muted/30 rounded-lg flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Map View</p>
            {fieldId && <p className="text-xs mt-1">Field: {fieldId}</p>}
            {overlayType !== "none" && (
              <p className="text-xs mt-1 capitalize">{overlayType} Overlay</p>
            )}
          </div>
          
          {showLegend && (
            <div className="absolute bottom-4 right-4 bg-card border border-border rounded-lg p-3 space-y-2 text-xs">
              <p className="font-medium mb-2">Legend</p>
              {overlayType === "ndvi" && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-success"></div>
                    <span>Healthy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-warning"></div>
                    <span>Moderate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-destructive"></div>
                    <span>Stressed</span>
                  </div>
                </>
              )}
              {overlayType === "damage" && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-destructive"></div>
                    <span>Affected Area</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-success/30"></div>
                    <span>Normal Area</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
