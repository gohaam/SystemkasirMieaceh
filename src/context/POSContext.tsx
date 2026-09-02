import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  User,
  MenuItem,
  Category,
  InventoryItem,
  Transaction,
  StoreSettings,
  CartItem,
  CartItemOption,
  OrderType,
  PaymentMethod,
  TableConfig,
  TableOrder,
  TableOrderStatus,
  TablePaymentStatus,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_MENU_ITEMS,
  INITIAL_INVENTORY,
  INITIAL_STORE_SETTINGS,
  INITIAL_TABLES,
  INITIAL_TABLE_ORDERS,
  generateSeedTransactions,
} from '../data/initialData';
import { DEFAULT_MENU_IMAGE, generateId, generateInvoiceNumber } from '../utils/formatters';
import { sqlite } from '../db/sqliteAdapter';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ExportService } from '../services/exportService';
import { BackupService } from '../services/backupService';

const generateSupabaseUserId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
};

const generateSupabaseUuid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
};

const normalizeSupabaseUserId = (value?: string): string => {
  if (!value) return generateSupabaseUuid();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  return isUuid ? value : generateSupabaseUuid();
};

const normalizeSupabaseUuid = (value?: string): string => {
  if (!value) return generateSupabaseUuid();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  return isUuid ? value : generateSupabaseUuid();
};

const isValidSupabaseUuid = (value?: string): boolean => {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

const mapSupabaseCategory = (row: any): Category => ({
  id: String(row.id ?? generateSupabaseUuid()),
  name: row.name ?? 'Kategori Baru',
  icon: row.icon ?? undefined,
  description: row.description ?? '',
});

const mapSupabaseMenuItem = (row: any): MenuItem => ({
  id: String(row.id ?? generateSupabaseUuid()),
  name: row.name ?? '',
  category: String(row.category ?? row.category_name ?? ''),
  description: row.description ?? '',
  price: Number(row.price ?? 0),
  costPrice: Number(row.cost_price ?? 0),
  image: row.image || DEFAULT_MENU_IMAGE,
  stock: Number(row.stock ?? 0),
  unit: row.unit ?? 'Porsi',
  isAvailable: Boolean(row.is_active ?? true),
  isPopular: Boolean(row.is_popular),
  spicyOptions: Number(row.spicy_options ?? 1) > 0,
  cookingStyleOptions: Number(row.cooking_style_options ?? 1) > 0,
  createdAt: row.created_at ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? new Date().toISOString(),
});

const mapSupabaseInventoryItem = (row: any): InventoryItem => ({
  id: String(row.id ?? generateSupabaseUuid()),
  name: row.name ?? '',
  category: row.category ?? 'Bahan Pokok',
  currentStock: Number(row.current_stock ?? 0),
  unit: row.unit ?? 'pcs',
  minStock: Number(row.min_stock ?? 0),
  costPerUnit: Number(row.cost_per_unit ?? 0),
  lastRestocked: row.last_restocked ?? row.updated_at ?? new Date().toISOString(),
  status: row.status === 'low' ? 'low' : row.status === 'out_of_stock' ? 'out_of_stock' : 'safe',
  supplier: row.supplier ?? '',
});

const loadCategoriesFromSupabase = async (): Promise<Category[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
  if (error) {
    console.error('Gagal memuat kategori dari Supabase:', error);
    return [];
  }

  return (data ?? []).map(mapSupabaseCategory);
};

const loadMenuItemsFromSupabase = async (): Promise<MenuItem[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
  if (error) {
    console.error('Gagal memuat menu dari Supabase:', error);
    return [];
  }

  return (data ?? []).map(mapSupabaseMenuItem);
};

const loadInventoryFromSupabase = async (): Promise<InventoryItem[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase.from('inventory').select('*').order('name', { ascending: true });
  if (error) {
    console.error('Gagal memuat stok bahan dari Supabase:', error);
    return [];
  }

  return (data ?? []).map(mapSupabaseInventoryItem);
};

const loadTablesFromSupabase = async (): Promise<TableConfig[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('tables').select('*').order('table_number', { ascending: true });
  if (error) throw new Error(error.message || 'Gagal memuat meja dari Supabase');
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    tableNumber: row.table_number,
    tableName: row.table_name,
    location: row.location,
    capacity: Number(row.capacity ?? 4),
    status: row.status,
    activeOrderId: row.active_order_id ?? undefined,
  }));
};

const loadTableOrdersFromSupabase = async (): Promise<TableOrder[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('table_orders').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Gagal memuat pesanan meja dari Supabase');
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    tableNumber: row.table_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone ?? undefined,
    items: Array.isArray(row.items_json) ? row.items_json : [],
    itemCount: Number(row.item_count ?? 0),
    subtotal: Number(row.subtotal ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    total: Number(row.total ?? 0),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    paidAt: row.paid_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
  }));
};

const tablePayload = (table: TableConfig) => ({
  id: normalizeSupabaseUuid(table.id),
  table_number: table.tableNumber,
  table_name: table.tableName,
  location: table.location,
  capacity: Number(table.capacity ?? 4),
  status: table.status,
  active_order_id: isValidSupabaseUuid(table.activeOrderId) ? table.activeOrderId : null,
  created_at: new Date().toISOString(),
});

const tableOrderPayload = (order: TableOrder) => ({
  id: normalizeSupabaseUuid(order.id),
  table_number: order.tableNumber,
  customer_name: order.customerName,
  customer_phone: order.customerPhone ?? null,
  items_json: order.items,
  item_count: Number(order.itemCount ?? 0),
  subtotal: Number(order.subtotal ?? 0),
  tax_amount: Number(order.taxAmount ?? 0),
  total: Number(order.total ?? 0),
  payment_method: order.paymentMethod,
  payment_status: order.paymentStatus,
  order_status: order.orderStatus,
  notes: order.notes ?? null,
  created_at: order.createdAt,
  updated_at: order.updatedAt ?? new Date().toISOString(),
  paid_at: order.paidAt ?? null,
  completed_at: order.completedAt ?? null,
});

const persistTableToSupabase = async (table: TableConfig) => {
  if (!supabase) return;
  const { error } = await supabase.from('tables').upsert(tablePayload(table), { onConflict: 'id' });
  if (error) throw new Error(error.message || 'Gagal menyimpan meja ke Supabase');
};

const persistTableOrderToSupabase = async (order: TableOrder) => {
  if (!supabase) return;
  const { error } = await supabase.from('table_orders').upsert(tableOrderPayload(order), { onConflict: 'id' });
  if (error) throw new Error(error.message || 'Gagal menyimpan pesanan meja ke Supabase');
};

const loadSettingsFromSupabase = async (): Promise<StoreSettings | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('store_settings')
    .select('settings_json')
    .eq('id', 'primary_store_config')
    .maybeSingle();

  if (error) {
    console.error('Gagal memuat pengaturan dari Supabase:', error);
    throw new Error(error.message || 'Gagal memuat pengaturan dari Supabase');
  }

  return data?.settings_json ? (data.settings_json as StoreSettings) : null;
};

const persistSettingsToSupabase = async (settings: StoreSettings): Promise<void> => {
  if (!supabase) return;

  const { error } = await supabase.from('store_settings').upsert({
    id: 'primary_store_config',
    settings_json: settings,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (error) {
    console.error('Gagal menyimpan pengaturan ke Supabase:', error);
    throw new Error(error.message || 'Gagal menyimpan pengaturan ke Supabase');
  }
};

const persistCategoryToSupabase = async (category: Category): Promise<void> => {
  if (!supabase) return;

  const payload = {
    id: normalizeSupabaseUuid(category.id),
    name: category.name,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('categories').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('Gagal menyimpan kategori ke Supabase:', error);
    throw new Error(error.message || 'Gagal menyimpan kategori ke Supabase');
  }
};

const persistMenuItemToSupabase = async (item: MenuItem): Promise<void> => {
  if (!supabase) return;

  const categoryName = String(item.category ?? '').trim();
  if (!categoryName) {
    throw new Error('Kategori menu wajib dipilih sebelum disimpan ke Supabase.');
  }

  const payload = {
    id: normalizeSupabaseUuid(item.id),
    name: String(item.name ?? '').trim(),
    category: categoryName,
    price: Number(item.price ?? 0),
    cost_price: Number(item.costPrice ?? 0),
    stock: Number(item.stock ?? 0),
    unit: item.unit || 'Porsi',
    description: item.description || '',
    image: item.image || DEFAULT_MENU_IMAGE,
    is_active: Boolean(item.isAvailable),
    is_popular: Boolean(item.isPopular),
    spicy_options: Number(Boolean(item.spicyOptions)),
    cooking_style_options: Number(Boolean(item.cookingStyleOptions)),
    created_at: item.createdAt ?? new Date().toISOString(),
    updated_at: item.updatedAt ?? new Date().toISOString(),
  };

  const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('Gagal menyimpan menu ke Supabase:', error);
    throw new Error(error.message || 'Gagal menyimpan menu ke Supabase');
  }
};

const persistInventoryItemToSupabase = async (item: InventoryItem): Promise<void> => {
  if (!supabase) return;

  const payload = {
    id: normalizeSupabaseUuid(item.id),
    name: String(item.name ?? '').trim(),
    category: item.category || 'Bahan Pokok',
    current_stock: Number(item.currentStock ?? 0),
    unit: item.unit || 'pcs',
    min_stock: Number(item.minStock ?? 0),
    cost_per_unit: Number(item.costPerUnit ?? 0),
    last_restocked: item.lastRestocked ?? new Date().toISOString(),
    status: item.status || 'safe',
    supplier: item.supplier ?? '',
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('inventory').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('Gagal menyimpan stok bahan ke Supabase:', error);
    throw new Error(error.message || 'Gagal menyimpan stok bahan ke Supabase');
  }
};

const deleteCategoryFromSupabase = async (id: string): Promise<void> => {
  if (!supabase) return;

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    console.error('Gagal menghapus kategori dari Supabase:', error);
    throw new Error(error.message || 'Gagal menghapus kategori dari Supabase');
  }
};

