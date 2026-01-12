import { useEffect, useState } from 'react';
import { User, Mail, Lock, Save, ImagePlus, Heart, UtensilsCrossed, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
// import { Checkbox } from '../ui/checkbox'; // Removed Checkbox import if no longer used
// import { cafeterias } from '../../data/cafeterias'; // Removed static import

interface ProfileSettingsProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role?: 'customer' | 'owner' | 'admin';
  };
  onNavigate?: (page: string) => void;
}

export default function ProfileSettings({ user, onNavigate }: ProfileSettingsProps) {
  // Get user info from props or localStorage
  const userEmail = user?.email || localStorage.getItem('userEmail') || 'student@graduate.utm.my';
  const userId = user?.id || localStorage.getItem('userId') || 'temp-user-id';
  const defaultName = user?.name || ((userEmail || '').split('@')[0] ?? '').replace('.', ' ').split(' ').map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [selectedPic, setSelectedPic] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: defaultName,
    email: userEmail,
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

  // Food Preferences State
  const [foodPreferences, setFoodPreferences] = useState({
    dietaryType: 'no-preference',
    spiceLevel: 'medium',
    favouriteCategories: [] as string[],
  });
  const [savingFoodPrefs, setSavingFoodPrefs] = useState(false);

  // Favourite Cafeterias State
  const [favouriteCafeterias, setFavouriteCafeterias] = useState<string[]>([]);

  // Cafeterias State (fetched from DB to match IDs)
  const [fetchedCafeterias, setFetchedCafeterias] = useState<any[]>([]);

  // Fetch cafeterias from DB
  useEffect(() => {
    const fetchCafeterias = async () => {
      const { data, error } = await supabase
        .from('cafeterias')
        .select('*');

      if (!error && data) {
         // Map to ensure shape matches what we need
         const mapped = data.map(row => ({
           id: row.id,
           name: row.name,
           category: row.category ?? 'Malaysian',
           description: row.description,
           image: row.image,
           isOpen: row.is_open
         }));
         setFetchedCafeterias(mapped);
      } else {
        console.error("Failed to fetch cafeterias for profile:", error);
      }
    };
    fetchCafeterias();
  }, []);

  const allCafeterias = fetchedCafeterias;

  // Listen for storage events to update favorites in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('favouriteCafeterias');
        if (saved) {
          setFavouriteCafeterias(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Failed to sync favorites", e);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const foodCategories = ['Malay', 'Chinese', 'Halal', 'Western', 'Dessert', 'Beverages', 'Fried', 'Fast Food'];

  // -----------------------------------------------------------
  // LOAD PROFILE FROM DATABASE
  // -----------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoadingProfile(true);

      // Get real auth user to ensure RLS compliance
      let currentUserId = userId;
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          currentUserId = authData.user.id;
          console.log("Using authenticated User ID:", currentUserId);
        }
      } catch (e) {
        console.warn("Could not fetch auth user, using fallback:", userId);
      }

      // Try to load from localStorage first (for demo purposes)
      const storedProfile = localStorage.getItem(`profile_${currentUserId}`);
      if (storedProfile) {
        try {
          const profile = JSON.parse(storedProfile);
          if (isMounted) {
            setFormData(prev => ({
              ...prev,
              name: profile.name ?? defaultName,
              email: profile.email ?? userEmail,
              phone: profile.phone ?? '',
            }));
            setProfilePic(profile.avatar_url ?? null);
            setPreferences({
              emailNotifications: profile.email_notifications ?? true,
              orderUpdates: profile.order_updates ?? true,
              promotions: profile.promotions ?? false,
            });
            
            // Load food prefs if available locally
            if (profile.dietary_type || profile.spice_level) {
               setFoodPreferences(prev => ({
                 ...prev,
                 dietaryType: profile.dietary_type || 'no-preference',
                 spiceLevel: profile.spice_level || 'medium',
                 favouriteCategories: profile.favourite_categories || [],
               }));
            }
             if (profile.favourite_cafeterias) {
               setFavouriteCafeterias(profile.favourite_cafeterias);
             }
          }
        } catch (e) {
          console.error('Error parsing stored profile:', e);
        }
      }

      // If Supabase is configured, try to load from database
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, email, phone, avatar_url, email_notifications, order_updates, promotions, dietary_type, spice_level, favourite_categories, favourite_cafeterias')
          .eq('id', currentUserId)
          .single();

        if (!isMounted) return;

        if (!error && data) {
          setFormData(prev => ({
            ...prev,
            name: data.name ?? defaultName,
            email: data.email ?? userEmail,
            phone: data.phone ?? '',
          }));

          setProfilePic(data.avatar_url ? data.avatar_url : null);

          setPreferences({
            emailNotifications: data.email_notifications ?? true,
            orderUpdates: data.order_updates ?? true,
            promotions: data.promotions ?? false,
          });

          setFoodPreferences({
            dietaryType: data.dietary_type || 'no-preference',
            spiceLevel: data.spice_level || 'medium',
            favouriteCategories: data.favourite_categories || [],
          });
          
          if (data.favourite_cafeterias) {
             setFavouriteCafeterias(data.favourite_cafeterias);
          }

          // Store in localStorage as backup
          localStorage.setItem(`profile_${currentUserId}`, JSON.stringify(data));
        }
      } catch (err) {
        // Supabase not configured or error occurred - use localStorage data
        console.log('Using localStorage profile data');
      }


      // Check for standalone favouriteCafeterias key (from CafeteriaList)
      // This takes precedence for the list view sync
      const standaloneFavs = localStorage.getItem('favouriteCafeterias');
      if (standaloneFavs) {
        try {
          setFavouriteCafeterias(JSON.parse(standaloneFavs));
        } catch (e) {
          console.error('Error parsing standalone favorites', e);
        }
      }

      setLoadingProfile(false);
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [userId, defaultName, userEmail]);

  // -----------------------------------------------------------
  // HELPER: Ensure Authentication with Refresh
  // -----------------------------------------------------------
  const ensureAuthenticated = async (): Promise<string | null> => {
    // 1. Try to get current user
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) return authData.user.id;

    // 2. If failed, try to refresh session
    console.log("Session invalid, attempting auto-refresh...");
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error("Session refresh failed:", refreshError);
      return null;
    }

    if (refreshData?.user) {
      console.log("Session refreshed successfully");
      return refreshData.user.id;
    }

    return null;
  };

  // -----------------------------------------------------------
  // UPLOAD PROFILE PICTURE
  // -----------------------------------------------------------
  const handleUploadProfilePic = async () => {
    if (!selectedPic) {
      toast.error("Please pick a picture first.");
      return;
    }

    // Resolve current user ID and Auth status
    let currentUserId = userId;
    let isAuthenticated = false;
    
    const validatedUserId = await ensureAuthenticated();
    if (validatedUserId) {
       currentUserId = validatedUserId;
       isAuthenticated = true;
    }

    try {
      const fileExt = selectedPic.name.split('.').pop();
      const fileName = `${currentUserId}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      let publicUrl = null;

      if (isAuthenticated) {
        // Upload to Supabase storage bucket "avatar"
        const { error: uploadError } = await supabase.storage
          .from('avatar')
          .upload(filePath, selectedPic, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error("Upload failed. Saving locally only.");
          // Fallback handled below
        } else {
           // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('avatar')
            .getPublicUrl(filePath);
          publicUrl = publicUrlData.publicUrl;
        }
      }

      // If we have a public URL (uploaded successfully), save to DB
      if (isAuthenticated && publicUrl) {
         const { error: updateError } = await supabase
          .from('profiles')
          .upsert({ 
            id: currentUserId,
            avatar_url: publicUrl,
            updated_at: new Date().toISOString()
          });

        if (updateError) {
          console.error('Supabase update error:', updateError);
           // Don't return, just warn and fall back to local
          toast.error(`Cloud save failed: ${updateError.message}`);
        } else {
           toast.success("Profile picture updated!");
        }
      } else {
         toast.error("Cloud sync failed: Session expired.", {
            description: "Please log in again to fix this.",
            action: {
              label: "Log Out",
              onClick: async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }
            },
            duration: 8000,
         });
      }

      // Always update local state/storage for immediate feedback
      const displayUrl = publicUrl || URL.createObjectURL(selectedPic);
      setProfilePic(displayUrl);
      setSelectedPic(null);

      const currentProfile = JSON.parse(localStorage.getItem(`profile_${currentUserId}`) || '{}');
      currentProfile.avatar_url = displayUrl;
      localStorage.setItem(`profile_${currentUserId}`, JSON.stringify(currentProfile));

      // Refresh image
      if (publicUrl) {
        setTimeout(() => {
          setProfilePic(`${publicUrl}?t=${Date.now()}`);
        }, 100);
      }

    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(`Error: ${err.message || "Unknown error"}`);
      // Fallback
      const localUrl = URL.createObjectURL(selectedPic);
      setProfilePic(localUrl);
      setSelectedPic(null);
    }
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
      // Resolve current user ID and Auth status
      let currentUserId = userId;
      let isAuthenticated = false;

      const validatedUserId = await ensureAuthenticated();
      if (validatedUserId) {
         currentUserId = validatedUserId;
         isAuthenticated = true;
      }

      const profileData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
      };

      // Try to save to Supabase
      if (isAuthenticated) {
        try {
          const { error } = await supabase
            .from('profiles')
            .upsert({
              id: currentUserId,
              ...profileData,
              updated_at: new Date().toISOString()
            });

          if (error) throw error;
        } catch (err: any) {
          console.error("Supabase Save Error:", err);
          toast.error(`Cloud save failed: ${err.message}. Saved locally.`);
        }
      } else {
         console.log('User not authenticated, skipping Supabase save');
      }

      // Always save to localStorage as backup
      const currentProfile = JSON.parse(localStorage.getItem(`profile_${currentUserId}`) || '{}');
      Object.assign(currentProfile, profileData);
      localStorage.setItem(`profile_${currentUserId}`, JSON.stringify(currentProfile));

      if (isAuthenticated) {
        toast.success("Profile updated successfully!");
        await updateAuthEmailIfChanged(formData.email.trim());
      } else {
        toast.error("Cloud sync failed: Session expired. Saved locally.");
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  /**
   * Helper to update the authentication email if it has changed.
   * Supabase requires a separate call for this, and it may trigger a confirmation email.
   */
  const updateAuthEmailIfChanged = async (newEmail: string) => {
    // Only proceed if email is actually different
    if (newEmail === userEmail) return;

    try {
      const { data, error } = await supabase.auth.updateUser({ email: newEmail });
      
      if (error) {
        toast.error(`Failed to update login email: ${error.message}`);
        console.error('Auth update error:', error);
        return;
      }

      // Check if email confirmation is required
      // Supabase often returns a user object with the NEW email as 'email' if no confirmation is needed,
      // or keeps the OLD one if confirmation is pending. 
      // A common pattern is to check if data.user.email matches newEmail.
      
      if (data.user?.email !== newEmail) {
        toast.info("Please check your new email to confirm the change.");
      } else {
        toast.success("Login email updated successfully.");
      }
      
    } catch (err) {
      console.error("Error updating auth email:", err);
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

    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });
      
      if (error) throw error;

      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      toast.success('Password changed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password. Feature requires Supabase configuration.');
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
      const prefsData = {
        email_notifications: preferences.emailNotifications,
        order_updates: preferences.orderUpdates,
        promotions: preferences.promotions,
      };

       // Resolve current user ID
      let currentUserId = userId;
      let isAuthenticated = false;

      const validatedUserId = await ensureAuthenticated();
      if (validatedUserId) {
         currentUserId = validatedUserId;
         isAuthenticated = true;
      }

      // Try to save to Supabase
      if (isAuthenticated) {
        try {
          const { error } = await supabase
            .from('profiles')
            .upsert({
              id: currentUserId,
              ...prefsData,
              updated_at: new Date().toISOString()
            });

          if (error) throw error;
        } catch (err: any) {
           console.error('Saving preferences error:', err);
           toast.error('Cloud save failed, saved locally.');
        }
      } else {
         console.log('Skipping Supabase save (not authenticated)');
      }

      // Always save to localStorage as backup
      const currentProfile = JSON.parse(localStorage.getItem(`profile_${currentUserId}`) || '{}');
      Object.assign(currentProfile, prefsData);
      localStorage.setItem(`profile_${currentUserId}`, JSON.stringify(currentProfile));

      if (isAuthenticated) {
        toast.success('Preferences saved!');
      } else {
         toast.error("Cloud sync failed: Session expired. Saved locally.");
      }
    } catch (err: any) {
      // toast.error(err.message || 'Failed to save preferences');
       toast.error('Update failed due to system error.'); // Requirement UC026 EF1
    } finally {
      setSavingPreferences(false);
    }
  };

  // -----------------------------------------------------------
  // SAVE FOOD PREFERENCES
  // -----------------------------------------------------------
  const handleSaveFoodPreferences = async () => {
    setSavingFoodPrefs(true);
    try {
      const foodPrefsData = {
        dietary_type: foodPreferences.dietaryType,
        spice_level: foodPreferences.spiceLevel,
        favourite_categories: foodPreferences.favouriteCategories,
      };

      // Resolve current user ID
      let currentUserId = userId;
      let isAuthenticated = false;

      const validatedUserId = await ensureAuthenticated();
      if (validatedUserId) {
         currentUserId = validatedUserId;
         isAuthenticated = true;
      }

      // Try to save to Supabase
      if (isAuthenticated) {
        try {
          const { error } = await supabase
            .from('profiles')
            .upsert({
              id: currentUserId,
              ...foodPrefsData,
              updated_at: new Date().toISOString()
            });

          if (error) throw error;
        } catch (err: any) {
           console.error('Saving food preferences error:', err);
           toast.error('Cloud save failed, saved locally.');
        }
      } else {
         console.log('Skipping Supabase save (not authenticated)');
      }

      // Always save to localStorage as backup
      const currentProfile = JSON.parse(localStorage.getItem(`profile_${currentUserId}`) || '{}');
      Object.assign(currentProfile, foodPrefsData);
      localStorage.setItem(`profile_${currentUserId}`, JSON.stringify(currentProfile));

      if (isAuthenticated) {
        toast.success('Food preferences saved!');
      } else {
         toast.error("Cloud sync failed: Session expired. Saved locally.");
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save food preferences');
    } finally {
      setSavingFoodPrefs(false);
    }
  };

  // -----------------------------------------------------------
  // TOGGLE FOOD CATEGORY
  // -----------------------------------------------------------
  const toggleFoodCategory = (category: string) => {
    setFoodPreferences(prev => ({
      ...prev,
      favouriteCategories: prev.favouriteCategories.includes(category)
        ? prev.favouriteCategories.filter(c => c !== category)
        : [...prev.favouriteCategories, category]
    }));
  };

  // -----------------------------------------------------------
  // TOGGLE FAVOURITE CAFETERIA
  // -----------------------------------------------------------
  const toggleFavouriteCafeteria = (cafeteriaId: string) => {
    setFavouriteCafeterias(prev => {
      const newFavs = prev.includes(cafeteriaId)
        ? prev.filter(id => id !== cafeteriaId)
        : [...prev, cafeteriaId];
      
      // Update localStorage to sync with CafeteriaList
      localStorage.setItem('favouriteCafeterias', JSON.stringify(newFavs));
      window.dispatchEvent(new Event('storage'));
      
      return newFavs;
    });
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
              className="w-28 h-28 rounded-full object-cover border bg-slate-100"
              onError={(e) => {
                // Fallback to default avatar if image fails to load
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 24 24" fill="none" stroke="%23a855f7" stroke-width="1.5"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';
              }}
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
                className="text-white hover:opacity-90"
                style={{ background: 'linear-gradient(90deg, oklch(40.8% 0.153 2.432), oklch(40.8% 0.153 2.432))' }}
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
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="+60 12-345 6789"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="text-white hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, oklch(40.8% 0.153 2.432), oklch(40.8% 0.153 2.432))' }}
          >
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
          <div>
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              placeholder="Enter current password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Enter new password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={changingPassword}
            variant="outline"
          >
            <Lock className="w-4 h-4 mr-2" />
            {changingPassword ? "Updating..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>

      {/* ---------------- Preferences ---------------- */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Manage how you receive alerts</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

            <div className="flex justify-between items-center">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-sm text-slate-500">Receive updates via email</p>
            </div>
            <Switch
              checked={preferences.emailNotifications}
              onCheckedChange={(v) => setPreferences({ ...preferences, emailNotifications: v })}
            />
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <div>
              <Label>Order Updates</Label>
              <p className="text-sm text-slate-500">Get notified about order status changes</p>
            </div>
            <Switch
              checked={preferences.orderUpdates}
              onCheckedChange={(v) => setPreferences({ ...preferences, orderUpdates: v })}
            />
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <div>
              <Label>Promotions</Label>
              <p className="text-sm text-slate-500">Receive promotional offers and discounts</p>
            </div>
            <Switch
              checked={preferences.promotions}
              onCheckedChange={(v) => setPreferences({ ...preferences, promotions: v })}
            />
          </div>

          <Button
            onClick={handleSavePreferences}
            disabled={savingPreferences}
            className="text-white hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, oklch(40.8% 0.153 2.432), oklch(40.8% 0.153 2.432))' }}
          >
            <Save className="w-4 h-4 mr-2" />
            {savingPreferences ? "Saving..." : "Save Preferences"}
          </Button>

        </CardContent>
      </Card>

      {/* ---------------- Food Preferences ---------------- */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5" />
            Food Preferences
          </CardTitle>
          <CardDescription>Set your dietary preferences for personalized recommendations</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">

          <div>
            <Label htmlFor="dietary-type">Dietary Type</Label>
            <Select
              value={foodPreferences.dietaryType}
              onValueChange={(v) => setFoodPreferences({ ...foodPreferences, dietaryType: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select dietary type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-preference">No Preference</SelectItem>
                <SelectItem value="vegetarian">Vegetarian</SelectItem>
                <SelectItem value="low-sugar">Low-sugar</SelectItem>
                <SelectItem value="high-protein">High Protein</SelectItem>
                <SelectItem value="low-fat">Low-fat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="spice-level">Spice Level</Label>
            <Select
              value={foodPreferences.spiceLevel}
              onValueChange={(v) => setFoodPreferences({ ...foodPreferences, spiceLevel: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select spice level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mild">Mild</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="spicy">Spicy</SelectItem>
                <SelectItem value="extra-spicy">Extra Spicy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-3 block">Favourite Food Categories</Label>
            <div className="flex flex-wrap gap-3">
              {foodCategories.map(category => {
                const isSelected = foodPreferences.favouriteCategories.includes(category);
                return (
                  <Button
                    key={category}
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => toggleFoodCategory(category)}
                    className={`rounded-full transition-all ${
                        isSelected 
                        ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600" 
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {category}
                  </Button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleSaveFoodPreferences}
            disabled={savingFoodPrefs}
            className="text-white hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, oklch(40.8% 0.153 2.432), oklch(40.8% 0.153 2.432))' }}
          >
            <Save className="w-4 h-4 mr-2" />
            {savingFoodPrefs ? "Saving..." : "Save Food Preferences"}
          </Button>

        </CardContent>
      </Card>

      {/* ---------------- Favourite Cafeterias ---------------- */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Favourite Cafeterias
          </CardTitle>
          <CardDescription>Mark your favourite cafeterias for quick access</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          <div className="space-y-4">
            {/* Filter to show ONLY favourite cafeterias */}
            {allCafeterias
              .filter(cafe => favouriteCafeterias.includes(cafe.id))
              .map(cafe => {
                const isFavourite = true; // inherently true since we filtered
                // Mock recent purchase logic (e.g., if ID is '1' or '2')
                const recentlyBought = ['1', '2'].includes(cafe.id);

                return (
                  <div
                    key={cafe.id}
                    className={`relative border rounded-lg p-4 transition-all border-purple-600 bg-purple-50`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-slate-900 font-medium">{cafe.name}</h3>
                          {recentlyBought && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200 text-[10px] px-1.5 h-5">
                              Recently Bought
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-white">
                          {cafe.category}
                        </Badge>
                      </div>
                      <div 
                        className="cursor-pointer text-red-500 hover:scale-110 transition-transform"
                        onClick={() => toggleFavouriteCafeteria(cafe.id)}
                      >
                        <Heart className="w-6 h-6 fill-current" />
                      </div>
                    </div>
                  </div>
                );
            })}

            {favouriteCafeterias.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                <Heart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No favourite cafeterias yet.</p>
              </div>
            )}
            
            <Button 
              variant="outline" 
              className="w-full mt-4 border-dashed border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={() => onNavigate?.('menu')}
            >
              <Search className="w-4 h-4 mr-2" />
              Browse More Cafeterias
            </Button>
          </div>

          {favouriteCafeterias.length > 0 && (
            <div className="pt-2">
              <p className="text-sm text-slate-600">
                {favouriteCafeterias.length} cafeteria{favouriteCafeterias.length !== 1 ? 's' : ''} marked as favourite
              </p>
            </div>
          )}

          <Button
            onClick={async () => {
              try {
                const favouriteCafesData = {
                  favourite_cafeterias: favouriteCafeterias,
                };

                // Try to save to Supabase
                try {
                  const { error } = await supabase
                    .from('profiles')
                    .update(favouriteCafesData)
                    .eq('id', userId);

                  if (error) throw error;
                } catch (err) {
                  console.log('Saving favourite cafeterias to localStorage');
                }

                // Always save to localStorage as backup
                const currentProfile = JSON.parse(localStorage.getItem(`profile_${userId}`) || '{}');
                Object.assign(currentProfile, favouriteCafesData);
                localStorage.setItem(`profile_${userId}`, JSON.stringify(currentProfile));

                toast.success('Favourite cafeterias saved!');
              } catch (err: any) {
                toast.error(err.message || 'Failed to save favourite cafeterias');
              }
            }}
            className="text-white hover:opacity-90"
            style={{ background: 'linear-gradient(90deg, oklch(40.8% 0.153 2.432), oklch(40.8% 0.153 2.432))' }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Favourite Cafeterias
          </Button>

        </CardContent>
      </Card>

    </div>
  );
}
