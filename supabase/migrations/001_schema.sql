-- ═══════════════════════════════════════════════════════════════
-- DONMAC DATA HUB — Complete Database Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────
create type app_role as enum ('admin', 'reseller', 'general');
create type order_status as enum ('waiting', 'pending', 'processing', 'completed', 'failed');
create type topup_status as enum ('pending', 'verified', 'rejected');
create type reseller_status as enum ('pending', 'approved', 'rejected');
create type tx_type as enum ('credit', 'debit');

-- ─── Profiles ────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null unique,
  phone         text unique,
  role          app_role not null default 'general',
  agent_code    text unique,
  wallet_balance numeric(12,2) not null default 0.00,
  referred_by   uuid references public.profiles(id),
  store_slug    text unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-generate sequential agent code on insert
create sequence if not exists agent_code_seq start 1000;
create or replace function generate_agent_code()
returns trigger language plpgsql as $$
declare
  initials text;
  num text;
begin
  initials := upper(
    substring(split_part(new.full_name,' ',1),1,1) ||
    coalesce(substring(split_part(new.full_name,' ',2),1,1),'X')
  );
  num := lpad(nextval('agent_code_seq')::text, 4, '0');
  new.agent_code := 'DMH' || num || initials;
  new.store_slug := lower('DMH' || num || initials);
  return new;
end;
$$;
create trigger set_agent_code before insert on public.profiles
  for each row when (new.agent_code is null) execute function generate_agent_code();

-- ─── Bundles ─────────────────────────────────────────────────
create table public.bundles (
  id          uuid primary key default uuid_generate_v4(),
  network     text not null check (network in ('mtn','telecel','airtel_big','airtel_premium')),
  size        text not null,
  validity    text not null,
  price       numeric(10,2) not null,
  api_code    text,          -- GHDataConnect bundle code
  visible     boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ─── Reseller Prices ─────────────────────────────────────────
create table public.reseller_prices (
  id          uuid primary key default uuid_generate_v4(),
  reseller_id uuid not null references public.profiles(id) on delete cascade,
  bundle_id   uuid not null references public.bundles(id) on delete cascade,
  price       numeric(10,2) not null,
  unique(reseller_id, bundle_id)
);

-- ─── Orders ──────────────────────────────────────────────────
create table public.orders (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id),
  ref             text not null unique default ('DMH-' || upper(substring(uuid_generate_v4()::text,1,8))),
  network         text not null,
  bundle_id       uuid references public.bundles(id),
  bundle_size     text not null,
  phone           text not null,
  amount          numeric(10,2) not null,
  cost            numeric(10,2),
  status          order_status not null default 'pending',
  ghconnect_ref   text,
  payment_method  text not null default 'wallet',
  scheduled_for   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Transactions ─────────────────────────────────────────────
create table public.transactions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id),
  type        tx_type not null,
  amount      numeric(10,2) not null,
  reference   text,
  description text,
  balance_after numeric(12,2),
  created_at  timestamptz not null default now()
);

-- ─── Wallet Top-ups ──────────────────────────────────────────
create table public.wallet_topups (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id),
  amount      numeric(10,2),
  method      text not null default 'momo',
  tx_id       text,          -- MoMo transaction ID from SMS
  paystack_ref text,
  network     text,
  status      topup_status not null default 'pending',
  notes       text,
  created_at  timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id)
);

-- ─── SMS Webhook Log ─────────────────────────────────────────
create table public.sms_webhook_log (
  id          uuid primary key default uuid_generate_v4(),
  raw_message text not null,
  parsed_tx_id text,
  parsed_amount numeric(10,2),
  parsed_network text,
  matched_topup_id uuid references public.wallet_topups(id),
  created_at  timestamptz not null default now()
);

-- ─── Reseller Applications ───────────────────────────────────
create table public.reseller_applications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id),
  tx_id       text not null,
  amount      numeric(10,2) not null default 40.00,
  status      reseller_status not null default 'pending',
  admin_note  text,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

-- ─── Referrals ────────────────────────────────────────────────
create table public.referrals (
  id              uuid primary key default uuid_generate_v4(),
  referrer_id     uuid not null references public.profiles(id),
  referred_id     uuid not null references public.profiles(id),
  reward_amount   numeric(10,2) not null default 0.50,
  reward_paid     boolean not null default false,
  created_at      timestamptz not null default now(),
  unique(referrer_id, referred_id)
);

