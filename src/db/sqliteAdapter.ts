import {
  MenuItem,
  InventoryItem,
  User,
  StoreSettings,
  Transaction,
  CartItem,
  TableConfig,
  TableOrder,
  TableOrderStatus,
  TablePaymentStatus,
  PaymentMethod,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_USERS,
  INITIAL_MENU_ITEMS,
  INITIAL_INVENTORY,
  INITIAL_STORE_SETTINGS,
  INITIAL_TABLES,
  INITIAL_TABLE_ORDERS,
  generateSeedTransactions,
} from '../data/initialData';
import { hashPassword, verifyPasswordHash } from '../utils/crypto';

// Electron IPC API type definition
declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      dbQuery: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
      dbExecute: (sql: string, params?: any[]) => Promise<{ changes: number; lastInsertRowid: number | bigint }>;
      dbTransaction: (queries: { sql: string; params?: any[] }[]) => Promise<boolean>;
      saveBackupDialog: (defaultFilename: string) => Promise<{ canceled: boolean; filePath?: string }>;
      restoreBackupDialog: () => Promise<{ canceled: boolean; filePath?: string; fileContent?: string }>;
      exportDatabase: () => Promise<string>;
      importDatabase: (dbSqlData: string) => Promise<boolean>;
      printReceipt: (receiptHtml: string, options?: { silent?: boolean; deviceName?: string }) => Promise<boolean>;
      getAppVersion: () => Promise<string>;
      getAppPlatform: () => Promise<string>;
    };
  }
}

const STORAGE_PREFIX = 'mie_pos_v7_menu_';
const ADMIN_RECOVERY_KEY = STORAGE_PREFIX + 'admin_recovery_v1';

export interface CategoryRecord {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  todaySales: number;
  todayTransactionsCount: number;
  todayItemsSold: number;
  todayNetRevenue: number;
  todayProfit: number;
  lowStockItemsCount: number;
  topSellingProducts: { name: string; quantity: number; revenue: number }[];
  hourlySales: { hour: string; total: number }[];
}

