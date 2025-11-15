import { useState } from 'react';
import { User, Mail, Lock, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Button } from '../ui/button.js';
import { Separator } from '../ui/separator.js';
import { Switch } from '../ui/switch.js';
import { toast } from 'sonner';

interface ProfileSettingsProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'staff' | 'admin';
  };
}

export default function ProfileSettings({ user }: ProfileSettingsProps) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: '012-345-6789',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    orderUpdates: true,
    promotions: false,
  });

  const handleSaveProfile = () => {
    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    toast.success('Profile updated successfully!');
  };

  const handleChangePassword = () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    toast.success('Password changed successfully!');
    setFormData({
      ...formData,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const handleSavePreferences = () => {
    toast.success('Preferences saved successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 mb-2">Profile Settings ⚙️</h1>
        <p className="text-slate-600">Manage your account settings and preferences</p>
      </div>

      {/* Personal Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Account Type</Label>
            <Input 
              value={user.role === 'staff' ? 'Cafeteria Staff/Owner' : 'UTM Student/Staff'} 
              disabled 
            />
          </div>

          <Button onClick={handleSaveProfile} className="text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}>
            <Save className="w-4 h-4 mr-2" />
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password for better security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, newPassword: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <Button onClick={handleChangePassword} variant="outline">
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-900">Email Notifications</p>
              <p className="text-sm text-slate-600">Receive updates via email</p>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(checked: boolean) => setPreferences({ ...preferences, emailNotifications: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-900">Order Updates</p>
              <p className="text-sm text-slate-600">Get notified about order status changes</p>
            </div>
            <Switch
              checked={preferences.orderUpdates}
              onCheckedChange={(checked: boolean) => setPreferences({ ...preferences, orderUpdates: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-900">Promotions & Offers</p>
              <p className="text-sm text-slate-600">Receive promotional emails</p>
            </div>
            <Switch
              checked={preferences.promotions}
              onCheckedChange={(checked: boolean) => setPreferences({ ...preferences, promotions: checked })}
            />
          </div>

          <Button onClick={handleSavePreferences} className="text-white hover:opacity-90" style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}>
            <Save className="w-4 h-4 mr-2" />
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
