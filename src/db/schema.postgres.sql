-- Supabase SQL schema for Mie Aceh POS
-- Pastikan ini dijalankan di SQL Editor Supabase project Anda.

create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  username text not null unique,
  password_hash text not null default '',
  name text not null,
  role text not null check (role in ('admin', 'cashier')),
  active boolean not null default true,
  pin text default '1234',
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  price integer not null default 0,
  cost_price integer not null default 0,
  stock integer not null default 0,
  unit text not null default 'Porsi',
  description text default '',
  image text default '',
  is_active boolean not null default true,
  is_popular boolean not null default false,
  spicy_options integer not null default 1,
  cooking_style_options integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text not null unique,
  transaction_date timestamptz not null default now(),
  cashier_id uuid,
  cashier_name text not null,
  order_type text not null default 'dine_in',
  table_number text,
  customer_name text,
  item_count integer not null default 0,
  subtotal integer not null default 0,
  discount_type text not null default 'fixed',
  discount_value real not null default 0,
  discount_amount integer not null default 0,
  discount_name text,
  tax_rate real not null default 0,
  tax_amount integer not null default 0,
  total integer not null default 0,
  payment_method text not null default 'cash',
  amount_paid integer not null default 0,
  change_amount integer not null default 0,
  payment_reference text,
  status text not null default 'completed',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists transaction_items (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  product_id uuid,
  product_name text not null,
  price integer not null default 0,
  cost_price integer not null default 0,
  quantity integer not null default 1,
  category text default '',
  cooking_style text default '',
  spice_level text default '',
  notes text default '',
  subtotal integer not null default 0
);

create table if not exists store_settings (
  id text primary key default 'primary_store_config',
  settings_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists tables (
  id uuid primary key default uuid_generate_v4(),
  table_number text not null unique,
  table_name text not null,
  location text not null default 'Area Utama',
  capacity integer not null default 4,
  status text not null default 'available',
  active_order_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists table_orders (
  id uuid primary key default uuid_generate_v4(),
  table_number text not null,
  customer_name text not null,
  customer_phone text,
  items_json jsonb not null default '[]'::jsonb,
  item_count integer not null default 0,
  subtotal integer not null default 0,
  tax_amount integer not null default 0,
  total integer not null default 0,
  payment_method text not null default 'qris',
  payment_status text not null default 'unpaid',
  order_status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  paid_at timestamptz,
  completed_at timestamptz
);

create table if not exists sync_queue (
  id uuid primary key default uuid_generate_v4(),
  device_id text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null,
  action text not null check (action in ('insert','update','delete')),
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_created_at on transactions(created_at);
create index if not exists idx_transaction_items_transaction_id on transaction_items(transaction_id);
create index if not exists idx_sync_queue_status on sync_queue(status, created_at);