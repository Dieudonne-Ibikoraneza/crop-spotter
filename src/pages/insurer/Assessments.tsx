import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ClipboardCheck,
  Search,
  Loader2,
  Calendar,
  User,
  MapPin,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAssessments } from "@/lib/api/hooks/useAssessor";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/ui/status-badge";

const InsurerAssessments = () => {
  const [q, setQ] = useState("");
  const { data: assessments, isLoading, error } = useAssessments();

  const rows = useMemo(() => {
    if (!assessments) return [];
    const query = q.trim().toLowerCase();
    
    // Filter for only SUBMITTED, COMPLETED, or APPROVED assessments
    // as those are the ones insurers care about for policy issuance
    const relevantAssessments = assessments.filter(
      (a: any) => 
        a.status === "SUBMITTED" || 
        a.status === "COMPLETED" || 
        a.status === "APPROVED" ||
        a.status === "POLICY_ISSUED"
    );

    if (!query) return relevantAssessments;

    return relevantAssessments.filter((a: any) => {
      const farmName = typeof a.farmId === "object" ? a.farmId?.name || "" : "";
      const farmerName =
        typeof a.farmerId === "object"
          ? `${a.farmerId?.firstName} ${a.farmerId?.lastName}`
          : "";
      const assessorName = 
        typeof a.assessorId === "object"
          ? `${a.assessorId?.firstName} ${a.assessorId?.lastName}`
          : "";
      
      return [farmName, farmerName, assessorName, a.status, a.assessmentNumber]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [q, assessments]);

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
        Error loading assessments. Please try again later.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Assessments Hub</h1>
          <p className="text-muted-foreground mt-1">
            Review field assessments and issue insurance policies.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-[300px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search farm, farmer, or status..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rows.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground font-medium">No assessments found matching your search.</p>
          </div>
        ) : (
          rows.map((assessment: any) => (
            <Card key={assessment._id} className="group hover:shadow-lg transition-all duration-300 border-primary/10 overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                    {assessment.assessmentNumber || assessment._id.substring(0, 8)}
                  </Badge>
                  <StatusBadge status={assessment.status} />
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  {typeof assessment.farmId === "object" ? assessment.farmId.name : "Unknown Farm"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {typeof assessment.farmerId === "object" 
                        ? `${assessment.farmerId.firstName} ${assessment.farmerId.lastName}`
                        : "Unknown Farmer"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground justify-end">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>{format(new Date(assessment.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {typeof assessment.farmId === "object" 
                        ? assessment.farmId.locationName || "No location"
                        : "Unknown Location"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Risk: {assessment.riskScore ?? assessment.risk_score ?? "N/A"}
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-2">
                  <Button asChild className="w-full gap-2 group/btn" variant="default">
                    <Link to={`/insurer/assessments/${assessment._id}`}>
                      View Details
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default InsurerAssessments;
