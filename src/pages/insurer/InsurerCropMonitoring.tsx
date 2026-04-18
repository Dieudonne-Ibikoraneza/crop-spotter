import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  ArrowLeft,
  Sprout,
  MapPin,
  Activity,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { InsurerMonitoringBasicInfoTab } from "@/components/insurer/tabs/InsurerMonitoringBasicInfoTab";
import { InsurerMonitoringWeatherTab } from "@/components/insurer/tabs/InsurerMonitoringWeatherTab";
import { InsurerMonitoringDroneReportTab } from "@/components/insurer/tabs/InsurerMonitoringDroneReportTab";
import { InsurerMonitoringOverviewTab } from "@/components/insurer/tabs/InsurerMonitoringOverviewTab";
import { cropMonitoringService } from "@/lib/api/services/cropMonitoring";
import { policiesService } from "@/lib/api/services/policies";
import { Loader2 } from "lucide-react";
import { formatCropTypeLabel, getRequiredMonitoringCycles } from "@/lib/crops";
import { Card, CardContent } from "@/components/ui/card";

const InsurerCropMonitoring = () => {
  const navigate = useNavigate();
  const { farmerId, fieldId } = useParams();

  // -------- Data fetching --------

  // Fetch all monitoring tasks (now handled for insurers by backend)
  const {
    data: allRecords,
    isPending: pendingRecords,
    isFetching: fetchingRecords,
  } = useQuery({
    queryKey: ["crop-monitoring-insurer"],
    queryFn: () => cropMonitoringService.listTasks(),
    refetchInterval: 120000, // 2-minute background cron
    staleTime: 30000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Fetch policies (all issued by this insurer)
  const {
    data: policies,
    isPending: pendingPolicies,
    isFetching: fetchingPolicies,
  } = useQuery({
    queryKey: ["insurer-policies"],
    queryFn: () => policiesService.listMyPolicies(),
    refetchInterval: 120000,
    staleTime: 30000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // -------- Derived data --------

  // Group monitoring cycles by policy
  const policyGroups = useMemo(() => {
    if (!allRecords) return [];

    const groupsMap = new Map<string, any[]>();
    allRecords.forEach((record) => {
      const pId =
        typeof record.policyId === "object"
          ? record.policyId._id
          : record.policyId;
      if (!groupsMap.has(pId)) groupsMap.set(pId, []);
      groupsMap.get(pId)!.push(record);
    });

    const result = Array.from(groupsMap.entries()).map(([policyId, cycles]) => {
      const sample = cycles[0];
      
      // Try to find the policy in our 'policies' data to get the populated farmer
      const fullPolicy = policies?.find(p => p._id === policyId);
      let farmer = fullPolicy?.farmerId;

      // If missing or just an ID, try the sample data
      if (!farmer || typeof farmer === 'string') {
        const sampleFarmer = typeof sample.policyId === "object" ? (sample.policyId as any).farmerId : null;
        if (sampleFarmer && typeof sampleFarmer === 'object' && 'firstName' in sampleFarmer) {
          farmer = sampleFarmer;
        }
      }

      return {
        policyId,
        cycles: cycles.sort((a, b) => a.monitoringNumber - b.monitoringNumber),
        sample,
        farm: sample.farmId,
        farmer: farmer,
      };
    });

    return result
      .filter((g) => g.cycles.some((c: any) => c.status === "COMPLETED"))
      .sort((a, b) => {
      const da = new Date(
        a.sample.updatedAt || a.sample.createdAt || 0,
      ).getTime();
      const db = new Date(
        b.sample.updatedAt || b.sample.createdAt || 0,
      ).getTime();
      return db - da;
    });
  }, [allRecords, policies]); // Added policies as dependency for joined data

  // If specific field is selected, find its data
  const currentGroup = useMemo(() => {
    if (!fieldId) return null;
    return policyGroups.find((g) => {
      const fId = typeof g.farm === "object" ? g.farm._id : g.farm;
      return fId === fieldId;
    });
  }, [policyGroups, fieldId]);

  const activeCycle = useMemo(
    () => currentGroup?.cycles.find((c) => c.status === "IN_PROGRESS") || null,
    [currentGroup],
  );

  const totalRecommendedCycles = useMemo(() => {
    if (!currentGroup?.farm) return 0;
    const crop =
      typeof currentGroup.farm === "object" ? currentGroup.farm.cropType : "";
    return getRequiredMonitoringCycles(crop);
  }, [currentGroup]);

  // -------- Table Columns --------

  const columns = [
    {
      key: "policy",
      label: "Policy Ref",
      render: (g: any) => {
        const policy = g.sample.policyId;
        return (
          <span className="font-mono text-sm">
            {typeof policy === "object" ? policy.policyNumber : "N/A"}
          </span>
        );
      },
    },
    {
      key: "farm",
      label: "Farm Name",
      render: (g: any) =>
        typeof g.farm === "object" ? g.farm.name : "Unknown Field",
    },
    {
      key: "farmer",
      label: "Farmer",
      render: (g: any) => {
        const farmer = g.farmer;
        // Check if farmer is a populated object with a firstName
        if (farmer && typeof farmer === "object" && 'firstName' in farmer) {
          return `${farmer.firstName} ${farmer.lastName}`;
        }
        // Fallback for when we only have the ID or data is still loading
        return farmer && typeof farmer === 'string' ? `Farmer (ID: ${farmer.slice(-4)})` : "Farmer Name Loading...";
      },
    },
    {
      key: "cycles",
      label: "Cycles",
      render: (g: any) => (
        <Badge variant="secondary" className="gap-1">
          {g.cycles.length} Total
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Sync Status",
      render: (g: any) => {
        const hasActive = g.cycles.some((c: any) => c.status === "IN_PROGRESS");
        return <StatusBadge status={hasActive ? "IN_PROGRESS" : "COMPLETED"} />;
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (g: any) => {
        const farmId = typeof g.farm === "object" ? g.farm._id : g.farm;
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/insurer/crop-monitoring/${farmId}`);
            }}
          >
            Review Data
          </Button>
        );
      },
    },
  ];

  // Only show full-page loader on the very first load (no cached data at all)
  if ((pendingRecords && !allRecords) || (pendingPolicies && !policies)) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- List View ---
  if (!fieldId) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Crop Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Satellite and drone health data for your issued policies.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full sm:w-[340px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search farm, farmer or policy..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter View
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <DataTable
              data={policyGroups}
              columns={columns}
              onRowClick={(g: any) => {
                const farmId = typeof g.farm === "object" ? g.farm._id : g.farm;
                navigate(`/insurer/crop-monitoring/${farmId}`);
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Detail View ---
  if (fieldId && currentGroup) {
    const farm = currentGroup.farm as any;
    const policy = currentGroup.sample.policyId as any;
    const farmer = currentGroup.farmer as any;

    const isSyncing = fetchingRecords || fetchingPolicies;
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
        <Button
          variant="ghost"
          onClick={() => navigate("/insurer/crop-monitoring")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold uppercase tracking-tight">
                Monitoring: {farm?.name || "Field Data"}
              </h1>
              {isSyncing && (
                <Badge
                  variant="outline"
                  className="animate-pulse bg-blue-50 text-blue-600 border-blue-200 gap-1.5 py-0.5"
                >
                  <Activity className="h-3 w-3" />
                  Background Syncing
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {currentGroup.farmer &&
              typeof currentGroup.farmer === "object" &&
              "firstName" in currentGroup.farmer
                ? `${currentGroup.farmer.firstName} ${currentGroup.farmer.lastName}`
                : "Farmer"}{" "}
              • {formatCropTypeLabel(farm?.cropType)}
            </p>
          </div>
          <div
            onClick={() => {
              if (policy?._id || policy?.policyNumber) {
                navigate(`/insurer/policies?policyId=${policy._id || policy.policyNumber}`);
              }
            }}
          >
            <Badge
              variant="outline"
              className="py-1.5 px-4 bg-primary/5 border-primary/20 text-primary font-mono text-sm cursor-pointer hover:bg-primary/10 transition-colors"
            >
              Policy: {policy?.policyNumber || "N/A"}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="basic" className="gap-2">
              📋 Basic Info
            </TabsTrigger>
            <TabsTrigger value="weather" className="gap-2">
              🌦️ Weather
            </TabsTrigger>
            <TabsTrigger value="drone" className="gap-2">
              🛸 Drone Analysis
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              🕒 History & Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-0">
            <InsurerMonitoringBasicInfoTab
              fieldId={fieldId || ""}
              fieldName={farm?.name || "N/A"}
              farmerName={farmer ? `${farmer.firstName} ${farmer.lastName}` : "N/A"}
              cropType={farm?.cropType || "N/A"}
              area={farm?.area || 0}
              season={farm?.season || "N/A"}
              location={farm?.locationName || "N/A"}
              boundary={farm?.boundary}
              locationCoords={farm?.location?.coordinates}
              cycles={currentGroup.cycles}
              activeCycle={activeCycle || undefined}
              totalRecommendedCycles={totalRecommendedCycles}
              sowingDate={farm?.sowingDate}
            />
          </TabsContent>

          <TabsContent value="weather" className="mt-0">
            <InsurerMonitoringWeatherTab cycles={currentGroup.cycles} />
          </TabsContent>

          <TabsContent value="drone" className="mt-0">
            <InsurerMonitoringDroneReportTab
              activeCycle={activeCycle || undefined}
              cycles={currentGroup.cycles}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <InsurerMonitoringOverviewTab
              monitoringId={activeCycle?._id || ""}
              policyId={policy?.policyNumber || policy?._id || ""}
              fieldName={farm?.name || "N/A"}
              farmerName={farmer ? `${farmer.firstName} ${farmer.lastName}` : "N/A"}
              cropType={farm?.cropType || "N/A"}
              area={farm?.area || 0}
              location={farm?.locationName || "N/A"}
              cycles={currentGroup.cycles}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="p-12 text-center text-muted-foreground">
      <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
      <p>No monitoring data found for this field.</p>
      <Button
        onClick={() => navigate("/insurer/crop-monitoring")}
        className="mt-4"
      >
        Return to List
      </Button>
    </div>
  );
};

export default InsurerCropMonitoring;