-- ─── Promotions ───────────────────────────────────────────────
create table public.promotions (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text,
  discount    numeric(5,2) not null default 0,
  code        text unique,
  network     text,
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─── Site Messages ────────────────────────────────────────────
create table public.site_messages (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  body        text not null,
  active      boolean not null default true,
  dismissible boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─── Chat Messages ───────────────────────────────────────────
create table public.chat_messages (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id),
  sender      text not null check (sender in ('user','ai','admin')),
  content     text,
  media_url   text,
  media_type  text,
  is_ai       boolean not null default false,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── Notifications ────────────────────────────────────────────
create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id),
  title       text not null,
  body        text,
  type        text not null default 'info',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Update updated_at automatically
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger orders_updated_at before update on public.orders
  for each row execute function update_updated_at();

-- Deduct from wallet when order placed
create or replace function deduct_wallet_for_order()
returns trigger language plpgsql security definer as $$
begin
  if new.payment_method = 'wallet' then
    -- Check balance
    if (select wallet_balance from public.profiles where id = new.user_id) < new.amount then
      raise exception 'Insufficient wallet balance';
    end if;
    -- Deduct
    update public.profiles
      set wallet_balance = wallet_balance - new.amount
      where id = new.user_id;
    -- Record transaction
    insert into public.transactions(user_id, type, amount, reference, description, balance_after)
      select new.user_id, 'debit', new.amount, new.ref,
             'Data bundle: ' || new.bundle_size || ' (' || new.network || ')',
             wallet_balance
      from public.profiles where id = new.user_id;
  end if;
  return new;
end; $$;

create trigger deduct_on_order after insert on public.orders
  for each row execute function deduct_wallet_for_order();

-- Credit wallet after verified top-up
create or replace function credit_wallet_on_topup()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'verified' and old.status = 'pending' and new.user_id is not null then
    update public.profiles
      set wallet_balance = wallet_balance + new.amount
      where id = new.user_id;
    insert into public.transactions(user_id, type, amount, reference, description, balance_after)
      select new.user_id, 'credit', new.amount,
             coalesce(new.tx_id, new.paystack_ref),
             'Wallet top-up via ' || new.method,
             wallet_balance
      from public.profiles where id = new.user_id;
    -- notify user
    insert into public.notifications(user_id, title, body, type)
      values(new.user_id, 'Wallet Credited', 'GHS ' || new.amount || ' has been added to your wallet.', 'success');
  end if;
  return new;
end; $$;

create trigger credit_on_topup_verify after update on public.wallet_topups
  for each row execute function credit_wallet_on_topup();

-- Notify user on order status change
create or replace function notify_order_status()
returns trigger language plpgsql security definer as $$
begin
  if new.status <> old.status then
    insert into public.notifications(user_id, title, body, type)
      values(new.user_id,
        case new.status
          when 'completed' then 'Order Delivered ✓'
          when 'processing' then 'Order Processing'
          when 'failed' then 'Order Failed'
          else 'Order Updated'
        end,
        new.bundle_size || ' (' || new.network || ') → ' || new.phone || ' is now ' || new.status,
        case new.status when 'completed' then 'success' when 'failed' then 'error' else 'info' end
      );
  end if;
  return new;
end; $$;

create trigger notify_on_status after update on public.orders
  for each row execute function notify_order_status();

-- Upgrade user to reseller on approval
create or replace function upgrade_to_reseller()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'approved' and old.status = 'pending' then
    update public.profiles set role = 'reseller' where id = new.user_id;
    insert into public.notifications(user_id, title, body, type)
      values(new.user_id, 'Reseller Account Activated! 🏪',
        'Congratulations! Your reseller account is now active. You can set your own prices.', 'success');
  end if;
  return new;
end; $$;

create trigger upgrade_reseller after update on public.reseller_applications
  for each row execute function upgrade_to_reseller();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles             enable row level security;
alter table public.bundles              enable row level security;
alter table public.reseller_prices      enable row level security;
alter table public.orders               enable row level security;
alter table public.transactions         enable row level security;
alter table public.wallet_topups        enable row level security;
alter table public.sms_webhook_log      enable row level security;
alter table public.reseller_applications enable row level security;
alter table public.referrals            enable row level security;
alter table public.promotions           enable row level security;
alter table public.site_messages        enable row level security;
alter table public.chat_messages        enable row level security;
alter table public.notifications        enable row level security;

-- Helper: is current user admin?
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles: users see own, admins see all
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or is_admin());
create policy "profiles_insert" on public.profiles for insert
  with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update
  using (id = auth.uid() or is_admin());

