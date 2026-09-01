export type Role = 'admin' | 'cashier';

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  avatar?: string;
  phone?: string;
  active: boolean;
  pin?: string;
  password?: string;
  lastLogin?: string;
  totalTransactions?: number;
  createdAt?: string;
}

export interface Category {
  id: string; // uuid-based id for Supabase; examples: "8e8a..."
  name: string; // e.g. "Mie Aceh", "Makanan", "Minuman", "Snack"
  icon?: string;
  description?: string;
}

export type MenuCategory = string;

export type SpiceLevel = 'Biasa' | 'Sedang' | 'Pedas' | 'Super Pedas';
export type CookingStyle = 'Goreng' | 'Kuah' | 'Tumis' | 'Kering' | 'Basah' | 'Original';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  description: string;
  price: number;
  costPrice: number; // HPP (Harga Pokok Penjualan)
  image: string;
  stock: number;
  unit: string;
  isAvailable: boolean;
  isPopular?: boolean;
  spicyOptions?: boolean;
  cookingStyleOptions?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItemOption {
  spiceLevel?: SpiceLevel;
  cookingStyle?: CookingStyle;
  notes?: string;
}

export interface CartItem {
  id: string; // Unique cart item ID (combines menuId + options)
  menuId: string;
  name: string;
  price: number;
  costPrice: number;
  image: string;
  quantity: number;
  category: MenuCategory;
  options?: CartItemOption;
  subtotal: number;
}

export type OrderType = 'dine_in' | 'take_away' | 'delivery';
export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'debit';
export type TransactionStatus = 'completed' | 'cancelled';

export interface Transaction {
  id: string; // e.g. INV-20260820-0001
  invoiceNumber: string;
  createdAt: string;
  cashierId: string;
  cashierName: string;
  orderType: OrderType;
  tableNumber?: string;
  customerName?: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  discountName?: string;
  taxRate: number; // e.g. 10 for 10%
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeAmount: number;
  paymentReference?: string;
  status: TransactionStatus;
  notes?: string;
  cancelledAt?: string;
  cancelReason?: string;
  cancelledBy?: string;
}

export type StockStatus = 'safe' | 'low' | 'out_of_stock';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  lastRestocked: string;
  status: StockStatus;
  supplier?: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  logoUrl: string;
  halalCertification?: string;
  receiptHeader: string;
  receiptFooter: string;
  taxRate: number;
  enableTax: boolean;
  enableServiceCharge: boolean;
  serviceChargeRate: number;
  paperWidth: '58mm' | '80mm';
  autoPrintReceipt: boolean;
  paymentMethods: {
    cash: boolean;
    qris: boolean;
    transfer: boolean;
    debit: boolean;
  };
  qrisImageUrl?: string;
  qrisNmid?: string;
  qrisMerchantName?: string;
  qrisA01?: string;
  qrisPrintedBy?: string;
  qrisVersion?: string;
  bankAccounts?: {
    bank: string;
    accountNumber: string;
    accountName: string;
  }[];
}

export type TableOrderStatus = 'pending' | 'cooking' | 'ready' | 'completed' | 'cancelled';
export type TablePaymentStatus = 'unpaid' | 'paid_qris' | 'paid_cashier' | 'paid_transfer';
export type TableLocation = 'Area Utama' | 'Lantai 2' | 'Outdoor' | 'VIP Lesehan';

export interface TableConfig {
  id: string;
  tableNumber: string; // e.g. "Meja 01"
  tableName: string;   // e.g. "Meja Depan Bar"
  location: TableLocation;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  activeOrderId?: string;
}

export interface TableOrder {
  id: string; // e.g. "ORD-M01-8821"
  tableNumber: string;
  customerName: string;
  customerPhone?: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: TablePaymentStatus;
  orderStatus: TableOrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  paidAt?: string;
  completedAt?: string;
}
