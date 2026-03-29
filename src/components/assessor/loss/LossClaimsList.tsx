import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { MapPin, Calendar, Sprout, ArrowRight } from "lucide-react";
import { Claim } from "@/lib/api/services/claims";
import { useNavigate } from "react-router-dom";

interface LossClaimsListProps {
  claims: Claim[];
  farmers: any[];
  title?: string;
}

export const LossClaimsList = ({ claims, farmers, title }: LossClaimsListProps) => {
  const navigate = useNavigate();

  const columns = [
    {
      key: "id",
      label: "Claim ID",
      render: (claim: Claim) => (
        <span className="font-mono text-xs">CLM-{claim._id.slice(-6).toUpperCase()}</span>
      ),
    },
    {
      key: "farmer",
      label: "Farmer",
      render: (claim: Claim) => {
        const farmer = farmers?.find(f => String(f.id) === String(claim.farmerId));
        return farmer ? `${farmer.firstName} ${farmer.lastName}` : "Unknown";
      },
    },
    {
      key: "farm",
      label: "Farm",
      render: (claim: Claim) => (
        <div className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-primary" />
          <span>{claim.farmId?.name || "Field"}</span>
        </div>
      ),
    },
    {
      key: "lossEventType",
      label: "Event Type",
      render: (claim: Claim) => (
        <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20 text-[10px]">
          {claim.lossEventType}
        </Badge>
      ),
    },
    {
      key: "filedAt",
      label: "Filed At",
      render: (claim: Claim) => (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{new Date(claim.filedAt).toLocaleDateString()}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (claim: Claim) => (
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider inline-block ${
          claim.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
          claim.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
          claim.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {claim.status.replace('_', ' ')}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (claim: Claim) => (
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 gap-1 hover:text-primary"
          onClick={() => {
             const farmId = typeof claim.farmId === 'string' ? claim.farmId : claim.farmId?._id;
             navigate(`/assessor/loss-assessment/${claim.farmerId}/${farmId}?claimId=${claim._id}`);
          }}
        >
          Details
          <ArrowRight className="h-3 w-3" />
        </Button>
      )
    }
  ];

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
          {title || "Assigned Loss Assessments"}
          <Badge variant="secondary" className="font-normal bg-primary/10 text-primary border-primary/20">{claims.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {claims.length > 0 ? (
          <DataTable data={claims} columns={columns} />
        ) : (
          <div className="py-20 text-center border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">No assigned loss assessments found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
