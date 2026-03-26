import { useState, useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers, Map as MapIcon } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface FieldMapWithLayersProps {
  fieldId: string;
  showLayerControls?: boolean;
  boundary: {
    type: string;
    coordinates: number[][][];
  };
  center?: [number, number];
}

type LayerType = "none" | "ndvi" | "msavi" | "evi" | "ndwi" | "weed" | "pest";
type TerrainType = "osm" | "satellite" | "terrain" | "hybrid";

const terrainOptions: Record<
  TerrainType,
  { label: string; url: string; attribution: string; labelsUrl?: string }
> = {
  osm: {
    label: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap",
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; ESRI",
  },
  hybrid: {
    label: "Hybrid",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labelsUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; ESRI",
  },
  terrain: {
    label: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenTopoMap",
  },
};

const layerConfig: Record<
  LayerType,
  { label: string; description: string; colors: string[] }
> = {
  none: {
    label: "No Layer",
    description: "Field boundary only",
    colors: [],
  },
  ndvi: {
    label: "🌱 NDVI",
    description: "Vegetation Health Index",
    colors: ["#d73027", "#fc8d59", "#fee08b", "#d9ef8b", "#91cf60", "#1a9850"],
  },
  msavi: {
    label: "🌿 MSAVI",
    description: "Soil Adjusted Vegetation",
    colors: ["#8c510a", "#bf812d", "#dfc27d", "#80cdc1", "#35978f", "#01665e"],
  },
  evi: {
    label: "🍀 EVI",
    description: "Enhanced Vegetation Index",
    colors: ["#762a83", "#af8dc3", "#e7d4e8", "#d9f0d3", "#7fbf7b", "#1b7837"],
  },
  ndwi: {
    label: "💧 NDWI",
    description: "Water Index",
    colors: ["#a50026", "#f46d43", "#fdae61", "#abd9e9", "#74add1", "#313695"],
  },
  weed: {
    label: "🟣 Weed",
    description: "Weed Detection",
    colors: ["#22c55e", "#84cc16", "#eab308", "#f97316", "#a855f7"],
  },
  pest: {
    label: "🔴 Pest",
    description: "Pest Detection",
    colors: ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"],
  },
};

