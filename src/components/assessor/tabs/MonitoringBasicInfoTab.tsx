import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sprout, MapPin, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { FieldMapWithLayers } from "../FieldMapWithLayers";
import { CropMonitoringRecord } from "@/lib/api/services/cropMonitoring";

interface MonitoringBasicInfoTabProps {
  fieldId: string;
  fieldName: string;
  farmerName: string;
  cropType: string;
  area: number;
  season: string;
  location: string;
  boundary?: {
    type: string;
    coordinates: number[][][] | number[][][][];
  } | null;
  locationCoords?: number[];
  cycles: CropMonitoringRecord[];
  activeCycle?: CropMonitoringRecord;
  onStartCycle: () => void;
  isStartingCycle: boolean;
}

export const MonitoringBasicInfoTab = ({
  fieldId,
  fieldName,
  farmerName,
  cropType,
  area,
  season,
  location,
  boundary,
  locationCoords,
  cycles,
  activeCycle,
  onStartCycle,
  isStartingCycle,
}: MonitoringBasicInfoTabProps) => {
  const formattedFieldId = fieldId
    ? `FLD-${fieldId.slice(0, 3).toUpperCase()}`
    : "N/A";

  const center =
    locationCoords && locationCoords.length >= 2
      ? ([locationCoords[1], locationCoords[0]] as [number, number])
      : undefined;

  return (
    <div className="space-y-6">
      {/* Field Information */}
      <Card>
        <CardHeader>
          <CardTitle>Field Information</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Field ID</p>
              <p className="font-medium font-mono text-sm">{formattedFieldId}</p>
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
            <div>
              <p className="text-sm text-muted-foreground mb-1">Location</p>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <p className="font-medium">{location}</p>
              </div>
            </div>
          </div>
          <div className="h-[300px] rounded-lg overflow-hidden border">
            <FieldMapWithLayers
              fieldId={fieldId}
              showLayerControls={false}
              boundary={boundary as any}
              center={center}
            />
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Cycles Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            Monitoring Cycles
            <Badge variant="outline" className="font-normal">
              {cycles.length} / 2 cycles
            </Badge>
          </CardTitle>
          <Button
            className="bg-green-600 hover:bg-green-700"
            disabled={cycles.length >= 2 || !!activeCycle || isStartingCycle}
            onClick={onStartCycle}
          >
            {isStartingCycle ? "Starting..." : "Start Monitoring Cycle"}
          </Button>
        </CardHeader>
        <CardContent>
          {cycles.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No Monitoring Cycles</p>
              <p className="text-sm">Click "Start Monitoring Cycle" to begin.</p>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {cycles.map((cycle) => (
              <div
                key={cycle._id}
                className="flex items-center gap-3 p-4 rounded-lg border bg-background"
              >
                {cycle.status === "COMPLETED" ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                ) : (
                  <Clock className="h-6 w-6 text-amber-500 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">Cycle #{cycle.monitoringNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    Started: {new Date(cycle.monitoringDate).toLocaleDateString()}
                  </p>
                  {cycle.reportGeneratedAt && (
                    <p className="text-xs text-muted-foreground">
                      Completed: {new Date(cycle.reportGeneratedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Badge
                  className={
                    cycle.status === "COMPLETED"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-amber-100 text-amber-800 border-amber-200"
                  }
                >
                  {cycle.status === "COMPLETED" ? "Completed" : "In Progress"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
