import { ChangeEvent, useEffect, useState } from 'react';
import { User, Mail, Lock, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Button } from '../ui/button.js';
import { Separator } from '../ui/separator.js';
import { Switch } from '../ui/switch.js';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient.js';

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
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    orderUpdates: true,
    promotions: false,
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setLoadingProfile(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, phone, email_notifications, order_updates, promotions')
        .eq('id', user.id)
        .single();

      if (!isMounted) return;

      if (!error && data) {
        setFormData(prev => ({
          ...prev,
          name: data.name ?? user.name,
          email: data.email ?? user.email,
          phone: data.phone ?? '',
        }));
        setPreferences({
          emailNotifications: data.email_notifications ?? true,
          orderUpdates: data.order_updates ?? true,
          promotions: data.promotions ?? false,
        });
      }
      setLoadingProfile(false);
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user.id, user.email, user.name]);

  const handleSaveProfile = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      if (formData.email.trim() !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email.trim(),
        });
        if (authError) throw authError;
        toast.info('Please verify your new email address from the link we just sent.');
      }

      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message ? `Unable to save profile: ${err.message}` : 'Unable to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });
      if (error) throw error;
      toast.success('Password changed successfully!');
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      toast.error(err.message ? `Unable to change password: ${err.message}` : 'Unable to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          email_notifications: preferences.emailNotifications,
          order_updates: preferences.orderUpdates,
          promotions: preferences.promotions,
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Preferences saved successfully!');
    } catch (err: any) {
      toast.error(err.message ? `Unable to save preferences: ${err.message}` : 'Unable to save preferences.');
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  if (loadingProfile) {
    return <div className="px-6 py-10 text-center text-slate-500">Loading profile...</div>;
  }

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
              <Input id="name" value={formData.name} onChange={handleInputChange} className="pl-10" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input id="email" type="email" value={formData.email} onChange={handleInputChange} className="pl-10" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" value={formData.phone} onChange={handleInputChange} placeholder="012-345-6789" />
          </div>

          <div className="space-y-2">
            <Label>Account Type</Label>
            <Input
              value={user.role === 'staff' ? 'Cafeteria Owner' : 'Customer'}
              disabled
            />
          </div>

          <Button
            onClick={handleSaveProfile}
            className="text-white hover:opacity-90"
            style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}
            disabled={savingProfile}
          >
            <Save className="w-4 h-4 mr-2" />
            {savingProfile ? 'Saving...' : 'Save Profile'}
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
                onChange={handleInputChange}
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
                onChange={handleInputChange}
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
                onChange={handleInputChange}
                className="pl-10"
              />
            </div>
          </div>

          <Button onClick={handleChangePassword} variant="outline" disabled={changingPassword}>
            {changingPassword ? 'Updating...' : 'Change Password'}
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

          <Button
            onClick={handleSavePreferences}
            className="text-white hover:opacity-90"
            style={{ backgroundColor: 'oklch(40.8% 0.153 2.432)' }}
            disabled={savingPreferences}
          >
            <Save className="w-4 h-4 mr-2" />
            {savingPreferences ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
