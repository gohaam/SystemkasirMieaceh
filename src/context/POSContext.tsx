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
import { generateId, generateInvoiceNumber } from '../utils/formatters';
import { sqlite } from '../db/sqliteAdapter';
import { ExportService } from '../services/exportService';
import { BackupService } from '../services/backupService';

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
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  menuItems: MenuItem[];
  inventory: InventoryItem[];
  addMenuItem: (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
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

        setCategories(loadedCategories || []);
        setUsers(loadedUsers && loadedUsers.length > 0 ? loadedUsers : INITIAL_USERS);
        setMenuItems(loadedMenu || []);
        setInventory(loadedInv || []);
        setTransactions(loadedTx || []);
        if (loadedSettings) setSettings(loadedSettings);
        setTables(loadedTables || []);
        setTableOrders(loadedOrders || []);

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

    // 2. Save Transaction to SQLite
    await sqlite.saveTransaction(newTransaction);
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

    // Void in SQLite
    await sqlite.cancelTransaction(transactionId, reason, currentUser?.name || 'Admin');

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId
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
  const addCategory = async (category: Omit<Category, 'id'>) => {
    const id = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || generateId('cat');
    const newCategory: Category = {
      ...category,
      id,
    };
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
    const updated = { ...existing, ...updates };
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
    await sqlite.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast('Kategori berhasil dihapus', 'info');
  };

  // Menu Management
  const addMenuItem = async (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: MenuItem = {
      ...item,
      id: generateId('menu'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
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
      updatedAt: new Date().toISOString(),
    };
    await sqlite.saveProduct(updated);
    setMenuItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    showToast('Menu berhasil diperbarui', 'success');
  };

  const deleteMenuItem = async (id: string) => {
    await sqlite.deleteProduct(id);
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
    showToast('Menu berhasil dihapus', 'info');
  };

  const toggleMenuAvailability = async (id: string) => {
    const item = menuItems.find((m) => m.id === id);
    if (!item) return;
    const nextState = !item.isAvailable;
    const updated = { ...item, isAvailable: nextState, updatedAt: new Date().toISOString() };
    await sqlite.saveProduct(updated);
    setMenuItems((prev) => prev.map((m) => (m.id === id ? updated : m)));
    showToast(`${item.name} sekarang ${nextState ? 'Tersedia' : 'Habis'}`, 'info');
  };

  // Inventory Management
  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: generateId('inv'),
    };
    await sqlite.saveInventoryItem(newItem);
    setInventory((prev) => [...prev, newItem]);
    showToast(`Bahan ${newItem.name} berhasil ditambahkan!`, 'success');
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    const existing = inventory.find((i) => i.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates };
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
    };
    await sqlite.saveInventoryItem(updated);
    setInventory((prev) => prev.map((item) => (item.id === id ? updated : item)));
    showToast('Penyesuaian stok berhasil disimpan', 'success');
  };

  const deleteInventoryItem = async (id: string) => {
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
      id: generateId('tbl'),
    };
    await sqlite.saveTable(newTable);
    setTables((prev) => [...prev, newTable]);
    showToast(`Meja ${newTable.tableNumber} berhasil ditambahkan!`, 'success');
  };

  const updateTable = async (id: string, updates: Partial<TableConfig>) => {
    const existing = tables.find((t) => t.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates };
    await sqlite.saveTable(updated);
    setTables((prev) => prev.map((t) => (t.id === id ? updated : t)));
    showToast('Data meja berhasil diperbarui', 'success');
  };

  const deleteTable = async (id: string) => {
    await sqlite.deleteTable(id);
    setTables((prev) => prev.filter((t) => t.id !== id));
    showToast('Meja berhasil dihapus', 'info');
  };

  const addTableOrder = async (orderData: Omit<TableOrder, 'id' | 'createdAt'>): Promise<TableOrder> => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tableClean = orderData.tableNumber.replace(/\s+/g, '').toUpperCase();
    const orderId = `ORD-${tableClean}-${randomSuffix}`;

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

    // Save transaction to SQLite
    await sqlite.saveTransaction(newTransaction);
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
    setTableOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));

    // Free table
    const tbl = tables.find((t) => t.tableNumber.toLowerCase() === order.tableNumber.toLowerCase());
    if (tbl) {
      const updatedTbl: TableConfig = { ...tbl, status: 'available', activeOrderId: undefined };
      await sqlite.saveTable(updatedTbl);
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
    setTableOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));

    showToast(`Pesanan ${orderId} berhasil dibatalkan.`, 'info');
  };

  // User Management
  const addUser = async (user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: generateId('usr'),
      totalTransactions: 0,
    };
    await sqlite.saveUser(newUser);
    setUsers((prev) => [...prev, newUser]);
    showToast(`Karyawan ${newUser.name} berhasil ditambahkan!`, 'success');
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const existing = users.find((u) => u.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates };
    await sqlite.saveUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    if (currentUser?.id === id) {
      setCurrentUser(updated);
    }
    showToast('Data pengguna berhasil diperbarui', 'success');
  };

  const toggleUserStatus = async (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const nextActive = !target.active;
    const updated = { ...target, active: nextActive };
    await sqlite.saveUser(updated);
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
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    showToast(`Password / PIN pengguna ${existing.name} berhasil direset!`, 'success');
  };

  const deleteUser = async (id: string) => {
    if (currentUser?.id === id) {
      showToast('Tidak dapat menghapus akun yang sedang login.', 'error');
      return;
    }
    await sqlite.deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    showToast('Pengguna berhasil dihapus dari database', 'info');
  };

  // Settings
  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    const updated = { ...settings, ...newSettings };
    await sqlite.saveSettings(updated);
    setSettings(updated);
    showToast('Pengaturan warung berhasil disimpan!', 'success');
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
