import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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

  const { data: assessmentData, isLoading: assessmentLoading } = useQuery({
    queryKey: ["assessment", fieldId],
    queryFn: async () => {
      if (!fieldId) return null;
      try {
        const assessments = await assessorService.getAssessments();
        return (
          assessments.find(
            (a: any) => (a.farmId?._id || a.farmId) === fieldId,
          ) || null
        );
      } catch (error) {
        console.error("Failed to fetch assessment:", error);
        return null;
      }
    },
    enabled: !!fieldId,
  });

  const farmers: Farmer[] = useMemo(
    () =>
      farmersData?.map((farmer: FarmerWithFarms) => ({
        id: farmer.id,
        name: `${farmer.firstName} ${farmer.lastName}`,
        location: `${farmer.district}, ${farmer.province} Province`,
        fields: farmer.farms?.length || 0,
      })) || [],
    [farmersData],
  );

  // Helper function to calculate season from sowing date
  const getSeasonFromSowingDate = (sowingDate?: string): string => {
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
  };

  const allFields: Field[] = useMemo(
    () =>
      farmersData?.flatMap((farmer: FarmerWithFarms) =>
        (farmer.farms || []).map((farm: Farm) => ({
          id: farm.id,
          farmerId: farmer.id,
          farmerName: `${farmer.firstName} ${farmer.lastName}`,
          name: farm.name,
          crop: farm.cropType,
          area: farm.area || 0,
          season: getSeasonFromSowingDate(farm.sowingDate),
          location: farm.locationName || "Unknown",
          sowingDate: farm.sowingDate ? new Date(farm.sowingDate).toLocaleDateString() : "N/A",
          boundary: farm.boundary,
          locationCoords: farm.location?.coordinates,
          status: farm.status || (farm.boundary ? "healthy" : "active"),
        })),
      ) || [],
    [farmersData],
  );

  const isGlobalLoading = isLoading || (!!fieldId && assessmentLoading);

  if (isGlobalLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse text-sm">
            Syncing assessment data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50 text-red-900">
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-2">Sync Error</h2>
            <p className="mb-4">
              Failed to load data: {(error as Error).message}
            </p>
            <Button onClick={() => window.location.reload()}>Retry Sync</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!farmerId) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Risk Assessment</h1>
          <p className="text-muted-foreground">
            Drone-based crop analysis and risk evaluation
          </p>
        </div>
        <DataTable
          data={farmers}
          columns={[
            {
              key: "id",
              label: "ID",
              render: (f: any) => `F-${f.id.slice(0, 3).toUpperCase()}`,
            },
            { key: "name", label: "Farmer Name" },
            { key: "location", label: "Location" },
            { key: "fields", label: "Total Fields" },
          ]}
          onRowClick={(f) => navigate(`/assessor/risk-assessment/${f.id}`)}
        />
      </div>
    );
  }

  if (farmerId && !fieldId) {
    const farmer = farmers.find((f) => f.id === farmerId);
    const farmerFields = allFields.filter((f) => f.farmerId === farmerId);
    return (
      <div className="p-8 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/assessor/risk-assessment")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Farmers
        </Button>
        <h1 className="text-3xl font-bold">{farmer?.name} - Fields</h1>
        <DataTable
          data={farmerFields}
          columns={[
            {
              key: "id",
              label: "ID",
              render: (f: any) => `FLD-${f.id.slice(0, 3).toUpperCase()}`,
            },
            { key: "crop", label: "Crop" },
            { key: "area", label: "Area (ha)" },
            {
              key: "status",
              label: "Status",
              render: (f: any) => <StatusBadge status={f.status} />,
            },
            {
              key: "actions",
              label: "Actions",
              render: (f: any) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/assessor/risk-assessment/${f.farmerId}/${f.id}`);
                  }}
                >
                  View Detail
                </Button>
              ),
            },
          ]}
        />
      </div>
    );
  }

  const field = allFields.find((f) => f.id === fieldId);
  if (!field) return null;

  return (
    <div className="p-8 space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/assessor/risk-assessment/${farmerId}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Field List
      </Button>
      <div>
        <h1 className="text-3xl font-bold mb-2">
          FIELD DETAIL: {formatFieldId(field.id)}
        </h1>
        <p className="text-muted-foreground">
          {field.farmerName} - {field.crop}
        </p>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">📋 Basic Info</TabsTrigger>
          <TabsTrigger value="weather">🌦️ Weather</TabsTrigger>
          <TabsTrigger value="crop">🌿 Crop (Drone)</TabsTrigger>
          <TabsTrigger value="overview">📝 Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-6">
          <BasicInfoTab
            fieldId={field.id}
            farmerId={field.farmerId}
            fieldName={field.name}
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
            assessmentId={assessmentData?._id}
            initialNotes={assessmentData?.comprehensiveNotes}
          />
        </TabsContent>

        <TabsContent value="crop" className="mt-6">
          <DroneAnalysisTab
            fieldId={field.id}
            farmerName={field.farmerName}
            cropType={field.crop}
            area={field.area}
            assessmentId={assessmentData?._id}
            status={assessmentData?.status || "IN_PROGRESS"}
          />
        </TabsContent>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab
            analysisType="drone"
            assessmentId={assessmentData?._id}
            status={assessmentData?.status || "IN_PROGRESS"}
            initialNotes={assessmentData?.comprehensiveNotes}
            dronePdfs={assessmentData?.droneAnalysisPdfs || []}
            weatherData={{}}
            farmDetails={{
              name: field.name,
              cropType: field.crop,
              area: field.area,
              location: field.location,
              farmerName: field.farmerName,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskAssessment;
