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
alter table profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Public profiles are viewable by everyone.' and tablename = 'profiles') then
    create policy "Public profiles are viewable by everyone." on profiles for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can insert their own profile.' and tablename = 'profiles') then
    create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Users can update own profile.' and tablename = 'profiles') then
    create policy "Users can update own profile." on profiles for update using (auth.uid() = id);
  end if;
end $$;

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name')
  on conflict (id) do nothing;
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

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Avatar images are publicly accessible.' and tablename = 'objects' and schemaname = 'storage') then
     create policy "Avatar images are publicly accessible." on storage.objects for select using ( bucket_id = 'avatar' );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Anyone can upload an avatar.' and tablename = 'objects' and schemaname = 'storage') then
     create policy "Anyone can upload an avatar." on storage.objects for insert with check ( bucket_id = 'avatar' );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Anyone can update their own avatar.' and tablename = 'objects' and schemaname = 'storage') then
     create policy "Anyone can update their own avatar." on storage.objects for update using ( auth.uid() = owner ) with check ( bucket_id = 'avatar' );
  end if;
end $$;

-- Create the 'documents' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Documents are publicly accessible.' and tablename = 'objects' and schemaname = 'storage') then
     create policy "Documents are publicly accessible." on storage.objects for select using ( bucket_id = 'documents' );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Anyone can upload a document.' and tablename = 'objects' and schemaname = 'storage') then
     create policy "Anyone can upload a document." on storage.objects for insert with check ( bucket_id = 'documents' );
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Anyone can update their own document.' and tablename = 'objects' and schemaname = 'storage') then
     create policy "Anyone can update their own document." on storage.objects for update using ( auth.uid() = owner ) with check ( bucket_id = 'documents' );
  end if;
end $$;


-- OWNER REGISTRATION SETUP

-- Table: registration_request
create table if not exists registration_request (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  email text,
  business_name text,
  business_address text,
  contact_number text,
  documents jsonb default '{}'::jsonb,
  status text default 'pending', -- pending, approved, rejected
  submitted_at timestamp with time zone default now(),
  reviewed_at timestamp with time zone,
  rejection_reason text
);

alter table registration_request enable row level security;

-- Policies for registration_request
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can view requests.' and tablename = 'registration_request') then
      create policy "Authenticated users can view requests." on registration_request for select using (auth.role() = 'authenticated');
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Authenticated users can update requests.' and tablename = 'registration_request') then
      create policy "Authenticated users can update requests." on registration_request for update using (auth.role() = 'authenticated');
  end if;
end $$;

-- Function: create_owner_registration
create or replace function create_owner_registration(
  _auth_id uuid,
  _email text,
  _business_name text,
  _business_address text,
  _contact_number text,
  _documents jsonb
)
returns void as $$
begin
  insert into public.registration_request (
    user_id,
    email,
    business_name,
    business_address,
    contact_number,
    documents,
    status
  ) values (
    _auth_id,
    _email,
    _business_name,
    _business_address,
    _contact_number,
    _documents,
    'pending'
  );
end;
$$ language plpgsql security definer;


-- CAFETERIA TABLE SETUP (Needed for approval)

create table if not exists cafeterias (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users not null,
  name text not null,
  location text,
  description text,
  image text default 'https://via.placeholder.com/300?text=Cafeteria',
  rating numeric default 0,
  is_open boolean default false,
  category text default 'General',
  created_at timestamp with time zone default now()
);

-- Ensure owner_id exists if table was already created
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'cafeterias' and column_name = 'owner_id') then
    alter table cafeterias add column owner_id uuid references auth.users;
  end if;
end $$;

alter table cafeterias enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Safely public view cafeterias' and tablename = 'cafeterias') then
    create policy "Safely public view cafeterias" on cafeterias for select using (true);
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Owners can update own cafeteria' and tablename = 'cafeterias') then
    create policy "Owners can update own cafeteria" on cafeterias for update using (auth.uid() = owner_id);
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Owners can insert own cafeteria' and tablename = 'cafeterias') then
    create policy "Owners can insert own cafeteria" on cafeterias for insert with check (auth.uid() = owner_id);
  end if;
end $$;


-- Function: create_cafeteria_for_owner (Used by Admin Approval)
drop function if exists create_cafeteria_for_owner(uuid);

create or replace function create_cafeteria_for_owner(
  registration_id uuid
)
returns void as $$
declare
  reg_record record;
begin
  -- Get the registration request
  select * from public.registration_request where id = registration_id into reg_record;
  
  if reg_record is null then
    raise exception 'Registration request not found';
  end if;

  -- Create the cafeteria listing
  insert into public.cafeterias (
    owner_id,
    name,
    location,
    description,
    is_open
  ) values (
    reg_record.user_id,
    reg_record.business_name,
    reg_record.business_address,
    'New cafeteria',
    false
  );
end;
$$ language plpgsql security definer;
