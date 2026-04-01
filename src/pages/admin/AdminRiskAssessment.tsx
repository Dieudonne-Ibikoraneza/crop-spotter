import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { BasicInfoTab } from "@/components/assessor/tabs/BasicInfoTab";
import { WeatherAnalysisTab } from "@/components/assessor/tabs/WeatherAnalysisTab";
import { DroneAnalysisTab } from "@/components/assessor/tabs/DroneAnalysisTab";
import { OverviewTab } from "@/components/assessor/tabs/OverviewTab";
import { assessorService } from "@/lib/api/services/assessor";
import type { Assessment } from "@/lib/api/services/assessor";

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

function getSeasonFromSowingDate(sowingDate?: string): string {
  if (!sowingDate) return "Season A";
  const date = new Date(sowingDate);
  if (Number.isNaN(date.getTime())) return "Season A";
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 8 || month <= 1) return `Season ${year} A`;
  if (month >= 2 && month <= 5) return `Season ${year} B`;
  return `Season ${year} C`;
}

function farmerLocationFromFarm(farm: Record<string, unknown>): string {
  const ln = farm.locationName as string | undefined;
  if (ln) return ln;
  return "Unknown";
}

/** Build farmers and fields from admin/global assessment list (populated farm + farmer when available). */
function buildFarmersAndFieldsFromAssessments(assessments: Assessment[]): {
  farmers: Farmer[];
  fields: Field[];
} {
  const fields: Field[] = [];
  const seenFarmIds = new Set<string>();
  const farmerMap = new Map<
    string,
    { name: string; location: string; count: number }
  >();

  for (const a of assessments) {
    const farm = a.farmId as unknown;
    if (!farm || typeof farm !== "object") continue;
    const f = farm as Record<string, unknown>;
    const farmId =
      (f._id && String((f._id as { toString?: () => string }).toString?.())) ||
      "";
    if (!farmId) continue;
    if (seenFarmIds.has(farmId)) continue;
    seenFarmIds.add(farmId);

    const fr = f.farmerId as Record<string, unknown> | string | undefined;
    let farmerId = "";
    let farmerName = "Unknown farmer";
    if (fr && typeof fr === "object" && !Array.isArray(fr)) {
      farmerId =
        (fr._id && String((fr._id as { toString?: () => string }).toString?.())) ||
        "";
      const fn = fr.firstName as string | undefined;
      const ln = fr.lastName as string | undefined;
      if (fn || ln) {
        farmerName = [fn, ln].filter(Boolean).join(" ").trim();
      }
    } else if (typeof fr === "string") {
      farmerId = fr;
    } else if (fr != null) {
      farmerId = String(fr);
    }

    if (!farmerId) continue;

    const loc = farmerLocationFromFarm(f);
    const existing = farmerMap.get(farmerId);
    if (existing) {
      existing.count += 1;
    } else {
      farmerMap.set(farmerId, { name: farmerName, location: loc, count: 1 });
    }

    const sowingRaw = f.sowingDate as string | undefined;
    fields.push({
      id: farmId,
      farmerId,
      farmerName,
      name: (f.name as string) || "Field",
      crop: (f.cropType as string) || "",
      area: typeof f.area === "number" ? f.area : 0,
      season: getSeasonFromSowingDate(sowingRaw),
      location: loc,
      sowingDate: sowingRaw
        ? new Date(sowingRaw).toLocaleDateString()
        : "N/A",
      boundary: f.boundary as Field["boundary"],
      locationCoords: (f.location as { coordinates?: number[] } | undefined)
        ?.coordinates,
      status:
        (f.status as Field["status"]) ||
        (f.boundary ? "healthy" : "active"),
    });
  }

  const farmers: Farmer[] = Array.from(farmerMap.entries()).map(
    ([id, v]) => ({
      id,
      name: v.name,
      location: v.location,
      fields: v.count,
    }),
  );

  return { farmers, fields };
}

