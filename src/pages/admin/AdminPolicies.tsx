import { useState } from "react";
import { format } from "date-fns";
import { FileText, Loader2, Search } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAdminPoliciesList } from "@/lib/api/hooks/useAdmin";
import { AdminFarmDetailDialog } from "@/components/admin/AdminFarmDetailDialog";
import {
  displayFarmName,
  displayFarmerName,
  displayUserName,
  refIdString,
} from "@/lib/utils/adminDisplay";

type PolicyRow = {
  _id: string;
  policyNumber?: string;
  status?: string;
  coverageLevel?: string;
  premiumAmount?: number;
  startDate?: string;
  endDate?: string;
  farmId?: unknown;
  farmerId?: unknown;
  insurerId?: unknown;
};

const AdminPolicies = () => {
  const { data, isLoading, error, refetch, isFetching } = useAdminPoliciesList();
  const [selected, setSelected] = useState<PolicyRow | null>(null);
  const [q, setQ] = useState("");
  const [farmDialog, setFarmDialog] = useState<{
    farmId: string;
    farmerNameHint?: string;
  } | null>(null);

  const rows = (Array.isArray(data) ? data : []) as PolicyRow[];

  const filtered = rows.filter((p) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    const farm = displayFarmName(p.farmId).toLowerCase();
    const farmer = displayFarmerName(p.farmerId).toLowerCase();
    const pol = (p.policyNumber || p._id).toLowerCase();
    return farm.includes(s) || farmer.includes(s) || pol.includes(s);
  });

  const openFarm = (p: PolicyRow) => {
    const farmId = refIdString(p.farmId);
    if (!farmId) return;
    setFarmDialog({
      farmId,
      farmerNameHint: displayFarmerName(p.farmerId),
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Policies</h1>
          <p className="text-muted-foreground mt-1">
            All policies on the platform (admin view).
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
            <FileText className="h-5 w-5" />
            Policies ({filtered.length}
            {q.trim() ? ` of ${rows.length}` : ""})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <p className="text-center text-destructive py-12">Could not load policies.</p>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No policies yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Farm</TableHead>
                  <TableHead className="hidden lg:table-cell">Farmer</TableHead>
                  <TableHead className="text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow
                    key={p._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected(p)}
                  >
                    <TableCell className="font-mono text-sm">{p.policyNumber || p._id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.status || "—"}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {refIdString(p.farmId) ? (
                        <button
                          type="button"
                          className="text-left text-primary hover:underline font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFarm(p);
                          }}
                        >
                          {displayFarmName(p.farmId)}
                        </button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {displayFarmerName(p.farmerId)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(p); }}>
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

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Policy</SheetTitle>
            <SheetDescription className="font-mono text-xs">
              {selected?.policyNumber || selected?._id}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge>{selected.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coverage</span>
                <span>{selected.coverageLevel || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Premium</span>
                <span>
                  {selected.premiumAmount != null
                    ? selected.premiumAmount.toLocaleString()
                    : "—"}
                </span>
              </div>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Farm</p>
              {refIdString(selected.farmId) ? (
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => openFarm(selected)}
                >
                  {displayFarmName(selected.farmId)}
                </button>
              ) : (
                <p>—</p>
              )}
              <p className="text-xs font-medium text-muted-foreground">Farmer</p>
              <p>{displayFarmerName(selected.farmerId)}</p>
              <p className="text-xs font-medium text-muted-foreground">Insurer</p>
              <p>{displayUserName(selected.insurerId)}</p>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Start {selected.startDate ? format(new Date(selected.startDate), "PP") : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                End {selected.endDate ? format(new Date(selected.endDate), "PP") : "—"}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AdminFarmDetailDialog
        open={!!farmDialog}
        onOpenChange={(o) => !o && setFarmDialog(null)}
        farmId={farmDialog?.farmId ?? null}
        farmerNameHint={farmDialog?.farmerNameHint}
      />
    </div>
  );
};

export default AdminPolicies;
