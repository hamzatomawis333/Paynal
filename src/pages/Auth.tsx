import { getErrorMessage } from "@/lib/errors";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { loginUser, registerUser } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Store, ShoppingBag, ArrowLeft, Phone, MapPin, Wallet, Home } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { refresh: refreshAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

// Register
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState("buyer");

  // Vendor-only details. The API requires all of them when role === "seller",
  // so they are cleared whenever the account type switches back to buyer and
  // are never sent in that case.
  const [regPhone, setRegPhone] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regShopName, setRegShopName] = useState("");
  const [regShopAddress, setRegShopAddress] = useState("");
  const [regGcash, setRegGcash] = useState("");

  const isVendor = regRole === "seller";

  const handleRegRoleChange = (role: string) => {
    setRegRole(role);
    if (role !== "seller") {
      setRegPhone("");
      setRegAddress("");
      setRegShopName("");
      setRegShopAddress("");
      setRegGcash("");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
setIsLoading(true);
    try {
      const data = await loginUser(loginEmail, loginPassword);
      // The token was just written to localStorage after AuthContext already
      // finished its initial load, so reflect the new session in the context;
      // otherwise ProtectedRoute still thinks we are signed out and bounces
      // us back to /auth.
      try {
        await refreshAuth();
      } catch {
        // The context falls back to the server check on next mount.
      }
      toast.success(`Welcome back, ${data.user.full_name}!`);
      navigate(data.user.role === "admin" ? "/admin" : data.user.role === "seller" ? "/seller" : "/account");
    } catch (err) {
      toast.error(getErrorMessage(err, "Login failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
const data = await registerUser({
        full_name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        ...(isVendor
          ? {
              phone: regPhone,
              address: regAddress,
              shop_name: regShopName,
              shop_address: regShopAddress,
              gcash_number: regGcash,
            }
          : {}),
});
      try {
        await refreshAuth();
      } catch {
        // The context falls back to the server check on next mount.
      }
      toast.success(`Account created! Welcome, ${data.user.full_name}!`);
      navigate(data.user.role === "admin" ? "/admin" : data.user.role === "seller" ? "/seller" : "/account");
    } catch (err) {
      toast.error(getErrorMessage(err, "Registration failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign In | LanaoCrafts</title>
        <meta name="description" content="Sign in or create an account on LanaoCrafts" />
      </Helmet>

      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <Link
              to="/"
              className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>

            <Card className="p-6">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-gold">
                  <span className="font-display text-xl font-bold text-primary-foreground">L</span>
                </div>
                <h1 className="font-display text-2xl font-bold">Welcome to LanaoCrafts</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign in to your account or create a new one
                </p>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="gold"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="mt-6">
                  <form onSubmit={handleRegister} className="space-y-4">
                    {/* Account Type */}
                    <div className="space-y-2">
                      <Label>I want to</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="cursor-pointer">
                          <input
                            type="radio"
                            name="accountType"
                            value="buyer"
                            className="peer sr-only"
                            checked={regRole === "buyer"}
                            onChange={() => handleRegRoleChange("buyer")}
                          />
                          <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-border p-4 transition-colors peer-checked:border-primary peer-checked:bg-primary/5">
                            <ShoppingBag className="h-6 w-6 text-primary" />
                            <span className="text-sm font-medium">Buy Products</span>
                          </div>
                        </label>
                        <label className="cursor-pointer">
                          <input
                            type="radio"
                            name="accountType"
                            value="seller"
                            className="peer sr-only"
                            checked={regRole === "seller"}
                            onChange={() => handleRegRoleChange("seller")}
                          />
                          <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-border p-4 transition-colors peer-checked:border-primary peer-checked:bg-primary/5">
                            <Store className="h-6 w-6 text-primary" />
                            <span className="text-sm font-medium">Sell Crafts</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-name">Full Name</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Juan dela Cruz"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@example.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                      />
                    </div>
{isVendor && (
                      <>
                        <Separator className="my-1" />
                        <p className="text-sm text-muted-foreground">
                          These details are required so customers can reach your shop and so payouts
                          can be sent to your GCash account.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="register-phone" className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              Contact Number
                            </Label>
                            <Input
                              id="register-phone"
                              type="tel"
                              inputMode="numeric"
                              placeholder="09171234567"
                              value={regPhone}
                              onChange={(e) => setRegPhone(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="register-gcash" className="flex items-center gap-1.5">
                              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                              GCash Number
                            </Label>
                            <Input
                              id="register-gcash"
                              type="tel"
                              inputMode="numeric"
                              placeholder="09171234567"
                              value={regGcash}
                              onChange={(e) => setRegGcash(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-shop-name" className="flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5 text-muted-foreground" />
                            Shop Name
                          </Label>
                          <Input
                            id="register-shop-name"
                            type="text"
                            placeholder="e.g., Maranao Weaving Co."
                            value={regShopName}
                            onChange={(e) => setRegShopName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-address" className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            Address
                          </Label>
                          <Input
                            id="register-address"
                            type="text"
                            placeholder="Poblacion, Marawi City, Lanao del Sur"
                            value={regAddress}
                            onChange={(e) => setRegAddress(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="register-shop-address" className="flex items-center gap-1.5">
                            <Home className="h-3.5 w-3.5 text-muted-foreground" />
                            Shop Address
                          </Label>
                          <Textarea
                            id="register-shop-address"
                            rows={2}
                            placeholder="Stall / shop unit, market section, Marawi City"
                            value={regShopAddress}
                            onChange={(e) => setRegShopAddress(e.target.value)}
                            required
                          />
                        </div>
                      </>
                    )}
                    <Button
                      type="submit"
                      variant="gold"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Auth;
