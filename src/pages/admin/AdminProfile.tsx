import { getErrorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  useAdminProfile,
  useUpdateAdminProfile,
  useChangeAdminPassword,
  usePlatformSettings,
} from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/ErrorState";
import { ProfileHeader } from "@/components/ProfileHeader";
import { toast } from "sonner";
import { User, Lock, Wallet } from "lucide-react";

export default function AdminProfile() {
  const { data: profile, isLoading, isError, refetch } = useAdminProfile();
  const updateProfile = useUpdateAdminProfile();
  const changePassword = useChangeAdminPassword();
  const platformSettings = usePlatformSettings();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gcashNumber, setGcashNumber] = useState("");

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

  useEffect(() => {
    if (platformSettings.data) {
      setGcashNumber(platformSettings.data.gcash_number || "");
    }
  }, [platformSettings.data]);

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

  const saveGcashNumber = () => {
    platformSettings.updateSettings.mutate(
      { gcash_number: gcashNumber.trim() },
      {
        onSuccess: () => toast.success("Platform GCash number saved"),
        onError: (err) => toast.error(getErrorMessage(err, "Failed to save GCash number")),
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

        {/* Where sellers send their ₱299 subscription payments. Same value as
            Admin > Payment Methods; kept here so "my profile" is the one place
            an admin configures money destinations. */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Wallet className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              Platform GCash Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="profile-platform-gcash">GCash Number</Label>
                <Input
                  id="profile-platform-gcash"
                  inputMode="numeric"
                  value={gcashNumber}
                  onChange={(e) => setGcashNumber(e.target.value)}
                  placeholder="09XX XXX XXXX"
                />
                <p className="text-xs text-muted-foreground">
                  Sellers send their {formatPrice(Number(platformSettings.data?.subscription_price) || 299)} subscription
                  payment to this number. It is shown to them on the Subscription page and in their payment instructions.
                </p>
              </div>
              <Button
                variant="gold"
                onClick={saveGcashNumber}
                disabled={platformSettings.updateSettings.isPending}
              >
                {platformSettings.updateSettings.isPending ? "Saving..." : "Save Number"}
              </Button>
            </div>
            {!gcashNumber.trim() && !platformSettings.isLoading && (
              <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                No number set yet - sellers cannot start a subscription payment until one is saved.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}