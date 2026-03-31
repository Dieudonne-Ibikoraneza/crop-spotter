import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ShieldCheck, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type MockPolicy = {
  id: string;
  policyNumber: string;
  farmName: string;
  farmerName: string;
  coverageLevel: "BASIC" | "STANDARD" | "PREMIUM";
  premiumAmount: number;
  status: "ACTIVE" | "EXPIRED" | "PENDING";
  startDate: string;
  endDate: string;
};

const MOCK_POLICIES: MockPolicy[] = [
  {
    id: "69c8eb92d76e113555faa0d7",
    policyNumber: "POL-MNBJBM09-PIDF",
    farmName: "NYAGATARE RICE Field",
    farmerName: "Gad KALISA",
    coverageLevel: "STANDARD",
    premiumAmount: 173829,
    status: "ACTIVE",
    startDate: "2026-03-29T09:05:33.869Z",
    endDate: "2027-03-29T09:05:33.869Z",
  },
  {
    id: "69c8eb92d76e113555faa0a1",
    policyNumber: "POL-ABCD1234-XYZ",
    farmName: "Kayonza Maize Plot",
    farmerName: "Alice MUKAMANA",
    coverageLevel: "BASIC",
    premiumAmount: 98120,
    status: "ACTIVE",
    startDate: "2026-02-10T10:10:00.000Z",
    endDate: "2027-02-10T10:10:00.000Z",
  },
];

const InsurerPolicies = () => {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return MOCK_POLICIES;
    return MOCK_POLICIES.filter((p) =>
      [p.policyNumber, p.farmName, p.farmerName, p.status, p.coverageLevel]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [q]);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Policies</h1>
          <p className="text-muted-foreground mt-1">
            Coverage and premium overview (mock).
          </p>
        </div>
        <div className="relative w-full sm:w-[340px]">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search policy, farm, farmer…"
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Policies ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-2">Policy</th>
                  <th className="py-2 pr-2">Farm</th>
                  <th className="py-2 pr-2">Farmer</th>
                  <th className="py-2 pr-2">Coverage</th>
                  <th className="py-2 pr-2">Premium</th>
                  <th className="py-2 pr-2">Dates</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border/40">
                    <td className="py-3 pr-2 font-medium">{p.policyNumber}</td>
                    <td className="py-3 pr-2">{p.farmName}</td>
                    <td className="py-3 pr-2">{p.farmerName}</td>
                    <td className="py-3 pr-2">{p.coverageLevel}</td>
                    <td className="py-3 pr-2">{p.premiumAmount.toLocaleString()}</td>
                    <td className="py-3 pr-2 text-xs text-muted-foreground">
                      {format(new Date(p.startDate), "PP")} – {format(new Date(p.endDate), "PP")}
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary">{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsurerPolicies;

