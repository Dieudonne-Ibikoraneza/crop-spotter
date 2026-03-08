import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, ArrowLeft, Sprout, MapPin } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { BasicInfoTab } from "@/components/assessor/tabs/BasicInfoTab";
import { WeatherAnalysisTab } from "@/components/assessor/tabs/WeatherAnalysisTab";
import { SatelliteAnalysisTab } from "@/components/assessor/tabs/SatelliteAnalysisTab";
import { OverviewTab } from "@/components/assessor/tabs/OverviewTab";

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
  crop: string;
  area: number;
  season: string;
  status: "active" | "moderate" | "healthy";
  location: string;
}

const CropMonitoring = () => {
  const navigate = useNavigate();
  const { farmerId, fieldId } = useParams();

  // Format field ID as FLD-{three capitalized characters}
  const formatFieldId = (id: string) => {
    if (!id || id.length < 3) return id;
    return `FLD-${id.substring(0, 3).toUpperCase()}`;
  };

  const farmers: Farmer[] = [
    {
      id: "F-001",
      name: "Mugabo John",
      location: "Gatsibo, Eastern Province",
      fields: 3,
    },
    {
      id: "F-002",
      name: "Kamali Peace",
      location: "Bugesera, Eastern Province",
      fields: 2,
    },
    {
      id: "F-003",
      name: "Uwase Marie",
      location: "Nyagatare, Eastern Province",
      fields: 4,
    },
  ];

  const allFields: Field[] = [
    {
      id: "FLD-001",
      farmerId: "F-001",
      farmerName: "Mugabo John",
      crop: "Maize",
      area: 3.4,
      season: "B",
      status: "healthy",
      location: "Kigali City, Rwanda",
    },
    {
      id: "FLD-002",
      farmerId: "F-002",
      farmerName: "Kamali Peace",
      crop: "Wheat",
      area: 2.1,
      season: "A",
      status: "moderate",
      location: "Rwamagana District, Eastern Province, Rwanda",
    },
    {
      id: "FLD-003",
      farmerId: "F-003",
      farmerName: "Uwase Marie",
      crop: "Soybean",
      area: 1.8,
      season: "B",
      status: "active",
      location: "Ngoma District, Eastern Province, Rwanda",
    },
    {
      id: "FLD-004",
      farmerId: "F-001",
      farmerName: "Mugabo John",
      crop: "Rice",
      area: 2.5,
      season: "A",
      status: "healthy",
      location: "Kigali City, Rwanda",
    },
    {
      id: "FLD-005",
      farmerId: "F-001",
      farmerName: "Mugabo John",
      crop: "Beans",
      area: 1.4,
      season: "B",
      status: "active",
      location: "Bugesera District, Eastern Province, Rwanda",
    },
  ];

  const farmerColumns = [
    { key: "id", label: "Farmer ID" },
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
    { key: "id", label: "Field ID" },
    { key: "farmerName", label: "Farmer" },
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
            navigate(`/assessor/crop-monitoring/${field.farmerId}/${field.id}`)
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
        <div>
          <h1 className="text-3xl font-bold mb-2">Crop Monitoring</h1>
          <p className="text-muted-foreground">
            Satellite-based crop health and NDVI analysis
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
            navigate(`/assessor/crop-monitoring/${farmer.id}`)
          }
        />
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
          onClick={() => navigate("/assessor/crop-monitoring")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Farmers
        </Button>

        <div>
          <h1 className="text-3xl font-bold mb-2">{farmer?.name} - Fields</h1>
          <p className="text-muted-foreground">
            Select a field for crop monitoring
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
        onClick={() => navigate(`/assessor/crop-monitoring/${farmerId}`)}
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
          <TabsTrigger value="crop">🌱 Crop Analysis (Satellite)</TabsTrigger>
          <TabsTrigger value="overview">📝 Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-6">
          <BasicInfoTab
            fieldId={field.id}
            fieldName="North Maize Plot"
            farmerId={field.farmerId}
            farmerName={field.farmerName}
            cropType={field.crop}
            area={field.area}
            season={field.season}
            location={field.location}
          />
        </TabsContent>

        <TabsContent value="weather" className="mt-6">
          <WeatherAnalysisTab
            fieldId={field.id}
            farmerName={field.farmerName}
            cropType={field.crop}
            location={field.location}
          />
        </TabsContent>

        <TabsContent value="crop" className="mt-6">
          <SatelliteAnalysisTab
            fieldId={field.id}
            farmerName={field.farmerName}
            cropType={field.crop}
            area={field.area}
            season={field.season}
            region="Eastern Province"
          />
        </TabsContent>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab
            fieldStatus="Healthy"
            weatherRisk="Low (1.5/5)"
            cropHealth="82.4% (from satellite)"
            recommendation="Continue monitoring"
            analysisType="satellite"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CropMonitoring;
