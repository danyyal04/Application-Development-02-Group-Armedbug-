import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wbgjwatjhqukvkygcuun.supabase.co"; // matching seed-admins.mjs
const SERVICE_ROLE_KEY = "sb_secret_Gwi_OmL8jyQ7CvC1Q4DS8A_9z87ZFHM"; // matching seed-admins.mjs

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const email = "testowner@utm.my";
const password = "password123";

console.log(`Seeding owner: ${email}`);

// 1. Create/Get Auth User
let userId;
const { data: listData } = await supabase.auth.admin.listUsers();
const existingUser = listData.users.find(u => u.email === email);

if (existingUser) {
  userId = existingUser.id;
  console.log(`User exists: ${userId}`);
  // Update password to be sure
  await supabase.auth.admin.updateUserById(userId, { password: password });
} else {
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'owner', status: 'approved' },
    user_metadata: { name: 'Test Owner', role: 'owner', status: 'approved' }
  });
  
  if (authError) {
    console.error("Auth creation failed:", authError);
    process.exit(1);
  }
  userId = authData.user.id;
  console.log(`Created user: ${userId}`);
}

// 2. Upsert Profile
const { error: profError } = await supabase.from('profiles').upsert({
  id: userId,
  email,
  name: 'Test Owner',
  email_notifications: true
});
if (profError) console.error("Profile Error:", profError.message);
else console.log("Profile Upserted");

// 3. Fix Registration Request (Ensure Approved)
// Delete old requests to avoid duplicates/confusion
await supabase.from('registration_request').delete().eq('user_id', userId);

const { error: regError } = await supabase.from('registration_request').insert({
  user_id: userId,
  email,
  business_name: 'Test Cafeteria',
  business_address: 'UTM Campus',
  contact_number: '0123456789',
  status: 'approved',
  doc_url: '' // optional
});
if (regError) console.error("Reg Request Error:", regError.message);
else console.log("Registration Request Approved");

// 4. Ensure Cafeteria Exists
const { data: cafes } = await supabase.from('cafeterias').select('id').eq('owner_id', userId);
if (!cafes || cafes.length === 0) {
  const { error: cafeError } = await supabase.from('cafeterias').insert({
    owner_id: userId,
    name: 'Test Cafeteria',
    description: 'Auto-generated test cafeteria',
    is_open: true,
    category: 'Western'
  });
  if (cafeError) console.error("Cafeteria Creation Error:", cafeError.message);
  else console.log("Cafeteria Created");
} else {
  console.log("Cafeteria already exists");
}

console.log("Done.");
process.exit(0);
