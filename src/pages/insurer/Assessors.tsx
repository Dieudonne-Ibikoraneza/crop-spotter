import { Users, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type MockAssessor = {
  id: string;
  name: string;
  district: string;
  specialization: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
  activeCases: number;
};

const MOCK_ASSESSORS: MockAssessor[] = [
  {
    id: "69406883b45b8c4d0dd03311",
    name: "Victor MURAGWA",
    district: "Kicukiro",
    specialization: "Drone & field inspections",
    status: "BUSY",
    activeCases: 4,
  },
  {
    id: "69406883b45b8c4d0dd03312",
    name: "Anne UWASE",
    district: "Nyagatare",
    specialization: "Weather & flood assessments",
    status: "AVAILABLE",
    activeCases: 1,
  },
  {
    id: "69406883b45b8c4d0dd03313",
    name: "Eric HABIMANA",
    district: "Ngoma",
    specialization: "Crop stress / pests",
    status: "OFFLINE",
    activeCases: 0,
  },
];

const statusBadge = (s: MockAssessor["status"]) => {
  if (s === "AVAILABLE") return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Available</Badge>;
  if (s === "BUSY") return <Badge variant="secondary"><Clock className="h-3.5 w-3.5 mr-1" />Busy</Badge>;
  return <Badge variant="outline">Offline</Badge>;
};

const InsurerAssessors = () => {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Assessors</h1>
        <p className="text-muted-foreground mt-1">
          Assignment roster (mock).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MOCK_ASSESSORS.map((a) => (
          <Card key={a.id} className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 min-w-0">
                  <Users className="h-5 w-5 text-primary shrink-0" />
                  <span className="truncate">{a.name}</span>
                </span>
                {statusBadge(a.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">District</span>
                <span className="font-medium">{a.district}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Specialization</span>
                <span className="font-medium text-right">{a.specialization}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Active cases</span>
                <span className="font-medium">{a.activeCases}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InsurerAssessors;

