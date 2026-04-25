import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  User, 
  Settings as SettingsIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Briefcase, 
  Globe, 
  Camera,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  Upload,
  Save,
  Loader2,
  Trash2,
  Pencil,
  Plus,
  AlertTriangle,
  UserX,
  Lock
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
import { photosService } from "@/lib/api/services/photos";
import { authService } from "@/lib/api/services/auth";
import { useRequestDeactivation } from "@/lib/api/hooks/useAdmin";
import ImageCropper from "@/components/ui/image-cropper";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserWithProfile } from "@/lib/api/types";

const Settings = () => {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const requestDeactivation = useRequestDeactivation();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  // Cropper state
  const [cropperData, setCropperData] = useState<{
    image: string;
    type: string;
    title: string;
    aspect: number;
    circular: boolean;
  } | null>(null);
  
  // Fetch profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => authService.getProfile(),
  });

  // Form state
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (profile) {
      // Map profile fields to form data
      const roleProfile = profile.role === "INSURER" ? profile.insurerProfile : 
                         profile.role === "ASSESSOR" ? profile.assessorProfile : 
                         profile.role === "FARMER" ? profile.farmerProfile : {};
      
      setFormData({
        email: profile.email || "",
        phoneNumber: profile.phoneNumber || "",
        // Role specific fields
        ...roleProfile,
        companyName: (roleProfile as any)?.companyName || "",
        licenseNumber: (roleProfile as any)?.licenseNumber || "",
        website: (roleProfile as any)?.website || "",
        // Social media nested object
        ...(profile.role === "INSURER" ? {
          socialMedia: (roleProfile as any)?.socialMedia || {
            twitter: "",
            linkedin: "",
            facebook: "",
            instagram: ""
          }
        } : {})
      });
    }
  }, [profile]);

  const initialMappedData = useMemo(() => {
    if (!profile) return {};
    const roleProfile = profile.role === "INSURER" ? profile.insurerProfile : 
                       profile.role === "ASSESSOR" ? profile.assessorProfile : 
                       profile.role === "FARMER" ? profile.farmerProfile : {};
    
    return {
      email: profile.email || "",
      phoneNumber: profile.phoneNumber || "",
      ...roleProfile,
      ...(profile.role === "INSURER" ? {
        socialMedia: (roleProfile as any)?.socialMedia || {
          twitter: "",
          linkedin: "",
          facebook: "",
          instagram: ""
        }
      } : {})
    };
  }, [profile]);

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialMappedData);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => authService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update profile");
    }
  });
  
  // Password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: (data: any) => authService.changePassword(data),
    onSuccess: () => {
      toast.success("Password updated successfully");
      setShowPasswordDialog(false);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update password");
    }
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    updatePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev: any) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;
    updateProfileMutation.mutate(formData);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setCropperData({
        image: reader.result as string,
        type,
        title: type === "LOGO" ? "Crop Company Logo" : "Crop Profile Photo",
        aspect: type === "LOGO" ? 1 : 1,
        circular: type === "PROFILE",
      });
    });
    reader.readAsDataURL(file);
    
    // Reset file input
    e.target.value = "";
  };

  const uploadCroppedImage = async (croppedBlob: Blob) => {
    if (!cropperData || !profile) return;
    
    const type = cropperData.type;
    setCropperData(null);
    setIsUploading(true);
    setUploadProgress((prev) => ({ ...prev, [type]: 0 }));

    try {
      const response = await photosService.uploadPhoto(
        croppedBlob, 
        type, 
        profile.id,
        (progress) => setUploadProgress((prev) => ({ ...prev, [type]: progress }))
      );
      
      // Update the local form data preview
      const updateData = { ...formData };
      if (type === "LOGO") {
        updateData.companyLogoUrl = response.url;
      } else if (type === "PROFILE") {
        if (profile.role === "ASSESSOR") {
          updateData.profilePhotoUrl = response.url;
        } else {
          updateData.profilePictureUrl = response.url;
        }
      }
      
      setFormData(updateData);
      
      // Refresh the profile data to ensure everything is in sync
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      
      toast.success("Photo updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setIsUploading(false);
      setUploadProgress((prev) => ({ ...prev, [type]: 0 }));
    }
  };

  const handlePhotoRemove = async (type: string) => {
    if (!profile) return;

    setIsUploading(true);
    try {
      await photosService.clearProfilePhoto(profile.id, type);
      
      // Update the local form data preview
      const updateData = { ...formData };
      if (type === "LOGO") {
        updateData.companyLogoUrl = null;
      } else if (type === "PROFILE") {
        if (profile.role === "ASSESSOR") {
          updateData.profilePhotoUrl = null;
        } else {
          updateData.profilePictureUrl = null;
        }
      }
      
      setFormData(updateData);
      
      // Refresh the profile data to ensure everything is in sync
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      
      toast.success(`${type.toLowerCase()} removed successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to remove photo");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const role = profile?.role;

  return (
    <div className="container py-8 max-w-5xl">
      <div className="flex items-center gap-2 mb-8">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">Manage your profile and account preferences.</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="account">Account Access</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              {/* Profile Photos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {role === "INSURER" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Company Logo</CardTitle>
                      <CardDescription>Your organization's branding.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-6">
                      <div 
                        className="group relative h-40 w-40 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center overflow-hidden bg-muted/30 cursor-pointer"
                        onClick={() => document.getElementById("logo-upload")?.click()}
                      >
                        {formData.companyLogoUrl ? (
                          <img src={formData.companyLogoUrl} alt="Logo" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <Building2 className="h-16 w-16 text-muted-foreground/40" />
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 text-white">
                          {formData.companyLogoUrl ? (
                            <Pencil className="h-6 w-6" />
                          ) : (
                            <Plus className="h-6 w-6" />
                          )}
                          <span className="text-xs font-semibold px-2 text-center uppercase tracking-wider">
                            {formData.companyLogoUrl ? "Edit Company Logo" : "Add Company Logo"}
                          </span>
                        </div>

                        {/* Progress Bar Overlay */}
                        {isUploading && (uploadProgress["LOGO"] > 0) && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4">
                            <Loader2 className="h-6 w-6 text-white animate-spin mb-2" />
                            <Progress value={uploadProgress["LOGO"]} className="h-1 w-full bg-white/20" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <Input 
                          type="file" 
                          id="logo-upload" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, "LOGO")}
                        />
                        {formData.companyLogoUrl && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={isUploading}
                            onClick={() => handlePhotoRemove("LOGO")}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Logo
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(role === "INSURER" || role === "ASSESSOR") && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Profile Picture</CardTitle>
                      <CardDescription>Your personal professional photo.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-6">
                      <div 
                        className="group relative h-40 w-40 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center overflow-hidden bg-muted/30 cursor-pointer"
                        onClick={() => document.getElementById("profile-upload")?.click()}
                      >
                        {(formData.profilePictureUrl || formData.profilePhotoUrl) ? (
                          <img 
                            src={formData.profilePictureUrl || formData.profilePhotoUrl} 
                            alt="Profile" 
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" 
                          />
                        ) : (
                          <User className="h-16 w-16 text-muted-foreground/40" />
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 text-white">
                          {(formData.profilePictureUrl || formData.profilePhotoUrl) ? (
                            <Pencil className="h-6 w-6" />
                          ) : (
                            <Plus className="h-6 w-6" />
                          )}
                          <span className="text-xs font-semibold px-2 text-center uppercase tracking-wider">
                            {(formData.profilePictureUrl || formData.profilePhotoUrl) ? "Edit Profile Picture" : "Add Profile Picture"}
                          </span>
                        </div>

                        {/* Progress Bar Overlay */}
                        {isUploading && (uploadProgress["PROFILE"] > 0) && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4">
                            <Loader2 className="h-6 w-6 text-white animate-spin mb-2" />
                            <Progress value={uploadProgress["PROFILE"]} className="h-1 w-full bg-white/20" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <Input 
                          type="file" 
                          id="profile-upload" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, "PROFILE")}
                        />
                        {(formData.profilePictureUrl || formData.profilePhotoUrl) && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={isUploading}
                            onClick={() => handlePhotoRemove("PROFILE")}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Photo
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Cropper Modal */}
              {cropperData && (
                <ImageCropper
                  active={!!cropperData}
                  image={cropperData.image}
                  type={cropperData.type}
                  title={cropperData.title}
                  aspect={cropperData.aspect}
                  circular={cropperData.circular}
                  onCancel={() => setCropperData(null)}
                  onCropComplete={uploadCroppedImage}
                />
              )}

              {/* Basic Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Details</CardTitle>
                  <CardDescription>Verify your identity information (Provided by NIDA).</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input 
                        value={`${profile?.firstName || ""} ${profile?.lastName || ""}`} 
                        disabled 
                        className="bg-muted/30 border-dashed cursor-not-allowed opacity-80" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>National ID</Label>
                      <Input 
                        value={profile?.nationalId || "Not provided"} 
                        disabled 
                        className="bg-muted/30 border-dashed cursor-not-allowed opacity-80" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email" 
                          name="email"
                          value={formData.email} 
                          onChange={handleInputChange}
                          className="pl-9" 
                          placeholder="your.email@example.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="phoneNumber" 
                          name="phoneNumber"
                          value={formData.phoneNumber} 
                          onChange={handleInputChange}
                          className="pl-9" 
                          placeholder="+250..."
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Insurer Specific Details */}
              {role === "INSURER" && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Business Information</CardTitle>
                      <CardDescription>This information will be visible to farmers in the marketplace.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bio">Professional Biography</Label>
                        <Textarea 
                          id="bio" 
                          name="bio"
                          value={formData.bio || ""} 
                          onChange={handleInputChange}
                          placeholder="Describe your insurance agency's history and mission..."
                          className="min-h-[120px]"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="companyName">Company Name</Label>
                          <Input 
                            id="companyName" 
                            name="companyName"
                            value={formData.companyName || ""} 
                            onChange={handleInputChange}
                            placeholder="e.g. Starhawk Insurance Group"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="licenseNumber">Insurance License Number</Label>
                          <Input 
                            id="licenseNumber" 
                            name="licenseNumber"
                            value={formData.licenseNumber || ""} 
                            onChange={handleInputChange}
                            placeholder="LIC-12345678"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="website">Company Website</Label>
                          <Input 
                            id="website" 
                            name="website"
                            value={formData.website || ""} 
                            onChange={handleInputChange}
                            placeholder="https://www.company.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="officialEmail">Official Business Email</Label>
                          <Input 
                            id="officialEmail" 
                            name="officialEmail"
                            value={formData.officialEmail || ""} 
                            onChange={handleInputChange}
                            placeholder="contact@company.com"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="officialPhone">Official Business Phone</Label>
                          <Input 
                            id="officialPhone" 
                            name="officialPhone"
                            value={formData.officialPhone || ""} 
                            onChange={handleInputChange}
                            placeholder="+250..."
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Location & Social Presence</CardTitle>
                      <CardDescription>Where your headquarters are located and how to find you online.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="province">Province</Label>
                          <Input id="province" name="province" value={formData.province || ""} onChange={handleInputChange} placeholder="Not provided" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="district">District</Label>
                          <Input id="district" name="district" value={formData.district || ""} onChange={handleInputChange} placeholder="Not provided" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sector">Sector</Label>
                          <Input id="sector" name="sector" value={formData.sector || ""} onChange={handleInputChange} placeholder="Not provided" />
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="socialMedia.twitter" className="flex items-center gap-2">
                            <Twitter className="h-4 w-4" /> Twitter / X
                          </Label>
                          <Input 
                            id="socialMedia.twitter" 
                            name="socialMedia.twitter" 
                            value={formData.socialMedia?.twitter || ""} 
                            onChange={handleInputChange}
                            placeholder="https://x.com/username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="socialMedia.linkedin" className="flex items-center gap-2">
                            <Linkedin className="h-4 w-4" /> LinkedIn
                          </Label>
                          <Input 
                            id="socialMedia.linkedin" 
                            name="socialMedia.linkedin" 
                            value={formData.socialMedia?.linkedin || ""} 
                            onChange={handleInputChange}
                            placeholder="https://linkedin.com/company/username"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Farmer Specific Details */}
              {role === "FARMER" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Farm Information</CardTitle>
                    <CardDescription>Manage your primary farming location.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 text-muted-foreground">
                    <p className="text-sm italic">
                      Farm locations are typically managed through the "Farms" tab. Below are your profile-level address details.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <div className="space-y-2">
                        <Label htmlFor="province">Province</Label>
                        <Input id="province" name="province" value={formData.province || ""} onChange={handleInputChange} placeholder="Not provided" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="district">District</Label>
                        <Input id="district" name="district" value={formData.district || ""} onChange={handleInputChange} placeholder="Not provided" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sector">Sector</Label>
                        <Input id="sector" name="sector" value={formData.sector || ""} onChange={handleInputChange} placeholder="Not provided" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-4 mt-4">
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending || !hasChanges} 
                  className="w-full md:w-auto"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Access</CardTitle>
              <CardDescription>Information about your account security and authentication.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
                <div className="space-y-1">
                  <p className="font-medium">Password</p>
                  <p className="text-sm text-muted-foreground">Manage your account security credentials.</p>
                </div>
                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Update Password</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Update Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and a new secure password.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePasswordSubmit}>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="currentPassword"
                              type="password"
                              className="pl-9"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">New Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="newPassword"
                              type="password"
                              className="pl-9"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                              required
                              minLength={8}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm New Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="confirmPassword"
                              type="password"
                              className="pl-9"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setShowPasswordDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updatePasswordMutation.isPending}>
                          {updatePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Update Password
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
                <div className="space-y-1">
                  <p className="font-medium">Role Permissions</p>
                  <p className="text-sm text-muted-foreground">Your account has {role?.toLowerCase()} level access.</p>
                </div>
                <Badge variant="secondary" className="capitalize">{role?.toLowerCase()}</Badge>
              </div>

              <Separator />

              <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <h4 className="font-semibold text-destructive mb-1 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Deactivate Account
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Request account deactivation. This will immediately lock your account and notify system administrators for permanent deletion.
                </p>
                
                {profile?.status === "DEACTIVATION_REQUESTED" ? (
                  <Badge variant="destructive" className="h-9 px-4 py-2 text-sm animate-pulse flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deactivation Pending Approval
                  </Badge>
                ) : (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setConfirmDeactivate(true)}
                    disabled={requestDeactivation.isPending}
                  >
                    {requestDeactivation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserX className="mr-2 h-4 w-4" />
                    )}
                    Deactivate My Account
                  </Button>
                )}
              </div>

              <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        This action will submit your account for <strong className="font-bold text-foreground">permanent deletion</strong>. 
                        System administrators will review and authorize the final erasure of all your data.
                      </p>
                      <p className="font-semibold bg-muted p-3 rounded-md text-foreground">
                        Once submitted, you will be unable to log back in unless an administrator restores your access.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep my account</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        requestDeactivation.mutate(undefined, {
                          onSuccess: () => {
                            setConfirmDeactivate(false);
                            toast.success("Request submitted. Logging you out...");
                            setTimeout(() => {
                              authService.logout();
                              window.location.href = "/login";
                            }, 2000);
                          }
                        });
                      }}
                    >
                      Yes, request deactivation
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
