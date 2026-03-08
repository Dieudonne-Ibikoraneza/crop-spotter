import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  Filter,
  MapPin,
  Calendar,
  Sprout,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAssignedFarmers } from "@/lib/api/hooks/useAssessor";

interface Farmer {
  id: string;
  name: string;
  location: string;
  fields: number;
  totalArea: number;
}

interface FieldLocation {
  type: string;
  coordinates: number[];
}

interface Field {
  id: string | null;
  farmerId: string;
  farmerName: string;
  crop: string;
  area: number;
  season: string;
  status: "active" | "moderate" | "healthy" | "pending";
  eosdaFieldId?: string;
  location?: FieldLocation | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<"farmers" | "fields">("farmers");
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);

  // Use React Query to fetch assigned farmers
  const { data: farmersData, isLoading, error } = useAssignedFarmers();

  // Transform API data to dashboard format
  const farmers: Farmer[] =
    farmersData?.map((farmer) => ({
      id: farmer.id,
      name: `${farmer.firstName} ${farmer.lastName}`,
      location: `${farmer.district}, ${farmer.province} Province`,
      fields: farmer.farms?.length || 0,
      totalArea:
        farmer.farms?.reduce((sum, farm) => sum + (farm.area || 0), 0) || 0,
    })) || [];

  const allFields: Field[] =
    farmersData?.flatMap((farmer) =>
      (farmer.farms || []).map((farm) => {
        // Check if field has boundary and location (meaning KML was uploaded)
        const hasBoundary =
          farm.boundary &&
          farm.boundary.coordinates &&
          farm.boundary.coordinates.length > 0;
        const hasLocation =
          farm.location &&
          farm.location.coordinates &&
          farm.location.coordinates.length >= 2;
        const isProcessed = hasBoundary && hasLocation;

        return {
          id: farm.id || null,
          farmerId: farmer.id,
          farmerName: `${farmer.firstName} ${farmer.lastName}`,
          crop: farm.cropType,
          area: farm.area || 0,
          season: "Season A", // Default season - could be enhanced
          status: isProcessed ? ("healthy" as const) : ("pending" as const),
          eosdaFieldId: farm.id,
          location: farm.location,
        };
      }),
    ) || [];

  // Calculate stats
  const totalFarmers = farmers.length;
  const totalFields = allFields.length;
  const totalArea = allFields.reduce((sum, f) => sum + f.area, 0);
  const processedFields = allFields.filter(
    (f) => f.status === "healthy",
  ).length;

  const fields = selectedFarmer
    ? allFields.filter((f) => f.farmerId === selectedFarmer.id)
    : allFields;

  const farmerColumns = [
    { key: "id", label: "Farmer ID", render: (farmer: Farmer) => `F-${farmer.id.slice(0, 3).toUpperCase()}` },
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
    {
      key: "totalArea",
      label: "Total Area (ha)",
      render: (farmer: Farmer) => `${farmer.totalArea} ha`,
    },
  ];

  const fieldColumns = [
    {
      key: "id",
      label: "Field ID",
      render: (field: Field) =>
        field.id ? (
          <span className="font-mono text-sm">FLD-{field.id.slice(0, 3).toUpperCase()}</span>
        ) : (
          <span className="text-muted-foreground italic">Not processed</span>
        ),
    },
    {
      key: "farmerName",
      label: "Farmer",
      render: (field: Field) => (
        <div className="flex items-center gap-2">
          <span>{field.farmerName}</span>
          <span className="text-xs text-muted-foreground">F-{field.farmerId.slice(0, 3).toUpperCase()}</span>
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
      render: (field: Field) => (
        <StatusBadge
          status={field.status}
          label={
            field.status === "healthy"
              ? "Processed"
              : field.status === "moderate"
                ? "Processing"
                : "Pending"
          }
        />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (field: Field) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={field.status === "pending" ? "default" : "outline"}
            onClick={() =>
              field.status === "pending" && field.id
                ? navigate(
                    `/assessor/field-processing?fieldId=${field.id}&farmer=${field.farmerName}&name=${field.crop}`,
                  )
                : field.id
                  ? navigate(`/assessor/field/${field.id}`)
                  : navigate(
                      `/assessor/field-processing?fieldId=&farmer=${field.farmerName}&name=${field.crop}`,
                    )
            }
          >
            {field.status === "pending" ? "✏️ Process" : "👁️ View Data"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Field Management</h1>
        <p className="text-muted-foreground">
          Manage farmers and their field registrations
        </p>
      </div>

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
          <p>Error loading data: {error.message}</p>
        </div>
      )}

      {/* Stats - only show when not loading */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Farmers" value={totalFarmers} icon={MapPin} />
          <StatCard title="Total Fields" value={totalFields} icon={Sprout} />
          <StatCard
            title="Total Area"
            value={`${totalArea.toFixed(1)} ha`}
            icon={MapPin}
          />
          <StatCard
            title="Processed Fields"
            value={processedFields}
            icon={Calendar}
          />
        </div>
      )}

      {/* View Selector & Controls */}
      {!isLoading && !error && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex gap-2">
            <Button
              variant={view === "farmers" ? "default" : "outline"}
              onClick={() => {
                setView("farmers");
                setSelectedFarmer(null);
              }}
            >
              View Farmers
            </Button>
            <Button
              variant={view === "fields" ? "default" : "outline"}
              onClick={() => setView("fields")}
            >
              View All Fields
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-10 w-64" />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      {selectedFarmer && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setSelectedFarmer(null)}
            className="text-primary hover:underline"
          >
            All Farmers
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground font-medium">
            {selectedFarmer.name}
          </span>
        </div>
      )}

      {/* Table */}
      {!isLoading &&
        !error &&
        (view === "farmers" && !selectedFarmer ? (
          <DataTable
            data={farmers}
            columns={farmerColumns}
            onRowClick={(farmer) => {
              setSelectedFarmer(farmer);
              setView("fields");
            }}
          />
        ) : (
          <DataTable data={fields} columns={fieldColumns} />
        ))}
    </div>
  );
};

export default Dashboard;
