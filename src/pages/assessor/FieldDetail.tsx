import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Calendar, Sprout, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { FieldMapWithLayers } from "@/components/assessor/FieldMapWithLayers";
import { useFarm, useAssessments } from "@/lib/api/hooks/useAssessor";
import { useAssessorClaims } from "@/lib/api/hooks/useClaims";

const FieldDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get farmId from params or query string
  const farmId =
    id || searchParams.get("fieldId") || searchParams.get("farmId");
  const farmerId = searchParams.get("farmerId");

  // Use React Query to fetch farm data
  const { data: farm, isLoading, error } = useFarm(farmId || undefined);
  const { data: assessments } = useAssessments();
  const { data: claimsData } = useAssessorClaims();

  // Find existing assessment and claim for this field
  const existingAssessment = assessments?.find(a => {
    const aFarmId = typeof a.farmId === 'object' ? a.farmId?._id : a.farmId;
    return String(aFarmId) === String(farmId);
  });

  const existingClaim = Array.isArray(claimsData) ? claimsData?.find(c => {
    const cFarmId = typeof c.farmId === 'object' ? (c.farmId as any)?._id : c.farmId;
    return String(cFarmId) === String(farmId);
  }) : null;

  // Helper functions to safely extract farmer ID and name
  // The API may return farmerId as a JSON string instead of an object
  const getFarmerIdValue = (fid: unknown): string => {
    if (!fid) return "Unknown";

    let farmerObj: Record<string, unknown> | null = null;

    // If it's a string, try to parse it as JSON
    if (typeof fid === "string") {
      try {
        // Try to parse if it's a JSON string
        if (fid.includes("{")) {
          farmerObj = JSON.parse(fid);
        }
      } catch (e) {
        // Not valid JSON, treat as plain string
        return fid;
      }
    } else if (typeof fid === "object") {
      farmerObj = fid as Record<string, unknown>;
    }

    if (farmerObj && "_id" in farmerObj) {
      const idValue = farmerObj._id;
      // Handle various ObjectId formats
      if (typeof idValue === "object" && idValue !== null) {
        // MongoDB Extended JSON: { $oid: "..." }
        if ("$oid" in idValue) {
          return String((idValue as { $oid: string }).$oid);
        }
        // Mongoose ObjectId: new ObjectId('...')
        if ("toString" in idValue) {
          return idValue.toString();
        }
        return JSON.stringify(idValue);
      }
      return String(idValue);
    }

    return typeof fid === "string" ? fid : "Unknown";
  };

  const getFarmerName = (fid: unknown): string => {
    if (!fid) return "Unknown Farmer";

    let farmerObj: Record<string, unknown> | null = null;

    // If it's a string, try to parse it as JSON
    if (typeof fid === "string") {
      try {
        if (fid.includes("{")) {
          farmerObj = JSON.parse(fid);
        }
      } catch (e) {
        return "Unknown Farmer";
      }
    } else if (typeof fid === "object") {
      farmerObj = fid as Record<string, unknown>;
    }

    if (farmerObj) {
      const firstName = farmerObj.firstName as string | undefined;
      const lastName = farmerObj.lastName as string | undefined;
      const fullName = `${firstName || ""} ${lastName || ""}`.trim();
      return fullName || "Unknown Farmer";
    }
    return "Unknown Farmer";
  };

  // Helper function to format sowing date
  const formatSowingDate = (dateStr?: string): string => {
    if (!dateStr) return 'Unknown';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Transform API data to display format
  // Note: The backend now returns farmerId as a string and farmerName separately
  const field = farm
    ? {
        id: farm.id,
        name:
          farm.name && farm.name !== farm.cropType
            ? farm.name
            : `${farm.cropType || "Field"} Field ${farm.id.substring(0, 6)}`,
        farmer: farm.farmerName || `Farmer ${farm.farmerId.substring(0, 6)}`,
        farmerId: farm.farmerId,
        crop: farm.cropType || "Unknown",
        area: farm.area || 0,
        season: getSeasonFromSowingDate(farm.sowingDate),
        location: farm.locationName
          ? farm.locationName
          : farm.location?.coordinates
            ? `${farm.location.coordinates[1].toFixed(4)}, ${farm.location.coordinates[0].toFixed(4)}`
            : "Location unknown",
        sowingDate: formatSowingDate(farm.sowingDate),
        status: farm.status?.toLowerCase() || (farm.boundary ? "healthy" : "active"),
        boundary: farm.boundary,
        locationCoords: farm.location?.coordinates,
      }
    : null;

  // Helper for Season label
  function getSeasonFromSowingDate(sowingDate?: string): string {
    if (!sowingDate) return "Season A";
    const date = new Date(sowingDate);
    if (isNaN(date.getTime())) return "Season A";
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();
    // Rwanda has three seasons:
    // Season A: September (8) - February (1)
    // Season B: March (2) - June (5)
    // Season C: July (6) - August (7)
    if (month >= 8 || month <= 1) {
      return `Season ${year} A`;
    } else if (month >= 2 && month <= 5) {
      return `Season ${year} B`;
    } else {
      return `Season ${year} C`;
    }
  }

  // Fallback for when no data
  const fallbackField = {
    id: farmId || "Unknown",
    name: "Loading...",
    farmer: farmerId || "Unknown",
    farmerId: farmerId || "",
    crop: "...",
    area: 0,
    season: "...",
    location: "...",
    sowingDate: "...",
    status: "pending" as const,
    boundary: null,
    locationCoords: undefined,
  };

  const displayField = field || fallbackField;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        <h1 className="text-3xl font-bold mb-2">
          {displayField.crop} Field
        </h1>
        <p className="text-muted-foreground">
          {displayField.farmer}
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
            Loading field data...
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-destructive mb-6">
          <p>Error loading data: {error.message}</p>
        </div>
      )}

      {/* Content - only show when not loading */}
      {!isLoading && !error && field && (
        <>
          {/* Full Width Map with NDVI Heatmap */}
          <div className="mb-6">
            <FieldMapWithLayers
              fieldId={field.id}
              showLayerControls={true}
              boundary={field.boundary || null}
              center={
                field.locationCoords
                  ? [field.locationCoords[1], field.locationCoords[0]]
                  : undefined
              }
            />
          </div>

          {/* Basic Info Section */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Field Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Field ID</span>
                  <span className="font-medium">FLD-{field.id.slice(0, 3).toUpperCase()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Farmer</span>
                  <span className="font-medium">{displayField.farmer}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Crop Type</span>
                  <span className="font-medium flex items-center gap-2">
                    <Sprout className="h-4 w-4 text-primary" />
                    {field.crop}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Area</span>
                  <span className="font-medium">
                    {field.area.toFixed(2)} hectares
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Season</span>
                  <span className="font-medium">{field.season}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Sowing Date</span>
                  <span className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {field.sowingDate}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {field.location}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status & Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Field Status
                  </p>
                  <StatusBadge
                    status={
                      field.status === "healthy"
                        ? "healthy"
                        : field.status === "moderate"
                          ? "moderate"
                          : "pending"
                    }
                    label={
                      field.status === "healthy"
                        ? "Processed"
                        : field.status === "moderate"
                          ? "In Progress"
                          : "Pending"
                    }
                  />
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    NDVI Health Score
                  </p>
                  <p className="text-2xl font-bold text-primary">--</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Awaiting satellite data
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Stress Level
                  </p>
                  <p className="text-2xl font-bold text-warning">--</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No data available
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-border">
            <Button 
              size="lg"
              className="px-8 font-medium"
              onClick={() => navigate(`/assessor/risk-assessment/${displayField.farmerId}/${displayField.id}`)}
              variant={existingAssessment ? "outline" : "default"}
            >
              {existingAssessment ? "View Risk Assessment" : "Start Risk Assessment"}
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="px-8 font-medium"
              onClick={() => navigate(`/assessor/crop-monitoring/${displayField.farmerId}/${displayField.id}`)}
            >
              Field Monitoring
            </Button>
            <Button 
              variant={existingClaim ? "secondary" : "default"}
              size="lg"
              className="px-8 font-medium"
              onClick={() => {
                const path = `/assessor/loss-assessment/${displayField.farmerId}/${displayField.id}`;
                if (existingClaim) {
                  navigate(`${path}?claimId=${existingClaim._id}`);
                } else {
                  navigate(path);
                }
              }}
            >
              {existingClaim ? "View Loss Assessment" : "Assess Loss"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default FieldDetail;