export const FieldMapWithLayers = ({
  fieldId,
  showLayerControls = true,
  boundary,
  center,
}: FieldMapWithLayersProps) => {
  const [selectedLayer, setSelectedLayer] = useState<LayerType>("ndvi");
  const [terrain, setTerrain] = useState<TerrainType>("satellite");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const indexLayerRef = useRef<L.GeoJSON | null>(null);

  // Generate index data based on actual field boundary
  const indexData = useMemo(() => {
    if (!boundary) return null;

    // Extract bounds from the actual boundary
    const coords = boundary.coordinates[0]; // First ring of the polygon
    const lats = coords.map((coord) => coord[1]);
    const lngs = coords.map((coord) => coord[0]);

    const bounds = {
      south: Math.min(...lats),
      north: Math.max(...lats),
      west: Math.min(...lngs),
      east: Math.max(...lngs),
    };

    const gridSize = (bounds.north - bounds.south) / 20; // 20x20 grid within the field
    const data: Record<LayerType, any> = {} as any;

    (Object.keys(layerConfig) as LayerType[])
      .filter((k) => k !== "none")
      .forEach((index) => {
        const features: any[] = [];

        for (let lat = bounds.south; lat < bounds.north; lat += gridSize) {
          for (let lng = bounds.west; lng < bounds.east; lng += gridSize) {
            // Check if this grid point is within the field boundary
            const pointInBounds =
              lng >= bounds.west &&
              lng <= bounds.east &&
              lat >= bounds.south &&
              lat <= bounds.north;

            if (pointInBounds) {
              // Generate spatially correlated values
              const baseValue =
                0.5 + Math.sin(lat * 2000) * 0.25 + Math.cos(lng * 2000) * 0.2;
              const noise = (Math.random() - 0.5) * 0.2;
              const value = Math.max(0, Math.min(1, baseValue + noise));

              features.push({
                type: "Feature",
                properties: { value },
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [lng, lat],
                      [lng + gridSize, lat],
                      [lng + gridSize, lat + gridSize],
                      [lng, lat + gridSize],
                      [lng, lat],
                    ],
                  ],
                },
              });
            }
          }
        }

        data[index] = { type: "FeatureCollection", features };
      });

    return data;
  }, [boundary]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Require boundary to initialize map
    if (!boundary) {
      console.warn(
        "FieldMapWithLayers: No boundary provided, using default location",
      );
      // Use default location instead of throwing error
      const defaultCenter = center || [-1.9565, 30.0615]; // Rwanda coordinates
      mapRef.current = L.map(mapContainerRef.current).setView(
        defaultCenter,
        15,
        { animate: false }
      );

      const terrainConfig = terrainOptions[terrain];
      tileLayerRef.current = L.tileLayer(terrainConfig.url, {
        attribution: terrainConfig.attribution,
      }).addTo(mapRef.current);

      return () => {
        if (mapRef.current) {
          mapRef.current.off();
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }

    // Calculate center from boundary
    const coords = boundary.coordinates[0];
    const lats = coords.map((coord) => coord[1]);
    const lngs = coords.map((coord) => coord[0]);
    const viewCenter = center || [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
    ];

    mapRef.current = L.map(mapContainerRef.current).setView(viewCenter, 15, { animate: false });

    const terrainConfig = terrainOptions[terrain];
    tileLayerRef.current = L.tileLayer(terrainConfig.url, {
      attribution: terrainConfig.attribution,
    }).addTo(mapRef.current);

    // Use the provided boundary
    const fieldGeometry = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { name: "Field Boundary" },
          geometry: boundary,
        },
      ],
    };

    // Add boundary layer
    boundaryLayerRef.current = L.geoJSON(fieldGeometry as any, {
      style: {
        color: "#ffffff",
        weight: 3,
        fillColor: "transparent",
        fillOpacity: 0,
      },
    }).addTo(mapRef.current);

    const bounds = boundaryLayerRef.current.getBounds();
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [30, 30], animate: false });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [boundary, center, terrain]);

  // Update terrain
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing layers
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }
    if (labelsLayerRef.current) {
      mapRef.current.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    const terrainConfig = terrainOptions[terrain];
    tileLayerRef.current = L.tileLayer(terrainConfig.url, {
      attribution: terrainConfig.attribution,
    }).addTo(mapRef.current);

    // Add labels layer for hybrid terrain
    if (terrainConfig.labelsUrl) {
      labelsLayerRef.current = L.tileLayer(terrainConfig.labelsUrl, {
        attribution: "",
      }).addTo(mapRef.current);
    }

    // Ensure index layer is on top
    if (indexLayerRef.current) {
      indexLayerRef.current.bringToFront();
    }
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.bringToFront();
    }
  }, [terrain]);

  // Update index layer
  useEffect(() => {
    if (!mapRef.current) return;

    if (indexLayerRef.current) {
      mapRef.current.removeLayer(indexLayerRef.current);
      indexLayerRef.current = null;
    }

    if (selectedLayer === "none") return;

    const data = indexData[selectedLayer];
    if (!data) return;

    const colors = layerConfig[selectedLayer].colors;

    indexLayerRef.current = L.geoJSON(data, {
      style: (feature) => {
        const value = feature?.properties?.value || 0;
        const colorIndex = Math.min(
          Math.floor(value * colors.length),
          colors.length - 1,
        );
        return {
          color: colors[colorIndex],
          weight: 0,
          fillColor: colors[colorIndex],
          fillOpacity: 0.75,
        };
      },
    }).addTo(mapRef.current);

    // Keep boundary on top
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.bringToFront();
    }
  }, [selectedLayer, indexData]);

  const currentLayerConfig = layerConfig[selectedLayer];

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-border">
      {/* Leaflet Map */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {/* Controls Overlay */}
      {showLayerControls && (
        <>
          {/* Top Left - Terrain Selector */}
          <div className="absolute top-4 left-4 z-[1000]">
            <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg">
              <div className="px-3 py-2 flex items-center gap-2">
                <MapIcon className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={terrain}
                  onValueChange={(v) => setTerrain(v as TerrainType)}
                >
                  <SelectTrigger className="w-[130px] h-8 bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(terrainOptions).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          </div>

          {/* Bottom Center - Layer Selector */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000]">
            <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg">
              <div className="px-4 py-3 flex items-center gap-3">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Index:</span>
                <Select
                  value={selectedLayer}
                  onValueChange={(v) => setSelectedLayer(v as LayerType)}
                >
                  <SelectTrigger className="w-[160px] h-9 bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(layerConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          </div>

          {/* Top Right - Legend */}
          {selectedLayer !== "none" && currentLayerConfig.colors.length > 0 && (
            <div className="absolute top-4 right-4 z-[1000]">
              <Card className="bg-card/95 backdrop-blur-sm border-border shadow-lg">
                <div className="px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {currentLayerConfig.description}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Low</span>
                    {currentLayerConfig.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-5 h-4 first:rounded-l last:rounded-r"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground">High</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
