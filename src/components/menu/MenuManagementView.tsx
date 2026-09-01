import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { MenuItem, Category } from '../../types';
import { DEFAULT_MENU_IMAGE, formatRupiah } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  Flame,
  Sparkles,
  DollarSign,
  Package,
  FolderPlus,
  Layers,
} from 'lucide-react';

export const MenuManagementView: React.FC = () => {
  const {
    menuItems,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuAvailability,
    showToast,
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Category modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    customCategoryName: '',
    price: 25000,
    costPrice: 15000,
    stock: 50,
    isAvailable: true,
    isPopular: false,
    spicyOptions: true,
    cookingStyleOptions: true,
    description: '',
    image: '',
  });

  const getCategoryValue = (category: string | undefined): string => {
    if (!category) return '';
    const match = categories.find((c) => c.id === category || c.name === category);
    return match ? match.name : category;
  };

  const filteredItems = menuItems.filter((item) => {
    const itemCategory = getCategoryValue(item.category);
    if (categoryFilter !== 'all' && itemCategory !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    const initialCategory = categories.length > 0 ? categories[0].name : '';
    setFormData({
      name: '',
      category: initialCategory,
      customCategoryName: categories.length === 0 ? 'Makanan Utama' : '',
      price: 25000,
      costPrice: 15000,
      stock: 50,
      isAvailable: true,
      isPopular: false,
      spicyOptions: true,
      cookingStyleOptions: true,
      description: '',
      image: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: getCategoryValue(item.category),
      customCategoryName: '',
      price: item.price,
      costPrice: item.costPrice,
      stock: item.stock,
      isAvailable: item.isAvailable,
      isPopular: Boolean(item.isPopular),
      spicyOptions: Boolean(item.spicyOptions),
      cookingStyleOptions: Boolean(item.cookingStyleOptions),
      description: item.description,
      image: item.image,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Nama menu wajib diisi.', 'error');
      return;
    }

    let targetCategory = formData.category.trim();

    if ((!targetCategory || targetCategory === 'new') && formData.customCategoryName.trim()) {
      const catName = formData.customCategoryName.trim();
      const existing = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      if (existing) {
        targetCategory = existing.name;
      } else {
        const newCatId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
              const random = Math.random() * 16 | 0;
              const value = char === 'x' ? random : (random & 0x3 | 0x8);
              return value.toString(16);
            });
        await addCategory({ id: newCatId, name: catName });
        targetCategory = catName;
      }
    } else if (!targetCategory && categories.length > 0) {
      targetCategory = categories[0].name;
    } else if (!targetCategory) {
      const defaultCategoryName = 'Menu Umum';
      const existing = categories.find((c) => c.name.toLowerCase() === defaultCategoryName.toLowerCase());
      if (existing) {
        targetCategory = existing.name;
      } else {
        const defaultCatId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
              const random = Math.random() * 16 | 0;
              const value = char === 'x' ? random : (random & 0x3 | 0x8);
              return value.toString(16);
            });
        await addCategory({ id: defaultCatId, name: defaultCategoryName });
        targetCategory = defaultCategoryName;
      }
    }

    const payload = {
      name: formData.name.trim(),
      category: targetCategory,
      price: Number(formData.price) || 0,
      costPrice: Number(formData.costPrice) || 0,
      stock: Number(formData.stock) || 0,
      unit: 'Porsi',
      isAvailable: formData.isAvailable,
      isPopular: formData.isPopular,
      spicyOptions: formData.spicyOptions,
      cookingStyleOptions: formData.cookingStyleOptions,
      description: formData.description.trim(),
      image: formData.image.trim(),
    };

    try {
      if (editingItem) {
        await updateMenuItem(editingItem.id, payload);
      } else {
        await addMenuItem(payload);
      }
      setIsModalOpen(false);
    } catch (error: any) {
      showToast(error?.message || 'Gagal menyimpan menu ke database.', 'error');
    }
  };

  const handleDelete = (item: MenuItem) => {
    if (confirm(`Apakah Anda yakin ingin menghapus menu "${item.name}"?`)) {
      deleteMenuItem(item.id);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      showToast('Nama kategori wajib diisi.', 'error');
      return;
    }
    if (editingCategory) {
      updateCategory(editingCategory.id, { name: newCategoryName.trim() });
      setEditingCategory(null);
    } else {
      addCategory({ name: newCategoryName.trim() });
    }
    setNewCategoryName('');
  };

  const categoryNameByItem = (itemCategory?: string) => {
    if (!itemCategory) return 'Tanpa Kategori';
    const match = categories.find((c) => c.id === itemCategory || c.name === itemCategory);
    return match ? match.name : itemCategory;
  };

  const handleDeleteCategory = (cat: Category) => {
    if (confirm(`Hapus kategori "${cat.name}"?`)) {
      deleteCategory(cat.id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#FFFDF7] space-y-6 text-[#1C1917]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-[#166534]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
              Kelola Menu & Kategori
            </h2>
          </div>
          <p className="text-xs text-[#78716C] mt-1">
            Tambah menu baru, atur kategori, harga jual, HPP modal, dan opsi racikan bumbu khas Aceh
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            id="manage-categories-btn"
            className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-[#1C1917] text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 border border-stone-300 cursor-pointer transition-all"
          >
            <Layers className="w-4 h-4 text-[#166534]" />
            <span>Kelola Kategori</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            id="add-menu-btn"
            className="px-5 py-2.5 bg-[#166534] hover:bg-[#14532d] active:scale-98 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Menu Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E5E4] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama menu..."
            className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1C1917] placeholder-[#78716C]/60 focus:border-[#166534] outline-hidden"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:border-[#166534] outline-hidden"
          >
            <option value="all">Semua Kategori ({menuItems.length})</option>
            {categories.map((c) => {
              const count = menuItems.filter((m) => getCategoryValue(m.category) === c.name).length;
              return (
                <option key={c.id} value={c.name}>
                  {c.name} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Menu Grid / Table */}
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-[#78716C]">
            <UtensilsCrossed className="w-12 h-12 text-[#78716C]/40 mx-auto mb-3" />
            <p className="font-bold text-[#1C1917] text-base">Belum Ada Menu yang Sesuai</p>
            <p className="text-xs text-[#78716C] mt-1 max-w-sm mx-auto">
              Silakan tambahkan menu makanan atau minuman baru untuk mulai melayani pesanan kasir.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-4 px-4 py-2 bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Menu Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FFFDF7] border-b border-[#E7E5E4] text-[#78716C] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Menu</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Harga Jual</th>
                  <th className="py-3.5 px-4">HPP (Modal)</th>
                  <th className="py-3.5 px-4">Margin Laba</th>
                  <th className="py-3.5 px-4">Stok</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredItems.map((item) => {
                  const profitMargin = item.price - item.costPrice;
                  const profitPercent = Math.round((profitMargin / (item.price || 1)) * 100);
                  const catLabel = categoryNameByItem(item.category);

                  return (
                    <tr key={item.id} className="hover:bg-[#FFFDF7]/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image || DEFAULT_MENU_IMAGE}
                            alt={item.name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#E7E5E4] shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-[#1C1917]">
                              <span>{item.name}</span>
                              {item.isPopular && (
                                <span className="px-1.5 py-0.2 bg-[#DC2626]/10 text-[#DC2626] rounded text-[9px] font-bold">
                                  Favorit
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#78716C] truncate max-w-xs">{item.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-[#1C1917] capitalize">
                          {catLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#166534]">
                        {formatRupiah(item.price)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#78716C]">
                        {formatRupiah(item.costPrice)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className="text-[#166534] font-bold">{formatRupiah(profitMargin)}</span>{' '}
                        <span className="text-[10px] text-[#78716C]">({profitPercent}%)</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {item.stock} {item.unit || 'porsi'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleMenuAvailability(item.id)}
                          className="cursor-pointer"
                          title="Klik untuk ubah status ketersediaan"
                        >
                          {item.isAvailable && item.stock > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-[#166534] border border-green-200">
                              Tersedia
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#DC2626] border border-red-200">
                              Habis
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-[#78716C] hover:text-[#166534] hover:bg-[#166534]/10 rounded-lg transition-colors cursor-pointer"
                            title="Edit Menu"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-[#78716C] hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Menu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <Modal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
            setNewCategoryName('');
          }}
          title="Kelola Kategori Menu"
          subtitle="Tambah atau edit kategori menu makanan, minuman, dan olahan khas"
          maxWidth="md"
        >
          <div className="space-y-5 text-xs text-[#1C1917]">
            {/* Form Add/Edit Category */}
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nama kategori baru..."
                className="flex-1 bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden font-semibold"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#166534] hover:bg-[#14532d] text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {editingCategory ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{editingCategory ? 'Update' : 'Tambah'}</span>
              </button>
              {editingCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setNewCategoryName('');
                  }}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-[#78716C] rounded-xl cursor-pointer"
                >
                  Batal
                </button>
              )}
            </form>

            {/* List Categories */}
            <div className="border border-[#E7E5E4] rounded-xl divide-y divide-stone-100 max-h-60 overflow-y-auto">
              {categories.map((cat) => {
                const count = menuItems.filter((m) => m.category === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="p-3 flex items-center justify-between hover:bg-[#FFFDF7] transition-colors"
                  >
                    <div>
                      <p className="font-bold text-[#1C1917] text-xs">{cat.name}</p>
                      <p className="text-[10px] text-[#78716C]">
                        ID: <span className="font-mono">{cat.id}</span> • {count} menu terhubung
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(cat);
                          setNewCategoryName(cat.name);
                        }}
                        className="p-1.5 text-[#78716C] hover:text-[#166534] hover:bg-stone-100 rounded-lg cursor-pointer"
                        title="Edit Kategori"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 text-[#78716C] hover:text-[#DC2626] hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Menu Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? 'Edit Menu Makanan / Minuman' : 'Tambah Menu Baru'}
          subtitle="Lengkapi data menu, harga, HPP modal, dan opsi racikan"
          maxWidth="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs text-[#1C1917]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Nama Menu:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Mie Aceh Kepiting Jumbo"
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Kategori Menu:
                </label>
                {categories.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:border-[#166534] outline-hidden"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      <option value="new">+ Tambah Kategori Baru...</option>
                    </select>
                    {formData.category === 'new' && (
                      <input
                        type="text"
                        value={formData.customCategoryName}
                        onChange={(e) => setFormData({ ...formData, customCategoryName: e.target.value })}
                        placeholder="Ketik nama kategori baru..."
                        className="w-full bg-[#FFFDF7] border border-emerald-300 rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden font-semibold"
                        required
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={formData.customCategoryName}
                      onChange={(e) => setFormData({ ...formData, customCategoryName: e.target.value })}
                      placeholder="Contoh: Makanan Utama, Minuman..."
                      className="w-full bg-[#FFFDF7] border border-emerald-300 rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden font-semibold"
                      required
                    />
                    <p className="text-[10px] text-[#78716C]">
                      Kategori baru akan dibuat otomatis bersama menu ini.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  URL Foto Menu:
                </label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Harga Jual (Rp):
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#166534] focus:border-[#166534] outline-hidden"
                  min={0}
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  HPP / Modal Pokok (Rp):
                </label>
                <input
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#78716C] focus:border-[#166534] outline-hidden"
                  min={0}
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Stok Tersedia (Porsi):
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#1C1917] focus:border-[#166534] outline-hidden"
                  min={0}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Deskripsi Menu:
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Keterangan singkat tentang racikan bumbu atau komposisi..."
                  rows={2}
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl p-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden"
                />
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E7E5E4]">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-[#FFFDF7] border border-[#E7E5E4]">
                <input
                  type="checkbox"
                  checked={formData.spicyOptions}
                  onChange={(e) => setFormData({ ...formData, spicyOptions: e.target.checked })}
                  className="rounded text-[#166534] focus:ring-[#166534]"
                />
                <span className="font-semibold text-xs text-[#1C1917]">Opsi Level Pedas</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-[#FFFDF7] border border-[#E7E5E4]">
                <input
                  type="checkbox"
                  checked={formData.cookingStyleOptions}
                  onChange={(e) => setFormData({ ...formData, cookingStyleOptions: e.target.checked })}
                  className="rounded text-[#166534] focus:ring-[#166534]"
                />
                <span className="font-semibold text-xs text-[#1C1917]">Opsi Gaya Masak (Goreng/Kuah)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-[#FFFDF7] border border-[#E7E5E4]">
                <input
                  type="checkbox"
                  checked={formData.isPopular}
                  onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                  className="rounded text-[#166534] focus:ring-[#166534]"
                />
                <span className="font-semibold text-xs text-[#1C1917]">Tandai Sebagai Menu Favorit</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-[#FFFDF7] border border-[#E7E5E4]">
                <input
                  type="checkbox"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="rounded text-[#166534] focus:ring-[#166534]"
                />
                <span className="font-semibold text-xs text-[#1C1917]">Status Menu Tersedia</span>
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-[#E7E5E4]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 font-semibold text-[#78716C] hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#166534] hover:bg-[#14532d] text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                {editingItem ? 'Simpan Perubahan' : 'Tambah Menu'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
