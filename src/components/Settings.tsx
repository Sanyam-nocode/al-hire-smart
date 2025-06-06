import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { User, Bell, Shield, Palette, Globe, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface SettingsProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const Settings = ({ open, onOpenChange, trigger }: SettingsProps) => {
  const { user, recruiterProfile, candidateProfile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const userProfile = recruiterProfile || candidateProfile;
  const userType = recruiterProfile ? 'recruiter' : 'candidate';

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsUpdating(true);

    try {
      const formData = new FormData(event.currentTarget);
      
      if (userType === 'candidate' && candidateProfile) {
        const updateData = {
          first_name: formData.get('firstName') as string,
          last_name: formData.get('lastName') as string,
          email: formData.get('email') as string,
          phone: formData.get('phone') as string,
          location: formData.get('location') as string,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('candidate_profiles')
          .update(updateData)
          .eq('id', candidateProfile.id);

        if (error) {
          console.error('Error updating candidate profile:', error);
          toast.error("Failed to update profile. Please try again.");
          return;
        }

        // Invalidate and refetch auth context data
        await queryClient.invalidateQueries({ queryKey: ['candidates'] });
        
        // Refresh the profile in AuthContext
        await refreshProfile();
        
        toast.success("Profile updated successfully!");
      } else if (userType === 'recruiter' && recruiterProfile) {
        const updateData = {
          first_name: formData.get('firstName') as string,
          last_name: formData.get('lastName') as string,
          email: formData.get('email') as string,
          phone: formData.get('phone') as string,
          location: formData.get('location') as string,
          company: formData.get('company') as string,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('recruiter_profiles')
          .update(updateData)
          .eq('id', recruiterProfile.id);

        if (error) {
          console.error('Error updating recruiter profile:', error);
          toast.error("Failed to update profile. Please try again.");
          return;
        }

        // Refresh the profile in AuthContext
        await refreshProfile();

        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved!");
  };

  const handleSavePrivacy = () => {
    toast.success("Privacy settings updated!");
  };

  const handleDeleteAccount = () => {
    toast.error("Account deletion is not available yet. Please contact support.");
  };

  const settingsContent = (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="account">
            <Trash2 className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      name="firstName"
                      defaultValue={userProfile?.first_name || ''}
                      placeholder="Enter your first name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      name="lastName"
                      defaultValue={userProfile?.last_name || ''}
                      placeholder="Enter your last name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      name="email"
                      type="email"
                      defaultValue={user?.email || ''}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      name="phone"
                      defaultValue={userProfile?.phone || ''}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input 
                      id="location" 
                      name="location"
                      defaultValue={userProfile?.location || ''}
                      placeholder="Enter your location"
                    />
                  </div>
                  {userType === 'recruiter' && (
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input 
                        id="company" 
                        name="company"
                        defaultValue={recruiterProfile?.company || ''}
                        placeholder="Enter your company"
                        required
                      />
                    </div>
                  )}
                </div>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Save Profile Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in your browser
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing-emails">Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about new features and promotions
                  </p>
                </div>
                <Switch
                  id="marketing-emails"
                  checked={marketingEmails}
                  onCheckedChange={setMarketingEmails}
                />
              </div>
              
              <Button onClick={handleSaveNotifications}>
                Save Notification Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control your privacy and data visibility
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="profile-visibility">Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    {userType === 'candidate' 
                      ? 'Allow recruiters to find your profile'
                      : 'Make your profile visible to candidates'
                    }
                  </p>
                </div>
                <Switch
                  id="profile-visibility"
                  checked={profileVisibility}
                  onCheckedChange={setProfileVisibility}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Data Export</h4>
                <p className="text-sm text-muted-foreground">
                  Download a copy of your personal data
                </p>
                <Button variant="outline">
                  <Globe className="h-4 w-4 mr-2" />
                  Export My Data
                </Button>
              </div>
              
              <Button onClick={handleSavePrivacy}>
                Save Privacy Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account and data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Change Password</h4>
                <p className="text-sm text-muted-foreground">
                  Update your account password for better security
                </p>
                <Button variant="outline">
                  Change Password
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data
                </p>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  if (trigger) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>
              Manage your account settings and preferences
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {settingsContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return settingsContent;
};

export default Settings;
