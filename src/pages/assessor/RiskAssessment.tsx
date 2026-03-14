import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  ArrowLeft,
  Sprout,
  MapPin,
  Loader2,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { BasicInfoTab } from "@/components/assessor/tabs/BasicInfoTab";
import { WeatherAnalysisTab } from "@/components/assessor/tabs/WeatherAnalysisTab";
import { DroneAnalysisTab } from "@/components/assessor/tabs/DroneAnalysisTab";
import { OverviewTab } from "@/components/assessor/tabs/OverviewTab";
import { assessorService, farmService } from "@/lib/api/services/assessor";
import { FarmerWithFarms, Farm } from "@/lib/api/types";

interface Farmer {
  id: string;
  name: string;
  location: string;
  fields: number;
}

interface Field {
  id: string;
  farmerId: string;
  farmerName: string;
  name: string;
  crop: string;
  area: number;
  season: string;
  location: string;
  sowingDate: string;
  boundary?: {
    type: string;
    coordinates: number[][][] | number[][][][];
  } | null;
  locationCoords?: number[];
  status: "active" | "moderate" | "healthy";
}

const RiskAssessment = () => {
  const { farmerId, fieldId } = useParams();
  const navigate = useNavigate();
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);

  // Format field ID as FLD-{three capitalized characters}
  const formatFieldId = (id: string) => {
    if (!id || id.length < 3) return id;
    return `FLD-${id.substring(0, 3).toUpperCase()}`;
  };

  // Fetch assigned farmers with their farms
  const {
    data: farmersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["assignedFarmers"],
    queryFn: () => assessorService.getAssignedFarmers(),
  });

  // Fetch assessment by farm ID when fieldId is available - using same pattern as Starhawk
  const { data: assessmentData } = useQuery({
    queryKey: ["assessment", fieldId],
    queryFn: async () => {
      if (!fieldId) return null;
      try {
        // Get all assessments and find the one for this farm (same as Starhawk)
        const assessments = await assessorService.getAssessments();
        console.log("DEBUG: All assessments:", assessments);
        console.log("DEBUG: Looking for fieldId:", fieldId);

        const assessment = assessments.find((a: any) => {
          const farmIdMatch = a.farmId?._id === fieldId || a.farmId === fieldId;
          console.log(
            "DEBUG: Checking assessment:",
            a._id,
            "farmId:",
            a.farmId,
            "match:",
            farmIdMatch,
          );
          return farmIdMatch;
        });
        console.log("DEBUG: Found assessment:", assessment);
        return assessment || null;
      } catch (error) {
        console.error("Failed to fetch assessment:", error);
        return null;
      }
    },
    enabled: !!fieldId,
  });

  // Transform API data to dashboard format
  const farmers: Farmer[] =
    farmersData?.map((farmer: FarmerWithFarms) => ({
      id: farmer.id,
      name: `${farmer.firstName} ${farmer.lastName}`,
      location: `${farmer.district}, ${farmer.province} Province`,
      fields: farmer.farms?.length || 0,
    })) || [];

  // Helper function to format sowing date
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

  // Helper function to get location (with fallback to coordinates)
  const getLocation = (farm: Farm): string => {
    if (farm.locationName) return farm.locationName;
    if (farm.location?.coordinates && farm.location.coordinates.length >= 2) {
      // Coordinates are [longitude, latitude]
      const lat = farm.location.coordinates[1];
      const lng = farm.location.coordinates[0];
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    return "Location not available";
  };

  // Helper function to get location coordinates
  const getLocationCoords = (farm: Farm): number[] | undefined => {
    if (farm.location?.coordinates && farm.location.coordinates.length >= 2) {
      return farm.location.coordinates;
    }
    return undefined;
  };

  // Helper function to calculate season from sowing date
  const getSeasonFromSowingDate = (sowingDate?: string): string => {
    if (!sowingDate) return "Season A";
    const date = new Date(sowingDate);
    const month = date.getMonth(); // 0-11
    // Rwanda has two seasons:
    // Season A: September-January (main season)
    // Season B: February-June (secondary season)
    if (month >= 8 || month <= 0) {
      // September to January
      return "Season A";
    } else if (month >= 1 && month <= 5) {
      // February to June
      return "Season B";
    }
    return "Season A";
  };

  const allFields: Field[] =
    farmersData?.flatMap((farmer: FarmerWithFarms) =>
      (farmer.farms || []).map((farm: Farm) => ({
        id: farm.id,
        farmerId: farmer.id,
        farmerName: `${farmer.firstName} ${farmer.lastName}`,
        name: farm.name,
        crop: farm.cropType,
        area: farm.area || 0,
        season: getSeasonFromSowingDate(farm.sowingDate),
        location: getLocation(farm),
        sowingDate: formatSowingDate(farm.sowingDate),
        boundary: farm.boundary,
        locationCoords: getLocationCoords(farm),
        // Check if farm has boundary to determine status
        status: farm.boundary ? ("healthy" as const) : ("active" as const),
      })),
    ) || [];

  const farmerColumns = [
    {
      key: "id",
      label: "Farmer ID",
      render: (farmer: Farmer) => `F-${farmer.id.slice(0, 3).toUpperCase()}`,
    },
    { key: "name", label: "Farmer Name" },
    {
      key: "location",
      label: "Location",
      render: (farmer: Farmer) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {farmer.location}
        </div>
      ),
    },
    { key: "fields", label: "Total Fields" },
  ];

  const fieldColumns = [
    {
      key: "id",
      label: "Field ID",
      render: (field: Field) => `FLD-${field.id.slice(0, 3).toUpperCase()}`,
    },
    {
      key: "farmerName",
      label: "Farmer",
      render: (field: Field) => (
        <div className="flex items-center gap-2">
          <span>{field.farmerName}</span>
        </div>
      ),
    },
    {
      key: "crop",
      label: "Crop",
      render: (field: Field) => (
        <div className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-primary" />
          {field.crop}
        </div>
      ),
    },
    {
      key: "area",
      label: "Area (ha)",
      render: (field: Field) => `${field.area} ha`,
    },
    { key: "season", label: "Season" },
    {
      key: "status",
      label: "Status",
      render: (field: Field) => <StatusBadge status={field.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (field: Field) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            navigate(`/assessor/risk-assessment/${field.farmerId}/${field.id}`)
          }
        >
          View
        </Button>
      ),
    },
  ];

  // Farmer List View
  if (!farmerId) {
    return (
      <div className="p-8 space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">
              Loading farmers data...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-destructive">
            <p>Error loading data: {(error as Error).message}</p>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <>
            <div>
              <h1 className="text-3xl font-bold mb-2">Risk Assessment</h1>
              <p className="text-muted-foreground">
                Drone-based crop analysis and risk evaluation
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search farmers..." className="pl-10" />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>

            <DataTable
              data={farmers}
              columns={farmerColumns}
              onRowClick={(farmer) =>
                navigate(`/assessor/risk-assessment/${farmer.id}`)
              }
            />
          </>
        )}
      </div>
    );
  }

  // Field List View
  const farmer = farmers.find((f) => f.id === farmerId);
  const farmerFields = allFields.filter((f) => f.farmerId === farmerId);

  if (!fieldId) {
    return (
      <div className="p-8 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/assessor/risk-assessment")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Farmers
        </Button>

        <div>
          <h1 className="text-3xl font-bold mb-2">{farmer?.name} - Fields</h1>
          <p className="text-muted-foreground">
            Select a field for risk assessment
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search fields..." className="pl-10" />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        <DataTable data={farmerFields} columns={fieldColumns} />
      </div>
    );
  }

  // Field Detail View with Tabs
  const field = allFields.find((f) => f.id === fieldId);
  if (!field) return null;

  return (
    <div className="p-8 space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/assessor/risk-assessment/${farmerId}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Field List
      </Button>

      <div>
        <h1 className="text-3xl font-bold mb-2">
          FIELD DETAIL VIEW: {formatFieldId(field.id)}
        </h1>
        <p className="text-muted-foreground">
          {field.farmerName} - {field.crop}
        </p>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">📋 Basic Info</TabsTrigger>
          <TabsTrigger value="weather">🌦️ Weather Analysis</TabsTrigger>
          <TabsTrigger value="crop">🌿 Crop Analysis (Drone)</TabsTrigger>
          <TabsTrigger value="overview">📝 Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-6">
          <BasicInfoTab
            fieldId={field.id}
            farmerId={field.farmerId}
            fieldName={field.name || "North Maize Plot"}
            farmerName={field.farmerName}
            cropType={field.crop}
            area={field.area}
            season={field.season}
            location={field.location}
            sowingDate={field.sowingDate}
            boundary={field.boundary}
            locationCoords={field.locationCoords}
          />
        </TabsContent>

        <TabsContent value="weather" className="mt-6">
          <WeatherAnalysisTab
            fieldId={field.id}
            farmerName={field.farmerName}
            cropType={field.crop}
            location={field.location}
            assessmentId={assessmentData?._id || assessmentData?.id}
            initialNotes={assessmentData?.comprehensiveNotes || ""}
          />
        </TabsContent>

        <TabsContent value="crop" className="mt-6">
          <DroneAnalysisTab
            fieldId={field.id}
            farmerName={field.farmerName}
            cropType={field.crop}
            area={field.area}
            assessmentId={assessmentData?._id || assessmentData?.id}
            initialNotes={assessmentData?.comprehensiveNotes || ""}
          />
        </TabsContent>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab
            fieldStatus="Healthy"
            weatherRisk="Low (1.5/5)"
            cropHealth="82.4% (from drone)"
            recommendation="Continue monitoring"
            analysisType="drone"
            assessmentId={assessmentData?._id || assessmentData?.id}
            initialNotes={assessmentData?.comprehensiveNotes || ""}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskAssessment;
