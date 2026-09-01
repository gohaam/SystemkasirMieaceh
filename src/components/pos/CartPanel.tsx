import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { OrderType } from '../../types';
import { DEFAULT_MENU_IMAGE, formatRupiah } from '../../utils/formatters';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  Receipt,
  User,
  Utensils,
  ChevronRight,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface CartPanelProps {
  onOpenPayment: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({ onOpenPayment }) => {
  const {
    cart,
    orderType,
    setOrderType,
    tableNumber,
    setTableNumber,
    customerName,
    setCustomerName,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    discount,
    applyDiscount,
    removeDiscount,
    cartSubtotal,
    cartDiscountAmount,
    cartTaxAmount,
    cartTotal,
    cartItemCount,
    settings,
    tables: storedTables,
  } = usePOS();

  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [customDiscountType, setCustomDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [customDiscountValue, setCustomDiscountValue] = useState<number>(10);
  const [customDiscountName, setCustomDiscountName] = useState<string>('Promo Khusus');

  const tableList = useMemo(() => {
    if (storedTables && storedTables.length > 0) {
      return storedTables.map((t) => t.tableNumber);
    }
    return [];
  }, [storedTables]);

  const handleApplyCustomDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (customDiscountValue <= 0) return;
    applyDiscount(customDiscountType, customDiscountValue, customDiscountName);
    setShowDiscountInput(false);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-[#E7E5E4] select-none shadow-xs">
      {/* 1. Header & Order Type Picker */}
      <div className="p-4 border-b border-[#E7E5E4] space-y-3 bg-[#FFFDF7]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#166534]" />
            <h2 className="font-bold text-[#1C1917] text-base">Pesanan Aktif</h2>
            <span className="px-2 py-0.5 bg-[#166534]/10 text-[#166534] text-xs font-bold rounded-full">
              {cartItemCount} item
            </span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Kosongkan seluruh keranjang pesanan?')) {
                  clearCart();
                }
              }}
              id="clear-cart-btn"
              className="text-[#78716C] hover:text-[#DC2626] text-xs font-semibold flex items-center gap-1 transition-colors p-1 cursor-pointer"
              title="Kosongkan keranjang"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Order Type Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-xl">
          <button
            type="button"
            onClick={() => setOrderType('dine_in')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              orderType === 'dine_in'
                ? 'bg-white text-[#166534] shadow-xs'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Makan di Tempat
          </button>
          <button
            type="button"
            onClick={() => setOrderType('take_away')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              orderType === 'take_away'
                ? 'bg-white text-[#166534] shadow-xs'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Bawa Pulang
          </button>
        </div>

        {/* Table selector / Customer info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {orderType === 'dine_in' ? (
            <div>
              <label className="block text-[10px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
                Pilih Meja:
              </label>
              <select
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                id="cart-table-select"
                className="w-full bg-white border border-[#E7E5E4] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#1C1917] focus:border-[#166534] outline-hidden shadow-2xs"
              >
                {tableList.length === 0 ? (
                  <option value="">Belum ada meja</option>
                ) : (
                  tableList.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
                Kemasan:
              </label>
              <div className="bg-stone-100 border border-[#E7E5E4] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#78716C]">
                Bungkus Daun / Box
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-[#78716C] uppercase tracking-wider mb-1">
              Nama Pelanggan:
            </label>
            <input
              type="text"
              id="cart-customer-name-input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Contoh: Bang Teuku"
              className="w-full bg-white border border-[#E7E5E4] rounded-xl px-2.5 py-1.5 text-xs text-[#1C1917] placeholder-[#78716C]/60 focus:border-[#166534] outline-hidden shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* 2. Scrollable Cart Item List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-stone-100">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#78716C]">
            <div className="w-16 h-16 rounded-2xl bg-[#FFFDF7] flex items-center justify-center mb-3 border border-[#E7E5E4]">
              <ShoppingBag className="w-8 h-8 text-[#166534]/50" />
            </div>
            <p className="text-sm font-bold text-[#1C1917]">Keranjang Masih Kosong</p>
            <p className="text-xs text-[#78716C] mt-1 max-w-xs leading-relaxed">
              Pilih menu makanan atau minuman khas Aceh di katalog sebelah kiri.
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="pt-3 first:pt-0 flex gap-3 group">
              <img
                src={item.image || DEFAULT_MENU_IMAGE}
                alt={item.name}
                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#E7E5E4]"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="font-bold text-xs text-[#1C1917] leading-snug truncate">
                    {item.name}
                  </h4>
                  <span className="text-xs font-bold font-mono text-[#166534] shrink-0">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>

                {/* Options Chips */}
                {(item.options?.cookingStyle || item.options?.spiceLevel || item.options?.notes) && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.options.cookingStyle && (
                      <span className="px-1.5 py-0.2 bg-stone-100 text-[#1C1917] rounded text-[10px] font-medium">
                        {item.options.cookingStyle}
                      </span>
                    )}
                    {item.options.spiceLevel && (
                      <span className="px-1.5 py-0.2 bg-red-50 text-[#DC2626] rounded text-[10px] font-medium">
                        {item.options.spiceLevel}
                      </span>
                    )}
                    {item.options.notes && (
                      <span className="px-1.5 py-0.2 bg-amber-50 text-amber-900 rounded text-[10px] font-medium truncate max-w-[130px]">
                        📝 {item.options.notes}
                      </span>
                    )}
                  </div>
                )}

                {/* Price & Quantity Stepper */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-[#78716C] font-mono">
                    @{formatRupiah(item.price)}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center border border-[#E7E5E4] rounded-lg text-[#1C1917] hover:bg-stone-100 transition-colors cursor-pointer"
                      aria-label="Kurangi porsi"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs font-mono text-[#1C1917] min-w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center border border-[#E7E5E4] rounded-lg text-[#1C1917] hover:bg-stone-100 transition-colors cursor-pointer"
                      aria-label="Tambah porsi"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. Footer Summary & Checkout Button */}
      <div className="p-4 border-t border-[#E7E5E4] bg-[#FFFDF7] space-y-3 shrink-0">
        {/* Discount Trigger / Applied Banner */}
        {discount.value > 0 ? (
          <div className="flex items-center justify-between p-2.5 bg-[#166534]/10 border border-[#166534]/30 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 text-[#166534] font-semibold">
              <Tag className="w-3.5 h-3.5" />
              <span>{discount.name || 'Diskon Diterapkan'}</span>
            </div>
            <button
              onClick={removeDiscount}
              className="text-[#DC2626] hover:underline text-[11px] font-bold cursor-pointer"
            >
              Hapus
            </button>
          </div>
        ) : (
          <div>
            {!showDiscountInput ? (
              <button
                type="button"
                onClick={() => setShowDiscountInput(true)}
                className="text-xs font-bold text-[#166534] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>+ Pasang Diskon / Promo</span>
              </button>
            ) : (
              <form
                onSubmit={handleApplyCustomDiscount}
                className="p-2.5 bg-white border border-[#E7E5E4] rounded-xl space-y-2 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1C1917]">Beri Diskon Pesanan</span>
                  <button
                    type="button"
                    onClick={() => setShowDiscountInput(false)}
                    className="text-[#78716C] hover:text-[#1C1917] font-bold"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyDiscount('percentage', 10, 'Diskon 10%')}
                    className="py-1 bg-stone-100 hover:bg-[#166534]/10 hover:text-[#166534] text-[#1C1917] font-bold rounded-lg cursor-pointer"
                  >
                    10%
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDiscount('percentage', 15, 'Diskon 15%')}
                    className="py-1 bg-stone-100 hover:bg-[#166534]/10 hover:text-[#166534] text-[#1C1917] font-bold rounded-lg cursor-pointer"
                  >
                    15%
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDiscount('fixed', 10000, 'Potongan Rp10rb')}
                    className="py-1 bg-stone-100 hover:bg-[#166534]/10 hover:text-[#166534] text-[#1C1917] font-bold rounded-lg cursor-pointer"
                  >
                    -10rb
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Calculations */}
        <div className="space-y-1.5 text-xs text-[#78350F] border-t border-dashed border-[#E7E5E4] pt-3 font-medium">
          <div className="flex justify-between">
            <span className="text-[#78716C]">Subtotal:</span>
            <span className="font-semibold text-[#1C1917] font-mono">{formatRupiah(cartSubtotal)}</span>
          </div>

          {cartDiscountAmount > 0 && (
            <div className="flex justify-between text-[#166534] font-semibold">
              <span>Diskon:</span>
              <span className="font-mono">-{formatRupiah(cartDiscountAmount)}</span>
            </div>
          )}

          {settings.enableTax && (
            <div className="flex justify-between">
              <span className="text-[#78716C]">Pajak (PPN {settings.taxRate}%):</span>
              <span className="font-semibold text-[#1C1917] font-mono">{formatRupiah(cartTaxAmount)}</span>
            </div>
          )}

          {/* Clean Total Header */}
          <div className="flex justify-between items-center text-xl md:text-2xl font-black text-[#166534] border-t-2 border-[#166534] pt-3 mt-2">
            <span>TOTAL</span>
            <span className="font-mono">{formatRupiah(cartTotal)}</span>
          </div>
        </div>

        {/* Checkout Button: Height 48px (h-12), Full Width, Deep Green #166534, Text 16px font-bold */}
        <button
          type="button"
          id="checkout-btn"
          onClick={onOpenPayment}
          disabled={cart.length === 0}
          className="w-full h-12 bg-[#166534] hover:bg-[#14532d] active:scale-98 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-base transition-all shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
        >
          <Receipt className="w-5 h-5" />
          <span>Bayar Sekarang</span>
        </button>
      </div>
    </div>
  );
};
