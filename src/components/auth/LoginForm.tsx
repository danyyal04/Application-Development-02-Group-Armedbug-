import { useState } from "react";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { Label } from "../ui/label.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card.js";
import { toast } from "sonner";
import { Eye, EyeOff, Info } from "lucide-react";
import { supabase } from "../../lib/supabaseClient"; // correct path

const ALLOWED_ADMIN_EMAILS = [
  "danialdev@gmail.com",
  "amandev@gmail.com",
  "thayaallandev@gmail.com",
  "mustaqimdev@gmail.com",
];

interface LoginFormProps {
  onLogin: (user: any) => void;
  onSwitchToRegister: () => void;
}

export default function LoginForm({
  onLogin,
  onSwitchToRegister,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes("invalid login credentials")
        ) {
          toast.error("Invalid email or password.");
        } else {
          toast.error(error.message);
        }
      } else if (data.user) {
        const emailLower = (data.user.email || "").toLowerCase();
        const isAdmin =
          ALLOWED_ADMIN_EMAILS.includes(emailLower) ||
          data.user.app_metadata?.role === "admin" ||
          data.user.user_metadata?.role === "admin";

        // Default role/status
        let role = isAdmin
          ? "admin"
          : data.user.app_metadata?.role ||
            data.user.user_metadata?.role ||
            "student";
        let status =
          (data.user.app_metadata?.status as string) ||
          (data.user.user_metadata?.status as string) ||
          "active";

        // Fetch matching registration_request by linked app user id and/or email
        const { data: appUser } = await supabase
          .from("user")
          .select("id")
          .eq("auth_id", data.user.id)
          .maybeSingle();
        const filters: string[] = [];
        if (appUser?.id) filters.push(`user_id.eq.${appUser.id}`);
        if (data.user.email) filters.push(`email.ilike.${data.user.email}`);
        const orFilter = filters.join(",");

        const { data: regData, error: regError } = orFilter
          ? await supabase
              .from("registration_request")
              .select("status")
              .or(orFilter)
              .order("submitted_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : { data: null, error: null };

        const regStatus = regData?.status
          ? String(regData.status).trim().toLowerCase()
          : null;

        if (regError) {
          // If select blocked by RLS, fall back to metadata
          status = status || "active";
        } else if (regStatus) {
          role = isAdmin ? "admin" : "staff";
          status = regStatus;
        }

        status = (status || "active").toLowerCase();

        // Only block when we have an explicit pending/rejected status.
        if (role === "staff" && regStatus === "pending") {
          toast.info(
            "Your cafeteria owner application is pending approval. Please wait for admin review."
          );
          await supabase.auth.signOut();
          return;
        }
        if (role === "staff" && regStatus === "rejected") {
          toast.error(
            "Your cafeteria owner application was rejected. Please contact support."
          );
          await supabase.auth.signOut();
          return;
        }

        if (
          role === "admin" &&
          !ALLOWED_ADMIN_EMAILS.includes(emailLower)
        ) {
          toast.error("This admin account is not allowed to sign in.");
          await supabase.auth.signOut();
          return;
        }

        const userPayload = {
          id: data.user.id,
          email: data.user.email || "",
          name: data.user.user_metadata?.name || data.user.email || "",
          role,
          avatar: data.user.user_metadata?.avatar_url,
          status,
        };

        toast.success("Login successful!");
        onLogin(userPayload);
      }
    } catch (err: any) {
      toast.error("Unexpected error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email first.");
      return;
    }

    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password", // optional redirect page
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset email sent! Check your inbox.");
      }
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/UTMMunch-Logo.jpg"
            alt="UTMMunch Logo"
            className="h-24 w-auto mx-auto mb-4"
          />
          <p className="text-slate-600">
            Welcome back! Please login to your account.
          </p>
        </div>

        <Card className="shadow-xl border-slate-200">
          <CardHeader>
            <CardTitle>Login to UTMMunch</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g., student@utm.my or cafeteria@utm.my"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Forgot Password */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-purple-700 hover:underline text-sm disabled:opacity-60"
                    disabled={resetting || !email}
                  >
                    {resetting ? "Sending reset link..." : "Forgot password?"}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full text-white font-semibold"
                style={{
                  background: "linear-gradient(90deg, #7e22ce, #ec4899)",
                }}
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </Button>

              <div className="space-y-3">
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 flex gap-2">
                  <Info className="w-4 h-4 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium">Notes:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Customer: UTM email (e.g., student@utm.my)</li>
                      <li>Cafeteria Owner: xxxOwner@gmail.com</li>
                    </ul>
                  </div>
                </div>

                <p className="text-center text-sm text-slate-600">
                  Don’t have an account?{" "}
                  <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="text-purple-700 hover:underline font-medium"
                  >
                    Register here
                  </button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
