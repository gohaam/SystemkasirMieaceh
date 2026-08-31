import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { InventoryItem } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import {
  PackageCheck,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  RotateCw,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, adjustStock, deleteInventoryItem, showToast } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Bahan Pokok');
  const [currentStock, setCurrentStock] = useState<number>(10);
  const [minStock, setMinStock] = useState<number>(5);
  const [unit, setUnit] = useState('kg');
  const [costPerUnit, setCostPerUnit] = useState<number>(50000);
  const [supplier, setSupplier] = useState('Pasar Induk');

  // Adjust stock state
  const [newStockValue, setNewStockValue] = useState<number>(0);

  const filteredInventory = inventory.filter((item) => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.supplier?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const lowStockCount = inventory.filter((i) => i.status !== 'safe').length;

  const handleOpenAdd = () => {
    setSelectedItem(null);
    setName('');
    setCategory('Bahan Pokok');
    setCurrentStock(10);
    setMinStock(5);
    setUnit('kg');
    setCostPerUnit(50000);
    setSupplier('Pasar Induk');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setName(item.name);
    setCategory(item.category);
    setCurrentStock(item.currentStock);
    setMinStock(item.minStock);
    setUnit(item.unit);
    setCostPerUnit(item.costPerUnit || 0);
    setSupplier(item.supplier || '');
    setIsModalOpen(true);
  };

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setNewStockValue(item.currentStock);
    setIsAdjustModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama bahan wajib diisi.', 'error');
      return;
    }

    let status: 'safe' | 'low' | 'out_of_stock' = 'safe';
    if (currentStock <= 0) status = 'out_of_stock';
    else if (currentStock <= minStock) status = 'low';

    if (selectedItem) {
      updateInventoryItem(selectedItem.id, {
        name,
        category,
        currentStock,
        minStock,
        unit,
        costPerUnit,
        supplier,
        status,
      });
    } else {
      addInventoryItem({
        name,
        category,
        currentStock,
        minStock,
        unit,
        costPerUnit,
        supplier,
        status,
        lastRestocked: new Date().toISOString(),
      });
    }
    setIsModalOpen(false);
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    adjustStock(selectedItem.id, Number(newStockValue));
    setIsAdjustModalOpen(false);
  };

  const handleDelete = (item: InventoryItem) => {
    if (confirm(`Hapus data bahan "${item.name}"?`)) {
      deleteInventoryItem(item.id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#FFFDF7] space-y-6 text-[#1C1917]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-[#166534]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
              Manajemen Stok & Bahan Baku
            </h2>
          </div>
          <p className="text-xs text-[#78716C] mt-1">
            Pantau ketersediaan mie kuning, daging sapi, bumbu rempah Aceh, dan logistik dapur
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAdd}
            id="add-inventory-btn"
            className="px-5 py-2.5 bg-[#166534] hover:bg-[#14532d] active:scale-98 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Bahan Baku</span>
          </button>
        </div>
      </div>

      {/* Warning if stock low */}
      {lowStockCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-950 text-xs shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Ada {lowStockCount} item bahan yang menipis atau habis.</span>
            <span className="text-amber-800/80 ml-1">
              Segera lakukan restock atau belanja bahan baku agar operasional dapur tidak terganggu.
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E5E4] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari bahan baku, kategori, supplier..."
            className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1C1917] placeholder-[#78716C]/60 focus:border-[#166534] outline-hidden"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:border-[#166534] outline-hidden"
          >
            <option value="all">Semua Status Stok</option>
            <option value="safe">Stok Aman</option>
            <option value="low">Stok Menipis (Low)</option>
            <option value="out_of_stock">Habis (Out of Stock)</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-xs overflow-hidden">
        {filteredInventory.length === 0 ? (
          <div className="p-12 text-center text-[#78716C]">
            <PackageCheck className="w-12 h-12 text-[#78716C]/40 mx-auto mb-3" />
            <p className="font-bold text-[#1C1917] text-base">Belum Ada Bahan Baku Terdaftar</p>
            <p className="text-xs text-[#78716C] mt-1 max-w-sm mx-auto">
              Silakan tambahkan bahan baku atau stok komoditas untuk memantau sisa stok dan peringatan bahan menipis.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-4 px-4 py-2 bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Bahan Pertama</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FFFDF7] border-b border-[#E7E5E4] text-[#78716C] font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Nama Bahan</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Stok Saat Ini</th>
                  <th className="py-3.5 px-4">Batas Minimum</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Terakhir Restock</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FFFDF7]/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#1C1917]">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-[#1C1917]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#1C1917]">
                      {item.currentStock} <span className="text-xs font-normal text-[#78716C]">{item.unit}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#78716C]">
                      {item.minStock} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-[#78716C]">
                      {item.supplier || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.status === 'safe' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-[#166534] border border-green-200">
                          Aman
                        </span>
                      ) : item.status === 'low' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Menipis
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#DC2626] border border-red-200">
                          Habis
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#78716C] whitespace-nowrap">
                      {item.lastRestocked ? formatDateTime(item.lastRestocked) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(item)}
                          className="p-1.5 text-[#78716C] hover:text-[#166534] hover:bg-[#166534]/10 rounded-lg transition-colors cursor-pointer"
                          title="Sesuaikan Stok Cepat"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-[#78716C] hover:text-[#166534] hover:bg-[#166534]/10 rounded-lg transition-colors cursor-pointer"
                          title="Edit Data Bahan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-[#78716C] hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Bahan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedItem ? 'Edit Data Bahan Baku' : 'Tambah Bahan Baku Baru'}
          subtitle="Masukkan data inventaris dan ambang batas minimum stok"
          maxWidth="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs text-[#1C1917]">
            <div>
              <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                Nama Bahan / Komoditas:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Daging Sapi Has Luar"
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Kategori Bahan:
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Bahan Pokok / Daging"
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Satuan Unit:
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:border-[#166534] outline-hidden"
                >
                  <option value="kg">Kilogram (kg)</option>
                  <option value="gram">Gram (gr)</option>
                  <option value="butir">Butir</option>
                  <option value="liter">Liter</option>
                  <option value="porsi">Porsi</option>
                  <option value="ikat">Ikat</option>
                  <option value="bungkus">Bungkus</option>
                  <option value="kaleng">Kaleng</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Stok Saat Ini:
                </label>
                <input
                  type="number"
                  step="any"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(Number(e.target.value))}
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#1C1917] focus:border-[#166534] outline-hidden"
                  min={0}
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Batas Min. Stok (Peringatan):
                </label>
                <input
                  type="number"
                  step="any"
                  value={minStock}
                  onChange={(e) => setMinStock(Number(e.target.value))}
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-800 focus:border-[#166534] outline-hidden"
                  min={0}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                Nama Supplier / Toko Langganan:
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Contoh: Pasar Peunayong Banda Aceh"
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden"
              />
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
                {selectedItem ? 'Simpan Perubahan' : 'Tambah Bahan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && selectedItem && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title="Penyesuaian (Opname) Stok Bahan"
          subtitle={`Item: ${selectedItem.name}`}
          maxWidth="sm"
        >
          <form onSubmit={handleConfirmAdjust} className="space-y-4 text-xs text-[#1C1917]">
            <p className="text-[#78716C]">
              Masukkan jumlah stok riil fisik terkini di dapur / gudang warung.
            </p>

            <div>
              <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                Stok Fisik Baru ({selectedItem.unit}):
              </label>
              <input
                type="number"
                step="any"
                value={newStockValue}
                onChange={(e) => setNewStockValue(Number(e.target.value))}
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2.5 text-base font-mono font-bold text-[#166534] focus:border-[#166534] outline-hidden"
                min={0}
                required
                autoFocus
              />
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-[#E7E5E4]">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 font-semibold text-[#78716C] hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#166534] hover:bg-[#14532d] text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                Simpan Stok
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
