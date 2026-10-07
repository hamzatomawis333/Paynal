import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { Helmet } from "react-helmet-async";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { useSellerProfile, useUpdateProfile, useChangePassword } from "@/hooks/useSeller";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/ErrorState";
import { ProfileHeader } from "@/components/ProfileHeader";
import { toast } from "sonner";
import { User, Lock, Loader2 } from "lucide-react";

export default function SellerProfile() {
  const { data: profile, isLoading, isError, refetch } = useSellerProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [profileForm, setProfileForm] = useState<{
    full_name: string;
    phone: string;
    address: string;
    shop_name: string;
    shop_address: string;
    gcash_number: string;
    specialty: string;
    story: string;
    location: string;
  } | null>(null);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Initialize form when profile loads
  const form = profileForm || {
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
    shop_name: profile?.shop_name || "",
    shop_address: profile?.shop_address || "",
    gcash_number: profile?.gcash_number || "",
    specialty: profile?.artisan_profile?.specialty || "",
    story: profile?.artisan_profile?.story || "",
    location: profile?.artisan_profile?.location || "",
  };

  const handleProfileChange = (key: string, value: string) => {
    setProfileForm((prev) => ({ ...form, ...prev, [key]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync(form);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update your profile"));
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      await changePassword.mutateAsync({
        currentPassword: passwordForm.current_password,
        newPassword: passwordForm.new_password,
      });
      toast.success("Password changed successfully");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to change your password"));
    }
  };

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="mx-auto w-full max-w-6xl space-y-6 pt-4 lg:pt-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <Helmet>
        <title>Seller Profile | Seller Hub</title>
      </Helmet>

      <div className="mx-auto w-full max-w-6xl space-y-6 pt-4 lg:pt-6">
        <PageHeader
          title="Seller Profile"
          subtitle="Manage your account and artisan details"
        />

        {isError && (
          <ErrorState
            title="We couldn't load your profile"
            onRetry={() => void refetch()}
          />
        )}

        {profile && (
          <ProfileHeader
            name={profile.full_name}
            email={profile.email}
            role={profile.role}
            avatarUrl={profile.avatar_url}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Form */}
          <Card className="shadow-soft lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Personal Information
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={form.full_name}
                        onChange={(e) => handleProfileChange("full_name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={profile?.email || ""} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => handleProfileChange("phone", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={form.address}
                        onChange={(e) => handleProfileChange("address", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Shop Information
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="shop_name">Shop Name</Label>
                      <Input
                        id="shop_name"
                        value={form.shop_name}
                        onChange={(e) => handleProfileChange("shop_name", e.target.value)}
                        placeholder="e.g., Maranao Weaving Co."
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="gcash_number">GCash Number</Label>
                      <Input
                        id="gcash_number"
                        type="tel"
                        inputMode="numeric"
                        value={form.gcash_number}
                        onChange={(e) => handleProfileChange("gcash_number", e.target.value)}
                        placeholder="09171234567"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Payouts are sent to this number.
                      </p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="shop_address">Shop Address</Label>
                      <Textarea
                        id="shop_address"
                        rows={2}
                        value={form.shop_address}
                        onChange={(e) => handleProfileChange("shop_address", e.target.value)}
                        placeholder="Stall / shop unit, market section, Marawi City"
                        required
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Artisan Details
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="specialty">Specialty</Label>
                      <Input
                        id="specialty"
                        value={form.specialty}
                        onChange={(e) => handleProfileChange("specialty", e.target.value)}
                        placeholder="e.g., Brasswork, Weaving"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={form.location}
                        onChange={(e) => handleProfileChange("location", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="story">Your Story</Label>
                      <Textarea
                        id="story"
                        value={form.story}
                        onChange={(e) => handleProfileChange("story", e.target.value)}
                        rows={4}
                        placeholder="Tell customers about your craft..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setProfileForm(null)} disabled={updateProfile.isPending}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gold" disabled={updateProfile.isPending}>
                    {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_pw">Current Password</Label>
                  <Input
                    id="current_pw"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_pw">New Password</Label>
                  <Input
                    id="new_pw"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_pw">Confirm Password</Label>
                  <Input
                    id="confirm_pw"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirm_password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full" disabled={changePassword.isPending}>
                  {changePassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Change Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </SellerLayout>
  );
}