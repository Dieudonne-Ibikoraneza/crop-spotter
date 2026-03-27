import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sprout, MapPin, Calendar, Info, Clock, CheckCircle2 } from "lucide-react";
import { FieldMapWithLayers } from "../../FieldMapWithLayers";
import { Claim } from "@/lib/api/services/claims";

interface LossBasicInfoTabProps {
  field: any;
  claim: Claim;
  farmerName: string;
}

export const LossBasicInfoTab = ({
  field,
  claim,
  farmerName,
}: LossBasicInfoTabProps) => {
  const formattedFieldId = field?.id
    ? `FLD-${field.id.slice(0, 3).toUpperCase()}`
    : "N/A";

  const locationCoords = field?.location?.coordinates || field?.locationCoords;
  const center =
    locationCoords && locationCoords.length >= 2
      ? ([locationCoords[1], locationCoords[0]] as [number, number])
      : undefined;

  const formatSowingDate = (sowingDate?: string): string => {
    if (!sowingDate) return "N/A";
    try {
      const date = new Date(sowingDate);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const getLocation = (f: any): string => {
    if (f?.locationName) return f.locationName;
    if (f?.location?.coordinates && f.location.coordinates.length >= 2) {
      const lat = f.location.coordinates[1];
      const lng = f.location.coordinates[0];
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    return "Location not available";
  };

  const getSeasonFromSowingDate = (sowingDate?: string): string => {
    if (!sowingDate) return "Season A";
    const date = new Date(sowingDate);
    if (isNaN(date.getTime())) return "Season A";
    const month = date.getMonth(); // 0-11
    // Rwanda has two seasons:
    // Season A: September-January
    // Season B: February-June
    if (month >= 8 || month <= 0) {
      return "Season A";
    } else if (month >= 1 && month <= 5) {
      return "Season B";
    }
    return "Season A";
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Field & Farmer Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Field Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Farmer</p>
              <p className="font-medium">{farmerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Field ID</p>
              <p className="font-medium font-mono text-sm">{formattedFieldId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Crop Type</p>
              <div className="flex items-center gap-2">
                <Sprout className="h-4 w-4 text-primary" />
                <p className="font-medium">{field?.cropType || "N/A"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Area</p>
              <p className="font-medium">{field?.area || "0"} hectares</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Season</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <p className="font-medium">{getSeasonFromSowingDate(field?.sowingDate)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Location</p>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <p className="font-medium">{getLocation(field)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claim Info */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Claim Information</CardTitle>
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
              {claim.lossEventType}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Date Filed</p>
                  <p className="font-medium">{new Date(claim.filedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Loss Event</p>
                  <p className="font-medium text-lg text-destructive">{claim.lossEventType}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Claim Status</p>
                  <Badge variant="secondary" className="font-medium">
                    UNDER EVALUATION
                  </Badge>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t h-[400px]">
               <FieldMapWithLayers
                fieldId={field?.id}
                showLayerControls={false}
                boundary={field?.boundary}
                center={center}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
