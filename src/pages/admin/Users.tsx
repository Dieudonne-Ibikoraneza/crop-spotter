import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Loader2,
  Search,
  Mail,
  Phone,
  MapPin,
  Shield,
  User,
  Calendar,
  Fingerprint,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useAdminUserDirectory,
  useUserDetail,
  useDeactivateUser,
} from "@/lib/api/hooks/useAdmin";
import type { UserProfile } from "@/lib/api/services/users";
import { authService } from "@/lib/api/services/auth";

const roleVariant = (role: string) => {
  switch (role) {
    case "ADMIN":
      return "destructive" as const;
    case "INSURER":
      return "default" as const;
    case "ASSESSOR":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

const AdminUsers = () => {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useAdminUserDirectory(0, 100);
  const { data: detail, isLoading: detailLoading } = useUserDetail(selectedId);
  const deactivate = useDeactivateUser();

  const currentUserId = authService.getAuthStatus().user?.userId;
  const isTargetAdmin = detail?.role === "ADMIN";

  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((u: UserProfile) => {
      const name = `${u.firstName} ${u.lastName}`.toLowerCase();
      return (
        name.includes(needle) ||
        (u.email && u.email.toLowerCase().includes(needle)) ||
        (u.phoneNumber && u.phoneNumber.includes(needle)) ||
        u.role.toLowerCase().includes(needle)
      );
    });
  }, [data?.items, q]);

  const handleDeactivate = () => {
    if (!detail?.id) return;
    deactivate.mutate(detail.id, {
      onSuccess: () => {
        setConfirmDeactivate(false);
        setSelectedId(null);
        refetch();
      },
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">
            Platform directory. Click a row for full profile and actions.
            {data != null && ` ${data.totalItems} total.`}
          </p>
        </div>
        <button
          type="button"
          className="text-sm text-primary hover:underline disabled:opacity-50"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <Card>
        <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg">Directory</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone, role…"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading users…
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive text-sm">
              Could not load users.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow
                    key={u.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedId(u.id)}
                  >
                    <TableCell className="font-medium">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {u.phoneNumber || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleVariant(u.role)}>{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.active ? "secondary" : "outline"}>
                        {u.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {u.createdAt ? format(new Date(u.createdAt), "PP") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="sm:max-w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-2xl">
              <User className="h-6 w-6 text-primary" />
              User details
            </SheetTitle>
            <SheetDescription>
              {detailLoading
                ? "Loading…"
                : detail
                  ? `${detail.firstName} ${detail.lastName}`.trim() || detail.email
                  : ""}
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : detail ? (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant={roleVariant(detail.role)}>{detail.role}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={detail.active ? "secondary" : "outline"}>
                  {detail.active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-medium break-all">{detail.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <p className="font-medium">{detail.phoneNumber || "—"}</p>
                  </div>
                </div>
                {detail.nationalId && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Fingerprint className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">National ID</Label>
                      <p className="font-medium">{detail.nationalId}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <p className="font-medium text-sm">
                      {[detail.district, detail.province, detail.sector].filter(Boolean).join(", ") ||
                        "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Sex</Label>
                    <p className="font-medium">{detail.sex || "—"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Joined</Label>
                    <p className="font-medium">
                      {detail.createdAt ? format(new Date(detail.createdAt), "PPP") : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Actions</p>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={
                    !detail.active ||
                    isTargetAdmin ||
                    detail.id === currentUserId ||
                    deactivate.isPending
                  }
                  onClick={() => setConfirmDeactivate(true)}
                >
                  {deactivate.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Deactivate user
                </Button>
                {(isTargetAdmin || detail.id === currentUserId) && (
                  <p className="text-xs text-muted-foreground">
                    Admin accounts and your own account cannot be deactivated here.
                  </p>
                )}
                {!detail.active && (
                  <p className="text-xs text-muted-foreground">User is already inactive.</p>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this user?</AlertDialogTitle>
            <AlertDialogDescription>
              They will no longer be able to sign in. This matches{" "}
              <code className="text-xs">PUT /users/:id/deactivate</code>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeactivate}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
