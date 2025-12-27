import { supabase } from '../lib/supabaseClient.js';

interface EnsureUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

const DEFAULT_LOCATION = 'Universiti Teknologi Malaysia';
const DEFAULT_DESCRIPTION =
  'Update this description to help students recognize your cafeteria.';
const DEFAULT_ESTIMATED_TIME = '15-20 min';
const DEFAULT_CATEGORY = 'Malaysian';

const profileSelection = 'id, cafeteria_id, cafeteria_name, role';
const cafeteriaSelection =
  'id, owner_auth_id, name, location, description, image, shop_image_url, category, rating, estimated_time, is_open, created_at, updated_at';

export async function ensureCafeteriaContext(user: EnsureUser) {
  if (!user?.id) {
    throw new Error('Missing user information.');
  }

  const baseName = user.name || 'My Cafeteria';

  let { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select(profileSelection)
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  let cafeteriaId = profileRow?.cafeteria_id || null;
  let cafeteriaName = profileRow?.cafeteria_name || baseName;

  // Try to find cafeteria by owner first (covers cases where profile lacks the link)
  let { data: ownerCafe, error: ownerCafeError } = await supabase
    .from('cafeterias')
    .select(cafeteriaSelection)
    .eq('owner_auth_id', user.id)
    .maybeSingle();

  if (ownerCafeError) {
    throw ownerCafeError;
  }

  if (ownerCafe) {
    cafeteriaId = ownerCafe.id;
    cafeteriaName = ownerCafe.name || cafeteriaName;
  }

  if (!cafeteriaId) {
    cafeteriaId = ownerCafe?.id || user.id;
  }

  let cafeteriaRow = ownerCafe;

  if (!cafeteriaRow) {
    const { data, error } = await supabase
      .from('cafeterias')
      .select(cafeteriaSelection)
      .eq('id', cafeteriaId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    cafeteriaRow = data;
  }

  if (!cafeteriaRow) {
    // Do not create cafeteria client-side (RLS blocks anon key). Return minimal shape.
    cafeteriaRow = {
      id: cafeteriaId,
      owner_auth_id: user.id,
      name: cafeteriaName,
      location: DEFAULT_LOCATION,
      description: DEFAULT_DESCRIPTION,
      image: '/UTMMunch-Logo.jpg',
      shop_image_url: null,
      category: DEFAULT_CATEGORY,
      rating: 4.5,
      estimated_time: DEFAULT_ESTIMATED_TIME,
      is_open: true,
      created_at: null,
      updated_at: null,
    } as any;
  }

  return {
    profile:
      profileRow || {
        id: user.id,
        cafeteria_id: cafeteriaId,
        cafeteria_name: cafeteriaName,
        role: 'owner',
      },
    cafeteria: cafeteriaRow,
    cafeteriaId: cafeteriaRow?.id || cafeteriaId,
    cafeteriaName: cafeteriaRow?.name || cafeteriaName,
  };
}
