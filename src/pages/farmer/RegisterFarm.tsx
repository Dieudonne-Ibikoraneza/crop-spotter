import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { farmerService } from "@/lib/api/services/farmer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Building2, ChevronRight, ChevronLeft, 
  ShieldCheck, Info, CheckCircle2, Building, ArrowRight,
  Mail, Globe, Twitter, Linkedin, Facebook, Instagram, MapPin, Phone
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { RegisterFarmForm } from "@/components/farmer/register-farm-form";
import { useNavigate } from "react-router-dom";

const RegisterFarm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedInsurerId, setSelectedInsurerId] = useState<string | null>(null);
  const [viewingInsurer, setViewingInsurer] = useState<any>(null);

  const { data: insurersData, isLoading } = useQuery({
    queryKey: ["insurers"],
    queryFn: () => farmerService.getInsurers(),
  });

  const insurers = insurersData?.items || [];

  const handleNextStep = () => {
    setStep(2);
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const handleSelectInsurer = (id: string) => {
    setSelectedInsurerId(id === selectedInsurerId ? null : id);
    setViewingInsurer(null);
  };

  const selectedInsurer = insurers.find((i: any) => i.id === selectedInsurerId);

  return (
    <div className="p-6 md:p-10 space-y-10 max-w-5xl mx-auto animate-in fade-in duration-700">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span className={step >= 1 ? "text-primary font-bold" : ""}>1. Select Insurer</span>
          <ChevronRight className="h-4 w-4" />
          <span className={step >= 2 ? "text-primary font-bold" : ""}>2. Farm Details</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">Register Your Farm</h1>
        <p className="text-muted-foreground text-lg">
          {step === 1 
            ? "Start by selecting your preferred insurance provider. You can also skip this for now." 
            : "Provide the details of your farm to complete the registration."}
        </p>
      </div>

      {step === 1 ? (
        <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
          {isLoading ? (
            <div className="flex h-[40vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {insurers.map((insurer: any) => (
                  <Card 
                    key={insurer.id} 
                    className={`relative cursor-pointer transition-all border-2 ${
                      selectedInsurerId === insurer.id 
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/10" 
                        : "hover:border-primary/30 hover:bg-muted/30"
                    }`}
                    onClick={() => setViewingInsurer(insurer)}
                  >
                    {selectedInsurerId === insurer.id && (
                      <div className="absolute top-2 right-2 text-primary">
                        <CheckCircle2 className="h-6 w-6 fill-primary text-background" />
                      </div>
                    )}
                    <CardHeader className="pb-3 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2">
                        {insurer.insurerProfile?.companyLogoUrl ? (
                          <img src={insurer.insurerProfile.companyLogoUrl} alt={insurer.companyName} className="h-full w-full object-cover rounded-2xl" />
                        ) : (
                          <Building className="h-8 w-8" />
                        )}
                      </div>
                      <CardTitle className="text-lg">
                        {insurer.insurerProfile?.companyName || `${insurer.firstName} ${insurer.lastName}`}
                      </CardTitle>
                      <CardDescription className="line-clamp-1 h-4">
                        {insurer.insurerProfile?.website}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center text-sm text-muted-foreground">
                      <p className="line-clamp-2 italic h-10">
                        {insurer.insurerProfile?.bio && `"${insurer.insurerProfile.bio}"`}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Button variant="ghost" className="w-full text-xs gap-1" onClick={(e) => {
                        e.stopPropagation();
                        setViewingInsurer(insurer);
                      }}>
                        <Info className="h-3 w-3" /> View Full Profile
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 border-2 border-dashed rounded-3xl bg-muted/10">
                <div>
                  <h3 className="text-xl font-bold">Skip for now?</h3>
                  <p className="text-muted-foreground">You can register your farm without selecting an insurer today.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <Button variant="ghost" className="flex-1 md:flex-none" onClick={() => {
                    setSelectedInsurerId(null);
                    handleNextStep();
                  }}>
                    Skip Selection
                  </Button>
                  <Button 
                    className="flex-1 md:flex-none px-8 shadow-lg shadow-primary/20" 
                    onClick={handleNextStep}
                    disabled={!selectedInsurerId}
                  >
                    Continue with {selectedInsurer?.insurerProfile?.companyName || "Selected Insurer"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="animate-in slide-in-from-right-4 duration-500 max-w-2xl mx-auto">
          <Card className="border-none shadow-2xl shadow-black/5 bg-gradient-to-br from-background to-muted/20 overflow-hidden">
            <div className="h-2 bg-primary w-full" />
            <CardHeader className="pt-8 px-8">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">Finalize Registration</CardTitle>
                  <CardDescription>Enter your crop and sowing details</CardDescription>
                </div>
                {selectedInsurer && (
                  <Badge className="bg-primary/10 text-primary border-none flex gap-1.5 py-1 px-3">
                    <ShieldCheck className="h-4 w-4" />
                    {selectedInsurer.insurerProfile?.companyName}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <RegisterFarmForm 
                onSuccess={() => navigate("/farmer/farms")}
                initialInsurerId={selectedInsurerId || "none"}
              />
            </CardContent>
            <CardFooter className="bg-muted/30 p-4 px-8 border-t">
              <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={handlePrevStep}>
                <ChevronLeft className="h-4 w-4" />
                Change Insurer
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Insurer Profile Dialog */}
      <Dialog open={!!viewingInsurer} onOpenChange={(open) => !open && setViewingInsurer(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]">
          {viewingInsurer && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="relative shrink-0">
                <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5 w-full" />
                <div className="px-8 -mt-12">
                  <div className="flex flex-col md:flex-row items-end gap-6 mb-4">
                    <div className="h-24 w-24 rounded-3xl bg-background flex items-center justify-center text-primary shadow-xl border-4 border-background overflow-hidden shrink-0">
                      {viewingInsurer.insurerProfile?.companyLogoUrl ? (
                        <img src={viewingInsurer.insurerProfile.companyLogoUrl} alt={viewingInsurer.companyName} className="h-full w-full object-cover" />
                      ) : (
                        <Building className="h-12 w-12" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <h2 className="text-2xl font-bold">{viewingInsurer.insurerProfile?.companyName || `${viewingInsurer.firstName} ${viewingInsurer.lastName}`}</h2>
                      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                        <Building2 className="h-4 w-4" />
                        {viewingInsurer.district}, {viewingInsurer.province}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                <div className="space-y-6 pb-6">
                  {/* Bio / About */}
                  {(viewingInsurer.insurerProfile?.bio || viewingInsurer.insurerProfile?.companyDescription) && (
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">About</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        {viewingInsurer.insurerProfile.bio || viewingInsurer.insurerProfile.companyDescription}
                      </p>
                    </div>
                  )}

                  {/* Contact & Professional Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Website */}
                    {viewingInsurer.insurerProfile?.website && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Website</h4>
                        <a 
                          href={viewingInsurer.insurerProfile.website.startsWith('http') ? viewingInsurer.insurerProfile.website : `https://${viewingInsurer.insurerProfile.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline flex items-center gap-2 w-fit transition-all"
                        >
                          <Globe className="h-4 w-4 shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {viewingInsurer.insurerProfile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </span>
                        </a>
                      </div>
                    )}

                    {/* Email */}
                    {(viewingInsurer.insurerProfile?.officialEmail || viewingInsurer.email) && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</h4>
                        <a 
                          href={`mailto:${viewingInsurer.insurerProfile?.officialEmail || viewingInsurer.email}`}
                          className="text-sm font-medium text-primary hover:underline flex items-center gap-2 w-fit transition-all"
                        >
                          <Mail className="h-4 w-4 shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {viewingInsurer.insurerProfile?.officialEmail || viewingInsurer.email}
                          </span>
                        </a>
                      </div>
                    )}

                    {/* Phone */}
                    {(viewingInsurer.insurerProfile?.officialPhone || viewingInsurer.phoneNumber) && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</h4>
                        <a 
                          href={`tel:${viewingInsurer.insurerProfile?.officialPhone || viewingInsurer.phoneNumber}`}
                          className="text-sm font-medium text-primary hover:underline flex items-center gap-2 w-fit transition-all"
                        >
                          <Phone className="h-4 w-4 shrink-0" />
                          {viewingInsurer.insurerProfile?.officialPhone || viewingInsurer.phoneNumber}
                        </a>
                      </div>
                    )}

                    {/* Address */}
                    {viewingInsurer.insurerProfile?.address && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Physical Address</h4>
                        <p className="text-sm font-medium flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          {viewingInsurer.insurerProfile.address}
                        </p>
                      </div>
                    )}

                    {/* License Number */}
                    {viewingInsurer.insurerProfile?.licenseNumber && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">License Number</h4>
                        <p className="text-sm font-medium flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                          {viewingInsurer.insurerProfile.licenseNumber}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Location Hierarchy */}
                  {(viewingInsurer.province || viewingInsurer.district) && (
                    <div className="pt-4 border-t border-border/50">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Service Location</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-4">
                        {viewingInsurer.province && (
                          <div className="text-xs">
                            <span className="text-muted-foreground block mb-0.5">Province</span>
                            <span className="font-semibold text-foreground/90">{viewingInsurer.province}</span>
                          </div>
                        )}
                        {viewingInsurer.district && (
                          <div className="text-xs">
                            <span className="text-muted-foreground block mb-0.5">District</span>
                            <span className="font-semibold text-foreground/90">{viewingInsurer.district}</span>
                          </div>
                        )}
                        {viewingInsurer.sector && (
                          <div className="text-xs">
                            <span className="text-muted-foreground block mb-0.5">Sector</span>
                            <span className="font-semibold text-foreground/90">{viewingInsurer.sector}</span>
                          </div>
                        )}
                        {viewingInsurer.cell && (
                          <div className="text-xs">
                            <span className="text-muted-foreground block mb-0.5">Cell</span>
                            <span className="font-semibold text-foreground/90">{viewingInsurer.cell}</span>
                          </div>
                        )}
                        {viewingInsurer.village && (
                          <div className="text-xs">
                            <span className="text-muted-foreground block mb-0.5">Village</span>
                            <span className="font-semibold text-foreground/90">{viewingInsurer.village}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Social Media */}
                  {viewingInsurer.insurerProfile?.socialMedia && (
                    <div className="pt-4 border-t border-border/50">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Connect With Us</h4>
                      <div className="flex flex-wrap gap-x-6 gap-y-3">
                        {viewingInsurer.insurerProfile.socialMedia.twitter && (
                          <a 
                            href={`https://twitter.com/${viewingInsurer.insurerProfile.socialMedia.twitter}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm font-medium text-sky-600 hover:underline transition-all"
                          >
                            <Twitter className="h-4 w-4" />
                            Twitter
                          </a>
                        )}
                        {viewingInsurer.insurerProfile.socialMedia.linkedin && (
                          <a 
                            href={`https://linkedin.com/in/${viewingInsurer.insurerProfile.socialMedia.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline transition-all"
                          >
                            <Linkedin className="h-4 w-4" />
                            LinkedIn
                          </a>
                        )}
                        {viewingInsurer.insurerProfile.socialMedia.facebook && (
                          <a 
                            href={`https://facebook.com/${viewingInsurer.insurerProfile.socialMedia.facebook}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm font-medium text-blue-800 hover:underline transition-all"
                          >
                            <Facebook className="h-4 w-4" />
                            Facebook
                          </a>
                        )}
                        {viewingInsurer.insurerProfile.socialMedia.instagram && (
                          <a 
                            href={`https://instagram.com/${viewingInsurer.insurerProfile.socialMedia.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm font-medium text-pink-600 hover:underline transition-all"
                          >
                            <Instagram className="h-4 w-4" />
                            Instagram
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 p-8 pt-4 border-t bg-background">
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setViewingInsurer(null)}>
                    Close
                  </Button>
                  <Button 
                    className={`flex-1 ${selectedInsurerId === viewingInsurer.id ? "bg-destructive hover:bg-destructive/90" : ""}`} 
                    onClick={() => handleSelectInsurer(viewingInsurer.id)}
                  >
                    {selectedInsurerId === viewingInsurer.id ? "Unselect Provider" : "Select this Provider"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegisterFarm;
