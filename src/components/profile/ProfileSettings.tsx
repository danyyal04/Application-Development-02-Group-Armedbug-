import { ChangeEvent, useEffect, useState } from 'react';
import { User, Mail, Lock, Save, ImagePlus } from 'lucide-react';
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
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [selectedPic, setSelectedPic] = useState<File | null>(null);

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

  // -----------------------------------------------------------
  // LOAD PROFILE FROM DATABASE
  // -----------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoadingProfile(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, phone, avatar_url, email_notifications, order_updates, promotions')
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

        setProfilePic(data.avatar_url ? data.avatar_url : null);

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
  }, [user.id]);

  // -----------------------------------------------------------
  // UPLOAD PROFILE PICTURE
  // -----------------------------------------------------------
  const handleUploadProfilePic = async () => {
    if (!selectedPic) {
      toast.error("Please pick a picture first.");
      return;
    }

    const fileExt = selectedPic.name.split('.').pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase storage bucket "avatar"
    const { error: uploadError } = await supabase.storage
      .from('avatar')
      .upload(filePath, selectedPic, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      toast.error("Upload failed.");
      return;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('avatar')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Save URL in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      toast.error("Failed to update profile picture in database.");
      return;
    }

    setProfilePic(publicUrl);
    setSelectedPic(null);

    toast.success("Profile picture updated!");

    setTimeout(() => {
      window.location.reload();
    }, 1000);

    setProfilePic(`${publicUrl}?t=${Date.now()}`);
  };

  // -----------------------------------------------------------
  // SAVE PROFILE
  // -----------------------------------------------------------
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

      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // -----------------------------------------------------------
  // CHANGE PASSWORD
  // -----------------------------------------------------------
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
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  // -----------------------------------------------------------
  // SAVE NOTIFICATION PREFERENCES
  // -----------------------------------------------------------
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

      toast.success('Preferences saved!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPreferences(false);
    }
  };

  if (loadingProfile) {
    return <div className="px-6 py-10 text-center text-slate-500">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* ---------------- Profile Picture Section ---------------- */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Upload a new profile picture</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <img
              key={profilePic} 
                src={
                selectedPic 
                ? URL.createObjectURL(selectedPic) 
                : (profilePic ? `${profilePic}?t=${Date.now()}` : '/default-avatar.png')
            }
            alt="Profile"
            className="w-28 h-28 rounded-full object-cover border bg-slate-100" // Added bg-slate-100 so it looks nice even if empty
            />

            <div className="space-y-3">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedPic(e.target.files?.[0] || null)}
              />

              <Button
                onClick={handleUploadProfilePic}
                disabled={!selectedPic}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                Upload Picture
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- Personal Information ---------------- */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          </div>

          <Button onClick={handleSaveProfile} className="bg-purple-600 text-white hover:bg-purple-700">
            <Save className="w-4 h-4 mr-2" />
            {savingProfile ? "Saving..." : "Save Profile"}
          </Button>

        </CardContent>
      </Card>

      {/* ---------------- Change Password ---------------- */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your login password</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="Current Password"
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
          />

          <Input
            type="password"
            placeholder="New Password"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
          />

          <Input
            type="password"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          />

          <Button onClick={handleChangePassword} variant="outline">
            {changingPassword ? "Updating..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>

      {/* ---------------- Preferences ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Manage how you receive alerts</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          <div className="flex justify-between items-center">
            Email Notifications
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(v) => setPreferences({ ...preferences, emailNotifications: v })}
            />
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            Order Updates
            <Switch
              checked={preferences.orderUpdates}
              onCheckedChange={(v) => setPreferences({ ...preferences, orderUpdates: v })}
            />
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            Promotions
            <Switch
              checked={preferences.promotions}
              onCheckedChange={(v) => setPreferences({ ...preferences, promotions: v })}
            />
          </div>

          <Button onClick={handleSavePreferences} className="bg-purple-600 text-white hover:bg-purple-700">
            <Save className="w-4 h-4 mr-2" />
            {savingPreferences ? "Saving..." : "Save Preferences"}
          </Button>

        </CardContent>
      </Card>

    </div>
  );
}

