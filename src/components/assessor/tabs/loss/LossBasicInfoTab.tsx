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

  const formatLocation = (loc: any) => {
    if (!loc) return "N/A";
    if (typeof loc === 'string') return loc;
    if (loc.coordinates && Array.isArray(loc.coordinates)) {
      return `${loc.coordinates[1].toFixed(4)}, ${loc.coordinates[0].toFixed(4)}`;
    }
    return "N/A";
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
                <p className="font-medium">{field?.season || "N/A"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Location</p>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <p className="font-medium truncate">{formatLocation(field?.location)}</p>
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
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded border italic">
                    "{claim.lossDescription}"
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t h-[300px]">
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
