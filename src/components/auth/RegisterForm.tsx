import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.js';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient'; // adjust path

interface RegisterFormProps {
  onRegister: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onRegister, onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    cafeteriaId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cafeterias, setCafeterias] = useState<{ id: string; name: string; location: string | null }[]>([]);
  const [isLoadingCafeterias, setIsLoadingCafeterias] = useState(false);
  const [cafeteriaError, setCafeteriaError] = useState('');

  useEffect(() => {
    const fetchCafeterias = async () => {
      setIsLoadingCafeterias(true);
      const { data, error } = await supabase
        .from('cafeterias')
        .select('id, name, location')
        .order('name', { ascending: true });

      if (error) {
        setCafeteriaError('Unable to load cafeteria list. Please try again later.');
        setCafeterias([]);
      } else {
        setCafeterias(data || []);
        setCafeteriaError('');
      }
      setIsLoadingCafeterias(false);
    };

    fetchCafeterias();
  }, []);
  const emailRegex = useMemo(() => /\S+@\S+\.\S+/, []);

  const validateInputs = () => {
    if (!formData.name.trim()) {
      toast.error('Full name is required.');
      return false;
    }
    if (!emailRegex.test(formData.email)) {
      toast.error('Please provide a valid email address.');
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
    if (formData.role === 'staff' && !formData.cafeteriaId) {
      toast.error('Please select your cafeteria.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);

    try {
      const selectedCafeteria = cafeterias.find(cafeteria => cafeteria.id === formData.cafeteriaId);

      // 1. Register user in Supabase Auth without auto-login
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
          },
          emailRedirectTo: window.location.origin + '/login', // stay on login page
        },
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      // 2. Insert user profile in "profiles" table
      if (data.user) {
        const profileData: Record<string, any> = {
          id: data.user.id,
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };

        if (formData.role === 'staff') {
          profileData.cafeteria_id = formData.cafeteriaId;
          profileData.cafeteria_name = selectedCafeteria?.name || null;
        }

        const { error: profileError } = await supabase.from('profiles').insert([profileData]);

        if (profileError) {
          toast.error('Failed to create profile: ' + profileError.message);
        } else {
          await supabase.auth.signOut();
          toast.success('Registration successful! Please verify your email, then login.');
          onRegister(); // redirect to login page
        }
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
                  placeholder="your.email@utm.my"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: string) =>
                    setFormData(prev => ({
                      ...prev,
                      role: value,
                      cafeteriaId: value === 'staff' ? prev.cafeteriaId : '',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Customer</SelectItem>
                    <SelectItem value="staff">Cafeteria Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === 'staff' && (
                <div className="space-y-2">
                  <Label htmlFor="cafeteria">Cafeteria</Label>
                  <Select
                    value={formData.cafeteriaId}
                    onValueChange={(value: string) => setFormData({ ...formData, cafeteriaId: value })}
                    disabled={isLoadingCafeterias || !!cafeteriaError}
                  >
                    <SelectTrigger id="cafeteria">
                      <SelectValue placeholder={isLoadingCafeterias ? 'Loading cafeterias...' : 'Select your cafeteria'} />
                    </SelectTrigger>
                    <SelectContent>
                      {cafeterias.map(cafeteria => (
                        <SelectItem key={cafeteria.id} value={cafeteria.id}>
                          {cafeteria.name}
                          {cafeteria.location ? ` - ${cafeteria.location}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {cafeteriaError && (
                    <p className="text-sm text-red-600">{cafeteriaError}</p>
                  )}
                </div>
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
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full text-white hover:opacity-90"
                style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Account'}
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