const deleteMenuItemFromSupabase = async (id: string): Promise<void> => {
  if (!supabase) return;

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    console.error('Gagal menghapus menu dari Supabase:', error);
    throw new Error(error.message || 'Gagal menghapus menu dari Supabase');
  }
};

const SYNC_QUEUE_KEY = 'mie_aceh_sync_queue_v1';
const LAST_ONLINE_SNAPSHOT_KEY = 'mie_aceh_last_online_snapshot_v1';

type SyncQueueAction = 'insert' | 'update' | 'delete';
type SyncQueueEntity = 'users' | 'categories' | 'products' | 'inventory' | 'transactions' | 'store_settings' | 'tables' | 'table_orders';

interface SyncQueueEntry {
  id: string;
  entityType: SyncQueueEntity;
  entityId?: string;
  action: SyncQueueAction;
  payload?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'failed';
}

const readSyncQueue = (): SyncQueueEntry[] => {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Gagal membaca sync queue lokal:', error);
    return [];
  }
};

type LastOnlineSnapshot = {
  categories: Category[];
  users: User[];
  menu: MenuItem[];
  inventory: InventoryItem[];
  transactions: Transaction[];
  tables: TableConfig[];
  tableOrders: TableOrder[];
};

const readLastOnlineSnapshot = (): LastOnlineSnapshot => {
  try {
    const raw = localStorage.getItem(LAST_ONLINE_SNAPSHOT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
      menu: Array.isArray(parsed.menu) ? parsed.menu : [],
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      tables: Array.isArray(parsed.tables) ? parsed.tables : [],
      tableOrders: Array.isArray(parsed.tableOrders) ? parsed.tableOrders : [],
    };
  } catch (error) {
    console.warn('Gagal membaca snapshot data online terakhir:', error);
    return { categories: [], users: [], menu: [], inventory: [], transactions: [], tables: [], tableOrders: [] };
  }
};

const writeLastOnlineSnapshot = (snapshot: Partial<LastOnlineSnapshot>) => {
  try {
    localStorage.setItem(LAST_ONLINE_SNAPSHOT_KEY, JSON.stringify({
      categories: snapshot.categories ?? [],
      users: snapshot.users ?? [],
      menu: snapshot.menu ?? [],
      inventory: snapshot.inventory ?? [],
      transactions: snapshot.transactions ?? [],
      tables: snapshot.tables ?? [],
      tableOrders: snapshot.tableOrders ?? [],
    }));
  } catch (error) {
    console.warn('Gagal menyimpan snapshot data online terakhir:', error);
  }
};

async function loadSupabaseDataOrSnapshot<T>(
  loader: () => Promise<T[]>,
  snapshotKey: keyof LastOnlineSnapshot,
  fallback: T[]
): Promise<T[]> {
  if (!isSupabaseConfigured) return fallback;

  const isOnline = typeof navigator === 'undefined' || navigator.onLine;
  if (!isOnline) {
    const snapshot = readLastOnlineSnapshot();
    return (snapshot[snapshotKey] as T[]) ?? fallback;
  }

  try {
    const data = await loader();
    const snapshot = readLastOnlineSnapshot();
    writeLastOnlineSnapshot({ ...snapshot, [snapshotKey]: data });
    return data;
  } catch (error) {
    console.warn(`Gagal memuat data ${String(snapshotKey)} dari Supabase, memakai snapshot lokal terakhir.`, error);
    const snapshot = readLastOnlineSnapshot();
    return (snapshot[snapshotKey] as T[]) ?? fallback;
  }
}

const writeSyncQueue = (queue: SyncQueueEntry[]) => {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

const enqueueSyncQueue = (entityType: SyncQueueEntity, action: SyncQueueAction, payload?: Record<string, any>, entityId?: string): void => {
  const queue = readSyncQueue();
  const entry: SyncQueueEntry = {
    id: generateId('sync'),
    entityType,
    entityId: entityId ?? payload?.id ?? undefined,
    action,
    payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'pending',
  };

  queue.push(entry);
  writeSyncQueue(queue);
};

const flushSyncQueue = async (): Promise<void> => {
  if (!supabase || typeof navigator !== 'undefined' && !navigator.onLine) return;

  const queue = readSyncQueue();
  if (!queue.length) return;

  const remaining: SyncQueueEntry[] = [];

  for (const item of queue) {
    try {
      const id = item.entityId ?? item.payload?.id;
      if (!id && item.action !== 'delete') {
        remaining.push(item);
        continue;
      }

      if (item.action === 'delete') {
        const { error } = await supabase.from(item.entityType).delete().eq('id', id ?? item.entityId ?? item.payload?.id);
        if (error) {
          console.error(`Gagal sinkron delete ${item.entityType}:`, error);
          remaining.push({ ...item, status: 'failed', updatedAt: new Date().toISOString() });
          continue;
        }
        continue;
      }

      if (item.entityType === 'transactions' && item.payload && item.payload.id) {
        await persistTransactionToSupabase(item.payload as Transaction);
        continue;
      }

      if (item.entityType === 'tables' && item.payload) {
        await persistTableToSupabase(item.payload as TableConfig);
        continue;
      }

      if (item.entityType === 'table_orders' && item.payload) {
        await persistTableOrderToSupabase(item.payload as TableOrder);
        continue;
      }

      const { error } = await supabase.from(item.entityType).upsert(item.payload, { onConflict: 'id' });
      if (error) {
        console.error(`Gagal sinkron ${item.entityType}:`, error);
        remaining.push({ ...item, status: 'failed', updatedAt: new Date().toISOString() });
        continue;
      }
    } catch (error) {
      console.error('Kesalahan saat memproses sync queue:', error);
      remaining.push({ ...item, status: 'failed', updatedAt: new Date().toISOString() });
    }
  }

  writeSyncQueue(remaining);
};

const deleteInventoryItemFromSupabase = async (id: string): Promise<void> => {
  if (!supabase) return;

  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) {
    console.error('Gagal menghapus stok bahan dari Supabase:', error);
    throw new Error(error.message || 'Gagal menghapus stok bahan dari Supabase');
  }
};

