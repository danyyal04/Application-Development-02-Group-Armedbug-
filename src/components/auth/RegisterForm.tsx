import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.js";
import { Separator } from "../ui/separator.js";
import { toast } from "sonner";
import { Eye, EyeOff, Upload } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

interface RegisterFormProps {
  onRegister: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterForm({
  onRegister,
  onSwitchToLogin,
}: RegisterFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    businessName: "",
    businessAddress: "",
    contactNumber: "",
    ownerIdFile: "",
    businessLogoFile: "",
    ssmCertificateFile: "",
    businessLicenseFile: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // EMAIL VALIDATION RULES
  const utmEmailRegex = useMemo(
    () => /@(utm\.my|graduate\.utm\.my)$/i,
    []
  );

  const ownerEmailRegex = useMemo(
    () => /^[a-zA-Z0-9._%+-]*Owner@gmail\.com$/,
    []
  );

  const generalEmailRegex = useMemo(() => /\S+@\S+\.\S+/, []);

  // ============================
  // VALIDATION
  // ============================

  const validateInputs = () => {
    if (!formData.name.trim())
      return toast.error("Full name is required."), false;

    if (!generalEmailRegex.test(formData.email))
      return toast.error("Invalid email format."), false;

    if (formData.role === "student" && !utmEmailRegex.test(formData.email))
      return toast.error("Customers MUST use a UTM email address."), false;

    if (formData.role === "staff" && !ownerEmailRegex.test(formData.email))
      return toast.error(
        "Cafeteria Owner MUST use an email like xxOwner@gmail.com"
      ), false;

    if (formData.password.length < 8)
      return toast.error("Password must be at least 8 characters."), false;

    if (formData.password !== formData.confirmPassword)
      return toast.error("Passwords do not match."), false;

    if (formData.role === "staff") {
      if (!formData.businessName)
        return toast.error("Cafeteria name required."), false;

      if (!formData.businessAddress)
        return toast.error("Cafeteria address required."), false;

      if (!formData.contactNumber)
        return toast.error("Contact number required."), false;

      if (!formData.ownerIdFile)
        return toast.error("Owner ID is required."), false;

      if (!formData.ssmCertificateFile)
        return toast.error("SSM Certificate is required."), false;

      if (!formData.businessLicenseFile)
        return toast.error("Business License is required."), false;
    }

    return true;
  };

  // ============================
  // SUBMIT
  // ============================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
            status: formData.role === "staff" ? "pending" : "active",
          },
          emailRedirectTo: window.location.origin + "/login",
        },
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      const user = data.user;

      if (user && formData.role === "staff") {
        const { error: reqErr } = await supabase.from("registration_request").insert({
          user_id: user.id,
          business_name: formData.businessName,
          business_address: formData.businessAddress,
          contact_number: formData.contactNumber,
          email: formData.email,
          documents: {
            owner_identification: formData.ownerIdFile,
            ssm_certificate: formData.ssmCertificateFile,
            business_license: formData.businessLicenseFile,
            business_logo: formData.businessLogoFile || null,
          },
          status: "pending",
        });

        if (reqErr) {
          toast.error("Failed to submit application: " + reqErr.message);
          setLoading(false);
          return;
        }
      }

      if (user) {
        await supabase.auth.signOut();
        toast.success(
          formData.role === "staff"
            ? "Application submitted. Please wait for admin approval."
            : "Registration successful! Check your UTM email."
        );
        onRegister();
      }
    } catch (err: any) {
    toast.error("Unexpected error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // FILE FIELDS
  const documentFields = [
    { label: "Owner Identification (IC/Passport) *", key: "ownerIdFile" as keyof typeof formData },
    { label: "SSM Certificate *", key: "ssmCertificateFile" as keyof typeof formData },
    { label: "Business License *", key: "businessLicenseFile" as keyof typeof formData },
    { label: "Business Logo (Optional)", key: "businessLogoFile" as keyof typeof formData },
  ] as const;

  // ============================
  // UI
  // ============================

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <img src="/UTMMunch-Logo.jpg" className="h-24 w-auto mx-auto mb-4" />
          <p className="text-slate-600">Create your account to get started</p>
        </div>

        <Card className="shadow-xl border-slate-200">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Fill in your details to register</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ROLE SELECT */}
              <div className="space-y-2">
                <Label>Register As</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: string) =>
                    setFormData((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Customer (UTM Student/Staff)</SelectItem>
                    <SelectItem value="staff">Cafeteria Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* NAME */}
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              {/* EMAIL */}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />

                {/* CUSTOMER EMAIL CHECK */}
                {formData.role === "student" &&
                  formData.email !== "" &&
                  !utmEmailRegex.test(formData.email) && (
                    <p className="text-xs text-red-600">
                      Must use UTM email (example: yourname@utm.my)
                    </p>
                  )}

                {/* CAFETERIA OWNER EMAIL CHECK */}
                {formData.role === "staff" &&
                  formData.email !== "" &&
                  !ownerEmailRegex.test(formData.email) && (
                    <p className="text-xs text-red-600">
                      Must use owner email: <strong>xxOwner@gmail.com</strong>
                    </p>
                  )}
              </div>

              {/* STAFF FIELDS */}
              {formData.role === "staff" && (
                <>
                  <Separator />

                  {/* CAFETERIA NAME */}
                  <div className="space-y-2">
                    <Label>Cafeteria Name</Label>
                    <Input
                      value={formData.businessName}
                      onChange={(e) =>
                        setFormData({ ...formData, businessName: e.target.value })
                      }
                    />
                  </div>

                  {/* CAFETERIA ADDRESS */}
                  <div className="space-y-2">
                    <Label>Cafeteria Address</Label>
                    <Input
                      value={formData.businessAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, businessAddress: e.target.value })
                      }
                    />
                  </div>

                  {/* CONTACT NUMBER (NOT CHANGED) */}
                  <div className="space-y-2">
                    <Label>Contact Number</Label>
                    <Input
                      value={formData.contactNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, contactNumber: e.target.value })
                      }
                    />
                  </div>

                  <Separator />

                  {/* DOCUMENT UPLOAD FIELDS */}
                  {documentFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label>{field.label}</Label>
                      <label className="flex items-center justify-between rounded-md border border-slate-300 px-4 py-2 cursor-pointer hover:bg-slate-50">
                        <span className="text-slate-700">
                          {formData[field.key] || "Choose file"}
                        </span>
                        <Upload className="w-4 h-4 text-slate-500" />
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [field.key]: e.target.files?.[0]?.name || "",
                            })
                          }
                        />
                      </label>
                    </div>
                  ))}
                </>
              )}

              {/* PASSWORD */}
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              {/* SUBMIT */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-700 to-pink-700 text-white hover:opacity-90"
              >
                {loading
                  ? "Creating account..."
                  : formData.role === "staff"
                  ? "Submit for Approval"
                  : "Register"}
              </Button>

              {/* SWITCH TO LOGIN */}
              <p className="text-sm text-center text-slate-600">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-purple-700 hover:underline"
                >
                  Login here
                </button>
              </p>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
