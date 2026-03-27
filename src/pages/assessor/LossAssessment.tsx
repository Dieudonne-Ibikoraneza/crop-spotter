import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { useAssignedFarmers } from "@/lib/api/hooks/useAssessor";
import { useClaim, useAssessorClaims } from "@/lib/api/hooks/useClaims";
import { LossBasicInfoTab } from "../../components/assessor/tabs/loss/LossBasicInfoTab";
import { LossClaimsList } from "../../components/assessor/loss/LossClaimsList";
import { LossEvidenceTab } from "../../components/assessor/tabs/loss/LossEvidenceTab";
import { LossDetailsTab } from "../../components/assessor/tabs/loss/LossDetailsTab";
import { LossOverviewTab } from "../../components/assessor/tabs/loss/LossOverviewTab";

const LossAssessment = () => {
  const { farmerId, fieldId } = useParams();
  const [searchParams] = useSearchParams();
  const claimId = searchParams.get("claimId")?.trim();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("basic-info");

  // Fetch data
  const { data: farmers, isLoading: isFarmersLoading } = useAssignedFarmers();
  const { data: claims, isLoading: isClaimsLoading } = useAssessorClaims();
  const { data: claim, isLoading: isClaimLoading } = useClaim(claimId || undefined);

  // Find current farmer and field
  const farmer = farmers?.find((f) => String(f.id) === String(farmerId));
  const field = farmer?.farms.find((f) => String(f.id) === String(fieldId));

  const isLoading = isClaimLoading || isClaimsLoading || isFarmersLoading;
  
  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse text-sm">Preparing assessment data...</p>
        </div>
      </div>
    );
  }

  if (!claimId || !claim) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <Button variant="ghost" className="mb-2 -ml-2" onClick={() => navigate("/assessor/dashboard")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Loss Assessments</h1>
          <p className="text-muted-foreground">
             Select an assigned claim to start or continue an evaluation
          </p>
        </div>

        {claims && claims.length > 0 ? (
          <LossClaimsList claims={claims} farmers={farmers || []} />
        ) : (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-amber-900 mb-2">No Active Claim Found</h2>
              <p className="text-amber-700 max-w-md mx-auto mb-4">
                {claimId 
                  ? `The claim with ID "${claimId}" could not be retrieved from our systems.` 
                  : "We couldn't find any claims assigned to you for this field."}
                Please verify the claim status on your dashboard.
              </p>
              <div className="text-[10px] text-amber-600/50 font-mono">
                Field: {fieldId} • Farmer: {farmerId} • Claim: {claimId || "None"}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" className="mb-2 -ml-2" onClick={() => navigate("/assessor/dashboard")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Loss Assessment</h1>
          <p className="text-muted-foreground">
            Evaluating loss for <strong>{field?.name || "Field"}</strong> • {farmer?.firstName} {farmer?.lastName}
          </p>
        </div>
        <div className="flex items-center gap-2">
           <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
             claim.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
             claim.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
             claim.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
             'bg-amber-100 text-amber-700'
           }`}>
             {claim.status.replace('_', ' ')}
           </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="details">Loss Details</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="basic-info">
             <LossBasicInfoTab 
               field={field} 
               claim={claim} 
               farmerName={`${farmer?.firstName} ${farmer?.lastName}`}
             />
          </TabsContent>

          <TabsContent value="evidence">
            <LossEvidenceTab claim={claim} />
          </TabsContent>

          <TabsContent value="details">
            <LossDetailsTab claim={claim} />
          </TabsContent>

          <TabsContent value="overview">
            <LossOverviewTab claim={claim} fieldName={field?.name || "Field"} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default LossAssessment;
