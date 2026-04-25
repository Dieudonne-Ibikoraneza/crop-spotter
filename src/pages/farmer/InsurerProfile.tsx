import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { farmerService } from "@/lib/api/services/farmer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, Building2, Globe, Mail, Phone, MapPin, 
  ChevronLeft, ExternalLink, Calendar, Shield, Users,
  Twitter, Linkedin, Facebook, Instagram
} from "lucide-react";

const InsurerProfile = () => {
  const { id } = useParams();
  
  const { data: insurer, isLoading, error } = useQuery({
    queryKey: ["insurer", id],
    queryFn: () => farmerService.getInsurerPublicProfile(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !insurer) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive">Error</h2>
        <p className="text-muted-foreground mt-2">Could not load insurer details. They may no longer be active.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/farmer/insurers">Back to Marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <Button asChild variant="ghost" className="mb-2 -ml-4 hover:bg-primary/5">
        <Link to="/farmer/insurers" className="flex items-center gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Marketplace
        </Link>
      </Button>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-lg shadow-primary/10">
          {insurer.companyLogoUrl ? (
            <img src={insurer.companyLogoUrl} alt={insurer.companyName} className="h-full w-full object-cover rounded-3xl" />
          ) : (
            <Building2 className="h-16 w-16" />
          )}
        </div>
        <div className="space-y-4 flex-1">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight">{insurer.companyName || `${insurer.firstName} ${insurer.lastName}`}</h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
              {insurer.website && (
                <a 
                  href={insurer.website.startsWith('http') ? insurer.website : `https://${insurer.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-primary hover:underline transition-all"
                >
                  <Globe className="h-4 w-4" /> 
                  {insurer.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> 
                {insurer.district}, {insurer.province}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-primary/10 text-primary border-none py-1 px-3">Official Partner</Badge>
            <Badge variant="outline" className="py-1 px-3">Top Rated</Badge>
          </div>
        </div>
        <div className="shrink-0 w-full md:w-auto">
          <Button asChild size="lg" className="w-full shadow-lg shadow-primary/20">
            <Link to="/farmer/farms">Select this Provider</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">About {insurer.companyName || "the Insurer"}</h2>
            <Card className="border-none bg-muted/20 shadow-none">
              <CardContent className="pt-6 text-lg leading-relaxed text-muted-foreground">
                {insurer.bio || "This insurer provides comprehensive coverage for various crop types, ensuring that farmers are protected against unforeseen climate events and market fluctuations. They have been a reliable partner in the Rwandan agricultural sector for years."}
              </CardContent>
            </Card>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Coverage Areas
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Specializes in Maize, Rice, Beans, and Wheat across the {insurer.province} province.
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Helping over 5,000 farmers manage risk effectively with fast claim settlements.
              </CardContent>
            </Card>
          </div>

          {/* Location Details */}
          {(insurer.province || insurer.district) && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <MapPin className="h-6 w-6 text-primary" />
                Service Location
              </h2>
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    {insurer.province && (
                      <div className="text-sm">
                        <span className="text-muted-foreground block mb-1">Province</span>
                        <span className="font-semibold">{insurer.province}</span>
                      </div>
                    )}
                    {insurer.district && (
                      <div className="text-sm">
                        <span className="text-muted-foreground block mb-1">District</span>
                        <span className="font-semibold">{insurer.district}</span>
                      </div>
                    )}
                    {insurer.sector && (
                      <div className="text-sm">
                        <span className="text-muted-foreground block mb-1">Sector</span>
                        <span className="font-semibold">{insurer.sector}</span>
                      </div>
                    )}
                    {insurer.cell && (
                      <div className="text-sm">
                        <span className="text-muted-foreground block mb-1">Cell</span>
                        <span className="font-semibold">{insurer.cell}</span>
                      </div>
                    )}
                    {insurer.village && (
                      <div className="text-sm">
                        <span className="text-muted-foreground block mb-1">Village</span>
                        <span className="font-semibold">{insurer.village}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Social Media Section */}
          {insurer.socialMedia && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Connect With Us</h2>
              <div className="flex flex-wrap gap-4">
                {insurer.socialMedia.twitter && (
                  <Button asChild variant="outline" className="gap-2 border-sky-200 hover:bg-sky-50 text-sky-600">
                    <a href={`https://twitter.com/${insurer.socialMedia.twitter}`} target="_blank" rel="noreferrer">
                      <Twitter className="h-4 w-4" />
                      Twitter
                    </a>
                  </Button>
                )}
                {insurer.socialMedia.linkedin && (
                  <Button asChild variant="outline" className="gap-2 border-blue-200 hover:bg-blue-50 text-blue-700">
                    <a href={`https://linkedin.com/in/${insurer.socialMedia.linkedin}`} target="_blank" rel="noreferrer">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  </Button>
                )}
                {insurer.socialMedia.facebook && (
                  <Button asChild variant="outline" className="gap-2 border-blue-200 hover:bg-blue-50 text-blue-800">
                    <a href={`https://facebook.com/${insurer.socialMedia.facebook}`} target="_blank" rel="noreferrer">
                      <Facebook className="h-4 w-4" />
                      Facebook
                    </a>
                  </Button>
                )}
                {insurer.socialMedia.instagram && (
                  <Button asChild variant="outline" className="gap-2 border-pink-200 hover:bg-pink-50 text-pink-600">
                    <a href={`https://instagram.com/${insurer.socialMedia.instagram}`} target="_blank" rel="noreferrer">
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </a>
                  </Button>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(insurer.officialEmail || insurer.email) && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Email</p>
                    <a href={`mailto:${insurer.officialEmail || insurer.email}`} className="text-sm text-muted-foreground break-all hover:text-primary hover:underline transition-all">
                      {insurer.officialEmail || insurer.email}
                    </a>
                  </div>
                </div>
              )}
              {(insurer.officialPhone || insurer.phoneNumber) && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Phone</p>
                    <a href={`tel:${insurer.officialPhone || insurer.phoneNumber}`} className="text-sm text-muted-foreground hover:text-primary hover:underline transition-all">
                      {insurer.officialPhone || insurer.phoneNumber}
                    </a>
                  </div>
                </div>
              )}
              {insurer.website && (
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-primary shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Website</p>
                    <a 
                      href={insurer.website.startsWith('http') ? insurer.website : `https://${insurer.website}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-sm text-primary hover:underline flex items-center gap-1 group"
                    >
                      {insurer.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Office Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Mon - Fri</span>
                <span>8:00 AM - 5:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday</span>
                <span>9:00 AM - 1:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday</span>
                <span className="text-destructive/70 italic">Closed</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InsurerProfile;
