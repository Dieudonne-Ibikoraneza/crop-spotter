import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { farmerService } from "@/lib/api/services/farmer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, User, Mail, Phone, MapPin, 
  ChevronLeft, Award, Briefcase, Star, 
  CheckCircle2, Info
} from "lucide-react";

const AssessorProfileView = () => {
  const { id } = useParams();
  
  const { data: assessor, isLoading, error } = useQuery({
    queryKey: ["assessor", id],
    queryFn: () => farmerService.getAssessorProfile(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !assessor) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive">Error</h2>
        <p className="text-muted-foreground mt-2">Could not load assessor details.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/farmer/claims">Back to Claims</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <Button asChild variant="ghost" className="mb-2 -ml-4 hover:bg-primary/5">
        <Link to="/farmer/claims" className="flex items-center gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Claims
        </Link>
      </Button>

      <Card className="border-none bg-gradient-to-br from-primary/10 via-background to-background shadow-xl shadow-primary/5">
        <CardContent className="pt-8 pb-10">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
            <div className="relative group">
              <div className="h-40 w-40 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 border-4 border-background shadow-2xl overflow-hidden">
                {assessor.profilePhotoUrl ? (
                  <img src={assessor.profilePhotoUrl} alt={assessor.firstName} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <User className="h-20 w-20" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 border-4 border-background h-10 w-10 rounded-full flex items-center justify-center text-white shadow-lg">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            
            <div className="space-y-4 flex-1">
              <div className="space-y-1">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <h1 className="text-4xl font-extrabold tracking-tight">{assessor.firstName} {assessor.lastName}</h1>
                  <Badge className="w-fit mx-auto md:mx-0 bg-primary/20 text-primary border-none py-1 px-4 text-sm font-bold">
                    Certified Assessor
                  </Badge>
                </div>
                <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-muted-foreground mt-2">
                  <span className="flex items-center gap-1.5 font-medium"><MapPin className="h-4 w-4 text-primary" /> {assessor.district}, {assessor.province}</span>
                  <span className="flex items-center gap-1.5 font-medium"><Award className="h-4 w-4 text-primary" /> {assessor.specialization || "General Crop Assessment"}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="bg-background/80 backdrop-blur-sm border rounded-2xl px-4 py-2 flex items-center gap-2 shadow-sm">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold">4.9</span>
                  <span className="text-xs text-muted-foreground">(128 reviews)</span>
                </div>
                <div className="bg-background/80 backdrop-blur-sm border rounded-2xl px-4 py-2 flex items-center gap-2 shadow-sm">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span className="font-bold">{assessor.experienceYears || 5}+ Years</span>
                  <span className="text-xs text-muted-foreground">Experience</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Info className="h-6 w-6 text-primary" />
              Professional Background
            </h2>
            <Card className="border-none bg-muted/20 shadow-none">
              <CardContent className="pt-6 text-lg leading-relaxed text-muted-foreground">
                {assessor.bio || `${assessor.firstName} is a highly experienced agricultural assessor with a deep understanding of crop health monitoring and yield estimation. Specializing in ${assessor.specialization || "diverse crop types"}, they have successfully conducted hundreds of field assessments across Rwanda, providing accurate and reliable reports for insurance purposes.`}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Specializations</h2>
            <div className="flex flex-wrap gap-2">
              {["NDVI Analysis", "Soil Health", "Yield Prediction", "Climate Risk", "Maize Specialist"].map((spec) => (
                <Badge key={spec} variant="secondary" className="px-4 py-2 text-sm rounded-full bg-primary/5 text-primary-foreground/80 border-primary/10">
                  {spec}
                </Badge>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-lg shadow-black/5">
            <CardHeader>
              <CardTitle className="text-lg">Contact Details</CardTitle>
              <CardDescription>Direct contact for assessment inquiries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="flex items-center gap-4 group p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium break-all">{assessor.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 group p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</p>
                  <p className="text-sm font-medium">{assessor.phoneNumber}</p>
                </div>
              </div>

              <Button className="w-full h-12 rounded-2xl gap-2 font-bold shadow-lg shadow-primary/20">
                Send Message
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-muted/20 shadow-none border-dashed">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground italic font-medium">
                "Committed to supporting Rwanda's agricultural growth through precise and fair assessments."
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AssessorProfileView;