export class SQLiteAdapter {
  private static instance: SQLiteAdapter;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): SQLiteAdapter {
    if (!SQLiteAdapter.instance) {
      SQLiteAdapter.instance = new SQLiteAdapter();
    }
    return SQLiteAdapter.instance;
  }

  public isElectronEnvironment(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
  }

  /**
   * Initializes database schema and default seeds
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (this.isElectronEnvironment()) {
      // Electron native SQLite is initialized automatically via main.cjs
      console.log('Running in Electron native SQLite mode');
    } else {
      // Local storage fallback engine with full SQLite table structure
      await this.initLocalStorageEngine();
    }

    await this.ensureDefaultAdminAccount();
    this.isInitialized = true;
  }

  private async ensureDefaultAdminAccount(): Promise<void> {
    const users = await this.getUsers();
    const existingAdmin = users.find((user) => user.username.toLowerCase() === 'admin' && user.active);

    if (existingAdmin) return;

    const defaultAdmin = users.find((user) => user.id === 'usr_admin_1');

    if (defaultAdmin) {
      const restoredAdmin: User = {
        ...defaultAdmin,
        name: 'Administrator',
        username: 'admin',
        pin: 'admin123',
        password: 'admin123',
        role: 'admin',
        active: true,
      };
      await this.saveUser(restoredAdmin);
      localStorage.setItem(ADMIN_RECOVERY_KEY, 'completed');
      return;
    }

    await this.saveUser({
      id: 'usr_admin_1',
      name: 'Administrator',
      username: 'admin',
      password: 'admin123',
      pin: 'admin123',
      role: 'admin',
      active: true,
      phone: '',
      lastLogin: undefined,
      totalTransactions: 0,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(ADMIN_RECOVERY_KEY, 'completed');
  }

  private async initLocalStorageEngine(): Promise<void> {
    // 1. Categories - Starts completely empty
    if (!localStorage.getItem(STORAGE_PREFIX + 'categories')) {
      localStorage.setItem(STORAGE_PREFIX + 'categories', JSON.stringify(INITIAL_CATEGORIES));
    }

    // 2. Users with hashed passwords - Only Admin user
    if (!localStorage.getItem(STORAGE_PREFIX + 'users')) {
      const seededUsers = await Promise.all(
        INITIAL_USERS.map(async (u) => {
          const passwordHash = await hashPassword(u.pin || '1234');
          return {
            ...u,
            password_hash: passwordHash,
          };
        })
      );
      localStorage.setItem(STORAGE_PREFIX + 'users', JSON.stringify(seededUsers));
    }

    // 3. Products - Starts empty
    if (!localStorage.getItem(STORAGE_PREFIX + 'products')) {
      localStorage.setItem(STORAGE_PREFIX + 'products', JSON.stringify(INITIAL_MENU_ITEMS));
    }

    // 4. Inventory - Starts empty
    if (!localStorage.getItem(STORAGE_PREFIX + 'inventory')) {
      localStorage.setItem(STORAGE_PREFIX + 'inventory', JSON.stringify(INITIAL_INVENTORY));
    }

    // 5. Transactions - Starts empty
    if (!localStorage.getItem(STORAGE_PREFIX + 'transactions')) {
      localStorage.setItem(STORAGE_PREFIX + 'transactions', JSON.stringify([]));
    }

    // 6. Settings
    if (!localStorage.getItem(STORAGE_PREFIX + 'store_settings')) {
      localStorage.setItem(STORAGE_PREFIX + 'store_settings', JSON.stringify(INITIAL_STORE_SETTINGS));
    }

    // 7. Tables - Starts empty
    const tablesKey = STORAGE_PREFIX + 'tables';
    const savedTables = localStorage.getItem(tablesKey);
    if (!savedTables) {
      localStorage.setItem(tablesKey, JSON.stringify(INITIAL_TABLES));
    } else {
      try {
        const parsedTables = JSON.parse(savedTables);
        const hasLegacySeedTables =
          Array.isArray(parsedTables) &&
          parsedTables.length > 0 &&
          parsedTables.every((table) => {
            const tableNumber = table?.tableNumber ?? '';
            return typeof tableNumber === 'string' && /^Meja\s+0?\d+$/.test(tableNumber);
          });

        if (hasLegacySeedTables) {
          localStorage.setItem(tablesKey, JSON.stringify([]));
        }
      } catch (error) {
        console.warn('Failed to normalize saved tables data:', error);
      }
    }

    // 8. Table Orders - Starts empty
    if (!localStorage.getItem(STORAGE_PREFIX + 'table_orders')) {
      localStorage.setItem(STORAGE_PREFIX + 'table_orders', JSON.stringify(INITIAL_TABLE_ORDERS));
    }
  }

  // =========================================================================
  // CATEGORIES
  // =========================================================================
  public async getCategories(): Promise<CategoryRecord[]> {
    if (this.isElectronEnvironment()) {
      return await window.electronAPI!.dbQuery<CategoryRecord>('SELECT * FROM categories ORDER BY name ASC');
    }
    const raw = localStorage.getItem(STORAGE_PREFIX + 'categories');
    return raw ? JSON.parse(raw) : [];
  }

  public async saveCategory(category: CategoryRecord): Promise<void> {
    if (this.isElectronEnvironment()) {
      await window.electronAPI!.dbExecute(
        'INSERT INTO categories (id, name, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, updated_at=excluded.updated_at',
        [category.id, category.name, category.created_at, category.updated_at]
      );
      return;
    }
    const cats = await this.getCategories();
    const idx = cats.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      cats[idx] = category;
    } else {
      cats.push(category);
    }
    localStorage.setItem(STORAGE_PREFIX + 'categories', JSON.stringify(cats));
  }

  public async deleteCategory(id: string): Promise<void> {
    if (this.isElectronEnvironment()) {
      await window.electronAPI!.dbExecute('DELETE FROM categories WHERE id = ?', [id]);
      return;
    }
    const cats = await this.getCategories();
    const filtered = cats.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_PREFIX + 'categories', JSON.stringify(filtered));
  }

  // =========================================================================
  // PRODUCTS / MENU ITEMS
  // =========================================================================
  public async getProducts(includeInactive = false): Promise<MenuItem[]> {
    if (this.isElectronEnvironment()) {
      const sql = includeInactive
        ? 'SELECT * FROM products ORDER BY name ASC'
        : 'SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC';
      const rows = await window.electronAPI!.dbQuery<any>(sql);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        price: r.price,
        costPrice: r.cost_price,
        stock: r.stock,
        unit: r.unit,
        description: r.description,
        image: r.image,
        isAvailable: Boolean(r.is_active && r.stock > 0),
        isPopular: Boolean(r.is_popular),
        spicyOptions: Boolean(r.spicy_options),
        cookingStyleOptions: Boolean(r.cooking_style_options),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }

    const raw = localStorage.getItem(STORAGE_PREFIX + 'products');
    const items: MenuItem[] = raw ? JSON.parse(raw) : INITIAL_MENU_ITEMS;
    return includeInactive ? items : items.filter((i) => i.isAvailable !== false);
  }

  public async saveProduct(item: MenuItem): Promise<void> {
    if (this.isElectronEnvironment()) {
      await window.electronAPI!.dbExecute(
        `INSERT INTO products (id, name, category, price, cost_price, stock, unit, description, image, is_active, is_popular, spicy_options, cooking_style_options, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, category=excluded.category, price=excluded.price, cost_price=excluded.cost_price,
           stock=excluded.stock, unit=excluded.unit, description=excluded.description, image=excluded.image,
           is_active=excluded.is_active, is_popular=excluded.is_popular, spicy_options=excluded.spicy_options,
           cooking_style_options=excluded.cooking_style_options, updated_at=excluded.updated_at`,
        [
          item.id,
          item.name,
          item.category,
          item.price,
          item.costPrice,
          item.stock,
          item.unit || 'Porsi',
          item.description || '',
          item.image || '',
          item.isAvailable ? 1 : 0,
          item.isPopular ? 1 : 0,
          item.spicyOptions ? 1 : 0,
          item.cookingStyleOptions ? 1 : 0,
          item.createdAt,
          item.updatedAt,
        ]
      );
      return;
    }

    const raw = localStorage.getItem(STORAGE_PREFIX + 'products');
    const items: MenuItem[] = raw ? JSON.parse(raw) : [];
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.unshift(item);
    }
    localStorage.setItem(STORAGE_PREFIX + 'products', JSON.stringify(items));
  }

  public async deleteProduct(id: string): Promise<void> {
    if (this.isElectronEnvironment()) {
      // Soft delete to protect transaction history
      await window.electronAPI!.dbExecute('UPDATE products SET is_active = 0, updated_at = datetime("now") WHERE id = ?', [id]);
      return;
    }
    const raw = localStorage.getItem(STORAGE_PREFIX + 'products');
    const items: MenuItem[] = raw ? JSON.parse(raw) : [];
    const filtered = items.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_PREFIX + 'products', JSON.stringify(filtered));
  }

  public async deductStock(itemsToDeduct: { productId: string; quantity: number }[]): Promise<void> {
    if (this.isElectronEnvironment()) {
      const queries = itemsToDeduct.map((item) => ({
        sql: 'UPDATE products SET stock = MAX(0, stock - ?), updated_at = datetime("now") WHERE id = ?',
        params: [item.quantity, item.productId],
      }));
      await window.electronAPI!.dbTransaction(queries);
      return;
    }

    const raw = localStorage.getItem(STORAGE_PREFIX + 'products');
    const items: MenuItem[] = raw ? JSON.parse(raw) : [];
    const updated = items.map((m) => {
      const match = itemsToDeduct.find((d) => d.productId === m.id);
      if (match) {
        const newStock = Math.max(0, m.stock - match.quantity);
        return { ...m, stock: newStock, isAvailable: newStock > 0 };
      }
      return m;
    });
    localStorage.setItem(STORAGE_PREFIX + 'products', JSON.stringify(updated));
  }

  public async restockProduct(productId: string, quantity: number): Promise<void> {
    if (this.isElectronEnvironment()) {
      await window.electronAPI!.dbExecute(
        'UPDATE products SET stock = stock + ?, is_active = 1, updated_at = datetime("now") WHERE id = ?',
        [quantity, productId]
      );
      return;
    }

    const raw = localStorage.getItem(STORAGE_PREFIX + 'products');
    const items: MenuItem[] = raw ? JSON.parse(raw) : [];
    const updated = items.map((m) => {
      if (m.id === productId) {
        const newStock = m.stock + quantity;
        return { ...m, stock: newStock, isAvailable: true };
      }
      return m;
    });
    localStorage.setItem(STORAGE_PREFIX + 'products', JSON.stringify(updated));
  }

  // =========================================================================
  // USERS & AUTHENTICATION
  // =========================================================================
  public async getUsers(): Promise<User[]> {
    if (this.isElectronEnvironment()) {
      const rows = await window.electronAPI!.dbQuery<any>('SELECT * FROM users ORDER BY role ASC, name ASC');
      return rows.map((r) => ({
        id: r.id,
        username: r.username,
        name: r.name,
        role: r.role,
        avatar: r.avatar,
        phone: r.phone,
        pin: r.pin,
        active: Boolean(r.active),
        lastLogin: r.last_login,
        totalTransactions: r.total_transactions,
      }));
    }

    const raw = localStorage.getItem(STORAGE_PREFIX + 'users');
    return raw ? JSON.parse(raw) : INITIAL_USERS;
  }

  public async saveUser(user: User): Promise<void> {
    const passwordHash = await hashPassword(user.pin || '1234');
    if (this.isElectronEnvironment()) {
      await window.electronAPI!.dbExecute(
        `INSERT INTO users (id, username, password_hash, name, role, avatar, phone, pin, active, last_login, total_transactions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           username=excluded.username, password_hash=excluded.password_hash, name=excluded.name,
           role=excluded.role, avatar=excluded.avatar, phone=excluded.phone, pin=excluded.pin,
           active=excluded.active, last_login=excluded.last_login, total_transactions=excluded.total_transactions`,
        [
          user.id,
          user.username,
          passwordHash,
          user.name,
          user.role,
          user.avatar || '',
          user.phone || '',
          user.pin || '1234',
          user.active ? 1 : 0,
          user.lastLogin || null,
          user.totalTransactions || 0,
        ]
      );
      return;
    }

    const users = await this.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      users[idx] = { ...user, pin: user.pin || '1234' };
    } else {
      users.push({ ...user, pin: user.pin || '1234' });
    }
    localStorage.setItem(STORAGE_PREFIX + 'users', JSON.stringify(users));
  }

  public async deleteUser(userId: string): Promise<void> {
    if (this.isElectronEnvironment()) {
      await window.electronAPI!.dbExecute('DELETE FROM users WHERE id = ?', [userId]);
      return;
    }
    const users = await this.getUsers();
    const filtered = users.filter((u) => u.id !== userId);
    localStorage.setItem(STORAGE_PREFIX + 'users', JSON.stringify(filtered));
  }

  public async verifyLogin(username: string, pin: string, roleRequired?: 'admin' | 'cashier'): Promise<User | null> {
    const users = await this.getUsers();
    const cleanUser = username.toLowerCase().trim();
    const cleanPin = pin.trim();

    const user = users.find(
      (u) =>
        u.username.toLowerCase() === cleanUser &&
        (u.pin === cleanPin ||
          u.password === cleanPin ||
          !u.pin)
    );

    if (!user || !user.active) return null;
    if (roleRequired && user.role !== roleRequired) return null;

    // Update last login
    user.lastLogin = new Date().toISOString();
    await this.saveUser(user);

    return user;
  }

  // =========================================================================
  // TRANSACTIONS
  // =========================================================================
  public async getTransactions(): Promise<Transaction[]> {
    if (this.isElectronEnvironment()) {
      const txRows = await window.electronAPI!.dbQuery<any>(
        'SELECT * FROM transactions ORDER BY created_at DESC'
      );
      const itemsRows = await window.electronAPI!.dbQuery<any>(
        'SELECT * FROM transaction_items ORDER BY id ASC'
      );

      const itemsByTxId: Record<string, CartItem[]> = {};
      itemsRows.forEach((item) => {
        if (!itemsByTxId[item.transaction_id]) {
          itemsByTxId[item.transaction_id] = [];
        }
        itemsByTxId[item.transaction_id].push({
          id: item.id,
          menuId: item.product_id,
          name: item.product_name,
          price: item.price,
          costPrice: item.cost_price,
          quantity: item.quantity,
          category: item.category as any,
          image: '',
          options: {
            cookingStyle: item.cooking_style || undefined,
            spiceLevel: item.spice_level || undefined,
            notes: item.notes || undefined,
          },
          subtotal: item.subtotal,
        });
      });

      return txRows.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoice_number,
        createdAt: r.created_at,
        cashierId: r.cashier_id,
        cashierName: r.cashier_name,
        orderType: r.order_type,
        tableNumber: r.table_number || undefined,
        customerName: r.customer_name || undefined,
        items: itemsByTxId[r.id] || [],
        itemCount: r.item_count,
        subtotal: r.subtotal,
        discountType: r.discount_type,
        discountValue: r.discount_value,
        discountAmount: r.discount_amount,
        discountName: r.discount_name || undefined,
        taxRate: r.tax_rate,
        taxAmount: r.tax_amount,
        total: r.total,
        paymentMethod: r.payment_method,
        amountPaid: r.amount_paid,
        changeAmount: r.change_amount,
        paymentReference: r.payment_reference || undefined,
        status: r.status,
        notes: r.notes || undefined,
        cancelledAt: r.cancelled_at || undefined,
        cancelReason: r.cancel_reason || undefined,
        cancelledBy: r.cancelled_by || undefined,
      }));
    }

    const raw = localStorage.getItem(STORAGE_PREFIX + 'transactions');
    return raw ? JSON.parse(raw) : [];
  }

  public async saveTransaction(tx: Transaction): Promise<void> {
    if (this.isElectronEnvironment()) {
      const queries = [
        {
          sql: `INSERT INTO transactions (
            id, invoice_number, transaction_date, cashier_id, cashier_name, order_type,
            table_number, customer_name, item_count, subtotal, discount_type, discount_value,
            discount_amount, discount_name, tax_rate, tax_amount, total, payment_method,
            amount_paid, change_amount, payment_reference, status, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params: [
            tx.id,
            tx.invoiceNumber,
            tx.createdAt,
            tx.cashierId,
            tx.cashierName,
            tx.orderType,
            tx.tableNumber || null,
            tx.customerName || null,
            tx.itemCount,
            tx.subtotal,
            tx.discountType,
            tx.discountValue,
            tx.discountAmount,
            tx.discountName || null,
            tx.taxRate,
            tx.taxAmount,
            tx.total,
            tx.paymentMethod,
            tx.amountPaid,
            tx.changeAmount,
            tx.paymentReference || null,
            tx.status,
            tx.notes || null,
            tx.createdAt,
          ],
        },
        ...tx.items.map((item, idx) => ({
          sql: `INSERT INTO transaction_items (
            id, transaction_id, product_id, product_name, price, cost_price, quantity,
            category, cooking_style, spice_level, notes, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params: [
            `${tx.id}_item_${idx + 1}`,
            tx.id,
            item.menuId,
            item.name,
            item.price,
            item.costPrice || item.price * 0.6,
            item.quantity,
            item.category || '',
            item.options?.cookingStyle || '',
            item.options?.spiceLevel || '',
            item.options?.notes || '',
            item.subtotal,
          ],
        })),
        {
          sql: 'UPDATE users SET total_transactions = total_transactions + 1 WHERE id = ?',
          params: [tx.cashierId],
        },
      ];

      await window.electronAPI!.dbTransaction(queries);
      return;
    }

    const txs = await this.getTransactions();
    txs.unshift(tx);
    localStorage.setItem(STORAGE_PREFIX + 'transactions', JSON.stringify(txs));
  }

  public async cancelTransaction(transactionId: string, reason: string, cancelledBy: string): Promise<boolean> {
    if (this.isElectronEnvironment()) {
      await window.electronAPI!.dbExecute(
        `UPDATE transactions SET
           status = 'cancelled',
           cancelled_at = datetime('now'),
           cancel_reason = ?,
           cancelled_by = ?
         WHERE id = ?`,
        [reason, cancelledBy, transactionId]
      );
      return true;
    }

    const txs = await this.getTransactions();
    const updated = txs.map((t) =>
      t.id === transactionId
        ? {
            ...t,
            status: 'cancelled' as const,
            cancelledAt: new Date().toISOString(),
            cancelReason: reason,
            cancelledBy,
          }
        : t
    );
    localStorage.setItem(STORAGE_PREFIX + 'transactions', JSON.stringify(updated));
    return true;
  }

  // =========================================================================
  // INVENTORY
  // =========================================================================
  public async getInventory(): Promise<InventoryItem[]> {
    if (this.isElectronEnvironment()) {
      const rows = await window.electronAPI!.dbQuery<any>('SELECT * FROM inventory ORDER BY name ASC');
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        currentStock: r.current_stock,
        unit: r.unit,
        minStock: r.min_stock,
        costPerUnit: r.cost_per_unit,
        lastRestocked: r.last_restocked,
        status: r.status,
        supplier: r.supplier,
      }));
    }

    const raw = localStorage.getItem(STORAGE_PREFIX + 'inventory');
    return raw ? JSON.parse(raw) : INITIAL_INVENTORY;
  }

  public async saveInventoryItem(item: InventoryItem): Promise<void> {
    if (this.isElectronEnvironment()) {
      await window.electronAPI!.dbExecute(
        `INSERT INTO inventory (id, name, category, current_stock, unit, min_stock, cost_per_unit, last_restocked, status, supplier)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, category=excluded.category, current_stock=excluded.current_stock,
           unit=excluded.unit, min_stock=excluded.min_stock, cost_per_unit=excluded.cost_per_unit,
           last_restocked=excluded.last_restocked, status=excluded.status, supplier=excluded.supplier`,
        [
          item.id,
          item.name,
          item.category,
          item.currentStock,
          item.unit,
          item.minStock,
          item.costPerUnit,
          item.lastRestocked,
          item.status,
          item.supplier || '',
        ]
      );
      return;
    }

    const inv = await this.getInventory();
    const idx = inv.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      inv[idx] = item;
    } else {
      inv.push(item);
    }
    localStorage.setItem(STORAGE_PREFIX + 'inventory', JSON.stringify(inv));
  }

  public async deleteInventoryItem(id: string): Promise<void> {
    if (this.isElectronEnvironment()) {
      await window.electronAPI!.dbExecute('DELETE FROM inventory WHERE id = ?', [id]);
      return;
    }
    const inv = await this.getInventory();
    const filtered = inv.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_PREFIX + 'inventory', JSON.stringify(filtered));
  }

  // =========================================================================
  // STORE SETTINGS
  // =========================================================================
  public async getSettings(): Promise<StoreSettings> {
    if (this.isElectronEnvironment()) {
      const rows = await window.electronAPI!.dbQuery<any>(
        'SELECT settings_json FROM store_settings WHERE id = "primary_store_config"'
      );
      if (rows.length > 0 && rows[0].settings_json) {
        return JSON.parse(rows[0].settings_json);
      }
    }

    const raw = localStorage.getItem(STORAGE_PREFIX + 'store_settings');
    return raw ? JSON.parse(raw) : INITIAL_STORE_SETTINGS;
  }

  public async saveSettings(settings: StoreSettings): Promise<void> {
    if (this.isElectronEnvironment()) {
      await window.electronAPI!.dbExecute(
        `INSERT INTO store_settings (id, settings_json, updated_at)
         VALUES ('primary_store_config', ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET settings_json=excluded.settings_json, updated_at=excluded.updated_at`,
        [JSON.stringify(settings)]
      );
      return;
    }
    localStorage.setItem(STORAGE_PREFIX + 'store_settings', JSON.stringify(settings));
  }

  // =========================================================================
  // RESTAURANT TABLES & SELF-ORDER
  // =========================================================================
  public async getTables(): Promise<TableConfig[]> {
    if (this.isElectronEnvironment()) {
      const rows = await window.electronAPI!.dbQuery<any>('SELECT * FROM tables ORDER BY table_number ASC');
      return rows.map((r) => ({
        id: r.id,
        tableNumber: r.table_number,
        tableName: r.table_name,
        location: r.location,
        capacity: r.capacity,
        status: r.status,
        activeOrderId: r.active_order_id || undefined,
      }));
    }
    const raw = localStorage.getItem(STORAGE_PREFIX + 'tables');
    return raw ? JSON.parse(raw) : INITIAL_TABLES;
  }

  public async saveTable(table: TableConfig): Promise<void> {
    if (this.isElectronEnvironment()) {
      await window.electronAPI!.dbExecute(
        `INSERT INTO tables (id, table_number, table_name, location, capacity, status, active_order_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           table_number=excluded.table_number, table_name=excluded.table_name, location=excluded.location,
           capacity=excluded.capacity, status=excluded.status, active_order_id=excluded.active_order_id`,
        [
          table.id,
          table.tableNumber,
          table.tableName,
          table.location,
          table.capacity,
          table.status,
          table.activeOrderId || null,
        ]
      );
      return;
    }
    const tables = await this.getTables();
    const idx = tables.findIndex((t) => t.id === table.id);
    if (idx >= 0) tables[idx] = table;
    else tables.push(table);
    localStorage.setItem(STORAGE_PREFIX + 'tables', JSON.stringify(tables));
  }

  public async deleteTable(id: string): Promise<void> {
    if (this.isElectronEnvironment()) {
      await window.electronAPI!.dbExecute('DELETE FROM tables WHERE id = ?', [id]);
      return;
    }
    const tables = await this.getTables();
    localStorage.setItem(STORAGE_PREFIX + 'tables', JSON.stringify(tables.filter((t) => t.id !== id)));
  }

  public async getTableOrders(): Promise<TableOrder[]> {
    if (this.isElectronEnvironment()) {
      const rows = await window.electronAPI!.dbQuery<any>('SELECT * FROM table_orders ORDER BY created_at DESC');
      return rows.map((r) => ({
        id: r.id,
        tableNumber: r.table_number,
        customerName: r.customer_name,
        customerPhone: r.customer_phone || undefined,
        items: JSON.parse(r.items_json || '[]'),
        itemCount: r.item_count,
        subtotal: r.subtotal,
        taxAmount: r.tax_amount,
        total: r.total,
        paymentMethod: r.payment_method,
        paymentStatus: r.payment_status,
        orderStatus: r.order_status,
        notes: r.notes || undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at || undefined,
        paidAt: r.paid_at || undefined,
        completedAt: r.completed_at || undefined,
      }));
    }
    const raw = localStorage.getItem(STORAGE_PREFIX + 'table_orders');
    return raw ? JSON.parse(raw) : INITIAL_TABLE_ORDERS;
  }

  public async saveTableOrder(order: TableOrder): Promise<void> {
    if (this.isElectronEnvironment()) {
      await window.electronAPI!.dbExecute(
        `INSERT INTO table_orders (
           id, table_number, customer_name, customer_phone, items_json, item_count,
           subtotal, tax_amount, total, payment_method, payment_status, order_status,
           notes, created_at, updated_at, paid_at, completed_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           table_number=excluded.table_number, customer_name=excluded.customer_name,
           customer_phone=excluded.customer_phone, items_json=excluded.items_json,
           item_count=excluded.item_count, subtotal=excluded.subtotal, tax_amount=excluded.tax_amount,
           total=excluded.total, payment_method=excluded.payment_method,
           payment_status=excluded.payment_status, order_status=excluded.order_status,
           notes=excluded.notes, updated_at=excluded.updated_at, paid_at=excluded.paid_at,
           completed_at=excluded.completed_at`,
        [
          order.id,
          order.tableNumber,
          order.customerName,
          order.customerPhone || null,
          JSON.stringify(order.items),
          order.itemCount,
          order.subtotal,
          order.taxAmount,
          order.total,
          order.paymentMethod,
          order.paymentStatus,
          order.orderStatus,
          order.notes || null,
          order.createdAt,
          order.updatedAt || null,
          order.paidAt || null,
          order.completedAt || null,
        ]
      );
      return;
    }
    const orders = await this.getTableOrders();
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) orders[idx] = order;
    else orders.unshift(order);
    localStorage.setItem(STORAGE_PREFIX + 'table_orders', JSON.stringify(orders));
  }

  // =========================================================================
  // BACKUP & RESTORE
  // =========================================================================
  public async exportFullDatabaseDump(): Promise<string> {
    if (this.isElectronEnvironment()) {
      return await window.electronAPI!.exportDatabase();
    }

    // Comprehensive JSON SQL snapshot
    const snapshot = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      store: await this.getSettings(),
      categories: await this.getCategories(),
      users: await this.getUsers(),
      products: await this.getProducts(true),
      inventory: await this.getInventory(),
      transactions: await this.getTransactions(),
      tables: await this.getTables(),
      tableOrders: await this.getTableOrders(),
    };

    return JSON.stringify(snapshot, null, 2);
  }

  public async importFullDatabaseDump(dumpContent: string): Promise<boolean> {
    try {
      if (this.isElectronEnvironment()) {
        return await window.electronAPI!.importDatabase(dumpContent);
      }

      const data = JSON.parse(dumpContent);
      if (!data.categories || !data.products || !data.transactions) {
        throw new Error('Format file backup database tidak valid.');
      }

      localStorage.setItem(STORAGE_PREFIX + 'categories', JSON.stringify(data.categories));
      localStorage.setItem(STORAGE_PREFIX + 'users', JSON.stringify(data.users || []));
      localStorage.setItem(STORAGE_PREFIX + 'products', JSON.stringify(data.products || []));
      localStorage.setItem(STORAGE_PREFIX + 'inventory', JSON.stringify(data.inventory || []));
      localStorage.setItem(STORAGE_PREFIX + 'transactions', JSON.stringify(data.transactions || []));
      localStorage.setItem(STORAGE_PREFIX + 'store_settings', JSON.stringify(data.store || INITIAL_STORE_SETTINGS));
      localStorage.setItem(STORAGE_PREFIX + 'tables', JSON.stringify(data.tables || INITIAL_TABLES));
      localStorage.setItem(STORAGE_PREFIX + 'table_orders', JSON.stringify(data.tableOrders || INITIAL_TABLE_ORDERS));

      return true;
    } catch (err) {
      console.error('Failed to restore backup database:', err);
      return false;
    }
  }
}

export const sqlite = SQLiteAdapter.getInstance();