-- Bundles: anyone can read visible, admin can manage
create policy "bundles_read" on public.bundles for select
  using (visible = true or is_admin());
create policy "bundles_admin" on public.bundles for all
  using (is_admin());

-- Orders: own orders, admins all
create policy "orders_select" on public.orders for select
  using (user_id = auth.uid() or is_admin());
create policy "orders_insert" on public.orders for insert
  with check (user_id = auth.uid());
create policy "orders_update" on public.orders for update
  using (is_admin());

-- Transactions: own only
create policy "tx_select" on public.transactions for select
  using (user_id = auth.uid() or is_admin());

-- Top-ups: own, admins all
create policy "topups_select" on public.wallet_topups for select
  using (user_id = auth.uid() or is_admin());
create policy "topups_insert" on public.wallet_topups for insert
  with check (user_id = auth.uid() or is_admin());
create policy "topups_update" on public.wallet_topups for update
  using (is_admin());

-- Chat messages: own only
create policy "chat_select" on public.chat_messages for select
  using (user_id = auth.uid() or is_admin());
create policy "chat_insert" on public.chat_messages for insert
  with check (user_id = auth.uid() or is_admin());

-- Notifications: own only
create policy "notif_select" on public.notifications for select
  using (user_id = auth.uid());
create policy "notif_update" on public.notifications for update
  using (user_id = auth.uid());

-- Reseller applications: own, admins all
create policy "reseller_app_select" on public.reseller_applications for select
  using (user_id = auth.uid() or is_admin());
create policy "reseller_app_insert" on public.reseller_applications for insert
  with check (user_id = auth.uid());
create policy "reseller_app_update" on public.reseller_applications for update
  using (is_admin());

-- Site messages / promotions: public read
create policy "site_msg_read" on public.site_messages for select using (active = true or is_admin());
create policy "promos_read" on public.promotions for select using (active = true or is_admin());
create policy "promos_admin" on public.promotions for all using (is_admin());

-- SMS log: admin only
create policy "sms_log_admin" on public.sms_webhook_log for all using (is_admin());

-- Reseller prices
create policy "reseller_prices_select" on public.reseller_prices for select using (true);
create policy "reseller_prices_manage" on public.reseller_prices for all
  using (reseller_id = auth.uid() or is_admin());

-- ═══════════════════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.wallet_topups;

