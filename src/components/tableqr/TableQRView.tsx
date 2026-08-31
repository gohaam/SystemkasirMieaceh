import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { TableConfig, TableOrder, TableLocation, TableOrderStatus, PaymentMethod } from '../../types';
import { TableStandeeModal } from './TableStandeeModal';
import { TableOrderDetailsModal } from './TableOrderDetailsModal';
import { formatCurrency, formatTime, formatDate } from '../../utils/formatters';
import {
  QrCode,
  Printer,
  Plus,
  Search,
  Users,
  ExternalLink,
  ChefHat,
  Clock,
  CheckCircle2,
  UtensilsCrossed,
  DollarSign,
  Filter,
  Eye,
  Receipt,
  Flame,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  MapPin,
  RefreshCw,
} from 'lucide-react';

export const TableQRView: React.FC = () => {
  const {
    tables,
    tableOrders,
    settings,
    addTable,
    updateTable,
    deleteTable,
    updateTableOrderStatus,
    updateTablePaymentStatus,
    convertTableOrderToTransaction,
    cancelTableOrder,
    setIsCustomerMode,
    setActiveCustomerTable,
    showToast,
  } = usePOS();

  // Active Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'tables' | 'orders'>('tables');

  // Table Filters & Search
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');

  // Order Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('active');

  // Modals state
  const [selectedTableForStandee, setSelectedTableForStandee] = useState<TableConfig | null>(null);
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState<boolean>(false);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState<boolean>(false);

  const [selectedOrderDetails, setSelectedOrderDetails] = useState<TableOrder | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);

  // Add / Edit Table Modal State
  const [isTableFormOpen, setIsTableFormOpen] = useState<boolean>(false);
  const [editingTable, setEditingTable] = useState<TableConfig | null>(null);
  const [formTableNumber, setFormTableNumber] = useState<string>('');
  const [formTableName, setFormTableName] = useState<string>('');
  const [formLocation, setFormLocation] = useState<TableLocation>('Area Utama');
  const [formCapacity, setFormCapacity] = useState<number>(4);

  // Filtered Tables
  const filteredTables = tables.filter((t) => {
    const matchesLoc = selectedLocation === 'all' || t.location === selectedLocation;
    const matchesSearch =
      t.tableNumber.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
      t.tableName.toLowerCase().includes(searchTableQuery.toLowerCase());
    return matchesLoc && matchesSearch;
  });

  // Filtered Orders
  const filteredOrders = tableOrders.filter((o) => {
    if (orderStatusFilter === 'active') {
      return o.orderStatus === 'pending' || o.orderStatus === 'cooking' || o.orderStatus === 'ready';
    }
    if (orderStatusFilter === 'all') return true;
    return o.orderStatus === orderStatusFilter;
  });

  // Stats calculation
  const totalTables = tables.length;
  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const activeOrdersCount = tableOrders.filter(
    (o) => o.orderStatus === 'pending' || o.orderStatus === 'cooking' || o.orderStatus === 'ready'
  ).length;

  const todayOrders = tableOrders.filter((o) => {
    const orderDate = new Date(o.createdAt).toDateString();
    const today = new Date().toDateString();
    return orderDate === today && o.orderStatus !== 'cancelled';
  });
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);

  const handleOpenCustomerMode = (tableNumber: string) => {
    setActiveCustomerTable(tableNumber);
    setIsCustomerMode(true);
  };

  const handleOpenAddTable = () => {
    setEditingTable(null);
    const nextNum = tables.length + 1;
    setFormTableNumber(`Meja ${nextNum < 10 ? '0' + nextNum : nextNum}`);
    setFormTableName(`Meja Tamu ${nextNum}`);
    setFormLocation('Area Utama');
    setFormCapacity(4);
    setIsTableFormOpen(true);
  };

  const handleOpenEditTable = (table: TableConfig) => {
    setEditingTable(table);
    setFormTableNumber(table.tableNumber);
    setFormTableName(table.tableName);
    setFormLocation(table.location);
    setFormCapacity(table.capacity);
    setIsTableFormOpen(true);
  };

  const handleSaveTableForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTableNumber.trim()) {
      showToast('Nomor meja wajib diisi', 'error');
      return;
    }

    if (editingTable) {
      updateTable(editingTable.id, {
        tableNumber: formTableNumber.trim(),
        tableName: formTableName.trim(),
        location: formLocation,
        capacity: formCapacity,
      });
    } else {
      addTable({
        tableNumber: formTableNumber.trim(),
        tableName: formTableName.trim(),
        location: formLocation,
        capacity: formCapacity,
        status: 'available',
      });
    }
    setIsTableFormOpen(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Fast Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#166534]/10 text-[#166534]">
              <QrCode className="w-6 h-6 text-[#166534]" />
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-[#1C1917] tracking-tight">
              QR Meja & Pesanan Pelanggan
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#166534] text-white">
              Self-Ordering
            </span>
          </div>
          <p className="text-xs md:text-sm text-[#78716C] mt-1">
            Cetak QR standee meja, kelola antrian pesanan real-time dari meja tamu, dan sinkronisasi pembayaran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setIsBatchPrintOpen(true);
              setIsStandeeModalOpen(true);
            }}
            id="btn-batch-print-qr"
            className="px-4 py-2.5 bg-white hover:bg-stone-50 border border-[#E7E5E4] text-[#1C1917] text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#166534]" />
            <span>Cetak Semua Standee Meja</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddTable}
            id="btn-add-table"
            className="px-4 py-2.5 bg-[#166534] hover:bg-[#14532d] active:scale-98 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Meja Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-green-50 text-[#166534] flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#78716C] uppercase">Total Meja QR</p>
            <p className="text-lg md:text-xl font-bold text-[#1C1917]">{totalTables} Meja</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#78716C] uppercase">Meja Terisi</p>
            <p className="text-lg md:text-xl font-bold text-[#1C1917]">
              {occupiedTables} / {totalTables}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#78716C] uppercase">Pesanan Aktif Dapur</p>
            <div className="flex items-center gap-2">
              <p className="text-lg md:text-xl font-bold text-blue-700">{activeOrdersCount} Pesanan</p>
              {activeOrdersCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#78716C] uppercase">Omset QR Hari Ini</p>
            <p className="text-lg md:text-xl font-bold text-[#166534]">
              {formatCurrency(todayRevenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Tab Navigator */}
      <div className="flex border-b border-[#E7E5E4] gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('tables')}
          className={`pb-3 px-4 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'tables'
              ? 'border-[#166534] text-[#166534]'
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Daftar Meja & QR Standee ({tables.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('orders')}
          className={`pb-3 px-4 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'orders'
              ? 'border-[#166534] text-[#166534]'
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Live Pesanan Masuk Meja</span>
          {activeOrdersCount > 0 && (
            <span className="px-2 py-0.2 bg-[#DC2626] text-white rounded-full text-[10px] font-bold">
              {activeOrdersCount}
            </span>
          )}
        </button>
      </div>

      {/* SUBTAB 1: TABLES LIST & QR GENERATOR */}
      {activeSubTab === 'tables' && (
        <div className="space-y-4">
          {/* Controls / Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#E7E5E4] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78716C]" />
              <input
                type="text"
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                placeholder="Cari nomor / nama meja..."
                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-[#E7E5E4] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#166534]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {['all', 'Area Utama', 'Lantai 2', 'Outdoor', 'VIP Lesehan'].map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setSelectedLocation(loc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedLocation === loc
                      ? 'bg-[#166534] text-white'
                      : 'bg-stone-100 text-[#78716C] hover:bg-stone-200'
                  }`}
                >
                  {loc === 'all' ? 'Semua Area' : loc}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Tables */}
          {filteredTables.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-[#E7E5E4] space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#166534] flex items-center justify-center mx-auto border border-emerald-200">
                <QrCode className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-base text-[#1C1917]">Belum Ada Meja Terdaftar</h4>
              <p className="text-xs text-[#78716C] max-w-md mx-auto">
                Tambahkan nomor meja warung / resto Anda untuk menghasilkan kode QR otomatis dan mengaktifkan pesanan mandiri tamu.
              </p>
              <button
                type="button"
                onClick={handleOpenAddTable}
                className="mt-2 px-5 py-2.5 bg-[#166534] hover:bg-[#14532d] active:scale-98 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer inline-flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Meja Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTables.map((t) => {
                const activeOrder = tableOrders.find(
                  (o) =>
                    o.tableNumber.toLowerCase() === t.tableNumber.toLowerCase() &&
                    (o.orderStatus === 'pending' || o.orderStatus === 'cooking' || o.orderStatus === 'ready')
                );

                return (
                  <div
                    key={t.id}
                    className={`bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                      t.status === 'occupied'
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-[#E7E5E4]'
                    }`}
                  >
                    <div>
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-[#166534] text-white flex items-center justify-center font-black text-sm shadow-xs">
                            {t.tableNumber.replace(/[^0-9]/g, '') || 'QR'}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-[#1C1917] leading-tight">
                              {t.tableNumber}
                            </h4>
                            <p className="text-[11px] text-[#78716C] truncate max-w-[130px]">
                              {t.tableName}
                            </p>
                          </div>
                        </div>

                        {/* Status badge and Action Icons */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'occupied'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {t.status === 'occupied' ? 'Terisi' : 'Tersedia'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditTable(t)}
                            className="p-1 text-[#78716C] hover:text-[#166534] hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
                            title="Edit Meja"
                          >
                            <span className="sr-only">Edit</span>
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus meja "${t.tableNumber}"?`)) {
                                deleteTable(t.id);
                              }
                            }}
                            className="p-1 text-[#78716C] hover:text-[#DC2626] hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                            title="Hapus Meja"
                          >
                            <span className="sr-only">Hapus</span>
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Location & Capacity */}
                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-[#78716C]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#166534]" />
                          {t.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[#78716C]" />
                          {t.capacity} Kursi
                        </span>
                      </div>

                      {/* Active Order Notice if Occupied */}
                      {activeOrder && (
                        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs">
                          <div className="flex items-center justify-between text-amber-900 font-bold">
                            <span>{activeOrder.customerName}</span>
                            <span>{formatCurrency(activeOrder.total)}</span>
                          </div>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            {activeOrder.itemCount} Item • {activeOrder.orderStatus.toUpperCase()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTableForStandee(t);
                          setIsBatchPrintOpen(false);
                          setIsStandeeModalOpen(true);
                        }}
                        className="px-2.5 py-2 bg-stone-100 hover:bg-stone-200 text-[#1C1917] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#166534]" />
                        <span>Cetak QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCustomerMode(t.tableNumber)}
                        className="px-2.5 py-2 bg-[#166534]/10 hover:bg-[#166534]/20 text-[#166534] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Tes Scan</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: LIVE ORDERS FROM TABLES */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          {/* Order Status Filters */}
          <div className="bg-white p-3 rounded-2xl border border-[#E7E5E4] shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setOrderStatusFilter('active')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  orderStatusFilter === 'active'
                    ? 'bg-[#166534] text-white'
                    : 'bg-stone-100 text-[#78716C] hover:bg-stone-200'
                }`}
              >
                Aktif Dapur ({activeOrdersCount})
              </button>
              <button
                type="button"
                onClick={() => setOrderStatusFilter('pending')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  orderStatusFilter === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-100 text-[#78716C] hover:bg-stone-200'
                }`}
              >
                Menunggu
              </button>
              <button
                type="button"
                onClick={() => setOrderStatusFilter('cooking')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  orderStatusFilter === 'cooking'
                    ? 'bg-blue-600 text-white'
                    : 'bg-stone-100 text-[#78716C] hover:bg-stone-200'
                }`}
              >
                Sedang Dimasak
              </button>
              <button
                type="button"
                onClick={() => setOrderStatusFilter('ready')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  orderStatusFilter === 'ready'
                    ? 'bg-purple-600 text-white'
                    : 'bg-stone-100 text-[#78716C] hover:bg-stone-200'
                }`}
              >
                Siap Saji
              </button>
              <button
                type="button"
                onClick={() => setOrderStatusFilter('completed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  orderStatusFilter === 'completed'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-100 text-[#78716C] hover:bg-stone-200'
                }`}
              >
                Selesai
              </button>
              <button
                type="button"
                onClick={() => setOrderStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  orderStatusFilter === 'all'
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-[#78716C] hover:bg-stone-200'
                }`}
              >
                Semua Riwayat
              </button>
            </div>
          </div>

          {/* Orders Cards Grid */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-[#E7E5E4] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 text-[#78716C] flex items-center justify-center mx-auto">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[#1C1917]">Tidak Ada Pesanan Meja</h4>
              <p className="text-xs text-[#78716C] max-w-sm mx-auto">
                Belum ada pesanan dari scan QR meja untuk kategori filter ini. Anda dapat menguji fitur dengan tombol "Tes Scan" di atas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border border-[#E7E5E4] p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#166534] text-white flex items-center justify-center font-black text-sm shadow-xs">
                          {ord.tableNumber.replace(/[^0-9]/g, '') || 'QR'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-[#1C1917]">{ord.tableNumber}</h4>
                            <span className="text-[11px] font-mono text-[#78716C]">#{ord.id}</span>
                          </div>
                          <p className="text-xs text-[#78716C]">
                            {ord.customerName} • {formatTime(new Date(ord.createdAt))} WIB
                          </p>
                        </div>
                      </div>

                      {/* Status */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          ord.orderStatus === 'pending'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : ord.orderStatus === 'cooking'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : ord.orderStatus === 'ready'
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : ord.orderStatus === 'completed'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-red-100 text-red-900'
                        }`}
                      >
                        {ord.orderStatus === 'pending'
                          ? 'Menunggu'
                          : ord.orderStatus === 'cooking'
                          ? 'Dimasak'
                          : ord.orderStatus === 'ready'
                          ? 'Siap Saji'
                          : ord.orderStatus === 'completed'
                          ? 'Selesai'
                          : 'Batal'}
                      </span>
                    </div>

                    {/* Items preview */}
                    <div className="bg-stone-50 rounded-xl p-2.5 space-y-1 text-xs">
                      {ord.items.slice(0, 3).map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[#1C1917]">
                          <span className="truncate">
                            <span className="font-bold text-[#166534]">{it.quantity}x</span> {it.name}
                          </span>
                          <span className="font-semibold text-[11px] text-[#78716C]">
                            {formatCurrency(it.subtotal)}
                          </span>
                        </div>
                      ))}
                      {ord.items.length > 3 && (
                        <p className="text-[10px] text-[#78716C] italic">
                          +{ord.items.length - 3} item menu lainnya...
                        </p>
                      )}
                    </div>

                    {/* Payment info */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-100">
                      <div>
                        <span className="text-[10px] uppercase text-[#78716C] font-bold block">
                          Metode Bayar
                        </span>
                        <span className="font-semibold text-[#1C1917]">
                          {ord.paymentStatus === 'paid_qris'
                            ? 'QRIS (Lunas)'
                            : ord.paymentStatus === 'paid_transfer'
                            ? 'Transfer (Lunas)'
                            : 'Tunai di Kasir'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-[#78716C] font-bold block">
                          Total
                        </span>
                        <span className="font-black text-sm text-[#166534]">
                          {formatCurrency(ord.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-stone-100">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderDetails(ord);
                          setIsOrderModalOpen(true);
                        }}
                        className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-[#1C1917] text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Rincian</span>
                      </button>

                      {ord.orderStatus === 'pending' && (
                        <button
                          type="button"
                          onClick={() => updateTableOrderStatus(ord.id, 'cooking')}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                        >
                          <ChefHat className="w-3.5 h-3.5" />
                          <span>Masak</span>
                        </button>
                      )}

                      {ord.orderStatus === 'cooking' && (
                        <button
                          type="button"
                          onClick={() => updateTableOrderStatus(ord.id, 'ready')}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                        >
                          <UtensilsCrossed className="w-3.5 h-3.5" />
                          <span>Siap Saji</span>
                        </button>
                      )}

                      {ord.orderStatus === 'ready' && (
                        <button
                          type="button"
                          onClick={() => convertTableOrderToTransaction(ord.id)}
                          className="px-3 py-2 bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Selesai/Bayar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Standee Generator / Batch Print */}
      <TableStandeeModal
        isOpen={isStandeeModalOpen}
        onClose={() => setIsStandeeModalOpen(false)}
        table={selectedTableForStandee}
        settings={settings}
        allTables={tables}
        isBatchMode={isBatchPrintOpen}
        onOpenCustomerView={handleOpenCustomerMode}
      />

      {/* Modal: Order Details */}
      <TableOrderDetailsModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        order={selectedOrderDetails}
        onUpdateStatus={updateTableOrderStatus}
        onUpdatePayment={updateTablePaymentStatus}
        onConvertToTransaction={convertTableOrderToTransaction}
        onCancelOrder={cancelTableOrder}
      />

      {/* Modal: Add/Edit Table */}
      {isTableFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-[#1C1917]">
              {editingTable ? 'Edit Konfigurasi Meja' : 'Tambah Meja Baru'}
            </h3>

            <form onSubmit={handleSaveTableForm} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#1C1917] block mb-1">
                  Nomor Meja (Display)
                </label>
                <input
                  type="text"
                  required
                  value={formTableNumber}
                  onChange={(e) => setFormTableNumber(e.target.value)}
                  placeholder="Contoh: Meja 13"
                  className="w-full px-3.5 py-2.5 border border-[#E7E5E4] rounded-xl text-xs focus:outline-none focus:border-[#166534]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#1C1917] block mb-1">
                  Nama Meja / Keterangan
                </label>
                <input
                  type="text"
                  value={formTableName}
                  onChange={(e) => setFormTableName(e.target.value)}
                  placeholder="Contoh: Meja Sudut Teras"
                  className="w-full px-3.5 py-2.5 border border-[#E7E5E4] rounded-xl text-xs focus:outline-none focus:border-[#166534]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1C1917] block mb-1">
                    Area Lokasi
                  </label>
                  <select
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value as TableLocation)}
                    className="w-full px-3 py-2.5 border border-[#E7E5E4] rounded-xl text-xs focus:outline-none focus:border-[#166534] bg-white"
                  >
                    <option value="Area Utama">Area Utama</option>
                    <option value="Lantai 2">Lantai 2</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="VIP Lesehan">VIP Lesehan</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1C1917] block mb-1">
                    Kapasitas Kursi
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-[#E7E5E4] rounded-xl text-xs focus:outline-none focus:border-[#166534]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsTableFormOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-[#1C1917] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold rounded-xl transition-colors shadow-md cursor-pointer"
                >
                  Simpan Meja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
