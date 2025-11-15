import { useState } from 'react';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onLogin: (user: any) => void;
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onLogin, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      // Mock validation
      if (email && password) {
        const mockUser = {
          id: '1',
          name: email.includes('cafeteria') ? 'Ahmad (Cafe Angkasa)' : 'John Doe',
          email,
          role: email.includes('cafeteria') ? 'staff' : 'student',
        };
        
        toast.success('Login successful!');
        onLogin(mockUser);
      } else {
        toast.error('Invalid credentials. Please try again.');
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <img src="/UTMMunch-Logo.jpg" alt="UTMMunch Logo" className="h-24 w-auto mx-auto mb-4" />
          <p className="text-slate-600">
            Welcome back! Please login to your account.
          </p>
        </div>

        <Card className="shadow-xl border-slate-200">
          <CardHeader>
            <CardTitle>Login to UTMMunch</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
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

              <Button
                type="submit"
                className="w-full text-white hover:opacity-90"
                style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-slate-600">
                  Demo: Use any email (try "cafeteria@utm.my" for cafeteria staff role)
                </p>
                <p className="text-sm text-slate-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="text-purple-700 hover:underline"
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