-- ═══════════════════════════════════════════════════════════════
-- SEED: default bundles
-- ═══════════════════════════════════════════════════════════════
insert into public.bundles (network, size, validity, price, api_code, sort_order) values
  ('mtn','1GB',  '90 Days',  5.00,  'mtn-1gb',   1),
  ('mtn','2GB',  '90 Days',  10.00, 'mtn-2gb',   2),
  ('mtn','3GB',  '90 Days',  15.00, 'mtn-3gb',   3),
  ('mtn','4GB',  '90 Days',  20.00, 'mtn-4gb',   4),
  ('mtn','5GB',  '90 Days',  25.00, 'mtn-5gb',   5),
  ('mtn','6GB',  '90 Days',  30.00, 'mtn-6gb',   6),
  ('mtn','7GB',  '90 Days',  35.00, 'mtn-7gb',   7),
  ('mtn','8GB',  '90 Days',  40.00, 'mtn-8gb',   8),
  ('mtn','10GB', '90 Days',  46.00, 'mtn-10gb',  9),
  ('mtn','15GB', '90 Days',  67.00, 'mtn-15gb',  10),
  ('mtn','20GB', '90 Days',  88.00, 'mtn-20gb',  11),
  ('mtn','25GB', '90 Days',  109.00,'mtn-25gb',  12),
  ('mtn','30GB', '90 Days',  130.00,'mtn-30gb',  13),
  ('mtn','40GB', '90 Days',  170.00,'mtn-40gb',  14),
  ('mtn','50GB', '90 Days',  210.00,'mtn-50gb',  15),
  ('mtn','100GB','90 Days',  400.00,'mtn-100gb', 16),
  ('telecel','2GB',  'Non-Expiry',11.00, 'telecel-2gb',   1),
  ('telecel','3GB',  'Non-Expiry',16.50, 'telecel-3gb',   2),
  ('telecel','5GB',  'Non-Expiry',24.50, 'telecel-5gb',   3),
  ('telecel','10GB', 'Non-Expiry',44.00, 'telecel-10gb',  4),
  ('telecel','15GB', 'Non-Expiry',65.00, 'telecel-15gb',  5),
  ('telecel','20GB', 'Non-Expiry',85.00, 'telecel-20gb',  6),
  ('telecel','30GB', 'Non-Expiry',127.00,'telecel-30gb',  7),
  ('telecel','40GB', 'Non-Expiry',167.00,'telecel-40gb',  8),
  ('telecel','50GB', 'Non-Expiry',207.00,'telecel-50gb',  9),
  ('telecel','100GB','Non-Expiry',400.00,'telecel-100gb', 10),
  ('airtel_big','15GB', '90 Days / Non-Expiry',60.00, 'at-big-15gb',  1),
  ('airtel_big','20GB', '90 Days / Non-Expiry',68.00, 'at-big-20gb',  2),
  ('airtel_big','30GB', '90 Days / Non-Expiry',80.00, 'at-big-30gb',  3),
  ('airtel_big','40GB', '90 Days / Non-Expiry',92.00, 'at-big-40gb',  4),
  ('airtel_big','50GB', '90 Days / Non-Expiry',104.00,'at-big-50gb',  5),
  ('airtel_big','60GB', '90 Days / Non-Expiry',116.00,'at-big-60gb',  6),
  ('airtel_big','70GB', '90 Days / Non-Expiry',143.00,'at-big-70gb',  7),
  ('airtel_big','80GB', '90 Days / Non-Expiry',158.00,'at-big-80gb',  8),
  ('airtel_big','90GB', '90 Days / Non-Expiry',170.00,'at-big-90gb',  9),
  ('airtel_big','100GB','90 Days / Non-Expiry',184.00,'at-big-100gb', 10),
  ('airtel_big','130GB','90 Days / Non-Expiry',230.00,'at-big-130gb', 11),
  ('airtel_big','140GB','90 Days / Non-Expiry',256.00,'at-big-140gb', 12),
  ('airtel_big','150GB','90 Days / Non-Expiry',285.00,'at-big-150gb', 13),
  ('airtel_big','200GB','90 Days / Non-Expiry',380.00,'at-big-200gb', 14),
  ('airtel_premium','1GB',  '60 Days',4.80,   'at-prem-1gb',   1),
  ('airtel_premium','2GB',  '60 Days',9.60,   'at-prem-2gb',   2),
  ('airtel_premium','3GB',  '60 Days',14.40,  'at-prem-3gb',   3),
  ('airtel_premium','4GB',  '60 Days',19.20,  'at-prem-4gb',   4),
  ('airtel_premium','5GB',  '60 Days',24.00,  'at-prem-5gb',   5),
  ('airtel_premium','6GB',  '60 Days',28.80,  'at-prem-6gb',   6),
  ('airtel_premium','7GB',  '60 Days',33.60,  'at-prem-7gb',   7),
  ('airtel_premium','8GB',  '60 Days',38.40,  'at-prem-8gb',   8),
  ('airtel_premium','10GB', '60 Days',43.20,  'at-prem-10gb',  9),
  ('airtel_premium','12GB', '60 Days',55.00,  'at-prem-12gb',  10),
  ('airtel_premium','15GB', '60 Days',67.00,  'at-prem-15gb',  11),
  ('airtel_premium','20GB', '60 Days',85.40,  'at-prem-20gb',  12),
  ('airtel_premium','25GB', '60 Days',109.40, 'at-prem-25gb',  13),
  ('airtel_premium','30GB', '60 Days',129.60, 'at-prem-30gb',  14);
