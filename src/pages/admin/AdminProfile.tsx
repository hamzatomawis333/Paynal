import { getErrorMessage } from "@/lib/errors";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminProfile, useUpdateAdminProfile, useChangeAdminPassword } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/ErrorState";
import { ProfileHeader } from "@/components/ProfileHeader";
import { toast } from "sonner";
import { User, Lock } from "lucide-react";

export default function AdminProfile() {
  const { data: profile, isLoading, isError, refetch } = useAdminProfile();
  const updateProfile = useUpdateAdminProfile();
  const changePassword = useChangeAdminPassword();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
    }
  }, [profile]);

  const resetForm = () => {
    setFullName(profile?.full_name || "");
    setPhone(profile?.phone || "");
    setAddress(profile?.address || "");
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      { full_name: fullName, phone, address },
      {
        onSuccess: () => toast.success("Profile updated!"),
        onError: (err) => toast.error(getErrorMessage(err, "Failed to update")),
      }
    );
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPw.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    changePassword.mutate(
      { currentPassword: currentPw, newPassword: newPw },
      {
        onSuccess: () => {
          toast.success("Password changed!");
          setCurrentPw("");
          setNewPw("");
          setConfirmPw("");
        },
        onError: (err) => toast.error(getErrorMessage(err, "Failed to change password")),
      }
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="mx-auto w-full max-w-6xl space-y-6 pt-4 lg:pt-6">
          <Skeleton className="h-9 w-48" aria-hidden="true" />
          <Skeleton className="h-64 w-full" aria-hidden="true" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>My Profile | Admin Panel</title>
      </Helmet>

      <div className="mx-auto w-full max-w-6xl space-y-6 pt-4 lg:pt-6">
        <PageHeader title="My Profile" subtitle="Update your account information" />

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
            createdAt={profile.created_at}
            avatarUrl={profile.avatar_url}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Info */}
          <Card className="shadow-soft lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={profile?.email || ""} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09XX XXX XXXX" />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Your full address" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gold" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
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
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPw">Current Password</Label>
                  <Input id="currentPw" type="password" autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPw">New Password</Label>
                  <Input id="newPw" type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPw">Confirm New Password</Label>
                  <Input id="confirmPw" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
                </div>
                <Button type="submit" variant="outline" className="w-full" disabled={changePassword.isPending}>
                  {changePassword.isPending ? "Changing..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}