const AdminRiskAssessment = () => {
  const { farmerId, fieldId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const formatFieldId = (id: string) => {
    if (!id || id.length < 3) return id;
    return `FLD-${id.substring(0, 3).toUpperCase()}`;
  };

  const {
    data: assessmentsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["assessments", "admin-risk"],
    queryFn: () => assessorService.getAssessments(),
  });

  function farmIdOfAssessment(a: Assessment): string {
    const f = a.farmId as { _id?: string } | string | undefined;
    if (f && typeof f === "object" && "_id" in f) {
      return String((f as { _id: string })._id);
    }
    if (typeof f === "string") return f;
    return "";
  }

  const { data: assessmentData, isLoading: assessmentLoading } = useQuery({
    queryKey: ["assessment", "by-field", fieldId],
    queryFn: async () => {
      if (!fieldId) return null;
      try {
        const assessments = await assessorService.getAssessments();
        return (
          assessments.find((a) => farmIdOfAssessment(a) === fieldId) || null
        );
      } catch {
        return null;
      }
    },
    enabled: !!fieldId,
  });

  const { farmers, allFields } = useMemo(() => {
    const list = assessmentsData ?? [];
    const { farmers: fm, fields } = buildFarmersAndFieldsFromAssessments(list);
    return { farmers: fm, allFields: fields };
  }, [assessmentsData]);

  const farmersFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return farmers;
    return farmers.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q),
    );
  }, [farmers, search]);

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
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Risk assessment
            </h1>
            <p className="text-muted-foreground mt-1">
              Farmers with at least one assessment (view only — same layout as
              assessor).
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search farmers..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <DataTable
              data={farmersFiltered}
              columns={[
                {
                  key: "id",
                  label: "ID",
                  render: (f: Farmer) => `F-${f.id.slice(0, 3).toUpperCase()}`,
                },
                { key: "name", label: "Farmer name" },
                { key: "location", label: "Location" },
                { key: "fields", label: "Assessed fields" },
              ]}
              onRowClick={(f) =>
                navigate(`/admin/risk-assessments/${f.id}`)
              }
            />
            {farmersFiltered.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No assessments yet, or nothing matches your search.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (farmerId && !fieldId) {
    const farmer = farmers.find((f) => f.id === farmerId);
    const farmerFields = allFields.filter((f) => f.farmerId === farmerId);
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/risk-assessments")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to farmers
        </Button>
        <h1 className="text-3xl font-bold">{farmer?.name ?? "Farmer"} — Fields</h1>
        <Card>
          <CardContent className="pt-6">
            <DataTable
              data={farmerFields}
              columns={[
                {
                  key: "id",
                  label: "ID",
                  render: (f: Field) => `FLD-${f.id.slice(0, 3).toUpperCase()}`,
                },
                { key: "crop", label: "Crop" },
                { key: "area", label: "Area (ha)" },
                {
                  key: "status",
                  label: "Status",
                  render: (f: Field) => <StatusBadge status={f.status} />,
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (f: Field) => (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          `/admin/risk-assessments/${f.farmerId}/${f.id}`,
                        );
                      }}
                    >
                      View detail
                    </Button>
                  ),
                },
              ]}
            />
            {farmerFields.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No fields for this farmer in the assessment list.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const field = allFields.find((f) => f.id === fieldId);
  if (!field) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(`/admin/risk-assessments/${farmerId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to field list
        </Button>
        <p className="mt-6 text-muted-foreground">
          Field not found in assessments, or data is still loading.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Button
        variant="ghost"
        onClick={() => navigate(`/admin/risk-assessments/${farmerId}`)}
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to field list
      </Button>
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Field detail: {formatFieldId(field.id)}
        </h1>
        <p className="text-muted-foreground">
          {field.farmerName} — {field.crop} (admin view only)
        </p>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic info</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="crop">Crop (drone)</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
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
            showActions={false}
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
            readOnly
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
            readOnly
          />
        </TabsContent>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab
            analysisType="drone"
            fieldId={field.id}
            assessmentId={assessmentData?._id}
            status={assessmentData?.status || "IN_PROGRESS"}
            initialNotes={assessmentData?.comprehensiveNotes}
            dronePdfs={assessmentData?.droneAnalysisPdfs || []}
            farmDetails={{
              name: field.name,
              cropType: field.crop,
              area: field.area,
              location: field.location,
              farmerName: field.farmerName,
            }}
            readOnly
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminRiskAssessment;
