import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Leaf, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminCropMonitoringAll } from "@/lib/api/hooks/useAdmin";
import type { CropMonitoringRecord } from "@/lib/api/services/cropMonitoring";
import { AdminFarmDetailDialog } from "@/components/admin/AdminFarmDetailDialog";
import {
  displayFarmName,
  displayFarmerName,
  displayPolicyRef,
  displayUserName,
  refIdString,
} from "@/lib/utils/adminDisplay";

function policyIdOf(r: CropMonitoringRecord): string {
  return refIdString(r.policyId);
}

const AdminCropMonitoring = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch, isFetching } = useAdminCropMonitoringAll();
  const [q, setQ] = useState("");
  const [farmDialog, setFarmDialog] = useState<{
    farmId: string;
    farmerNameHint?: string;
  } | null>(null);

  const rows = data ?? [];

  /** One row per policy — monitoring cycles are opened on the detail page. */
  const policyGroups = useMemo(() => {
    const map = new Map<string, CropMonitoringRecord[]>();
    for (const r of rows) {
      const pid = policyIdOf(r);
      if (!pid) continue;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(r);
    }
    const out: {
      policyId: string;
      cycles: CropMonitoringRecord[];
      sample: CropMonitoringRecord;
    }[] = [];
    for (const [policyId, cycles] of map) {
      const sorted = [...cycles].sort(
        (a, b) => a.monitoringNumber - b.monitoringNumber,
      );
      out.push({
        policyId,
        cycles: sorted,
        sample: sorted[0],
      });
    }
    out.sort(
      (a, b) =>
        new Date(b.sample.updatedAt || b.sample.monitoringDate || 0).getTime() -
        new Date(a.sample.updatedAt || a.sample.monitoringDate || 0).getTime(),
    );
    return out;
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return policyGroups;
    return policyGroups.filter((g) => {
      const pol = displayPolicyRef(g.sample.policyId).toLowerCase();
      const farm = displayFarmName(g.sample.farmId).toLowerCase();
      const farmer = displayFarmerName(
        typeof g.sample.policyId === "object" && g.sample.policyId !== null
          ? (g.sample.policyId as { farmerId?: unknown }).farmerId
          : undefined,
      ).toLowerCase();
      return (
        pol.includes(s) ||
        farm.includes(s) ||
        farmer.includes(s) ||
        g.policyId.toLowerCase().includes(s)
      );
    });
  }, [policyGroups, q]);

  const openFarm = (sample: CropMonitoringRecord) => {
    const farmId = refIdString(sample.farmId);
    if (!farmId) return;
    const policy = sample.policyId;
    let farmerNameHint: string | undefined;
    if (policy && typeof policy === "object" && "farmerId" in policy) {
      const n = displayUserName((policy as { farmerId?: unknown }).farmerId);
      if (n !== "—") farmerNameHint = n;
    }
    setFarmDialog({ farmId, farmerNameHint });
  };

  const cycleSummary = (cycles: CropMonitoringRecord[]) => {
    const completed = cycles.filter((c) => c.status === "COMPLETED").length;
    const inProg = cycles.some((c) => c.status === "IN_PROGRESS");
    if (inProg) return `${completed}/${cycles.length} done · in progress`;
    return `${completed}/${cycles.length} completed`;
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Crop monitoring</h1>
          <p className="text-muted-foreground mt-1">
            One row per policy (field assessment context). Open a row to see monitoring
            cycles and reports.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by policy, farm, or farmer…"
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Leaf className="h-5 w-5 text-emerald-600" />
            Policies ({filtered.length}
            {q.trim() ? ` of ${policyGroups.length}` : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <p className="text-center text-destructive py-12">Could not load monitoring data.</p>
          ) : policyGroups.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No monitoring data yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead className="hidden md:table-cell">Farm</TableHead>
                  <TableHead className="hidden lg:table-cell">Farmer</TableHead>
                  <TableHead>Cycles</TableHead>
                  <TableHead className="hidden xl:table-cell">Updated</TableHead>
                  <TableHead className="text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((g) => (
                  <TableRow
                    key={g.policyId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate(`/admin/crop-monitoring/policy/${g.policyId}`)
                    }
                  >
                    <TableCell className="font-mono text-sm">
                      {displayPolicyRef(g.sample.policyId)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {refIdString(g.sample.farmId) ? (
                        <button
                          type="button"
                          className="text-left text-primary hover:underline font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFarm(g.sample);
                          }}
                        >
                          {displayFarmName(g.sample.farmId)}
                        </button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {typeof g.sample.policyId === "object" &&
                      g.sample.policyId !== null &&
                      "farmerId" in g.sample.policyId
                        ? displayFarmerName(
                            (g.sample.policyId as { farmerId?: unknown }).farmerId,
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="w-fit">
                          {g.cycles.length} cycle{g.cycles.length === 1 ? "" : "s"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {cycleSummary(g.cycles)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                      {g.sample.updatedAt
                        ? format(new Date(g.sample.updatedAt), "PP")
                        : g.sample.monitoringDate
                          ? format(new Date(g.sample.monitoringDate), "PP")
                          : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/crop-monitoring/policy/${g.policyId}`);
                        }}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AdminFarmDetailDialog
        open={!!farmDialog}
        onOpenChange={(o) => !o && setFarmDialog(null)}
        farmId={farmDialog?.farmId ?? null}
        farmerNameHint={farmDialog?.farmerNameHint}
      />
    </div>
  );
};

export default AdminCropMonitoring;
