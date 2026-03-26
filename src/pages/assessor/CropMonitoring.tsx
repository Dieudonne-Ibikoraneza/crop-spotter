import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, ArrowLeft, Sprout, MapPin, Plus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { MonitoringBasicInfoTab } from "@/components/assessor/tabs/MonitoringBasicInfoTab";
import { MonitoringWeatherTab } from "@/components/assessor/tabs/MonitoringWeatherTab";
import { MonitoringDroneReportTab } from "@/components/assessor/tabs/MonitoringDroneReportTab";
import { MonitoringOverviewTab } from "@/components/assessor/tabs/MonitoringOverviewTab";
import { assessorService } from "@/lib/api/services/assessor";
import { cropMonitoringService } from "@/lib/api/services/cropMonitoring";
import { policiesService } from "@/lib/api/services/policies";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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
  name?: string;
  crop: string;
  area: number;
  season: string;
  status: "active" | "moderate" | "healthy";
  location: string;
  boundary?: {
    type: string;
    coordinates: number[][][] | number[][][][];
  } | null;
  coordinates?: number[] | null;
  weatherRisk?: string;
  cropHealth?: string;
  recommendation?: string;
  region?: string;
}

const CropMonitoring = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { farmerId, fieldId } = useParams();
  const [startingCycle, setStartingCycle] = useState(false);

  // -------- Data fetching (all hooks at the top, unconditionally) --------

  // Fetch farmers data from API using the same service as Risk Assessment
  const {
    data: farmersData,
    isLoading: farmersLoading,
    error: farmersError,
  } = useQuery({
    queryKey: ["assignedFarmers"],
    queryFn: () => assessorService.getAssignedFarmers(),
  });

  // Fetch crop monitoring tasks (assessor-only)
  const { data: cropMonitoring, isLoading: monitoringLoading } = useQuery({
    queryKey: ["crop-monitoring"],
    queryFn: () => cropMonitoringService.listTasks(),
  });

  // Fetch policies visible to assessor (assigned farms only)
  const { data: policies, isLoading: policiesLoading } = useQuery({
    queryKey: ["policies"],
    queryFn: () => policiesService.listMyPolicies(),
  });

  // -------- Derived data (hooks order is now stable) --------

  const farmers = farmersData || [];

  // Get current farmer and field
  const farmer = useMemo(() => farmerId ? (farmersData || []).find((f: any) => (f._id || f.id) === farmerId) : null, [farmersData, farmerId]);

  const fields = useMemo(
    () =>
      (farmersData || []).flatMap(
        (farmer: any) =>
          farmer.farms?.map((farm: any) => ({
            id: farm._id || farm.id,
            farmerId: farmer._id || farmer.id,
            farmerName:
              farmer.name ||
              `${farmer.firstName || ""} ${farmer.lastName || ""}`.trim() ||
              farmer.email ||
              "Unknown Farmer",
            name: farm.name,
            crop: farm.cropType,
            area: farm.area || 0,
            season: farm.season || "A",
            location: farm.locationName || farm.location || "Unknown",
            status: farm.status || "active",
            boundary: farm.boundary || null,
            coordinates: farm.location?.coordinates || null,
          })) || [],
      ),
    [farmersData],
  );

  const field = useMemo(() => fieldId ? fields.find((f) => f.id === fieldId) : null, [fields, fieldId]);

  const activePolicies = useMemo(() => (policies || []).filter(
    (p: any) => p?.status === "ACTIVE" || p?.status === "active",
  ), [policies]);

  const policyByFarmId = useMemo(() => {
    const map = new Map<string, any>();
    activePolicies.forEach((p: any) => {
      const farmIdVal = p.farmId?._id || p.farmId;
      if (farmIdVal) map.set(String(farmIdVal), p);
    });
    return map;
  }, [activePolicies]);

  const fieldPolicy = useMemo(() => field?.id ? policyByFarmId.get(String(field.id)) : null, [field, policyByFarmId]);

  // Fetch monitoring cycles for the specific policy
  const {
    data: cycles,
    isLoading: cyclesLoading,
  } = useQuery({
    queryKey: ["crop-monitoring-policy", fieldPolicy?._id],
    queryFn: () => cropMonitoringService.getByPolicy(fieldPolicy!._id),
    enabled: !!fieldPolicy?._id,
  });

  const activeCycle = useMemo(() => (cycles || []).find((c) => c.status === "IN_PROGRESS"), [cycles]);

  // Mutations
  const startMutation = useMutation({
    mutationFn: () => cropMonitoringService.startCycle(fieldPolicy!._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crop-monitoring"] });
      queryClient.invalidateQueries({ queryKey: ["crop-monitoring-policy", fieldPolicy?._id] });
      toast({
        title: "Monitoring Started",
        description: "A new monitoring cycle has been started successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to start monitoring cycle.",
        variant: "destructive",
      });
    },
  });

  // -------- Derived data --------

  // Filter fields by farmer when farmerId is provided
  const farmerFields = farmerId
    ? fields.filter((f) => f.farmerId === farmerId)
    : fields;

  // Format field ID as FLD-{three capitalized characters}
  const formatFieldId = (id: string) => {
    if (!id || id.length < 3) return id;
    return `FLD-${id.substring(0, 3).toUpperCase()}`;
  };

  // -------- Column definitions (inside component so navigate is in scope) --------

  const farmerColumns = [
    { key: "id", label: "Farmer ID", render: (f: any) => f._id || f.id },
    { key: "name", label: "Farmer Name", render: (f: any) => `${f.firstName || ""} ${f.lastName || ""}`.trim() || f.email || "-" },
    {
      key: "location",
      label: "Location",
      render: (f: any) => {
        const loc = [f.province, f.district, f.sector].filter(Boolean).join(", ");
        return (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {loc || "Unknown"}
          </div>
        );
      },
    },
    { key: "fields", label: "Total Fields", render: (f: any) => f.farms?.length || 0 },
  ];

  const policyColumns = [
    { key: "policyNumber", label: "Policy Number", render: (p: any) => p.policyNumber || "N/A" },
    { key: "farmName", label: "Field", render: (p: any) => {
        const farmIdStr = typeof p.farmId === 'object' ? p.farmId._id : p.farmId;
        const f = fields.find((field) => String(field.id) === String(farmIdStr));
        return f ? (f.name || f.crop) : "Unknown Field";
      }
    },
    { key: "farmerName", label: "Farmer", render: (p: any) => {
        const farmIdStr = typeof p.farmId === 'object' ? p.farmId._id : p.farmId;
        const f = fields.find((field) => String(field.id) === String(farmIdStr));
        return f ? f.farmerName : "Unknown";
      }
    },
    { key: "status", label: "Status", render: (p: any) => <StatusBadge status={p.status} /> },
    { key: "actions", label: "Actions", render: (p: any) => {
        const farmIdStr = typeof p.farmId === 'object' ? p.farmId._id : p.farmId;
        const f = fields.find((field) => String(field.id) === String(farmIdStr));
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              if (f) navigate(`/assessor/crop-monitoring/${f.farmerId}/${f.id}`);
            }}
            disabled={!f}
          >
            Monitor Field
          </Button>
        );
      }
    },
  ];

  const fieldColumns = [
    { key: "id", label: "Field ID" },
    { key: "farmerName", label: "Farmer" },
    {
      key: "crop",
      label: "Crop",
      render: (f: Field) => (
        <div className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-primary" />
          {f.crop}
        </div>
      ),
    },
    {
      key: "area",
      label: "Area (ha)",
      render: (f: Field) => `${f.area} ha`,
    },
    { key: "season", label: "Season" },
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
          onClick={() =>
            navigate(
              `/assessor/crop-monitoring/${f.farmerId}/${f.id}`,
            )
          }
        >
          View Details
        </Button>
      ),
    },
  ];

  // -------- Loading / Error --------

  if (farmersLoading || monitoringLoading || policiesLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">
            Loading crop monitoring data...
          </p>
        </div>
      </div>
    );
  }

  if (farmersError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <h2 className="text-lg font-semibold mb-2">Error Loading Data</h2>
          <p>Failed to load crop monitoring data. Please try again later.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // -------- Views --------

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

        <Tabs defaultValue="farmers" className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="farmers">Farmers & Fields</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." className="pl-10 h-9" />
              </div>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          <TabsContent value="farmers" className="mt-0">
            <DataTable
              data={farmers || []}
              columns={farmerColumns}
              onRowClick={(farmer: any) =>
                navigate(`/assessor/crop-monitoring/${farmer._id || farmer.id}`)
              }
            />
          </TabsContent>

          <TabsContent value="policies" className="mt-0">
            <DataTable
              data={activePolicies || []}
              columns={policyColumns}
              onRowClick={(policy: any) => {
                const farmIdStr = typeof policy.farmId === 'object' ? policy.farmId._id : policy.farmId;
                const f = fields.find((field) => String(field.id) === String(farmIdStr));
                if (f) navigate(`/assessor/crop-monitoring/${f.farmerId}/${f.id}`);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Field List View
  if (farmerId && !fieldId) {
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

        <DataTable data={farmerFields || []} columns={fieldColumns} />
      </div>
    );
  }

  // Field Detail View
  if (fieldId && field) {
    return (
      <div className="p-8 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/assessor/crop-monitoring/${farmerId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Field List
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              FIELD DETAIL: {formatFieldId(field.id)}
            </h1>
            <p className="text-muted-foreground">
              {field.farmerName} - {field.crop} | Area: {field.area} ha | Season: {field.season}
            </p>
          </div>
          {fieldPolicy && (
            <Badge variant="outline" className="text-sm px-4 py-1.5 border-green-200 bg-green-50 text-green-700">
              Active Policy: {fieldPolicy.policyNumber}
            </Badge>
          )}
        </div>

        {!fieldPolicy ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-6 text-center">
            <p className="font-medium text-lg">No Active Policy</p>
            <p className="mt-1 mb-4">
              Crop monitoring requires an active insurance policy for this
              field. Please ensure a policy has been issued first.
            </p>
            <Button disabled>Start Monitoring Cycle</Button>
          </div>
        ) : (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="basic">📋 Basic Info</TabsTrigger>
              <TabsTrigger value="weather">🌦️ Weather</TabsTrigger>
              <TabsTrigger value="drone">🛸 Drone Report</TabsTrigger>
              <TabsTrigger value="overview">📝 Overview</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-0">
              <MonitoringBasicInfoTab
                fieldId={field.id}
                fieldName={field.name || "N/A"}
                farmerName={field.farmerName}
                cropType={field.crop}
                area={field.area}
                season={field.season}
                location={field.location}
                boundary={field.boundary}
                locationCoords={field.coordinates || undefined}
                cycles={cycles || []}
                activeCycle={activeCycle}
                onStartCycle={() => startMutation.mutate()}
                isStartingCycle={startMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="weather" className="mt-0">
              <MonitoringWeatherTab cycles={cycles || []} />
            </TabsContent>

            <TabsContent value="drone" className="mt-0">
              <MonitoringDroneReportTab
                monitoringId={activeCycle?._id || ""}
                activeCycle={activeCycle}
                cropType={field.crop}
                area={field.area}
              />
            </TabsContent>

            <TabsContent value="overview" className="mt-0">
              <MonitoringOverviewTab
                monitoringId={activeCycle?._id || ""}
                policyId={fieldPolicy._id}
                fieldName={field.name || "N/A"}
                cycles={cycles || []}
                activeCycle={activeCycle}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    );
  }

  // Handle 404 or invalid field
  if (fieldId && !field) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Field Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The field you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/assessor/crop-monitoring")}>
            Back to Crop Monitoring
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default CropMonitoring;