const mapSupabaseTransaction = (row: any): Transaction => {
  const items = Array.isArray(row.transaction_items) ? row.transaction_items : [];
  const normalizedItems: CartItem[] = items.map((item: any, index: number) => ({
    id: `${row.invoice_number ?? row.id ?? `tx-${index}`}_${item.id ?? index}`,
    menuId: isValidSupabaseUuid(item.product_id) ? String(item.product_id) : String(item.product_name ?? `menu-${index}`),
    name: item.product_name ?? 'Menu',
    price: Number(item.price ?? 0),
    costPrice: Number(item.cost_price ?? 0),
    image: DEFAULT_MENU_IMAGE,
    quantity: Number(item.quantity ?? 1),
    category: String(item.category ?? ''),
    options: {
      cookingStyle: item.cooking_style || undefined,
      spiceLevel: item.spice_level || undefined,
      notes: item.notes || undefined,
    },
    subtotal: Number(item.subtotal ?? (Number(item.price ?? 0) * Number(item.quantity ?? 1))),
  }));

  const invoiceNumber = String(row.invoice_number ?? row.id ?? 'INV-UNKNOWN');
  return {
    id: invoiceNumber,
    invoiceNumber,
    createdAt: row.created_at ?? row.transaction_date ?? new Date().toISOString(),
    cashierId: String(row.cashier_id ?? 'unknown'),
    cashierName: row.cashier_name ?? 'Kasir',
    orderType: (row.order_type as OrderType) ?? 'dine_in',
    tableNumber: row.table_number ?? undefined,
    customerName: row.customer_name ?? undefined,
    items: normalizedItems,
    itemCount: Number(row.item_count ?? normalizedItems.reduce((sum, item) => sum + item.quantity, 0)),
    subtotal: Number(row.subtotal ?? 0),
    discountType: row.discount_type === 'percentage' ? 'percentage' : 'fixed',
    discountValue: Number(row.discount_value ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    discountName: row.discount_name ?? undefined,
    taxRate: Number(row.tax_rate ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    total: Number(row.total ?? 0),
    paymentMethod: (row.payment_method as PaymentMethod) ?? 'cash',
    amountPaid: Number(row.amount_paid ?? row.total ?? 0),
    changeAmount: Number(row.change_amount ?? 0),
    paymentReference: row.payment_reference ?? undefined,
    status: row.status === 'cancelled' ? 'cancelled' : 'completed',
    notes: row.notes ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    cancelReason: row.cancel_reason ?? undefined,
    cancelledBy: row.cancelled_by ?? undefined,
  };
};

const loadTransactionsFromSupabase = async (): Promise<Transaction[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('*, transaction_items(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Gagal memuat transaksi dari Supabase:', error);
    return [];
  }

  return (data ?? []).map(mapSupabaseTransaction);
};

const persistTransactionToSupabase = async (tx: Transaction): Promise<void> => {
  if (!supabase) return;

  const transactionId = normalizeSupabaseUuid();
  const invoiceNumber = String(tx.invoiceNumber || tx.id || generateId('inv'));
  const transactionPayload = {
    id: transactionId,
    invoice_number: invoiceNumber,
    transaction_date: tx.createdAt,
    cashier_id: isValidSupabaseUuid(tx.cashierId) ? tx.cashierId : null,
    cashier_name: tx.cashierName,
    order_type: tx.orderType,
    table_number: tx.tableNumber ?? null,
    customer_name: tx.customerName ?? null,
    item_count: Number(tx.itemCount ?? tx.items.reduce((total, item) => total + item.quantity, 0)),
    subtotal: Number(tx.subtotal ?? 0),
    discount_type: tx.discountType,
    discount_value: Number(tx.discountValue ?? 0),
    discount_amount: Number(tx.discountAmount ?? 0),
    discount_name: tx.discountName ?? null,
    tax_rate: Number(tx.taxRate ?? 0),
    tax_amount: Number(tx.taxAmount ?? 0),
    total: Number(tx.total ?? 0),
    payment_method: tx.paymentMethod,
    amount_paid: Number(tx.amountPaid ?? tx.total ?? 0),
    change_amount: Number(tx.changeAmount ?? 0),
    payment_reference: tx.paymentReference ?? null,
    status: tx.status,
    notes: tx.notes ?? null,
    created_at: tx.createdAt,
  };

  const { error: transactionError } = await supabase
    .from('transactions')
    .upsert(transactionPayload, { onConflict: 'invoice_number' });

  if (transactionError) {
    console.error('Gagal menyimpan transaksi ke Supabase:', transactionError);
    throw new Error(transactionError.message || 'Gagal menyimpan transaksi ke Supabase');
  }

  const { data: savedTxRows, error: loadTxError } = await supabase
    .from('transactions')
    .select('id')
    .eq('invoice_number', invoiceNumber)
    .limit(1);

  if (loadTxError || !savedTxRows || savedTxRows.length === 0) {
    throw new Error('Gagal mengambil transaksi yang baru disimpan untuk item detail.');
  }

  const savedTxId = savedTxRows[0].id;
  const transactionItems = tx.items.map((item, index) => ({
    id: generateSupabaseUuid(),
    transaction_id: savedTxId,
    product_id: isValidSupabaseUuid(item.menuId) ? item.menuId : null,
    product_name: item.name,
    price: Number(item.price ?? 0),
    cost_price: Number(item.costPrice ?? 0),
    quantity: Number(item.quantity ?? 1),
    category: item.category ?? '',
    cooking_style: item.options?.cookingStyle ?? '',
    spice_level: item.options?.spiceLevel ?? '',
    notes: item.options?.notes ?? '',
    subtotal: Number(item.subtotal ?? (Number(item.price ?? 0) * Number(item.quantity ?? 1))),
  }));

  const { error: itemError } = await supabase.from('transaction_items').insert(transactionItems);
  if (itemError) {
    console.error('Gagal menyimpan detail transaksi ke Supabase:', itemError);
    throw new Error(itemError.message || 'Gagal menyimpan detail transaksi ke Supabase');
  }

  if (isValidSupabaseUuid(tx.cashierId)) {
    const { data: cashierData, error: cashierLookupError } = await supabase
      .from('users')
      .select('total_transactions')
      .eq('id', tx.cashierId)
      .limit(1)
      .single();

    if (!cashierLookupError && cashierData) {
      await supabase
        .from('users')
        .update({ total_transactions: Number(cashierData.total_transactions ?? 0) + 1 })
        .eq('id', tx.cashierId);
    }
  }
};

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

const DEFAULT_CATEGORIES: Category[] = [];

export type TabView = 
  | 'dashboard'
  | 'pos'
  | 'transactions'
  | 'table-qr'
  | 'menu'
  | 'inventory'
  | 'reports'
  | 'users'
  | 'settings';

interface POSContextType {
  // Database status
  isDbReady: boolean;
  isElectron: boolean;

  // Auth & Navigation
  currentUser: User | null;
  users: User[];
  login: (username: string, pin: string, roleRequired?: 'admin' | 'cashier') => Promise<boolean>;
  logout: () => void;
  switchUser: (userId: string) => void;
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;

  // Customer Self-Ordering Mode
  isCustomerMode: boolean;
  setIsCustomerMode: (enabled: boolean) => void;
  activeCustomerTable: string | null;
  setActiveCustomerTable: (tableNumber: string | null) => void;

  // Table QR & Orders
  tables: TableConfig[];
  tableOrders: TableOrder[];
  addTable: (table: Omit<TableConfig, 'id'>) => Promise<void>;
  updateTable: (id: string, updates: Partial<TableConfig>) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
  addTableOrder: (order: Omit<TableOrder, 'id' | 'createdAt'>) => Promise<TableOrder>;
  updateTableOrderStatus: (orderId: string, status: TableOrderStatus) => Promise<void>;
  updateTablePaymentStatus: (orderId: string, paymentStatus: TablePaymentStatus) => Promise<void>;
  convertTableOrderToTransaction: (orderId: string, paymentMethod?: PaymentMethod) => Promise<Transaction | null>;
  cancelTableOrder: (orderId: string, reason?: string) => Promise<void>;
  activePendingTableOrdersCount: number;

  // Categories & Menu & Inventory
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'> & { id?: string }) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  menuItems: MenuItem[];
  inventory: InventoryItem[];
  addMenuItem: (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  toggleMenuAvailability: (id: string) => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  adjustStock: (id: string, newStock: number) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;

  // Cart & Active POS Order
  cart: CartItem[];
  orderType: OrderType;
  tableNumber: string;
  customerName: string;
  orderNotes: string;
  discount: { type: 'percentage' | 'fixed'; value: number; name?: string };
  setOrderType: (type: OrderType) => void;
  setTableNumber: (table: string) => void;
  setCustomerName: (name: string) => void;
  setOrderNotes: (notes: string) => void;
  addToCart: (item: MenuItem, options?: CartItemOption) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartItemNotes: (cartItemId: string, notes: string) => void;
  clearCart: () => void;
  applyDiscount: (type: 'percentage' | 'fixed', value: number, name?: string) => void;
  removeDiscount: () => void;

  // Cart Calculations
  cartSubtotal: number;
  cartDiscountAmount: number;
  cartTaxAmount: number;
  cartTotal: number;
  cartItemCount: number;

  // Transactions
  transactions: Transaction[];
  completeTransaction: (details: {
    paymentMethod: PaymentMethod;
    amountPaid: number;
    paymentReference?: string;
  }) => Promise<Transaction>;
  cancelTransaction: (transactionId: string, reason: string) => Promise<boolean>;
  selectedReceipt: Transaction | null;
  setSelectedReceipt: (transaction: Transaction | null) => void;

  // Users
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  resetUserPassword: (id: string, newPin: string) => Promise<void>;

  // Settings
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  resetAllData: () => Promise<void>;

  // Offline Backup & Export
  exportTransactionsCSV: (filtered?: Transaction[]) => void;
  exportInventoryCSV: () => void;
  backupDatabase: () => Promise<void>;
  restoreDatabase: (file: File) => Promise<boolean>;

  // Toasts
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

const CURRENT_USER_KEY = 'mie_aceh_current_user_v1';

const mapSupabaseUser = (row: any): User => ({
  id: String(row.id),
  name: row.name ?? '',
  username: row.username ?? '',
  role: String(row.role ?? '').toLowerCase() === 'admin' ? 'admin' : 'cashier',
  phone: row.phone ?? '',
  active: row.active ?? true,
  pin: row.pin ?? row.password ?? row.password_hash ?? '1234',
  password: row.password ?? row.password_hash ?? row.pin ?? '1234',
  lastLogin: row.last_login ?? undefined,
  totalTransactions: Number(row.total_transactions ?? 0),
  createdAt: row.created_at ?? new Date().toISOString(),
});

const getSupabaseUserColumnSet = async (): Promise<Set<string>> => {
  if (!supabase) return new Set();

  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error || !data || data.length === 0) {
    return new Set(['id', 'username', 'password_hash', 'password', 'name', 'role']);
  }

  return new Set(Object.keys(data[0]));
};

const loadUsersFromSupabase = async (): Promise<User[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('role', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Gagal memuat data user dari Supabase:', error);
    return [];
  }

  return (data ?? []).map(mapSupabaseUser);
};

const ensureSupabaseUsersSeed = async (fallbackUsers: User[] = []): Promise<User[]> => {
  if (!supabase || fallbackUsers.length === 0) return [];

  const { data: existingRows, error: existingError } = await supabase
    .from('users')
    .select('id, username')
    .limit(1);

  if (existingError) {
    console.error('Gagal mengecek data user Supabase sebelum seeding:', existingError);
    return fallbackUsers;
  }

  if (!existingRows || existingRows.length === 0) {
    for (const user of fallbackUsers) {
      await persistUserToSupabase(user);
    }
    return fallbackUsers;
  }

  return await loadUsersFromSupabase();
};

const persistUserToSupabase = async (user: User): Promise<void> => {
  if (!supabase) return;

  const availableColumns = await getSupabaseUserColumnSet();
  const payload: Record<string, any> = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };

  if (availableColumns.has('password_hash')) payload.password_hash = user.password ?? user.pin ?? '1234';
  if (availableColumns.has('password')) payload.password = user.password ?? user.pin ?? '1234';
  if (availableColumns.has('phone')) payload.phone = user.phone ?? '';
  if (availableColumns.has('active')) payload.active = Boolean(user.active);
  if (availableColumns.has('pin')) payload.pin = user.pin ?? '1234';
  if (availableColumns.has('last_login')) payload.last_login = user.lastLogin ?? null;
  if (availableColumns.has('total_transactions')) payload.total_transactions = Number(user.totalTransactions ?? 0);
  if (availableColumns.has('created_at')) payload.created_at = user.createdAt ?? new Date().toISOString();

  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('Gagal menyimpan user ke Supabase:', error);
    throw new Error(error.message || 'Gagal menyimpan user ke Supabase');
  }
};

