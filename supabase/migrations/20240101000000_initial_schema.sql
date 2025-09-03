-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Create custom types
create type user_type as enum ('regular', 'advertiser', 'admin');
create type verification_status as enum ('pending', 'verified', 'rejected');
create type campaign_status as enum ('draft', 'active', 'paused', 'completed', 'rejected');
create type transaction_type as enum ('deposit', 'withdrawal', 'reward', 'payment', 'refund');
create type transaction_status as enum ('pending', 'completed', 'failed');

-- Users table (extends auth.users)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_active boolean default true,
  user_type user_type default 'regular',
  balance decimal(12,2) default 0,
  total_earned decimal(12,2) default 0,
  level integer default 1,
  experience_points integer default 0
);

-- Enable RLS on users table
alter table public.users enable row level security;

-- Users policies
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Admins can view all users" on public.users
  for all using (
    exists (
      select 1 from public.users
      where id = auth.uid() and user_type = 'admin'
    )
  );

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, user_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'user_type')::user_type, 'regular')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Advertisers table
create table public.advertisers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  company_name text not null,
  website_url text,
  business_registration text,
  verification_status verification_status default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  total_spent decimal(12,2) default 0,
  account_balance decimal(12,2) default 0,
  unique(user_id)
);

-- Enable RLS on advertisers table
alter table public.advertisers enable row level security;

-- Advertisers policies
create policy "Advertisers can view own profile" on public.advertisers
  for select using (user_id = auth.uid());

create policy "Advertisers can update own profile" on public.advertisers
  for update using (user_id = auth.uid());

create policy "Advertisers can insert own profile" on public.advertisers
  for insert with check (user_id = auth.uid());

create policy "Admins can manage all advertisers" on public.advertisers
  for all using (
    exists (
      select 1 from public.users
      where id = auth.uid() and user_type = 'admin'
    )
  );

-- Campaigns table
create table public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  advertiser_id uuid references public.advertisers(id) on delete cascade not null,
  title text not null,
  description text not null,
  landing_url text not null,
  budget decimal(12,2) not null check (budget > 0),
  cost_per_click decimal(6,4) not null check (cost_per_click > 0),
  max_daily_spend decimal(10,2) not null check (max_daily_spend > 0),
  target_audience jsonb default '{}',
  status campaign_status default 'draft',
  start_date timestamp with time zone not null,
  end_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  total_clicks integer default 0,
  total_spent decimal(12,2) default 0,
  conversion_rate decimal(5,4) default 0
);

-- Enable RLS on campaigns table
alter table public.campaigns enable row level security;

-- Campaigns policies
create policy "Advertisers can manage own campaigns" on public.campaigns
  for all using (
    advertiser_id in (
      select id from public.advertisers where user_id = auth.uid()
    )
  );

create policy "Users can view active campaigns" on public.campaigns
  for select using (
    status = 'active' and
    start_date <= now() and
    (end_date is null or end_date >= now())
  );

create policy "Admins can manage all campaigns" on public.campaigns
  for all using (
    exists (
      select 1 from public.users
      where id = auth.uid() and user_type = 'admin'
    )
  );

-- Clicks table
create table public.clicks (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  clicked_at timestamp with time zone default now(),
  ip_address inet not null,
  user_agent text not null,
  reward_amount decimal(6,4) not null,
  conversion_tracked boolean default false,
  is_valid boolean default true
);

-- Enable RLS on clicks table
alter table public.clicks enable row level security;

-- Clicks policies
create policy "Users can view own clicks" on public.clicks
  for select using (user_id = auth.uid());

create policy "Users can insert own clicks" on public.clicks
  for insert with check (user_id = auth.uid());

create policy "Advertisers can view campaign clicks" on public.clicks
  for select using (
    campaign_id in (
      select c.id from public.campaigns c
      join public.advertisers a on c.advertiser_id = a.id
      where a.user_id = auth.uid()
    )
  );

create policy "Admins can manage all clicks" on public.clicks
  for all using (
    exists (
      select 1 from public.users
      where id = auth.uid() and user_type = 'admin'
    )
  );

-- Transactions table
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type transaction_type not null,
  amount decimal(12,2) not null check (amount != 0),
  description text not null,
  status transaction_status default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  reference_id text
);

-- Enable RLS on transactions table
alter table public.transactions enable row level security;

-- Transactions policies
create policy "Users can view own transactions" on public.transactions
  for select using (user_id = auth.uid());

create policy "Admins can manage all transactions" on public.transactions
  for all using (
    exists (
      select 1 from public.users
      where id = auth.uid() and user_type = 'admin'
    )
  );

