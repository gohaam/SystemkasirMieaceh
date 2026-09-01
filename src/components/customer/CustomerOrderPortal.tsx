import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { MenuItem, MenuCategory, CartItem, CartItemOption, PaymentMethod, TableOrder } from '../../types';
import { CustomerItemCustomizerModal } from './CustomerItemCustomizerModal';
import { CustomerOrderSuccess } from './CustomerOrderSuccess';
import { DEFAULT_MENU_IMAGE, formatCurrency } from '../../utils/formatters';
import {
  Utensils,
  Search,
  ShoppingBag,
  Flame,
  Plus,
  Minus,
  Trash2,
  X,
  QrCode,
  Sparkles,
  ArrowLeft,
  ChefHat,
  Smartphone,
  CreditCard,
  Banknote,
  Building,
  CheckCircle2,
  Phone,
  User,
  Info,
} from 'lucide-react';

interface CustomerOrderPortalProps {
  initialTableNumber?: string;
}

export const CustomerOrderPortal: React.FC<CustomerOrderPortalProps> = ({
  initialTableNumber = '',
}) => {
  const {
    menuItems,
    categories: storedCategories,
    settings,
    tables,
    addTableOrder,
    activeCustomerTable,
    tableOrders,
    showToast,
  } = usePOS();

  // Current Table
  const currentTableNumber = activeCustomerTable || initialTableNumber;
  const currentTableConfig = tables.find(
    (t) => t.tableNumber.toLowerCase() === currentTableNumber.toLowerCase()
  );

  // Search & Category Filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart State for Customer
  const [customerCart, setCustomerCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Item customizer modal
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);

  // Customer Checkout Form
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');

  // Completed Order for Live Tracking
  const [submittedOrder, setSubmittedOrder] = useState<TableOrder | null>(null);

  // Find if there is an active existing order for this table
  const existingActiveOrder = useMemo(() => {
    return tableOrders.find(
      (o) =>
        o.tableNumber.toLowerCase() === currentTableNumber.toLowerCase() &&
        (o.orderStatus === 'pending' || o.orderStatus === 'cooking' || o.orderStatus === 'ready')
    );
  }, [tableOrders, currentTableNumber]);

  // Categories definition
  const categories = useMemo(() => {
    const list = [{ id: 'all', label: 'Semua Menu' }];
    if (storedCategories && storedCategories.length > 0) {
      storedCategories.forEach((cat) => {
        list.push({ id: cat.id, label: `${cat.icon ? cat.icon + ' ' : ''}${cat.name}` });
      });
    }
    return list;
  }, [storedCategories]);

  // Filter menu
  const filteredMenu = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart Calculations
  const cartSubtotal = customerCart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartTaxAmount = settings.enableTax ? Math.round(cartSubtotal * (settings.taxRate / 100)) : 0;
  const cartTotal = cartSubtotal + cartTaxAmount;
  const cartItemCount = customerCart.reduce((sum, item) => sum + item.quantity, 0);

  // Add Item to Customer Cart
  const handleAddToCart = (item: MenuItem, options: CartItemOption, quantity: number) => {
    const cartItemId = `${item.id}_${options.cookingStyle || ''}_${options.spiceLevel || ''}_${options.notes || ''}`;

    setCustomerCart((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === cartItemId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + quantity;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          subtotal: newQty * item.price,
        };
        return updated;
      } else {
        const newCartItem: CartItem = {
          id: cartItemId,
          menuId: item.id,
          name: item.name,
          price: item.price,
          costPrice: item.costPrice,
          image: item.image,
          quantity: quantity,
          category: item.category,
          options: options,
          subtotal: quantity * item.price,
        };
        return [...prev, newCartItem];
      }
    });

    showToast(`${quantity}x ${item.name} dimasukkan ke keranjang!`, 'success');
  };

  const updateCartQty = (cartItemId: string, delta: number) => {
    setCustomerCart((prev) =>
      prev
        .map((c) => {
          if (c.id === cartItemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty, subtotal: newQty * c.price } : null;
          }
          return c;
        })
        .filter((c): c is CartItem => c !== null)
    );
  };

  const removeCartItem = (cartItemId: string) => {
    setCustomerCart((prev) => prev.filter((c) => c.id !== cartItemId));
  };

  // Submit Order to Kitchen/POS
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerCart.length === 0) {
      showToast('Keranjang pesanan masih kosong.', 'error');
      return;
    }
    if (!customerName.trim()) {
      showToast('Mohon masukkan nama pemesan.', 'error');
      return;
    }

    const newOrder = addTableOrder({
      tableNumber: currentTableNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      items: customerCart,
      itemCount: cartItemCount,
      subtotal: cartSubtotal,
      taxAmount: cartTaxAmount,
      total: cartTotal,
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'qris' ? 'paid_qris' : paymentMethod === 'transfer' ? 'paid_transfer' : 'paid_cashier',
      orderStatus: 'pending',
      notes: orderNotes.trim() || undefined,
    });

    setSubmittedOrder(newOrder);
    setCustomerCart([]);
    setIsCartOpen(false);
  };

  // If user already submitted order or has existing active order, view success screen
  const activeOrderToTrack = submittedOrder || existingActiveOrder;
  if (activeOrderToTrack) {
    return (
      <CustomerOrderSuccess
        order={activeOrderToTrack}
        settings={settings}
        onOrderMore={() => {
          setSubmittedOrder(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-[#1C1917] flex flex-col pb-28">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-[#FFFDF7]/95 backdrop-blur-md border-b border-[#E7E5E4] px-4 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#166534] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
              MI
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base text-[#166534] leading-tight">
                {settings.storeName}
              </h1>
              <p className="text-[11px] text-[#78716C] truncate max-w-[180px] sm:max-w-xs">
                {settings.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Table Badge */}
            <div className="bg-[#166534] text-white px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs">
              <QrCode className="w-3.5 h-3.5" />
              <span>{currentTableNumber}</span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Menu Body */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* Banner */}
        <div className="bg-gradient-to-r from-[#166534] to-[#14532d] rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-md space-y-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-stone-900">
              <Sparkles className="w-3 h-3" /> Resep Asli Khas Ulee Kareng
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Selamat Menikmati di {currentTableNumber}
            </h2>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              Pilih menu favorit Anda, atur tingkat kepedasan & gaya masak, lalu bayar instan via QRIS atau tunai di kasir.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#78716C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Mie Kepiting, Nasi Goreng, Teh Tarik..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl text-xs sm:text-sm text-[#1C1917] placeholder:text-[#78716C] shadow-xs focus:outline-none focus:border-[#166534]"
          />
        </div>

        {/* Category Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
                selectedCategory === cat.id
                  ? 'bg-[#166534] text-white scale-102'
                  : 'bg-white text-[#78716C] hover:text-[#1C1917] border border-[#E7E5E4]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Food Menu Items Grid */}
        {filteredMenu.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-[#E7E5E4] space-y-3">
            <Utensils className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="font-bold text-sm text-[#1C1917]">Belum Ada Menu Tersedia</h3>
            <p className="text-xs text-[#78716C] max-w-xs mx-auto">
              Daftar menu sedang diperbarui oleh pihak warung. Silakan hubungi kasir atau pelayan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMenu.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-[#E7E5E4] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="relative h-44 bg-stone-100 overflow-hidden">
                    <img
                      src={item.image || DEFAULT_MENU_IMAGE}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.isPopular && (
                      <span className="absolute top-3 left-3 bg-[#DC2626] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
                        Best Seller 🔥
                      </span>
                    )}
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center text-white text-xs font-black uppercase">
                        Habis Terjual
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-1.5">
                    <h3 className="font-bold text-sm text-[#1C1917] leading-snug group-hover:text-[#166534] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#78716C] line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center justify-between gap-2 mt-2">
                  <div>
                    <span className="text-[10px] text-[#78716C] uppercase font-bold block">Harga</span>
                    <span className="text-base font-black text-[#166534]">
                      {formatCurrency(item.price)}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!item.isAvailable}
                    onClick={() => {
                      setSelectedMenuItem(item);
                      setIsCustomizerOpen(true);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                      item.isAvailable
                        ? 'bg-[#166534] hover:bg-[#14532d] active:scale-95 text-white'
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pesan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-xl mx-auto">
          <div className="bg-[#166534] text-white rounded-3xl p-3.5 shadow-2xl flex items-center justify-between gap-3 border-2 border-white/20">
            <div className="flex items-center gap-3 pl-2">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#166534] flex items-center justify-center font-black text-sm shadow-xs">
                {cartItemCount}
              </div>
              <div>
                <p className="text-xs font-medium text-white/80">{cartItemCount} Menu Dipilih</p>
                <p className="text-base font-black leading-tight">{formatCurrency(cartTotal)}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-900 font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Lihat Pesanan & Bayar</span>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* Modal: Item Customizer */}
      <CustomerItemCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        item={selectedMenuItem}
        onAddToCart={handleAddToCart}
      />

      {/* Drawer: Customer Cart & Checkout */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-[#E7E5E4] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#E7E5E4] flex items-center justify-between bg-[#FFFDF7] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#166534] text-white flex items-center justify-center font-bold text-xs">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1C1917]">Pesanan {currentTableNumber}</h3>
                  <p className="text-xs text-[#78716C]">Periksa menu dan selesaikan pembayaran</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-[#78716C] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items & Customer Form */}
            <form onSubmit={handleSubmitOrder} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Form Input Pelanggan */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#166534]" />
                  <span>Data Pemesan di Meja</span>
                </h4>

                <div>
                  <label className="text-xs font-bold text-[#1C1917] block mb-1">
                    Nama Pemesan (Wajib)
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Budi / Kak Nadia"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E7E5E4] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#166534]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#78716C] block mb-1">
                    Nomor WhatsApp / HP (Opsional)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E7E5E4] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#166534]"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                  Menu Yang Dipesan ({cartItemCount} Item)
                </h4>

                <div className="divide-y divide-stone-100">
                  {customerCart.map((item) => (
                    <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <img
                          src={item.image || DEFAULT_MENU_IMAGE}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                        />
                        <div>
                          <h5 className="font-bold text-xs sm:text-sm text-[#1C1917] leading-tight">
                            {item.name}
                          </h5>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-[#78716C]">
                            {item.options?.cookingStyle && (
                              <span className="bg-stone-100 px-1.5 py-0.5 rounded">
                                {item.options.cookingStyle}
                              </span>
                            )}
                            {item.options?.spiceLevel && (
                              <span className="bg-red-50 text-[#DC2626] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" /> {item.options.spiceLevel}
                              </span>
                            )}
                            {item.options?.notes && <span>• Note: {item.options.notes}</span>}
                          </div>
                          <span className="block font-bold text-xs text-[#166534] mt-1">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white text-[#1C1917] flex items-center justify-center hover:bg-stone-50 cursor-pointer shadow-2xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-[#166534] text-white flex items-center justify-center hover:bg-[#14532d] cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                  Pilih Cara Pembayaran
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      paymentMethod === 'qris'
                        ? 'border-[#166534] bg-[#166534]/10 text-[#166534] font-bold shadow-xs'
                        : 'border-[#E7E5E4] bg-white text-[#1C1917] hover:bg-stone-50'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-[#166534] shrink-0" />
                    <div>
                      <span className="block text-xs font-bold">QRIS Instan</span>
                      <span className="block text-[10px] text-[#78716C]">GoPay/BCA/Dana</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      paymentMethod === 'cash'
                        ? 'border-[#166534] bg-[#166534]/10 text-[#166534] font-bold shadow-xs'
                        : 'border-[#E7E5E4] bg-white text-[#1C1917] hover:bg-stone-50'
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-amber-700 shrink-0" />
                    <div>
                      <span className="block text-xs font-bold">Bayar di Kasir</span>
                      <span className="block text-[10px] text-[#78716C]">Tunai / EDC</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      paymentMethod === 'transfer'
                        ? 'border-[#166534] bg-[#166534]/10 text-[#166534] font-bold shadow-xs'
                        : 'border-[#E7E5E4] bg-white text-[#1C1917] hover:bg-stone-50'
                    }`}
                  >
                    <Building className="w-5 h-5 text-sky-700 shrink-0" />
                    <div>
                      <span className="block text-xs font-bold">Transfer Bank</span>
                      <span className="block text-[10px] text-[#78716C]">BCA / BSI</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Price Calculation Summary */}
              <div className="bg-[#FFFDF7] p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between text-[#78716C]">
                  <span>Subtotal Menu</span>
                  <span>{formatCurrency(cartSubtotal)}</span>
                </div>
                {cartTaxAmount > 0 && (
                  <div className="flex justify-between text-[#78716C]">
                    <span>PB1 Restoran ({settings.taxRate}%)</span>
                    <span>{formatCurrency(cartTaxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-[#166534] pt-2 border-t border-stone-200">
                  <span>Total Tagihan</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 px-4 bg-[#166534] hover:bg-[#14532d] active:scale-98 text-white rounded-2xl font-bold text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ChefHat className="w-5 h-5" />
                  <span>Kirim Pesanan ke Dapur & Selesaikan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
