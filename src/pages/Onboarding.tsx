import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile, useUpdateProfile } from "@/lib/api/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  Building2, 
  UserCircle, 
  Mail, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Camera,
  Trash2,
  Pencil,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { photosService } from "@/lib/api/services/photos";
import ImageCropper from "@/components/ui/image-cropper";
import { Progress as UIProgress } from "@/components/ui/progress";

const Onboarding = () => {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    bio: "",
    companyName: "",
    contactPerson: "",
    website: "",
    address: "",
    companyDescription: "",
    licenseNumber: "",
    officialEmail: "",
    officialPhone: "",
    companyLogoUrl: "",
    profilePictureUrl: "",
    profilePhotoUrl: "", // For assessor compatibility if needed
  });

  const [cropperData, setCropperData] = useState<{
    image: string;
    type: "LOGO" | "PROFILE";
    title: string;
    aspect: number;
    circular?: boolean;
  } | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    try {
      await updateProfile.mutateAsync(formData);
      toast.success("Onboarding complete! Welcome to Starhawk.");
      
      // Navigate based on role
      if (profile?.role === "INSURER") navigate("/insurer/dashboard");
      else if (profile?.role === "ASSESSOR") navigate("/assessor/dashboard");
      else navigate("/dashboard");
    } catch (err) {
      toast.error("Failed to save profile. Please try again.");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "LOGO" | "PROFILE") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropperData({
        image: reader.result as string,
        type,
        title: type === "LOGO" ? "Crop Company Logo" : "Crop Profile Picture",
        aspect: type === "LOGO" ? 1 : 1,
        circular: type === "PROFILE",
      });
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = "";
  };

  const uploadCroppedImage = async (blob: Blob) => {
    if (!cropperData) return;
    
    const type = cropperData.type;
    setCropperData(null);
    setIsUploading(true);
    setUploadProgress({ [type]: 10 });

    try {
      const file = new File([blob], `${type.toLowerCase()}_${Date.now()}.png`, { type: "image/png" });
      const photoType = type === "LOGO" ? "LOGO" : "PROFILE";
      const entityId = profile?.id || "onboarding";
      const { url } = await photosService.uploadPhoto(file, photoType, entityId, (progress) => {
        setUploadProgress({ [type]: progress });
      });

      setFormData(prev => ({
        ...prev,
        [type === "LOGO" ? "companyLogoUrl" : "profilePictureUrl"]: url,
        ...(type === "PROFILE" ? { profilePhotoUrl: url } : {})
      }));
      
      toast.success(`${type === "LOGO" ? "Logo" : "Profile picture"} uploaded successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const handlePhotoRemove = (type: "LOGO" | "PROFILE") => {
    setFormData(prev => ({
      ...prev,
      [type === "LOGO" ? "companyLogoUrl" : "profilePictureUrl"]: "",
      ...(type === "PROFILE" ? { profilePhotoUrl: "" } : {})
    }));
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progress = ((step - 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6 lg:p-12">
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">Welcome, {profile?.firstName}!</h1>
          <p className="text-muted-foreground text-lg">
            Let's get your insurer profile set up in just a few steps.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium px-1">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <UIProgress value={progress} className="h-2" />
        </div>

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader>
            {step === 1 && (
              <>
                <div className="flex items-center gap-2 text-primary mb-2">
                  <UserCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Step 1: Introduction</span>
                </div>
                <CardTitle className="text-2xl">Tell us about yourself</CardTitle>
                <CardDescription>
                  Provide a brief bio or professional summary to help others know who you are.
                </CardDescription>
              </>
            )}
            {step === 2 && (
              <>
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Building2 className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Step 2: Company Profile</span>
                </div>
                <CardTitle className="text-2xl">Business Details</CardTitle>
                <CardDescription>
                  Enter your company information and licensing details.
                </CardDescription>
              </>
            )}
            {step === 3 && (
              <>
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Camera className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Step 3: Brand Identity</span>
                </div>
                <CardTitle className="text-2xl">Visual Profile</CardTitle>
                <CardDescription>
                  Upload your professional photo and company logo to build trust.
                </CardDescription>
              </>
            )}
            {step === 4 && (
              <>
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Mail className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Step 4: Verification</span>
                </div>
                <CardTitle className="text-2xl">Official Contacts</CardTitle>
                <CardDescription>
                  Provide the official business credentials for correspondence.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    placeholder="Briefly describe your role and experience..."
                    className="min-h-[150px] resize-none"
                    value={formData.bio}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      placeholder="e.g. AgriSure Ltd"
                      value={formData.companyName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      name="licenseNumber"
                      placeholder="e.g. LIC-2024-889"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    name="website"
                    placeholder="https://www.example.com"
                    value={formData.website}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Headquarters Address</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="123 Kigali St, District..."
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyDescription">Company Description</Label>
                  <Textarea
                    id="companyDescription"
                    name="companyDescription"
                    placeholder="What does your company specialize in?"
                    className="min-h-[100px] resize-none"
                    value={formData.companyDescription}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Profile Picture */}
                  <div className="flex flex-col items-center gap-4">
                    <Label className="text-center">Profile Picture</Label>
                    <div 
                      className="group relative h-32 w-32 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center overflow-hidden bg-muted/30 cursor-pointer"
                      onClick={() => document.getElementById("profile-upload")?.click()}
                    >
                      {formData.profilePictureUrl ? (
                        <img 
                          src={formData.profilePictureUrl} 
                          alt="Profile" 
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <UserCircle className="h-12 w-12 text-muted-foreground/40" />
                      )}
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                        <Pencil className="h-5 w-5" />
                        <span className="text-[10px] uppercase font-bold mt-1">Change</span>
                      </div>

                      {isUploading && uploadProgress["PROFILE"] > 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <Input 
                      type="file" 
                      id="profile-upload" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, "PROFILE")}
                    />
                    {formData.profilePictureUrl && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlePhotoRemove("PROFILE")}>
                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    )}
                  </div>

                  {/* Company Logo */}
                  <div className="flex flex-col items-center gap-4">
                    <Label className="text-center">Company Logo</Label>
                    <div 
                      className="group relative h-32 w-48 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center overflow-hidden bg-muted/30 cursor-pointer"
                      onClick={() => document.getElementById("logo-upload")?.click()}
                    >
                      {formData.companyLogoUrl ? (
                        <img 
                          src={formData.companyLogoUrl} 
                          alt="Logo" 
                          className="h-full w-full object-contain p-2" 
                        />
                      ) : (
                        <Building2 className="h-12 w-12 text-muted-foreground/40" />
                      )}
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                        <Pencil className="h-5 w-5" />
                        <span className="text-[10px] uppercase font-bold mt-1">Change</span>
                      </div>

                      {isUploading && uploadProgress["LOGO"] > 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <Input 
                      type="file" 
                      id="logo-upload" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, "LOGO")}
                    />
                    {formData.companyLogoUrl && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handlePhotoRemove("LOGO")}>
                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Primary Contact Person</Label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    placeholder="Full name of person in charge"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="officialEmail">Official Email</Label>
                    <Input
                      id="officialEmail"
                      name="officialEmail"
                      type="email"
                      placeholder="contact@company.com"
                      value={formData.officialEmail}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="officialPhone">Official Phone</Label>
                    <Input
                      id="officialPhone"
                      name="officialPhone"
                      placeholder="+250..."
                      value={formData.officialPhone}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex gap-4 items-start translate-y-4">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    By finishing onboarding, you confirm that the information provided is accurate and represents your authorized role within your organization.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between pt-6 border-t bg-muted/10">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={step === 1 || updateProfile.isPending}
              className="px-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            {step < totalSteps ? (
              <Button onClick={nextStep} className="px-8 bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/25">
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={updateProfile.isPending}
                className="px-8 bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground opacity-50">
          Powered by AgriGuard Security Framework v2.4
        </p>
      </div>

      {cropperData && (
        <ImageCropper
          image={cropperData.image}
          title={cropperData.title}
          aspect={cropperData.aspect}
          circular={cropperData.circular}
          onCancel={() => setCropperData(null)}
          onCropComplete={uploadCroppedImage}
        />
      )}
    </div>
  );
};

export default Onboarding;
