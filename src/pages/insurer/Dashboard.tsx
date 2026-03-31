import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ShieldCheck,
  FileWarning,
  Users,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const mockStats = {
  openClaims: 14,
  submittedToday: 3,
  activePolicies: 128,
  assessorsOnline: 7,
};

const mockQueue = [
  { id: "CLM-2J4", farm: "NYAGATARE RICE Field", event: "FLOOD", status: "SUBMITTED", createdAt: "2026-03-29T09:17:51.598Z" },
  { id: "CLM-9K1", farm: "Kayonza Maize Plot", event: "DROUGHT", status: "IN_PROGRESS", createdAt: "2026-03-28T14:03:22.000Z" },
  { id: "CLM-7P8", farm: "Ngoma Beans Parcel", event: "PEST", status: "FILED", createdAt: "2026-03-27T08:55:10.000Z" },
];

const InsurerDashboard = () => {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Insurer dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Operational overview (mock data for now).
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/insurer/claims">
            <FileWarning className="h-4 w-4" />
            Open claims
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Open claims</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-bold">{mockStats.openClaims}</div>
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              +2
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Submitted today</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-bold">{mockStats.submittedToday}</div>
            <Badge variant="outline">Daily</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active policies</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-bold">{mockStats.activePolicies}</div>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Assessors online</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-3xl font-bold">{mockStats.assessorsOnline}</div>
            <Users className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Priority queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockQueue.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-4 bg-card"
            >
              <div className="min-w-0">
                <div className="font-semibold truncate">{c.farm}</div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                  <span>{c.id}</span>
                  <span>•</span>
                  <span>{c.event}</span>
                  <span>•</span>
                  <span>{format(new Date(c.createdAt), "PPp")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{c.status}</Badge>
                <Button asChild size="sm" variant="outline" className="gap-2">
                  <Link to="/insurer/claims">
                    Review <ArrowRight className="h-4 w-4" />
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

export default InsurerDashboard;

