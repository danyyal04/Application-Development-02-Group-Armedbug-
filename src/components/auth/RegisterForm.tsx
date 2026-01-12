import { useMemo, useState } from 'react';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.js';
import { Separator } from '../ui/separator.js';
import { toast } from 'sonner';
import { Eye, EyeOff, Info, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient'; // adjust path

interface RegisterFormProps {
  onRegister: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onRegister, onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: string;
    businessName: string;
    businessAddress: string;
    contactNumber: string;
    ownerIdFile: File | null;
    businessLogoFile: File | null;
  }>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer', // customer = customer, owner = cafeteria owner
    businessName: '',
    businessAddress: '',
    contactNumber: '',
    ownerIdFile: null,
    businessLogoFile: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailRegex = useMemo(() => /\S+@\S+\.\S+/, []);
  const utmEmailRegex = useMemo(() => /@(?:utm\.my|graduate\.utm\.my)$/i, []);
  const ownerEmailRegex = useMemo(
  () => /^[a-zA-Z0-9._%+-]*owner@gmail\.com$/,
  []
);

  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `owner-docs/${Date.now()}-${Math.random()}.${fileExt}`;
    const { error } = await supabase.storage.from('documents').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const validateInputs = () => {
    if (!formData.name.trim()) {
      toast.error('Full name is required.');
      return false;
    }
    if (!emailRegex.test(formData.email)) {
      toast.error('Please provide a valid email address.');
      return false;
    }
    if (formData.role === 'customer' && !utmEmailRegex.test(formData.email)) {
      toast.error('Customer accounts must use a valid UTM email address.');
      return false;
    }
    if (formData.role === 'owner' && !ownerEmailRegex.test(formData.email)) {
    toast.error('Cafeteria Owner email must follow format: xxowner@gmail.com');
    return false;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      return false;
    }
    if (formData.role === 'owner') {
      if (!formData.businessName.trim()) {
        toast.error('Business name is required.');
        return false;
      }
      if (!formData.businessAddress.trim()) {
        toast.error('Business address is required.');
        return false;
      }
      if (!formData.contactNumber.trim()) {
        toast.error('Contact number is required.');
        return false;
      }
      if (!formData.ownerIdFile) {
        toast.error('Owner identification document is required.');
        return false;
      }
      if (!formData.businessLogoFile) {
        toast.error('Business logo is required for cafeteria listing.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);

    try {
      // 1. Register user in Supabase Auth without auto-login
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
            status: formData.role === 'owner' ? 'pending' : 'active',
          },
          emailRedirectTo: window.location.origin + '/login', // stay on login page
        },
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (user && formData.role === 'owner') {
        let ownerIdUrl = '';
        let businessLogoUrl = '';

        try {
          if (formData.ownerIdFile) {
             ownerIdUrl = await uploadFile(formData.ownerIdFile);
          }
          if (formData.businessLogoFile) {
             businessLogoUrl = await uploadFile(formData.businessLogoFile);
          }
        } catch (uploadError: any) {
           toast.error('Failed to upload documents: ' + uploadError.message);
           setLoading(false);
           return;
        }

        // Use a security-definer RPC to bypass RLS for owner registration
        const { error: reqErr } = await supabase.rpc('create_owner_registration', {
          _auth_id: user.id,
          _email: formData.email,
          _business_name: formData.businessName,
          _business_address: formData.businessAddress,
          _contact_number: formData.contactNumber,
          _documents: {
            owner_identification: ownerIdUrl,
            business_logo: businessLogoUrl,
          },
        });
        if (reqErr) {
          toast.error('Failed to submit application: ' + reqErr.message);
          setLoading(false);
          return;
        }
      }

      if (user) {
        if (data.session) {
          // If auto-login happened, sign out. 
          // App.tsx will handle the SIGNED_OUT event and redirect to login.
          // We DO NOT call onRegister() here to avoid a race condition 
          // (changing page before App.tsx processes the initial SIGNED_IN event).
          await supabase.auth.signOut(); 
        } else {
          // No session means no auto-signin (e.g. email confirmation pending).
          // Manually redirect since no auth event will fire.
          onRegister(); 
        }

        toast.success(
          formData.role === 'owner'
            ? 'Application submitted. Please wait for admin approval.'
            : 'Registration successful! Please verify your email, then login.'
        );
      }
    } catch (err: any) {
      toast.error('Unexpected error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <img src="/UTMMunch-Logo.jpg" alt="UTMMunch Logo" className="h-24 w-auto mx-auto mb-4" />
          <p className="text-slate-600">Create your account to get started with UTMMunch</p>
        </div>

        <Card className="shadow-xl border-slate-200">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Fill in your details to register</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Register As</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: string) =>
                    setFormData(prev => ({
                      ...prev,
                      role: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer (UTM Student/Staff)</SelectItem>
                    <SelectItem value="owner">Cafeteria Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={formData.role === 'customer' ? 'your.email@utm.my' : 'owner@email.com'}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                {formData.role === 'customer' && (
                  <p className="text-xs text-slate-500">Must be a valid UTM email address</p>
                )}
                {formData.role === 'owner' && (
                  <div className="flex gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                    <Info className="w-4 h-4 mt-0.5" />
                    <span>Additional business information and verification documents are required for cafeteria owner registration.</span>
                  </div>
                )}
              </div>

              {formData.role === 'owner' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Cafeteria Name</Label>
                      <Input
                        id="businessName"
                        placeholder="e.g., Cafe Angkasa"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessAddress">Cafeteria Address</Label>
                      <Input
                        id="businessAddress"
                        placeholder="e.g., Faculty of Computing, UTM"
                        value={formData.businessAddress}
                        onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input
                        id="contactNumber"
                        placeholder="e.g., +6012 345 6789"
                        value={formData.contactNumber}
                        onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                        required
                      />
                    </div>

                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Cafeteria Verification Documents</Label>
                      <p className="text-xs text-slate-500">Owner ID and Cafeteria logo are required.</p>
                      <div className="space-y-2">
                        <Label>Owner Identification (IC/Passport) *</Label>
                        <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                          <Upload className="w-4 h-4 text-slate-500" />
                          <span>{formData.ownerIdFile?.name || 'Choose file'}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf"
                            onChange={(e) =>
                              setFormData({ ...formData, ownerIdFile: e.target.files?.[0] || null })
                            }
                          />
                        </label>
                      </div>
                      <div className="space-y-2">
                        <Label>Business Logo *</Label>
                        <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                          <Upload className="w-4 h-4 text-slate-500" />
                          <span>{formData.businessLogoFile?.name || 'Choose file (logo shown to customers)'}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) =>
                              setFormData({ ...formData, businessLogoFile: e.target.files?.[0] || null })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full text-white hover:opacity-90"
                style={{
                  background:
                    'linear-gradient(90deg, oklch(40.8% 0.153 2.432), oklch(40.8% 0.153 2.432))',
                }}
                disabled={loading}
              >
                {loading
                  ? 'Creating account...'
                  : formData.role === 'owner'
                  ? 'Submit for Approval'
                  : 'Register'}
              </Button>

              <p className="text-sm text-center text-slate-600">
                Already have an account?{' '}
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
