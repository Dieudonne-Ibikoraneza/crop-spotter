import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import area from "@turf/area";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

interface FieldDrawInterfaceProps {
  fieldId: string | null;
  farmerName: string;
  onBack: () => void;
}

// Note: User needs to add MAPBOX_PUBLIC_TOKEN to their Supabase secrets
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

export const FieldDrawInterface = ({ fieldId, farmerName, onBack }: FieldDrawInterfaceProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  
  const [geometry, setGeometry] = useState<any>(null);
  const [calculatedArea, setCalculatedArea] = useState<number | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapInitialized) return;

    if (!MAPBOX_TOKEN) {
      toast({
        title: "Mapbox Token Missing",
        description: "Please add VITE_MAPBOX_TOKEN to your environment variables",
        variant: "destructive",
      });
      return;
    }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [30.0619, -1.9403], // Rwanda center
        zoom: 12,
      });

      draw.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        defaultMode: "draw_polygon",
      });

      map.current.addControl(draw.current);
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.current.on("draw.create", updateArea);
      map.current.on("draw.update", updateArea);
      map.current.on("draw.delete", () => {
        setGeometry(null);
        setCalculatedArea(null);
      });

      setMapInitialized(true);
    } catch (error) {
      console.error("Map initialization error:", error);
      toast({
        title: "Map Error",
        description: "Failed to initialize map. Check console for details.",
        variant: "destructive",
      });
    }

    return () => {
      map.current?.remove();
    };
  }, [mapInitialized, toast]);

  const updateArea = () => {
    if (!draw.current) return;

    const data = draw.current.getAll();
    if (data.features.length > 0) {
      const polygon = data.features[0];
      const areaInSqMeters = area(polygon);
      const areaInHectares = areaInSqMeters / 10000;

      setGeometry(polygon.geometry);
      setCalculatedArea(Number(areaInHectares.toFixed(2)));

      toast({
        title: "Polygon Drawn",
        description: `Area: ${areaInHectares.toFixed(2)} hectares`,
      });
    }
  };

  const handleProcessField = async () => {
    if (!geometry || !calculatedArea) {
      toast({
        title: "Missing Data",
        description: "Please draw a field polygon on the map",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Processing Field",
      description: "Syncing with EOSDA API to generate Field ID...",
    });

    // TODO: Call EOSDA API to register field
    setTimeout(() => {
      toast({
        title: "Field Processed Successfully",
        description: `Field ID: FLD-${Math.floor(Math.random() * 10000)}`,
      });
      navigate("/assessor/dashboard");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        ← Back to Selection
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Draw Field Boundary</CardTitle>
            <p className="text-sm text-muted-foreground">
              Use the polygon tool to draw your field boundary on the map
            </p>
          </CardHeader>
          <CardContent>
            <div 
              ref={mapContainer} 
              className="w-full h-[600px] rounded-lg border border-border"
            />
            {!MAPBOX_TOKEN && (
              <div className="flex items-center gap-2 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">
                  Mapbox token not configured. Add VITE_MAPBOX_TOKEN to environment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Field Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Field Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Farmer</Label>
              <Input value={farmerName} disabled />
            </div>
            
            <div className="space-y-2">
              <Label>Calculated Area</Label>
              <Input 
                value={calculatedArea ? `${calculatedArea} hectares` : "Draw polygon to calculate"} 
                disabled 
              />
            </div>

            <div className="space-y-2">
              <Label>Season (Auto-filled)</Label>
              <Input value="Season B" disabled />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="px-3 py-2 bg-warning/10 border border-warning/20 rounded-md">
                <p className="text-sm text-warning font-medium">
                  {geometry ? "Geometry Captured" : "Awaiting Geometry"}
                </p>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Button 
                onClick={handleProcessField}
                disabled={!geometry || !calculatedArea}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Sync & Process Field
              </Button>
              <Button 
                variant="outline" 
                onClick={onBack}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
