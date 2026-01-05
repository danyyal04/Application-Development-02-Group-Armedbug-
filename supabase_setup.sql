-- Create a table for public profiles
create table if not exists profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  name text,
  email text,
  phone text,
  avatar_url text,
  
  -- Notification Preferences
  email_notifications boolean default true,
  order_updates boolean default true,
  promotions boolean default false,

  -- Food Preferences
  dietary_type text,
  spice_level text,
  favourite_categories text[],
  favourite_cafeterias text[]
);

-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security for more details.
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Function to handle new user signup
-- This triggers when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- STORAGE SETUP
-- Create the 'avatar' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatar', 'avatar', true)
on conflict (id) do nothing;

-- Set up RLS for Storage
create policy "Avatar images are publicly accessible." on storage.objects
  for select using ( bucket_id = 'avatar' );

create policy "Anyone can upload an avatar." on storage.objects
  for insert with check ( bucket_id = 'avatar' );

create policy "Anyone can update their own avatar." on storage.objects
  for update using ( auth.uid() = owner ) with check ( bucket_id = 'avatar' );
