// scripts/seed-admins.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cleiujovigtjaroqkggd.supabase.co"; // replace
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsZWl1am92aWd0amFyb3FrZ2dkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIzNTUxMiwiZXhwIjoyMDc4ODExNTEyfQ.o96LvNuUvkRbnRgEw-IX5OVytUUXlOstorfq9kYsnTI"; // replace, keep secret

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const admins = [
  "danialdev@gmail.com",
  "amandev@gmail.com",
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
