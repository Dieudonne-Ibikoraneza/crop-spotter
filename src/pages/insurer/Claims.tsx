import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { FileWarning, Search, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MockClaim = {
  id: string;
  farmName: string;
  farmerName: string;
  lossEventType: string;
  status: "FILED" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "REJECTED";
  filedAt: string;
  priority: "low" | "medium" | "high";
};

const MOCK_CLAIMS: MockClaim[] = [
  {
    id: "69c8ee3fd76e113555faa281",
    farmName: "NYAGATARE RICE Field",
    farmerName: "Gad KALISA",
    lossEventType: "FLOOD",
    status: "SUBMITTED",
    filedAt: "2026-03-29T09:17:51.598Z",
    priority: "high",
  },
  {
    id: "69c8aa3fd76e113555faa100",
    farmName: "Kayonza Maize Plot",
    farmerName: "Alice MUKAMANA",
    lossEventType: "DROUGHT",
    status: "IN_PROGRESS",
    filedAt: "2026-03-28T12:10:00.000Z",
    priority: "medium",
  },
  {
    id: "69c8bb3fd76e113555faa120",
    farmName: "Ngoma Beans Parcel",
    farmerName: "Jean NDAYISHIMIYE",
    lossEventType: "PEST_INFESTATION",
    status: "FILED",
    filedAt: "2026-03-27T08:55:10.000Z",
    priority: "low",
  },
];

const priorityBadge = (p: MockClaim["priority"]) => {
  if (p === "high") return "destructive";
  if (p === "medium") return "secondary";
  return "outline";
};

const InsurerClaims = () => {
  const [q, setQ] = useState("");
  const claims = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return MOCK_CLAIMS;
    return MOCK_CLAIMS.filter((c) =>
      [c.farmName, c.farmerName, c.lossEventType, c.status].some((x) =>
        x.toLowerCase().includes(query),
      ),
    );
  }, [q]);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Claims</h1>
          <p className="text-muted-foreground mt-1">
            Review queue and decisions (mock).
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-[320px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search farm, farmer, status…"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-primary" />
            Claim queue ({claims.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {claims.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-border/60 p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-semibold truncate">{c.farmName}</div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                  <span>{c.farmerName}</span>
                  <span>•</span>
                  <span>{c.lossEventType}</span>
                  <span>•</span>
                  <span>Filed {format(new Date(c.filedAt), "PPp")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={priorityBadge(c.priority)}>{c.priority}</Badge>
                <Badge variant="outline">{c.status}</Badge>
                <Button asChild size="sm" variant="outline" className="gap-2">
                  <Link to="/assessor/loss-assessment">
                    Assign / Review <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default InsurerClaims;