-- System settings table
create table public.system_settings (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  value jsonb not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on system settings table
alter table public.system_settings enable row level security;

-- System settings policies
create policy "Admins can manage system settings" on public.system_settings
  for all using (
    exists (
      select 1 from public.users
      where id = auth.uid() and user_type = 'admin'
    )
  );

create policy "Users can read public settings" on public.system_settings
  for select using (key like 'public_%');

-- Create indexes for better performance
create index idx_users_email on public.users(email);
create index idx_users_user_type on public.users(user_type);
create index idx_advertisers_user_id on public.advertisers(user_id);
create index idx_advertisers_verification_status on public.advertisers(verification_status);
create index idx_campaigns_advertiser_id on public.campaigns(advertiser_id);
create index idx_campaigns_status on public.campaigns(status);
create index idx_campaigns_dates on public.campaigns(start_date, end_date);
create index idx_clicks_campaign_id on public.clicks(campaign_id);
create index idx_clicks_user_id on public.clicks(user_id);
create index idx_clicks_clicked_at on public.clicks(clicked_at);
create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_type on public.transactions(type);
create index idx_transactions_status on public.transactions(status);
create index idx_transactions_created_at on public.transactions(created_at);
create index idx_system_settings_key on public.system_settings(key);

-- Functions for business logic

-- Function to update campaign statistics when a click occurs
create or replace function public.update_campaign_stats()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.campaigns
    set 
      total_clicks = total_clicks + 1,
      total_spent = total_spent + NEW.reward_amount,
      updated_at = now()
    where id = NEW.campaign_id;
    
    -- Update user balance if click is valid
    if NEW.is_valid then
      update public.users
      set 
        balance = balance + NEW.reward_amount,
        total_earned = total_earned + NEW.reward_amount,
        experience_points = experience_points + 1,
        updated_at = now()
      where id = NEW.user_id;
    end if;
    
    return NEW;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Trigger to update campaign stats on new clicks
create trigger update_campaign_stats_trigger
  after insert on public.clicks
  for each row execute procedure public.update_campaign_stats();

-- Function to update user level based on experience points
create or replace function public.update_user_level()
returns trigger as $$
begin
  NEW.level := case
    when NEW.experience_points >= 10000 then 10
    when NEW.experience_points >= 5000 then 9
    when NEW.experience_points >= 2500 then 8
    when NEW.experience_points >= 1000 then 7
    when NEW.experience_points >= 500 then 6
    when NEW.experience_points >= 250 then 5
    when NEW.experience_points >= 100 then 4
    when NEW.experience_points >= 50 then 3
    when NEW.experience_points >= 20 then 2
    else 1
  end;
  return NEW;
end;
$$ language plpgsql;

-- Trigger to update user level
create trigger update_user_level_trigger
  before update on public.users
  for each row
  when (OLD.experience_points != NEW.experience_points)
  execute procedure public.update_user_level();

-- Function to validate click fraud prevention
create or replace function public.validate_click()
returns trigger as $$
declare
  click_count integer;
  campaign_active boolean;
  daily_budget_exceeded boolean;
begin
  -- Check if campaign is active
  select 
    (status = 'active' and start_date <= now() and (end_date is null or end_date >= now()))
  into campaign_active
  from public.campaigns
  where id = NEW.campaign_id;
  
  if not campaign_active then
    NEW.is_valid := false;
    NEW.reward_amount := 0;
    return NEW;
  end if;
  
  -- Check for duplicate clicks (same user, same campaign, within 24 hours)
  select count(*)
  into click_count
  from public.clicks
  where 
    campaign_id = NEW.campaign_id 
    and user_id = NEW.user_id 
    and clicked_at > now() - interval '24 hours';
  
  if click_count > 0 then
    NEW.is_valid := false;
    NEW.reward_amount := 0;
  end if;
  
  -- Check daily budget limit
  select (
    select coalesce(sum(reward_amount), 0)
    from public.clicks
    where campaign_id = NEW.campaign_id
      and clicked_at::date = current_date
      and is_valid = true
  ) + NEW.reward_amount > max_daily_spend
  into daily_budget_exceeded
  from public.campaigns
  where id = NEW.campaign_id;
  
  if daily_budget_exceeded then
    NEW.is_valid := false;
    NEW.reward_amount := 0;
  end if;
  
  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger to validate clicks
create trigger validate_click_trigger
  before insert on public.clicks
  for each row execute procedure public.validate_click();

-- Function to update timestamps
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

-- Add update timestamp triggers to all tables
create trigger update_users_updated_at before update on public.users
  for each row execute procedure public.update_updated_at_column();

create trigger update_advertisers_updated_at before update on public.advertisers
  for each row execute procedure public.update_updated_at_column();

create trigger update_campaigns_updated_at before update on public.campaigns
  for each row execute procedure public.update_updated_at_column();

create trigger update_transactions_updated_at before update on public.transactions
  for each row execute procedure public.update_updated_at_column();

create trigger update_system_settings_updated_at before update on public.system_settings
  for each row execute procedure public.update_updated_at_column();