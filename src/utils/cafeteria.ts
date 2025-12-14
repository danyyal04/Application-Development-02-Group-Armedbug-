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

  if (!profileRow || profileRow.cafeteria_id !== cafeteriaId) {
    const upsertPayload = {
      id: user.id,
      cafeteria_id: cafeteriaId,
      cafeteria_name: cafeteriaName,
      role: 'staff',
    };
    const { data: upserted, error: upsertError } = await supabase
      .from('profiles')
      .upsert(upsertPayload)
      .select(profileSelection)
      .maybeSingle();

    if (upsertError) {
      throw upsertError;
    }

    profileRow = upserted;
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
    const insertPayload = {
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
    };

    let inserted = null;
    let insertError = null;
    try {
      const { data, error } = await supabase
        .from('cafeterias')
        .upsert(insertPayload, { onConflict: 'id' })
        .select(cafeteriaSelection)
        .maybeSingle();
      inserted = data;
      insertError = error;
    } catch (err: any) {
      insertError = err;
    }

    if (insertError) {
      // If the failure is due to owner unique constraint, fetch the existing row
      const duplicateOwner =
        typeof insertError.message === 'string' &&
        insertError.message.includes('cafeterias_owner_auth_unique');
      if (duplicateOwner) {
        const { data: existingOwner } = await supabase
          .from('cafeterias')
          .select(cafeteriaSelection)
          .eq('owner_auth_id', user.id)
          .maybeSingle();
        cafeteriaRow = existingOwner || null;
      } else {
        throw insertError;
      }
    } else {
      cafeteriaRow = inserted;
    }
  } else if (!cafeteriaRow.owner_auth_id) {
    await supabase
      .from('cafeterias')
      .update({ owner_auth_id: user.id })
      .eq('id', cafeteriaRow.id);
  }

  return {
    profile: profileRow,
    cafeteria: cafeteriaRow,
    cafeteriaId: cafeteriaRow?.id || cafeteriaId,
    cafeteriaName: cafeteriaRow?.name || cafeteriaName,
  };
}
