// scripts/seed-admins.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wbgjwatjhqukvkygcuun.supabase.co"; // replace
const SERVICE_ROLE_KEY = "sb_secret_Gwi_OmL8jyQ7CvC1Q4DS8A_9z87ZFHM"; // replace, keep secret

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const admins = [
  "danialdev@gmail.com",
  "fathurahmandev@gmail.com",
  "thayaallandev@gmail.com",
  "mustaqimdev@gmail.com",
];

for (const email of admins) {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password: "12345678",
    email_confirm: true,
    app_metadata: { role: "admin" },
  });
  if (error) {
    console.error(`Failed for ${email}:`, error.message);
  } else {
    console.log(`Created (or already exists) admin: ${email}`);
  }
}

process.exit(0);
