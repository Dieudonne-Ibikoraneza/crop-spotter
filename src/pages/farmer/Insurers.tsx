import { useQuery } from "@tanstack/react-query";
import { farmerService } from "@/lib/api/services/farmer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Globe, Mail, Phone, Info, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const InsurerMarketplace = () => {
  const { toast } = useToast();
  const { data: insurersData, isLoading, error } = useQuery({
    queryKey: ["insurers"],
    queryFn: () => farmerService.getInsurers(),
  });

  const insurers = insurersData?.items || [];

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        <h2 className="text-2xl font-bold">Error</h2>
        <p>Could not load insurers. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 px-3 py-1">
            Marketplace
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight">Insurance Providers</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Browse through our trusted insurance partners. Select a provider that best fits your farm's needs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {insurers.map((insurer: any) => (
          <Card key={insurer.id} className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
            <CardHeader className="pb-4 relative">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none">
                  Verified
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform duration-500">
                  {insurer.insurerProfile?.companyLogoUrl ? (
                    <img src={insurer.insurerProfile.companyLogoUrl} alt={insurer.insurerProfile.companyName} className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <Building2 className="h-8 w-8" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {insurer.insurerProfile?.companyName || `${insurer.firstName} ${insurer.lastName}`}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1 min-h-[1.25rem]">
                    {insurer.insurerProfile?.website && (
                      <>
                        <Globe className="h-3 w-3" />
                        {insurer.insurerProfile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3 min-h-[4.5rem]">
                {insurer.insurerProfile?.bio}
              </p>
              
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary/70" />
                  <span>{insurer.insurerProfile?.officialEmail || insurer.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 text-primary/70" />
                  <span>{insurer.insurerProfile?.officialPhone || insurer.phoneNumber}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 pt-4 flex gap-2">
              <Button asChild variant="outline" className="flex-1 gap-2 group/btn">
                <Link to={`/farmer/insurers/${insurer.id}`}>
                  <Info className="h-4 w-4" />
                  View Profile
                </Link>
              </Button>
              <Button asChild className="flex-1 gap-2 shadow-lg shadow-primary/20">
                <Link to="/farmer/farms">
                  Select Provider
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {insurers.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/5">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold">No insurers found</h3>
          <p className="text-muted-foreground">We couldn't find any active insurance providers at the moment.</p>
        </div>
      )}
    </div>
  );
};

// Internal icon for consistency
const ArrowRight = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export default InsurerMarketplace;
