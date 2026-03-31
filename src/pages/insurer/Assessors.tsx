import { useState } from "react";
import { format } from "date-fns";
import {
  Users,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Phone,
  Shield,
  MapPin,
  Fingerprint,
  User,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAssessors } from "@/lib/api/hooks/useUsers";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

const statusBadge = (a: any) => {
  if (a.status === "ACTIVE" || (a.active && !a.status))
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
        Active
      </Badge>
    );
  if (a.status === "BUSY")
    return (
      <Badge variant="secondary">
        <Clock className="h-3.5 w-3.5 mr-1" />
        Busy
      </Badge>
    );
  return <Badge variant="outline">Offline</Badge>;
};

const InsurerAssessors = () => {
  const [selectedAssessor, setSelectedAssessor] = useState<any>(null);
  const { data: assessors, isLoading, error } = useAssessors();

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Error loading assessors. Please try again later.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Assessors</h1>
        <p className="text-muted-foreground mt-1">
          Assignment roster for evaluators.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assessors?.map((a) => (
          <Card
            key={a.id}
            className="border-border/60 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedAssessor(a)}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center justify-between gap-4">
                <span className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-bold leading-tight">
                    {a.firstName} {a.lastName}
                  </span>
                </span>
                <div className="shrink-0">{statusBadge(a)}</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Email Address
                  </span>
                  <p className="font-medium truncate">{a.email}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Phone Number
                  </span>
                  <p className="font-medium">{a.phoneNumber || "---"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Professional Role
                  </span>
                  <p className="font-medium uppercase text-xs text-primary">
                    {a.role}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Region
                  </span>
                  <p className="font-medium text-xs">
                    {a.district || "---"}, {a.province || "---"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet
        open={!!selectedAssessor}
        onOpenChange={() => setSelectedAssessor(null)}
      >
        <SheetContent className="sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Assessor Details
            </SheetTitle>
            <SheetDescription>
              Comprehensive profile for {selectedAssessor?.firstName}{" "}
              {selectedAssessor?.lastName}
            </SheetDescription>
          </SheetHeader>

          {selectedAssessor && (
            <div className="mt-8 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Availability Status
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Status</span>
                  {statusBadge(selectedAssessor)}
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Joined On
                    </Label>
                    <p className="font-medium">
                      {selectedAssessor.createdAt
                        ? format(new Date(selectedAssessor.createdAt), "PPP")
                        : "---"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Email Address
                      </Label>
                      <p className="font-medium">{selectedAssessor.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Phone Number
                      </Label>
                      <p className="font-medium">
                        {selectedAssessor.phoneNumber || "---"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Personal Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Fingerprint className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        National ID
                      </Label>
                      <p className="font-medium text-xs">
                        {selectedAssessor.nationalId || "---"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Gender
                      </Label>
                      <p className="font-medium">
                        {selectedAssessor.sex || "---"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Location Context
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10 shrink-0">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Province
                        </Label>
                        <p className="font-medium">
                          {selectedAssessor.province || "---"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          District
                        </Label>
                        <p className="font-medium">
                          {selectedAssessor.district || "---"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Sector
                        </Label>
                        <p className="font-medium">
                          {selectedAssessor.sector || "---"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Cell
                        </Label>
                        <p className="font-medium">
                          {selectedAssessor.cell || "---"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">
                          Village
                        </Label>
                        <p className="font-medium">
                          {selectedAssessor.village || "---"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default InsurerAssessors;