const deleteUserFromSupabase = async (id: string): Promise<void> => {
  if (!supabase) return;

  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) {
    console.error('Gagal menghapus user dari Supabase:', error);
  }
};

export const POSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  // Core Database Models State
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_STORE_SETTINGS);
  const [tables, setTables] = useState<TableConfig[]>(INITIAL_TABLES);
  const [tableOrders, setTableOrders] = useState<TableOrder[]>(INITIAL_TABLE_ORDERS);

  const [isCustomerMode, setIsCustomerMode] = useState<boolean>(false);
  const [activeCustomerTable, setActiveCustomerTable] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabView>('pos');
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(() => {
    const saved = localStorage.getItem('pos_sidebar_collapsed');
    return saved === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsedState((prev) => {
      const next = !prev;
      localStorage.setItem('pos_sidebar_collapsed', String(next));
      return next;
    });
  };

  const setIsSidebarCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsedState(collapsed);
    localStorage.setItem('pos_sidebar_collapsed', String(collapsed));
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);

  // Active POS Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [discount, setDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number; name?: string }>({
    type: 'fixed',
    value: 0,
  });

  // Initialize SQLite Adapter & load data
  useEffect(() => {
    async function initDB() {
      try {
        await sqlite.initialize();
        setIsElectron(sqlite.isElectronEnvironment());

        const [loadedCategories, loadedUsers, loadedMenu, loadedInv, loadedTx, loadedSettings, loadedTables, loadedOrders] =
          await Promise.all([
            sqlite.getCategories(),
            sqlite.getUsers(),
            sqlite.getProducts(true),
            sqlite.getInventory(),
            sqlite.getTransactions(),
            sqlite.getSettings(),
            sqlite.getTables(),
            sqlite.getTableOrders(),
          ]);

        const localUsers = loadedUsers && loadedUsers.length > 0 ? loadedUsers : INITIAL_USERS;
        const supabaseUsers = isSupabaseConfigured ? await loadSupabaseDataOrSnapshot(loadUsersFromSupabase, 'users', localUsers) : localUsers;
        const supabaseCategories = isSupabaseConfigured
          ? await loadSupabaseDataOrSnapshot(loadCategoriesFromSupabase, 'categories', loadedCategories && loadedCategories.length > 0 ? loadedCategories : [])
          : (loadedCategories && loadedCategories.length > 0 ? loadedCategories : []);
        const supabaseMenu = isSupabaseConfigured
          ? await loadSupabaseDataOrSnapshot(loadMenuItemsFromSupabase, 'menu', loadedMenu && loadedMenu.length > 0 ? loadedMenu : INITIAL_MENU_ITEMS)
          : (loadedMenu && loadedMenu.length > 0 ? loadedMenu : INITIAL_MENU_ITEMS);
        const supabaseInventory = isSupabaseConfigured
          ? await loadSupabaseDataOrSnapshot(loadInventoryFromSupabase, 'inventory', loadedInv || [])
          : (loadedInv || []);
        const supabaseTransactions = isSupabaseConfigured
          ? await loadSupabaseDataOrSnapshot(loadTransactionsFromSupabase, 'transactions', loadedTx || [])
          : (loadedTx || []);
        const supabaseTables = isSupabaseConfigured
          ? await loadSupabaseDataOrSnapshot(loadTablesFromSupabase, 'tables', loadedTables || [])
          : (loadedTables || []);
        const supabaseTableOrders = isSupabaseConfigured
          ? await loadSupabaseDataOrSnapshot(loadTableOrdersFromSupabase, 'tableOrders', loadedOrders || [])
          : (loadedOrders || []);
        let finalSettings = loadedSettings || INITIAL_STORE_SETTINGS;
        if (isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
          try {
            const remoteSettings = await loadSettingsFromSupabase();
            if (remoteSettings) finalSettings = remoteSettings;
          } catch (error) {
            console.warn('Memakai pengaturan lokal karena Supabase tidak dapat diakses:', error);
          }
        }
        const finalUsers = isSupabaseConfigured ? supabaseUsers : localUsers;
        const finalCategories = isSupabaseConfigured ? supabaseCategories : (loadedCategories && loadedCategories.length > 0 ? loadedCategories : []);
        const finalMenu = isSupabaseConfigured ? supabaseMenu : (loadedMenu && loadedMenu.length > 0 ? loadedMenu : INITIAL_MENU_ITEMS);
        const finalInventory = isSupabaseConfigured ? supabaseInventory : (loadedInv || []);
        const finalTransactions = isSupabaseConfigured ? supabaseTransactions : (loadedTx || []);

        if (isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
          writeLastOnlineSnapshot({
            categories: finalCategories,
            users: finalUsers,
            menu: finalMenu,
            inventory: finalInventory,
            transactions: finalTransactions,
            tables: supabaseTables,
            tableOrders: supabaseTableOrders,
          });
        }

        setCategories(finalCategories);
        setUsers(finalUsers);
        setMenuItems(finalMenu);
        setInventory(finalInventory);
        setTransactions(finalTransactions);
        setSettings(finalSettings);
        setTables(supabaseTables);
        setTableOrders(supabaseTableOrders);

        setIsDbReady(true);
      } catch (err) {
        console.error('Error initializing SQLite adapter:', err);
        setIsDbReady(true);
      }
    }
    initDB();
  }, []);

  // Save current active cashier to localStorage for session persistence
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isSupabaseConfigured || !isDbReady) return;

    const syncWhenOnline = () => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        void flushSyncQueue();
      }
    };

    window.addEventListener('online', syncWhenOnline);
    syncWhenOnline();

    return () => {
      window.removeEventListener('online', syncWhenOnline);
    };
  }, [isDbReady]);

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = generateId('toast');
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auth Methods with offline verification
  const login = async (username: string, pin: string, roleRequired?: 'admin' | 'cashier'): Promise<boolean> => {
    try {
      const sourceUsers = isSupabaseConfigured ? await loadUsersFromSupabase() : (users.length > 0 ? users : INITIAL_USERS);

      const user = sourceUsers.find(
        (u) =>
          u.username.toLowerCase() === username.toLowerCase().trim() &&
          (u.pin === pin.trim() || u.password === pin.trim() || !u.pin)
      );

      if (user && user.active) {
        if (roleRequired && user.role !== roleRequired) {
          showToast('Akses role tidak sesuai.', 'error');
          return false;
        }

        const updatedUser = { ...user, lastLogin: new Date().toISOString() };
        if (supabase) {
          await supabase.from('users').update({ last_login: updatedUser.lastLogin }).eq('id', updatedUser.id);
        }
        await sqlite.saveUser(updatedUser);
        setCurrentUser(updatedUser);
        setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
        showToast(`Selamat datang, ${updatedUser.name}! (${updatedUser.role.toUpperCase()})`, 'success');
        return true;
      }

      const verified = await sqlite.verifyLogin(username, pin, roleRequired);
      if (verified) {
        setCurrentUser(verified);
        setUsers((prev) => prev.map((u) => (u.id === verified.id ? verified : u)));
        showToast(`Selamat datang, ${verified.name}! (${verified.role.toUpperCase()})`, 'success');
        return true;
      }

      showToast('Username atau PIN salah, atau akun nonaktif.', 'error');
      return false;
    } catch (err) {
      showToast('Gagal memverifikasi login.', 'error');
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    showToast('Berhasil keluar dari sistem kasir', 'info');
  };

  const switchUser = (userId: string) => {
    if (currentUser?.role !== 'admin') {
      showToast('Hanya Admin yang dapat berpindah akun secara langsung.', 'error');
      return;
    }
    const target = users.find((u) => u.id === userId);
    if (target) {
      if (!target.active) {
        showToast(`Akun ${target.name} sedang dinonaktifkan/off.`, 'warning');
        return;
      }
      setCurrentUser(target);
      showToast(`Beralih ke akun ${target.name} (${target.role.toUpperCase()})`, 'info');
    }
  };

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartDiscountAmount = useMemo(() => {
    if (discount.value <= 0) return 0;
    if (discount.type === 'percentage') {
      return Math.round((cartSubtotal * discount.value) / 100);
    }
    return Math.min(discount.value, cartSubtotal);
  }, [cartSubtotal, discount]);

  const cartTaxAmount = useMemo(() => {
    if (!settings.enableTax) return 0;
    const taxableAmount = Math.max(0, cartSubtotal - cartDiscountAmount);
    return Math.round((taxableAmount * settings.taxRate) / 100);
  }, [cartSubtotal, cartDiscountAmount, settings.enableTax, settings.taxRate]);

  const cartTotal = useMemo(() => {
    const base = Math.max(0, cartSubtotal - cartDiscountAmount);
    return base + cartTaxAmount;
  }, [cartSubtotal, cartDiscountAmount, cartTaxAmount]);

  // Cart Actions
  const addToCart = (menuItem: MenuItem, options?: CartItemOption) => {
    if (!menuItem.isAvailable || menuItem.stock <= 0) {
      showToast(`Maaf, ${menuItem.name} sedang habis.`, 'warning');
      return;
    }

    const optionKey = options
      ? `${options.cookingStyle || ''}_${options.spiceLevel || ''}_${options.notes || ''}`
      : 'standard';
    const cartItemId = `${menuItem.id}_${optionKey}`;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === cartItemId);
      if (existing) {
        if (existing.quantity >= menuItem.stock) {
          showToast(`Stok ${menuItem.name} tersisa ${menuItem.stock} porsi.`, 'warning');
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === cartItemId
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.price,
              }
            : item
        );
      } else {
        const newItem: CartItem = {
          id: cartItemId,
          menuId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          costPrice: menuItem.costPrice,
          image: menuItem.image,
          quantity: 1,
          category: menuItem.category,
          options,
          subtotal: menuItem.price,
        };
        return [...prevCart, newItem];
      }
    });

    showToast(`+1 ${menuItem.name} ditambahkan`, 'info');
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prevCart) => {
      const item = prevCart.find((i) => i.id === cartItemId);
      if (!item) return prevCart;

      const menuItem = menuItems.find((m) => m.id === item.menuId);
      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        return prevCart.filter((i) => i.id !== cartItemId);
      }

      if (menuItem && newQty > menuItem.stock) {
        showToast(`Maksimal stok tercapai (${menuItem.stock} porsi)`, 'warning');
        return prevCart;
      }

      return prevCart.map((i) =>
        i.id === cartItemId
          ? {
              ...i,
              quantity: newQty,
              subtotal: newQty * i.price,
            }
          : i
      );
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== cartItemId));
  };

  const updateCartItemNotes = (cartItemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === cartItemId
          ? {
              ...item,
              options: {
                ...item.options,
                notes,
              },
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setOrderNotes('');
    setDiscount({ type: 'fixed', value: 0 });
  };

  const applyDiscount = (type: 'percentage' | 'fixed', value: number, name?: string) => {
    setDiscount({ type, value, name });
    showToast(`Diskon diterapkan: ${name || (type === 'percentage' ? `${value}%` : `Rp ${value}`)}`, 'success');
  };

  const removeDiscount = () => {
    setDiscount({ type: 'fixed', value: 0 });
    showToast('Diskon dihapus', 'info');
  };

  // Transaction Checkout to SQLite
  const completeTransaction = async (details: {
    paymentMethod: PaymentMethod;
    amountPaid: number;
    paymentReference?: string;
  }): Promise<Transaction> => {
    if (cart.length === 0) {
      throw new Error('Keranjang belanja kosong');
    }

    const sequence = transactions.length + 1;
    const invoiceNumber = generateInvoiceNumber(sequence);
    const changeAmount = Math.max(0, details.amountPaid - cartTotal);

    const newTransaction: Transaction = {
      id: invoiceNumber,
      invoiceNumber,
      createdAt: new Date().toISOString(),
      cashierId: currentUser?.id || 'usr_unknown',
      cashierName: currentUser?.name || 'Kasir',
      orderType,
      tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
      customerName: customerName.trim() || undefined,
      items: [...cart],
      itemCount: cartItemCount,
      subtotal: cartSubtotal,
      discountType: discount.type,
      discountValue: discount.value,
      discountAmount: cartDiscountAmount,
      discountName: discount.name,
      taxRate: settings.enableTax ? settings.taxRate : 0,
      taxAmount: cartTaxAmount,
      total: cartTotal,
      paymentMethod: details.paymentMethod,
      amountPaid: details.amountPaid,
      changeAmount,
      paymentReference: details.paymentReference,
      status: 'completed',
      notes: orderNotes.trim() || undefined,
    };

    // 1. Deduct Menu stock in SQLite
    const deductItems = cart.map((c) => ({ productId: c.menuId, quantity: c.quantity }));
    await sqlite.deductStock(deductItems);

    setMenuItems((prevMenu) =>
      prevMenu.map((menu) => {
        const itemInCart = cart.filter((c) => c.menuId === menu.id);
        const qtyOrdered = itemInCart.reduce((sum, c) => sum + c.quantity, 0);
        if (qtyOrdered > 0) {
          const updatedStock = Math.max(0, menu.stock - qtyOrdered);
          return {
            ...menu,
            stock: updatedStock,
            isAvailable: updatedStock > 0,
          };
        }
        return menu;
      })
    );

    // 2. Save Transaction to live DB
    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await persistTransactionToSupabase(newTransaction);
      } else {
        enqueueSyncQueue('transactions', 'insert', newTransaction, newTransaction.id);
      }
    } else {
      await sqlite.saveTransaction(newTransaction);
    }
    setTransactions((prev) => [newTransaction, ...prev]);

    // 3. Update User stats
    if (currentUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id ? { ...u, totalTransactions: (u.totalTransactions || 0) + 1 } : u
        )
      );
    }

    // 4. Clear cart & set receipt
    clearCart();
    setSelectedReceipt(newTransaction);
    showToast(`Transaksi ${invoiceNumber} berhasil disimpan ke database lokal!`, 'success');

    return newTransaction;
  };

  const cancelTransaction = async (transactionId: string, reason: string): Promise<boolean> => {
    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx || tx.status === 'cancelled') {
      showToast('Transaksi tidak ditemukan atau sudah dibatalkan.', 'error');
      return false;
    }

    // Return stock
    for (const item of tx.items) {
      await sqlite.restockProduct(item.menuId, item.quantity);
    }

    setMenuItems((prevMenu) =>
      prevMenu.map((menu) => {
        const itemInTx = tx.items.filter((c) => c.menuId === menu.id);
        const qtyReturned = itemInTx.reduce((sum, c) => sum + c.quantity, 0);
        if (qtyReturned > 0) {
          const newStock = menu.stock + qtyReturned;
          return {
            ...menu,
            stock: newStock,
            isAvailable: true,
          };
        }
        return menu;
      })
    );

    // Void in live DB
    if (isSupabaseConfigured) {
      const targetTx = transactions.find((t) => t.id === transactionId || t.invoiceNumber === transactionId);
      if (targetTx) {
        const { error } = await supabase!
          .from('transactions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancel_reason: reason,
            cancelled_by: currentUser?.name || 'Admin',
          })
          .eq('invoice_number', targetTx.invoiceNumber);

        if (error) {
          console.error('Gagal membatalkan transaksi di Supabase:', error);
          throw new Error(error.message || 'Gagal membatalkan transaksi di Supabase');
        }
      }
    } else {
      await sqlite.cancelTransaction(transactionId, reason, currentUser?.name || 'Admin');
    }

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId || t.invoiceNumber === transactionId
          ? {
              ...t,
              status: 'cancelled',
              cancelledAt: new Date().toISOString(),
              cancelReason: reason,
              cancelledBy: currentUser?.name || 'Admin',
            }
          : t
      )
    );

    showToast(`Transaksi ${transactionId} berhasil dibatalkan (void).`, 'info');
    return true;
  };

  // Categories Management
  const addCategory = async (category: Omit<Category, 'id'> & { id?: string }) => {
    const id = normalizeSupabaseUuid(category.id);
    const newCategory: Category = {
      ...category,
      id,
    };

    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await persistCategoryToSupabase(newCategory);
      } else {
        enqueueSyncQueue('categories', 'insert', {
          id: newCategory.id,
          name: newCategory.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      setCategories((prev) => {
        const exists = prev.some((item) => item.id === newCategory.id);
        return exists ? prev.map((item) => (item.id === newCategory.id ? newCategory : item)) : [...prev, newCategory];
      });
      showToast(`Kategori ${newCategory.name} berhasil ditambahkan!`, 'success');
      return;
    }

    await sqlite.saveCategory({
      id: newCategory.id,
      name: newCategory.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setCategories((prev) => [...prev, newCategory]);
    showToast(`Kategori ${newCategory.name} berhasil ditambahkan!`, 'success');
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const existing = categories.find((c) => c.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates, id: normalizeSupabaseUuid(existing.id) };

    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await persistCategoryToSupabase(updated);
      } else {
        enqueueSyncQueue('categories', 'update', {
          id: updated.id,
          name: updated.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, updated.id);
      }
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showToast('Kategori berhasil diperbarui', 'success');
      return;
    }

    await sqlite.saveCategory({
      id: updated.id,
      name: updated.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    showToast('Kategori berhasil diperbarui', 'success');
  };

  const deleteCategory = async (id: string) => {
    // Check if category is in use
    const inUse = menuItems.some((m) => m.category === id);
    if (inUse) {
      showToast('Kategori ini masih digunakan oleh menu. Ubah kategori menu terlebih dahulu.', 'error');
      return;
    }

    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await deleteCategoryFromSupabase(id);
      } else {
        enqueueSyncQueue('categories', 'delete', { id }, id);
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast('Kategori berhasil dihapus', 'info');
      return;
    }

    await sqlite.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast('Kategori berhasil dihapus', 'info');
  };

  // Menu Management
  const addMenuItem = async (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const newItem: MenuItem = {
      ...item,
      id: normalizeSupabaseUuid(item.id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await persistMenuItemToSupabase(newItem);
      } else {
        enqueueSyncQueue('products', 'insert', {
          id: newItem.id,
          name: newItem.name,
          category: newItem.category,
          price: Number(newItem.price ?? 0),
          cost_price: Number(newItem.costPrice ?? 0),
          stock: Number(newItem.stock ?? 0),
          unit: newItem.unit || 'Porsi',
          description: newItem.description || '',
          image: newItem.image || DEFAULT_MENU_IMAGE,
          is_active: Boolean(newItem.isAvailable),
          is_popular: Boolean(newItem.isPopular),
          spicy_options: Number(Boolean(newItem.spicyOptions)),
          cooking_style_options: Number(Boolean(newItem.cookingStyleOptions)),
          created_at: newItem.createdAt,
          updated_at: newItem.updatedAt,
        }, newItem.id);
      }
      setMenuItems((prev) => [newItem, ...prev]);
      showToast(`Menu ${newItem.name} berhasil ditambahkan!`, 'success');
      return;
    }

    await sqlite.saveProduct(newItem);
    setMenuItems((prev) => [newItem, ...prev]);
    showToast(`Menu ${newItem.name} berhasil ditambahkan!`, 'success');
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    const existing = menuItems.find((m) => m.id === id);
    if (!existing) return;
    const updated: MenuItem = {
      ...existing,
      ...updates,
      id: normalizeSupabaseUuid(existing.id),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await persistMenuItemToSupabase(updated);
      } else {
        enqueueSyncQueue('products', 'update', {
          id: updated.id,
          name: updated.name,
          category: updated.category,
          price: Number(updated.price ?? 0),
          cost_price: Number(updated.costPrice ?? 0),
          stock: Number(updated.stock ?? 0),
          unit: updated.unit || 'Porsi',
          description: updated.description || '',
          image: updated.image || DEFAULT_MENU_IMAGE,
          is_active: Boolean(updated.isAvailable),
          is_popular: Boolean(updated.isPopular),
          spicy_options: Number(Boolean(updated.spicyOptions)),
          cooking_style_options: Number(Boolean(updated.cookingStyleOptions)),
          created_at: updated.createdAt,
          updated_at: updated.updatedAt,
        }, updated.id);
      }
      setMenuItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      showToast('Menu berhasil diperbarui', 'success');
      return;
    }

    await sqlite.saveProduct(updated);
    setMenuItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    showToast('Menu berhasil diperbarui', 'success');
  };

  const deleteMenuItem = async (id: string) => {
    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await deleteMenuItemFromSupabase(id);
      } else {
        enqueueSyncQueue('products', 'delete', { id }, id);
      }
      setMenuItems((prev) => prev.filter((item) => item.id !== id));
      showToast('Menu berhasil dihapus', 'info');
      return;
    }

    await sqlite.deleteProduct(id);
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
    showToast('Menu berhasil dihapus', 'info');
  };

  const toggleMenuAvailability = async (id: string) => {
    const item = menuItems.find((m) => m.id === id);
    if (!item) return;
    const nextState = !item.isAvailable;
    const updated = { ...item, id: normalizeSupabaseUuid(item.id), isAvailable: nextState, updatedAt: new Date().toISOString() };

    if (isSupabaseConfigured) {
      await persistMenuItemToSupabase(updated);
      setMenuItems((prev) => prev.map((m) => (m.id === id ? updated : m)));
      showToast(`${item.name} sekarang ${nextState ? 'Tersedia' : 'Habis'}`, 'info');
      return;
    }

    await sqlite.saveProduct(updated);
    setMenuItems((prev) => prev.map((m) => (m.id === id ? updated : m)));
    showToast(`${item.name} sekarang ${nextState ? 'Tersedia' : 'Habis'}`, 'info');
  };

  // Inventory Management
  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: normalizeSupabaseUuid(),
    };

    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await persistInventoryItemToSupabase(newItem);
      } else {
        enqueueSyncQueue('inventory', 'insert', {
          id: newItem.id,
          name: newItem.name,
          category: newItem.category || 'Bahan Pokok',
          current_stock: Number(newItem.currentStock ?? 0),
          unit: newItem.unit || 'pcs',
          min_stock: Number(newItem.minStock ?? 0),
          cost_per_unit: Number(newItem.costPerUnit ?? 0),
          last_restocked: newItem.lastRestocked || new Date().toISOString(),
          status: newItem.status || 'safe',
          supplier: newItem.supplier ?? '',
          updated_at: new Date().toISOString(),
        }, newItem.id);
      }
      setInventory((prev) => [...prev, newItem]);
      showToast(`Bahan ${newItem.name} berhasil ditambahkan!`, 'success');
      return;
    }

    await sqlite.saveInventoryItem(newItem);
    setInventory((prev) => [...prev, newItem]);
    showToast(`Bahan ${newItem.name} berhasil ditambahkan!`, 'success');
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    const existing = inventory.find((i) => i.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates, id: normalizeSupabaseUuid(existing.id) };

    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await persistInventoryItemToSupabase(updated);
      } else {
        enqueueSyncQueue('inventory', 'update', {
          id: updated.id,
          name: updated.name,
          category: updated.category || 'Bahan Pokok',
          current_stock: Number(updated.currentStock ?? 0),
          unit: updated.unit || 'pcs',
          min_stock: Number(updated.minStock ?? 0),
          cost_per_unit: Number(updated.costPerUnit ?? 0),
          last_restocked: updated.lastRestocked || new Date().toISOString(),
          status: updated.status || 'safe',
          supplier: updated.supplier ?? '',
          updated_at: new Date().toISOString(),
        }, updated.id);
      }
      setInventory((prev) => prev.map((item) => (item.id === id ? updated : item)));
      showToast('Data stok berhasil diperbarui', 'success');
      return;
    }

    await sqlite.saveInventoryItem(updated);
    setInventory((prev) => prev.map((item) => (item.id === id ? updated : item)));
    showToast('Data stok berhasil diperbarui', 'success');
  };

  const adjustStock = async (id: string, newStock: number) => {
    const existing = inventory.find((i) => i.id === id);
    if (!existing) return;
    let status: 'safe' | 'low' | 'out_of_stock' = 'safe';
    if (newStock <= 0) status = 'out_of_stock';
    else if (newStock <= existing.minStock) status = 'low';

    const updated: InventoryItem = {
      ...existing,
      currentStock: newStock,
      status,
      lastRestocked: new Date().toISOString(),
      id: normalizeSupabaseUuid(existing.id),
    };

    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await persistInventoryItemToSupabase(updated);
      } else {
        enqueueSyncQueue('inventory', 'update', {
          id: updated.id,
          name: updated.name,
          category: updated.category || 'Bahan Pokok',
          current_stock: Number(updated.currentStock ?? 0),
          unit: updated.unit || 'pcs',
          min_stock: Number(updated.minStock ?? 0),
          cost_per_unit: Number(updated.costPerUnit ?? 0),
          last_restocked: updated.lastRestocked || new Date().toISOString(),
          status: updated.status || 'safe',
          supplier: updated.supplier ?? '',
          updated_at: new Date().toISOString(),
        }, updated.id);
      }
      setInventory((prev) => prev.map((item) => (item.id === id ? updated : item)));
      showToast('Penyesuaian stok berhasil disimpan', 'success');
      return;
    }

    await sqlite.saveInventoryItem(updated);
    setInventory((prev) => prev.map((item) => (item.id === id ? updated : item)));
    showToast('Penyesuaian stok berhasil disimpan', 'success');
  };

  const deleteInventoryItem = async (id: string) => {
    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await deleteInventoryItemFromSupabase(id);
      } else {
        enqueueSyncQueue('inventory', 'delete', { id }, id);
      }
      setInventory((prev) => prev.filter((item) => item.id !== id));
      showToast('Item bahan berhasil dihapus', 'info');
      return;
    }

    await sqlite.deleteInventoryItem(id);
    setInventory((prev) => prev.filter((item) => item.id !== id));
    showToast('Item bahan berhasil dihapus', 'info');
  };

  // Table QR & Orders Management
  const activePendingTableOrdersCount = useMemo(() => {
    return tableOrders.filter(
      (o) => o.orderStatus === 'pending' || o.orderStatus === 'cooking' || o.orderStatus === 'ready'
    ).length;
  }, [tableOrders]);

  const addTable = async (tableData: Omit<TableConfig, 'id'>) => {
    const newTable: TableConfig = {
      ...tableData,
      id: normalizeSupabaseUuid(),
    };
    await sqlite.saveTable(newTable);
    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) await persistTableToSupabase(newTable);
      else enqueueSyncQueue('tables', 'insert', tablePayload(newTable), newTable.id);
    }
    setTables((prev) => [...prev, newTable]);
    showToast(`Meja ${newTable.tableNumber} berhasil ditambahkan!`, 'success');
  };

  const updateTable = async (id: string, updates: Partial<TableConfig>) => {
    const existing = tables.find((t) => t.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates };
    await sqlite.saveTable(updated);
    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) await persistTableToSupabase(updated);
      else enqueueSyncQueue('tables', 'update', tablePayload(updated), updated.id);
    }
    setTables((prev) => prev.map((t) => (t.id === id ? updated : t)));
    showToast('Data meja berhasil diperbarui', 'success');
  };

  const deleteTable = async (id: string) => {
    await sqlite.deleteTable(id);
    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        const { error } = await supabase!.from('tables').delete().eq('id', id);
        if (error) throw new Error(error.message || 'Gagal menghapus meja dari Supabase');
      } else enqueueSyncQueue('tables', 'delete', { id }, id);
    }
    setTables((prev) => prev.filter((t) => t.id !== id));
    showToast('Meja berhasil dihapus', 'info');
  };

  const addTableOrder = async (orderData: Omit<TableOrder, 'id' | 'createdAt'>): Promise<TableOrder> => {
    const orderId = normalizeSupabaseUuid();

    const newOrder: TableOrder = {
      ...orderData,
      id: orderId,
      createdAt: new Date().toISOString(),
    };

    // 1. Mark table occupied
    const tbl = tables.find((t) => t.tableNumber.toLowerCase() === orderData.tableNumber.toLowerCase());
    if (tbl) {
      const updatedTbl = { ...tbl, status: 'occupied' as const, activeOrderId: orderId };
      await sqlite.saveTable(updatedTbl);
      if (isSupabaseConfigured) {
        if (typeof navigator === 'undefined' || navigator.onLine) await persistTableToSupabase(updatedTbl);
        else enqueueSyncQueue('tables', 'update', tablePayload(updatedTbl), updatedTbl.id);
      }
      setTables((prev) => prev.map((t) => (t.id === tbl.id ? updatedTbl : t)));
    }

    // 2. Deduct Menu stock
    const deductItems = orderData.items.map((c) => ({ productId: c.menuId, quantity: c.quantity }));
    await sqlite.deductStock(deductItems);

    setMenuItems((prevMenu) =>
      prevMenu.map((menu) => {
        const itemInCart = orderData.items.filter((c) => c.menuId === menu.id);
        const qtyOrdered = itemInCart.reduce((sum, c) => sum + c.quantity, 0);
        if (qtyOrdered > 0) {
          const updatedStock = Math.max(0, menu.stock - qtyOrdered);
          return {
            ...menu,
            stock: updatedStock,
            isAvailable: updatedStock > 0,
          };
        }
        return menu;
      })
    );

    // 3. Save to SQLite
    await sqlite.saveTableOrder(newOrder);
    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) await persistTableOrderToSupabase(newOrder);
      else enqueueSyncQueue('table_orders', 'insert', tableOrderPayload(newOrder), newOrder.id);
    }
    setTableOrders((prev) => [newOrder, ...prev]);

    showToast(`Pesanan ${orderId} dari ${orderData.tableNumber} berhasil disimpan!`, 'success');
    return newOrder;
  };

  const updateTableOrderStatus = async (orderId: string, status: TableOrderStatus) => {
    const existing = tableOrders.find((o) => o.id === orderId);
    if (!existing) return;
    const isDone = status === 'completed' || status === 'cancelled';
    const updated: TableOrder = {
      ...existing,
      orderStatus: status,
      updatedAt: new Date().toISOString(),
      completedAt: isDone ? new Date().toISOString() : existing.completedAt,
    };
    await sqlite.saveTableOrder(updated);
    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) await persistTableOrderToSupabase(updated);
      else enqueueSyncQueue('table_orders', 'update', tableOrderPayload(updated), updated.id);
    }
    setTableOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    showToast(`Status pesanan ${orderId} diperbarui: ${status.toUpperCase()}`, 'info');
  };

  const updateTablePaymentStatus = async (orderId: string, paymentStatus: TablePaymentStatus) => {
    const existing = tableOrders.find((o) => o.id === orderId);
    if (!existing) return;
    const updated: TableOrder = {
      ...existing,
      paymentStatus,
      paidAt: paymentStatus !== 'unpaid' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };
    await sqlite.saveTableOrder(updated);
    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) await persistTableOrderToSupabase(updated);
      else enqueueSyncQueue('table_orders', 'update', tableOrderPayload(updated), updated.id);
    }
    setTableOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    showToast(`Status pembayaran pesanan ${orderId} diperbarui`, 'success');
  };

  const convertTableOrderToTransaction = async (
    orderId: string,
    paymentMethodOverride?: PaymentMethod
  ): Promise<Transaction | null> => {
    const order = tableOrders.find((o) => o.id === orderId);
    if (!order) {
      showToast('Pesanan meja tidak ditemukan.', 'error');
      return null;
    }

    const sequence = transactions.length + 1;
    const invoiceNumber = generateInvoiceNumber(sequence);
    const method = paymentMethodOverride || order.paymentMethod || 'qris';

    const newTransaction: Transaction = {
      id: invoiceNumber,
      invoiceNumber,
      createdAt: new Date().toISOString(),
      cashierId: currentUser?.id || 'usr_self_qr',
      cashierName: currentUser?.name || 'Self-Order QR Meja',
      orderType: 'dine_in',
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      items: [...order.items],
      itemCount: order.itemCount,
      subtotal: order.subtotal,
      discountType: 'fixed',
      discountValue: 0,
      discountAmount: 0,
      taxRate: settings.enableTax ? settings.taxRate : 0,
      taxAmount: order.taxAmount,
      total: order.total,
      paymentMethod: method,
      amountPaid: order.total,
      changeAmount: 0,
      paymentReference: `QR-${order.id}`,
      status: 'completed',
      notes: order.notes ? `[Pesanan QR Meja] ${order.notes}` : '[Pesanan QR Meja]',
    };

    // Save transaction locally and remotely when available
    await sqlite.saveTransaction(newTransaction);
    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) await persistTransactionToSupabase(newTransaction);
      else enqueueSyncQueue('transactions', 'insert', newTransaction, newTransaction.id);
    }
    setTransactions((prev) => [newTransaction, ...prev]);

    // Mark table order completed
    const updatedOrder: TableOrder = {
      ...order,
      orderStatus: 'completed',
      paymentStatus: method === 'qris' ? 'paid_qris' : method === 'transfer' ? 'paid_transfer' : 'paid_cashier',
      completedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
    };
    await sqlite.saveTableOrder(updatedOrder);
    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) await persistTableOrderToSupabase(updatedOrder);
      else enqueueSyncQueue('table_orders', 'update', tableOrderPayload(updatedOrder), updatedOrder.id);
    }
    setTableOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));

    // Free table
    const tbl = tables.find((t) => t.tableNumber.toLowerCase() === order.tableNumber.toLowerCase());
    if (tbl) {
      const updatedTbl: TableConfig = { ...tbl, status: 'available', activeOrderId: undefined };
      await sqlite.saveTable(updatedTbl);
      if (isSupabaseConfigured) {
        if (typeof navigator === 'undefined' || navigator.onLine) await persistTableToSupabase(updatedTbl);
        else enqueueSyncQueue('tables', 'update', tablePayload(updatedTbl), updatedTbl.id);
      }
      setTables((prev) => prev.map((t) => (t.id === tbl.id ? updatedTbl : t)));
    }

    setSelectedReceipt(newTransaction);
    showToast(`Pesanan ${order.tableNumber} selesai & tersimpan di database!`, 'success');
    return newTransaction;
  };

  const cancelTableOrder = async (orderId: string, reason: string = 'Dibatalkan pelanggan/kasir') => {
    const order = tableOrders.find((o) => o.id === orderId);
    if (!order || order.orderStatus === 'cancelled') {
      showToast('Pesanan tidak ditemukan atau sudah dibatalkan.', 'error');
      return;
    }

    // Return stock
    for (const item of order.items) {
      await sqlite.restockProduct(item.menuId, item.quantity);
    }

    setMenuItems((prevMenu) =>
      prevMenu.map((menu) => {
        const itemInOrder = order.items.filter((c) => c.menuId === menu.id);
        const qtyReturned = itemInOrder.reduce((sum, c) => sum + c.quantity, 0);
        if (qtyReturned > 0) {
          const newStock = menu.stock + qtyReturned;
          return {
            ...menu,
            stock: newStock,
            isAvailable: true,
          };
        }
        return menu;
      })
    );

    // Free table
    const tbl = tables.find((t) => t.tableNumber.toLowerCase() === order.tableNumber.toLowerCase());
    if (tbl) {
      const updatedTbl: TableConfig = { ...tbl, status: 'available', activeOrderId: undefined };
      await sqlite.saveTable(updatedTbl);
      setTables((prev) => prev.map((t) => (t.id === tbl.id ? updatedTbl : t)));
    }

    const updatedOrder: TableOrder = {
      ...order,
      orderStatus: 'cancelled',
      notes: `${order.notes || ''} [Batal: ${reason}]`,
      updatedAt: new Date().toISOString(),
    };
    await sqlite.saveTableOrder(updatedOrder);
    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) await persistTableOrderToSupabase(updatedOrder);
      else enqueueSyncQueue('table_orders', 'update', tableOrderPayload(updatedOrder), updatedOrder.id);
    }
    setTableOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));

    showToast(`Pesanan ${orderId} berhasil dibatalkan.`, 'info');
  };

  // User Management
  const addUser = async (user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: normalizeSupabaseUserId(generateId('usr')),
      totalTransactions: 0,
      createdAt: new Date().toISOString(),
    };

    try {
      await sqlite.saveUser(newUser);
      if (isSupabaseConfigured) {
        await persistUserToSupabase(newUser);
        const refreshed = await loadUsersFromSupabase();
        setUsers(refreshed.length > 0 ? refreshed : [newUser]);
      } else {
        setUsers((prev) => [...prev, newUser]);
      }
      showToast(`Karyawan ${newUser.name} berhasil ditambahkan!`, 'success');
    } catch (error: any) {
      console.error('Gagal menambah user:', error);
      showToast(error?.message || 'Gagal menambahkan pengguna ke database.', 'error');
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const existing = users.find((u) => u.id === id);
    if (!existing) return;
    const updated = {
      ...existing,
      ...updates,
      id: normalizeSupabaseUserId(existing.id),
      updatedAt: new Date().toISOString(),
    } as User;

    try {
      await sqlite.saveUser(updated);
      if (isSupabaseConfigured) {
        await persistUserToSupabase(updated);
        const refreshed = await loadUsersFromSupabase();
        setUsers(refreshed.length > 0 ? refreshed : users.map((u) => (u.id === id ? updated : u)));
      } else {
        setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      }
      if (currentUser?.id === id) {
        setCurrentUser(updated);
      }
      showToast('Data pengguna berhasil diperbarui', 'success');
    } catch (error: any) {
      console.error('Gagal memperbarui user:', error);
      showToast(error?.message || 'Gagal memperbarui data pengguna.', 'error');
    }
  };

  const toggleUserStatus = async (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const nextActive = !target.active;
    const updated = { ...target, active: nextActive };
    await sqlite.saveUser(updated);
    await persistUserToSupabase(updated);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    showToast(`Akun ${target.name} ${nextActive ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
  };

  const resetUserPassword = async (id: string, newPin: string) => {
    const existing = users.find((u) => u.id === id);
    if (!existing) return;
    const updated: User = {
      ...existing,
      pin: newPin,
      password: newPin,
    };
    await sqlite.saveUser(updated);
    await persistUserToSupabase(updated);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    showToast(`Password / PIN pengguna ${existing.name} berhasil direset!`, 'success');
  };

  const deleteUser = async (id: string) => {
    if (currentUser?.id === id) {
      showToast('Tidak dapat menghapus akun yang sedang login.', 'error');
      return;
    }
    await sqlite.deleteUser(id);
    await deleteUserFromSupabase(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    showToast('Pengguna berhasil dihapus dari database', 'info');
  };

  // Settings
  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    const updated = { ...settings, ...newSettings };
    await sqlite.saveSettings(updated);
    if (isSupabaseConfigured) {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        await persistSettingsToSupabase(updated);
      } else {
        enqueueSyncQueue('store_settings', 'update', {
          id: 'primary_store_config',
          settings_json: updated,
          updated_at: new Date().toISOString(),
        }, 'primary_store_config');
      }
    }
    setSettings(updated);
    showToast(isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)
      ? 'Pengaturan warung berhasil disimpan ke Supabase!'
      : 'Pengaturan warung disimpan lokal dan menunggu sinkronisasi.', 'success');
  };

  const resetAllData = async () => {
    await sqlite.importFullDatabaseDump(
      JSON.stringify({
        categories: [],
        users: INITIAL_USERS,
        products: [],
        inventory: [],
        transactions: [],
        store: INITIAL_STORE_SETTINGS,
        tables: [],
        tableOrders: [],
      })
    );

    setCategories([]);
    setUsers(INITIAL_USERS);
    setCurrentUser(null);
    setMenuItems([]);
    setInventory([]);
    setTransactions([]);
    setSettings(INITIAL_STORE_SETTINGS);
    setTables([]);
    setTableOrders([]);
    setCart([]);
    showToast('Seluruh data sistem telah direset menjadi kosong (mulai bisnis baru).', 'warning');
  };

  // Export & Backup
  const exportTransactionsCSV = (filtered?: Transaction[]) => {
    ExportService.exportTransactionsToCSV(filtered || transactions);
    showToast('File laporan transaksi CSV berhasil diunduh.', 'success');
  };

  const exportInventoryCSV = () => {
    ExportService.exportInventoryToCSV(inventory);
    showToast('File laporan stok bahan CSV berhasil diunduh.', 'success');
  };

  const backupDatabase = async () => {
    try {
      await BackupService.downloadDatabaseBackup();
      showToast('Backup database lokal berhasil diekspor!', 'success');
    } catch (err) {
      showToast('Gagal mengekspor backup database.', 'error');
    }
  };

  const restoreDatabase = async (file: File): Promise<boolean> => {
    try {
      const success = await BackupService.restoreDatabaseFromFile(file);
      if (success) {
        // Reload states
        const [loadedUsers, loadedMenu, loadedInv, loadedTx, loadedSettings, loadedTables, loadedOrders] =
          await Promise.all([
            sqlite.getUsers(),
            sqlite.getProducts(true),
            sqlite.getInventory(),
            sqlite.getTransactions(),
            sqlite.getSettings(),
            sqlite.getTables(),
            sqlite.getTableOrders(),
          ]);

        setUsers(loadedUsers);
        setMenuItems(loadedMenu);
        setInventory(loadedInv);
        setTransactions(loadedTx);
        setSettings(loadedSettings);
        setTables(loadedTables);
        setTableOrders(loadedOrders);

        showToast('Database berhasil dipulihkan (restore) sepenuhnya!', 'success');
        return true;
      }
      showToast('Gagal memulihkan database. Format file tidak sesuai.', 'error');
      return false;
    } catch (err) {
      showToast('Terjadi kesalahan saat restore database.', 'error');
      return false;
    }
  };

  return (
    <POSContext.Provider
      value={{
        isDbReady,
        isElectron,
        currentUser,
        users,
        login,
        logout,
        switchUser,
        activeTab,
        setActiveTab,
        isSidebarCollapsed,
        toggleSidebar,
        setIsSidebarCollapsed,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        toggleMobileSidebar,

        isCustomerMode,
        setIsCustomerMode,
        activeCustomerTable,
        setActiveCustomerTable,

        tables,
        tableOrders,
        addTable,
        updateTable,
        deleteTable,
        addTableOrder,
        updateTableOrderStatus,
        updateTablePaymentStatus,
        convertTableOrderToTransaction,
        cancelTableOrder,
        activePendingTableOrdersCount,

        categories,
        addCategory,
        updateCategory,
        deleteCategory,

        menuItems,
        inventory,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        toggleMenuAvailability,
        addInventoryItem,
        updateInventoryItem,
        adjustStock,
        deleteInventoryItem,

        cart,
        orderType,
        tableNumber,
        customerName,
        orderNotes,
        discount,
        setOrderType,
        setTableNumber,
        setCustomerName,
        setOrderNotes,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        updateCartItemNotes,
        clearCart,
        applyDiscount,
        removeDiscount,

        cartSubtotal,
        cartDiscountAmount,
        cartTaxAmount,
        cartTotal,
        cartItemCount,

        transactions,
        completeTransaction,
        cancelTransaction,
        selectedReceipt,
        setSelectedReceipt,

        addUser,
        updateUser,
        toggleUserStatus,
        deleteUser,
        resetUserPassword,

        settings,
        updateSettings,
        resetAllData,

        exportTransactionsCSV,
        exportInventoryCSV,
        backupDatabase,
        restoreDatabase,

        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = (): POSContextType => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
