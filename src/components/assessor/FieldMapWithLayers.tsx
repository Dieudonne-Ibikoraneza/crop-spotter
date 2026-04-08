import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers, Loader2, Map as MapIcon } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { farmService } from "@/lib/api/services/assessor";
import {
  meanOrLatestNdvi,
  ndviValuesFromSeriesResponse,
} from "@/lib/ndvi";

/** Ray-casting point-in-polygon (for synthetic grid cells inside boundary). */
function isPointInPolygon(point: number[], vs: number[][]) {
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInBoundary(point: number[], b: { type?: string; coordinates?: number[][][] }) {
  if (!b?.coordinates) return false;
  const type = (b.type || "Polygon").toLowerCase();
  if (type === "polygon") {
    return isPointInPolygon(point, b.coordinates[0] || []);
  }
  if (type === "multipolygon") {
    return b.coordinates.some((poly: number[][][]) =>
      isPointInPolygon(point, poly[0] || []),
    );
  }
  return false;
}

/** Visual preview grid (same idea as original map) when EOSDA has no series. */
function buildSyntheticIndexGrid(
  boundary: NonNullable<FieldMapWithLayersProps["boundary"]>,
  layer: LayerType,
): GeoJSON.FeatureCollection {
  let allPoints: number[][] = [];
  if (boundary.type === "Polygon") {
    allPoints = boundary.coordinates[0] || [];
  } else if (boundary.type === "MultiPolygon") {
    boundary.coordinates.forEach((poly: number[][][]) => {
      if (poly[0]) allPoints = [...allPoints, ...poly[0]];
    });
  }
  if (allPoints.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }

  const lats = allPoints.map((c) => c[1]);
  const lngs = allPoints.map((c) => c[0]);
  const bounds = {
    south: Math.min(...lats),
    north: Math.max(...lats),
    west: Math.min(...lngs),
    east: Math.max(...lngs),
  };
  const latStep = (bounds.north - bounds.south) / 25;
  const lngStep = (bounds.east - bounds.west) / 25;
  const phase =
    layer === "ndvi"
      ? 0
      : layer === "msavi"
        ? 1.1
        : layer === "evi"
          ? 2.2
          : layer === "ndwi"
            ? 3.3
            : layer === "weed"
              ? 4.4
              : 5.5;

  const features: GeoJSON.Feature[] = [];
  for (let lat = bounds.south; lat < bounds.north; lat += latStep) {
    for (let lng = bounds.west; lng < bounds.east; lng += lngStep) {
      const centerPoint = [lng + lngStep / 2, lat + latStep / 2];
      if (!isPointInBoundary(centerPoint, boundary)) continue;
      const baseValue =
        0.5 +
        Math.sin(lat * 5000 + phase) * 0.25 +
        Math.cos(lng * 5000 + phase * 0.7) * 0.2;
      const value = Math.max(0.1, Math.min(0.9, baseValue));
      features.push({
        type: "Feature",
        properties: { value, source: "preview" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [lng, lat],
              [lng + lngStep, lat],
              [lng + lngStep, lat + latStep],
              [lng, lat + latStep],
              [lng, lat],
            ],
          ],
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

interface FieldMapWithLayersProps {
  fieldId: string;
  showLayerControls?: boolean;
  boundary: {
    type: string;
    coordinates: number[][][];
  } | null;
  center?: [number, number];
}

type LayerType = "none" | "ndvi" | "msavi" | "evi" | "ndwi" | "weed" | "pest";
type TerrainType = "osm" | "satellite" | "terrain" | "hybrid";

const VEGETATION_LAYERS: LayerType[] = ["ndvi", "msavi", "evi", "ndwi"];

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
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const indexLayerRef = useRef<L.GeoJSON | null>(null);

  const dateEnd = format(new Date(), "yyyy-MM-dd");
  const dateStart = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const fetchVegetation =
    selectedLayer !== "none" && VEGETATION_LAYERS.includes(selectedLayer);

  const { data: ndviSeriesRaw, isLoading: ndviLoading, isError: ndviError } =
    useQuery({
      queryKey: ["farm", fieldId, "ndvi-series", dateStart, dateEnd],
      queryFn: () =>
        farmService.getNdviTimeSeries(fieldId, dateStart, dateEnd),
      enabled: !!fieldId && fetchVegetation && !!boundary?.coordinates?.length,
      staleTime: 5 * 60 * 1000,
    });

  const liveNdvi = useMemo(() => {
    if (!ndviSeriesRaw) return null;
    return meanOrLatestNdvi(ndviValuesFromSeriesResponse(ndviSeriesRaw));
  }, [ndviSeriesRaw]);

  const hasLiveNdvi =
    VEGETATION_LAYERS.includes(selectedLayer) &&
    liveNdvi != null &&
    !Number.isNaN(liveNdvi);

  /**
   * Single GeoJSON for the active layer. Prefer EOSDA mean NDVI for vegetation indices;
   * otherwise same preview grid as before so the map always shows a pattern.
   */
  const indexData = useMemo((): GeoJSON.FeatureCollection | null => {
    if (selectedLayer === "none" || !boundary?.coordinates?.length) {
      return null;
    }
    if (hasLiveNdvi) {
      return {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { value: liveNdvi as number, source: "eosda" },
            geometry: boundary,
          },
        ],
      };
    }
    if (
      VEGETATION_LAYERS.includes(selectedLayer) ||
      selectedLayer === "weed" ||
      selectedLayer === "pest"
    ) {
      return buildSyntheticIndexGrid(boundary, selectedLayer);
    }
    return null;
  }, [boundary, selectedLayer, liveNdvi, hasLiveNdvi]);

  useEffect(() => {
    if (!boundary || !boundary.coordinates || !boundary.coordinates[0]) {
      const defaultCenter = center || [-1.9565, 30.0615];
      const map = L.map(mapContainerRef.current).setView(
        defaultCenter,
        15,
        { animate: false }
      );

      setMapInstance(map);

      return () => {
        map.off();
        map.remove();
        setMapInstance(null);
      };
    }

    const outerRing =
      boundary.type === "MultiPolygon"
        ? boundary.coordinates[0]?.[0]
        : boundary.type === "Polygon"
          ? boundary.coordinates[0]
          : null;
    if (!outerRing?.length) {
      const defaultCenter = center || [-1.9565, 30.0615];
      const map = L.map(mapContainerRef.current!).setView(defaultCenter, 15, { animate: false });
      setMapInstance(map);
      return () => {
        map.off();
        map.remove();
        setMapInstance(null);
      };
    }
    const lats = outerRing.map((coord: number[]) => coord[1]);
    const lngs = outerRing.map((coord: number[]) => coord[0]);
    const viewCenter = center || [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
    ];

    const map = L.map(mapContainerRef.current).setView(viewCenter, 15, { animate: false });

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

    boundaryLayerRef.current = L.geoJSON(fieldGeometry as any, {
      style: {
        color: "#ffffff",
        weight: 3,
        fillColor: "transparent",
        fillOpacity: 0,
      },
    }).addTo(map);

    const bounds = boundaryLayerRef.current.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], animate: false });
    }

    setMapInstance(map);

    return () => {
      map.off();
      map.remove();
      setMapInstance(null);
    };
  }, [boundary, center]);

  useEffect(() => {
    if (!mapInstance) return;

    if (tileLayerRef.current) {
      mapInstance.removeLayer(tileLayerRef.current);
    }
    if (labelsLayerRef.current) {
      mapInstance.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    const terrainConfig = terrainOptions[terrain];
    tileLayerRef.current = L.tileLayer(terrainConfig.url, {
      attribution: terrainConfig.attribution,
    }).addTo(mapInstance);

    if (terrainConfig.labelsUrl) {
      labelsLayerRef.current = L.tileLayer(terrainConfig.labelsUrl, {
        attribution: "",
      }).addTo(mapInstance);
    }

    if (indexLayerRef.current) {
      indexLayerRef.current.bringToFront();
    }
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.bringToFront();
    }
  }, [mapInstance, terrain]);

  useEffect(() => {
    if (!mapInstance) return;

    if (indexLayerRef.current) {
      mapInstance.removeLayer(indexLayerRef.current);
      indexLayerRef.current = null;
    }

    if (selectedLayer === "none" || !indexData?.features?.length) return;

    const colors = layerConfig[selectedLayer].colors;

    indexLayerRef.current = L.geoJSON(indexData as GeoJSON.GeoJsonObject, {
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
    }).addTo(mapInstance);

    // Keep boundary on top
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.bringToFront();
    }
  }, [mapInstance, selectedLayer, indexData]);

  const currentLayerConfig = layerConfig[selectedLayer];

  const showNdviStatus =
    fetchVegetation && !!boundary?.coordinates?.length;

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border">
      {/* Leaflet Map */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0" />

      {showNdviStatus && ndviLoading && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2 rounded-md border bg-card/95 px-3 py-2 text-xs shadow-lg">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading EOSDA NDVI…
        </div>
      )}
      {showNdviStatus && !ndviLoading && ndviError && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1001] max-w-sm rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          EOSDA unavailable — showing preview pattern. Check field ID / API.
        </div>
      )}
      {showNdviStatus &&
        !ndviLoading &&
        !ndviError &&
        !hasLiveNdvi && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1001] max-w-sm rounded-md border bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-lg">
            No EOSDA NDVI in the last 30 days — preview pattern shown.
          </div>
        )}

      {/* Top Right - Legend (Always show if a layer is active, independent of controls) */}
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
        </>
      )}
    </div>
  );
};
