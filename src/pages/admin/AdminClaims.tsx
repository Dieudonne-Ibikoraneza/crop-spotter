import { useState } from "react";
import { format } from "date-fns";
import { Loader2, FileWarning, Search } from "lucide-react";
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
import { useAdminAllClaims } from "@/lib/api/hooks/useAdmin";
import type { Claim } from "@/lib/api/services/claims";
import { AdminFarmDetailDialog } from "@/components/admin/AdminFarmDetailDialog";
import { displayFarmName, refIdString } from "@/lib/utils/adminDisplay";
import { formatBackendEnumLabel } from "@/lib/crops";

function farmerName(c: Claim): string {
  const f = c.farmerId;
  if (f && typeof f === "object") {
    return [f.firstName, f.lastName].filter(Boolean).join(" ").trim() || f.email || "—";
  }
  return "—";
}

function farmName(c: Claim): string {
  return displayFarmName(c.farmId);
}

const AdminClaims = () => {
  const { data, isLoading, error, refetch, isFetching } = useAdminAllClaims();
  const [selected, setSelected] = useState<Claim | null>(null);
  const [q, setQ] = useState("");
  const [farmDialog, setFarmDialog] = useState<{
    farmId: string;
    farmerNameHint?: string;
  } | null>(null);

  const rows = data ?? [];

  const filtered = rows.filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      (c.lossEventType || "").toLowerCase().includes(s) ||
      farmName(c).toLowerCase().includes(s) ||
      farmerName(c).toLowerCase().includes(s)
    );
  });

  const openFarm = (c: Claim) => {
    const farmId = refIdString(c.farmId);
    const farmerId = refIdString(c.farmerId);
    if (!farmId || !farmerId) return;
    setFarmDialog({
      farmId,
      farmerId,
      farmerName: farmerName(c),
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Claims</h1>
          <p className="text-muted-foreground mt-1">All claims (admin, view only).</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Refresh
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by event, farm, or farmer…"
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileWarning className="h-5 w-5" />
            Claims ({filtered.length}
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
            <p className="text-center text-destructive py-12">Could not load claims.</p>
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No claims.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Farm</TableHead>
                  <TableHead className="hidden lg:table-cell">Filed</TableHead>
                  <TableHead className="text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected(c)}
                  >
                    <TableCell className="font-medium">
                      {formatBackendEnumLabel(c.lossEventType)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {refIdString(c.farmId) ? (
                        <button
                          type="button"
                          className="text-left text-primary hover:underline font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFarm(c);
                          }}
                        >
                          {farmName(c)}
                        </button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {c.filedAt ? format(new Date(c.filedAt), "PP") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(c);
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

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Claim</SheetTitle>
            <SheetDescription className="font-mono text-xs">{selected?._id}</SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Status</span>
                <Badge>{selected.status}</Badge>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Event</span>
                <span>{formatBackendEnumLabel(selected.lossEventType)}</span>
              </div>
              <Separator />
              <p className="text-xs font-medium text-muted-foreground">Farmer</p>
              <p>{farmerName(selected)}</p>
              <p className="text-xs font-medium text-muted-foreground">Farm</p>
              {refIdString(selected.farmId) ? (
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => openFarm(selected)}
                >
                  {farmName(selected)}
                </button>
              ) : (
                <p>—</p>
              )}
              {selected.lossDescription && (
                <>
                  <p className="text-xs font-medium text-muted-foreground">Description</p>
                  <p className="text-muted-foreground">{selected.lossDescription}</p>
                </>
              )}
              <Separator />
              <p className="text-xs text-muted-foreground">
                Filed {selected.filedAt ? format(new Date(selected.filedAt), "PPp") : "—"}
              </p>
              {selected.payoutAmount != null && (
                <p className="text-xs">Payout: {selected.payoutAmount.toLocaleString()}</p>
              )}
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

export default AdminClaims;
