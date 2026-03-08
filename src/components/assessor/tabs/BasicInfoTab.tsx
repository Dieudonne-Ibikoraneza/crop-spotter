import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldMapWithLayers } from "../FieldMapWithLayers";
import { Sprout, MapPin, Calendar } from "lucide-react";

interface BasicInfoTabProps {
  fieldId: string;
  farmerId: string;
  fieldName: string;
  farmerName: string;
  cropType: string;
  area: number;
  season: string;
  location: string;
  sowingDate?: string;
  boundary?: {
    type: string;
    coordinates: number[][][] | number[][][][];
  } | null;
  locationCoords?: number[];
}

export const BasicInfoTab = ({
  fieldId,
  fieldName,
  farmerName,
  cropType,
  area,
  season,
  location,
  sowingDate,
  boundary,
  locationCoords,
}: BasicInfoTabProps) => {
  // Format Field ID like in Dashboard
  const formattedFieldId = fieldId
    ? `FLD-${fieldId.slice(0, 3).toUpperCase()}`
    : "N/A";
  
  // Calculate center from location coordinates
  const center = locationCoords && locationCoords.length >= 2
    ? [locationCoords[1], locationCoords[0]] as [number, number]
    : undefined;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Field Information</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Field ID</p>
              <p className="font-medium font-mono text-sm">
                {formattedFieldId}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Field Name</p>
              <p className="font-medium">{fieldName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Farmer</p>
              <p className="font-medium">{farmerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Crop Type</p>
              <div className="flex items-center gap-2">
                <Sprout className="h-4 w-4 text-primary" />
                <p className="font-medium">{cropType}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Area</p>
              <p className="font-medium">{area} hectares</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Season</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <p className="font-medium">{season}</p>
              </div>
            </div>
            {sowingDate && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Sowing Date
                </p>
                <p className="font-medium">{sowingDate}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Location</p>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <p className="font-medium">{location}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline">Edit Info</Button>
              <Button variant="outline">View History</Button>
            </div>
          </div>
          <div className="h-[400px]">
            <FieldMapWithLayers
              fieldId={fieldId}
              showLayerControls={false}
              boundary={boundary || null}
              center={center}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
