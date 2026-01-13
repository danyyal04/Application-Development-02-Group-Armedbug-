-- Add ALL possibly missing columns to the profiles table
-- We use 'if not exists' so it is safe to run even if some columns already exist.

alter table profiles add column if not exists updated_at timestamp with time zone;
alter table profiles add column if not exists name text;
alter table profiles add column if not exists email text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists avatar_url text;

-- Notification Preferences
alter table profiles add column if not exists email_notifications boolean default true;
alter table profiles add column if not exists order_updates boolean default true;
alter table profiles add column if not exists promotions boolean default false;

-- Food Preferences
alter table profiles add column if not exists dietary_type text;
alter table profiles add column if not exists spice_level text;
alter table profiles add column if not exists favourite_categories text[];
alter table profiles add column if not exists favourite_cafeterias text[];

-- Force schema cache reload
comment on table profiles is 'User profiles with preferences (Updated schema)';

-- Cafeteria Owner Identification
-- Adding this to cafeterias table as it is related to the business entity verification
alter table cafeterias add column if not exists owner_identification_url text;
