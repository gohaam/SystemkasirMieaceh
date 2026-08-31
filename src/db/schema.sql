-- =============================================================================
-- SQLite Database Schema: Mie Aceh Pak Ismail POS (100% Offline Desktop)
-- =============================================================================

PRAGMA foreign_keys = ON;

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Products / Menu Items Table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  cost_price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'Porsi',
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  is_popular INTEGER NOT NULL DEFAULT 0,
  spicy_options INTEGER NOT NULL DEFAULT 1,
  cooking_style_options INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category) REFERENCES categories(id) ON UPDATE CASCADE
);

-- 3. Users Table (Admin & Cashier with salted password hashes)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
  avatar TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  pin TEXT DEFAULT '1234',
  active INTEGER NOT NULL DEFAULT 1,
  last_login TEXT DEFAULT NULL,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  transaction_date TEXT NOT NULL DEFAULT (datetime('now')),
  cashier_id TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'take_away', 'delivery')),
  table_number TEXT DEFAULT NULL,
  customer_name TEXT DEFAULT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value REAL NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  discount_name TEXT DEFAULT NULL,
  tax_rate REAL NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'qris', 'transfer', 'debit')),
  amount_paid INTEGER NOT NULL DEFAULT 0,
  change_amount INTEGER NOT NULL DEFAULT 0,
  payment_reference TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  notes TEXT DEFAULT NULL,
  cancelled_at TEXT DEFAULT NULL,
  cancel_reason TEXT DEFAULT NULL,
  cancelled_by TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cashier_id) REFERENCES users(id) ON UPDATE CASCADE
);

-- 5. Transaction Items (Line Items) Table
CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  cost_price INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  category TEXT DEFAULT '',
  cooking_style TEXT DEFAULT '',
  spice_level TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  subtotal INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE
);

-- 6. Inventory Raw Materials Table
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_stock REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'Kg',
  min_stock REAL NOT NULL DEFAULT 5,
  cost_per_unit INTEGER NOT NULL DEFAULT 0,
  last_restocked TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'safe' CHECK (status IN ('safe', 'low', 'out_of_stock')),
  supplier TEXT DEFAULT ''
);

-- 7. Store Settings Table
CREATE TABLE IF NOT EXISTS store_settings (
  id TEXT PRIMARY KEY DEFAULT 'primary_store_config',
  settings_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. Restaurant Tables Configuration
CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  table_number TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Area Utama',
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  active_order_id TEXT DEFAULT NULL
);

-- 9. Customer Table Orders (Self-Ordering QR)
CREATE TABLE IF NOT EXISTS table_orders (
  id TEXT PRIMARY KEY,
  table_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT DEFAULT NULL,
  items_json TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'qris',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'cooking', 'ready', 'completed', 'cancelled')),
  notes TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT NULL,
  paid_at TEXT DEFAULT NULL,
  completed_at TEXT DEFAULT NULL
);

-- Indexes for lightning fast offline queries
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice_number);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transaction_items_txid ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
