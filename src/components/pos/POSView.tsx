import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { MenuItem, MenuCategory } from '../../types';
import { MenuCard } from './MenuCard';
import { CartPanel } from './CartPanel';
import { OptionCustomizerModal } from './OptionCustomizerModal';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from '../common/ReceiptModal';
import {
  Search,
  Sparkles,
  ShoppingBag,
  Package,
  Utensils,
} from 'lucide-react';

export const POSView: React.FC = () => {
  const {
    menuItems,
    categories: storedCategories,
    setActiveTab,
    addToCart,
    cart,
    cartItemCount,
    selectedReceipt,
    setSelectedReceipt,
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');
  const [filterOnlyAvailable, setFilterOnlyAvailable] = useState<boolean>(false);
  const [filterOnlyPopular, setFilterOnlyPopular] = useState<boolean>(false);

  // Modals state
  const [selectedItemForCustom, setSelectedItemForCustom] = useState<MenuItem | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [showMobileCart, setShowMobileCart] = useState<boolean>(false);

  // Dynamic Category definitions from DB
  const categories = useMemo(() => {
    const dynamicList = storedCategories.map((c) => ({ id: c.id, label: c.name }));
    return [{ id: 'all', label: 'Semua Menu' }, ...dynamicList];
  }, [storedCategories]);

  // Filtered menu list
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Sub-category filter
      if (subCategoryFilter !== 'all') {
        const nameLower = item.name.toLowerCase();
        if (selectedCategory === 'kwetiaw-bihun') {
          if (subCategoryFilter === 'kwetiaw' && !nameLower.includes('kwetiaw')) return false;
          if (subCategoryFilter === 'bihun' && !nameLower.includes('bihun')) return false;
          if (subCategoryFilter === 'capcay' && !nameLower.includes('capcay')) return false;
        } else if (selectedCategory === 'minuman') {
          if (subCategoryFilter === 'teh' && !nameLower.includes('teh')) return false;
          if (subCategoryFilter === 'kopi' && !nameLower.includes('kopi')) return false;
          if (subCategoryFilter === 'jeruk' && !nameLower.includes('jeruk') && !nameLower.includes('timun') && !nameLower.includes('jahe')) return false;
        }
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(query);
        const matchDesc = item.description.toLowerCase().includes(query);
        if (!matchName && !matchDesc) return false;
      }
      // Available only filter
      if (filterOnlyAvailable && (!item.isAvailable || item.stock <= 0)) {
        return false;
      }
      // Popular filter
      if (filterOnlyPopular && !item.isPopular) {
        return false;
      }
      return true;
    });
  }, [menuItems, selectedCategory, subCategoryFilter, searchQuery, filterOnlyAvailable, filterOnlyPopular]);

  // Handle clicking a menu item
  const handleItemSelect = (item: MenuItem) => {
    if (item.spicyOptions || item.cookingStyleOptions) {
      setSelectedItemForCustom(item);
    } else {
      addToCart(item);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-[#FFFDF7]">
      {/* LEFT SECTION: Menu Catalog & Categories (65% width on desktop) */}
      <div className="flex-1 lg:w-[65%] flex flex-col min-w-0 overflow-hidden">
        {/* Top Search & Filter Bar */}
        <div className="p-4 md:p-6 bg-[#FFFDF7] border-b border-[#E7E5E4] space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="pos-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu atau kategori mie..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-[#E7E5E4] focus:ring-2 focus:ring-[#166534]/20 focus:border-[#166534] outline-none shadow-2xs text-sm text-[#1C1917] placeholder-[#78716C]/60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#1C1917] text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFilterOnlyPopular(!filterOnlyPopular)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  filterOnlyPopular
                    ? 'bg-[#DC2626] text-white border-[#DC2626]'
                    : 'bg-white text-[#1C1917] border-[#E7E5E4] hover:bg-[#FFFDF7]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Terlaris</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterOnlyAvailable(!filterOnlyAvailable)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  filterOnlyAvailable
                    ? 'bg-[#166534] text-white border-[#166534]'
                    : 'bg-white text-[#1C1917] border-[#E7E5E4] hover:bg-[#FFFDF7]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Tersedia Saja</span>
              </button>
            </div>
          </div>

          {/* Category Navigation Pill Tabs */}
          <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  id={`cat-filter-${cat.id}`}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSubCategoryFilter('all');
                  }}
                  className={`px-5 py-2 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#166534] text-white shadow-xs'
                      : 'bg-white border border-[#E7E5E4] text-[#78716C] hover:text-[#1C1917] hover:bg-[#FFFDF7]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </nav>

          {/* Sub-Category Quick Filter Chips */}
          {selectedCategory === 'kwetiaw-bihun' && (
            <div className="flex gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-stone-200/60 scrollbar-none">
              {[
                { id: 'all', label: 'Semua (Kwetiaw, Bihun, Capcay)' },
                { id: 'kwetiaw', label: '🥢 Kwetiaw Saja' },
                { id: 'bihun', label: '🍜 Bihun Saja' },
                { id: 'capcay', label: '🥗 Capcay Saja' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSubCategoryFilter(sub.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    subCategoryFilter === sub.id
                      ? 'bg-[#D97706] text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {selectedCategory === 'minuman' && (
            <div className="flex gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-stone-200/60 scrollbar-none">
              {[
                { id: 'all', label: 'Semua Minuman' },
                { id: 'teh', label: '🧋 Varian Teh & Teh Tarik' },
                { id: 'kopi', label: '☕ Kopi Robusta & Gula Aren' },
                { id: 'jeruk', label: '🍊 Es Timun, Jeruk & Jahe' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSubCategoryFilter(sub.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    subCategoryFilter === sub.id
                      ? 'bg-[#166534] text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {menuItems.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-[#E7E5E4] shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3">
                <Utensils className="w-7 h-7 text-[#166534]" />
              </div>
              <h3 className="font-bold text-[#1C1917] text-base">Belum Ada Menu Terdaftar</h3>
              <p className="text-xs text-[#78716C] mt-1 max-w-md leading-relaxed">
                Sistem dimulai dalam keadaan baru / kosong. Silakan buat kategori dan tambahkan menu makanan atau minuman pertama Anda di menu Manajemen Menu.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('menu')}
                className="mt-4 px-6 py-2.5 bg-[#166534] hover:bg-[#14532d] active:scale-98 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2"
              >
                <Utensils className="w-4 h-4" />
                <span>+ Buka Manajemen Menu</span>
              </button>
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-[#E7E5E4]">
              <Utensils className="w-12 h-12 text-[#166534]/30 mb-2" />
              <h3 className="font-bold text-[#1C1917] text-sm">Tidak ada menu yang cocok</h3>
              <p className="text-xs text-[#78716C] mt-1 max-w-sm">
                Sesuaikan kata kunci pencarian atau ganti filter kategori di atas.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setFilterOnlyAvailable(false);
                  setFilterOnlyPopular(false);
                }}
                className="mt-4 px-5 py-2 bg-[#166534] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Reset Semua Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5">
              {filteredMenuItems.map((item) => {
                const inCart = cart
                  .filter((c) => c.menuId === item.id)
                  .reduce((sum, c) => sum + c.quantity, 0);

                return (
                  <MenuCard
                    key={item.id}
                    item={item}
                    onSelect={handleItemSelect}
                    cartItemCount={inCart}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile Floating Cart Summary Bar */}
        <div className="lg:hidden p-3 bg-white border-t border-[#E7E5E4] flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#166534]/10 text-[#166534] flex items-center justify-center font-bold text-sm">
              {cartItemCount}
            </div>
            <div>
              <p className="text-[11px] text-[#78716C] leading-none">Keranjang Pesanan</p>
              <p className="text-xs font-bold text-[#1C1917] mt-0.5">
                {cartItemCount} Menu Dipilih
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowMobileCart(true)}
            className="px-5 py-2.5 bg-[#166534] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer uppercase tracking-wider"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Lihat Pesanan</span>
          </button>
        </div>
      </div>

      {/* RIGHT SECTION: Cart Panel (Desktop, 35% width) */}
      <div className="hidden lg:block lg:w-[35%] xl:w-[35%] h-full">
        <CartPanel onOpenPayment={() => setIsPaymentOpen(true)} />
      </div>

      {/* MOBILE CART DRAWER */}
      {showMobileCart && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setShowMobileCart(false)}
          />
          <div className="relative ml-auto w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="flex items-center justify-between p-4 border-b border-[#E7E5E4] bg-[#FFFDF7]">
              <h3 className="font-bold text-[#1C1917] text-sm">Keranjang Pesanan</h3>
              <button
                onClick={() => setShowMobileCart(false)}
                className="p-1.5 text-[#78716C] hover:text-[#1C1917] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CartPanel
                onOpenPayment={() => {
                  setShowMobileCart(false);
                  setIsPaymentOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Option Customizer Modal */}
      <OptionCustomizerModal
        isOpen={Boolean(selectedItemForCustom)}
        onClose={() => setSelectedItemForCustom(null)}
        item={selectedItemForCustom}
        onConfirm={(opts) => {
          if (selectedItemForCustom) {
            addToCart(selectedItemForCustom, opts);
          }
        }}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={() => {
          setIsPaymentOpen(false);
        }}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        transaction={selectedReceipt}
      />
    </div>
  );
};
