import React, { useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { DEFAULT_MENU_IMAGE, formatRupiah, formatDateTime } from '../../utils/formatters';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  Utensils,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Eye,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { transactions, menuItems, inventory, settings, setActiveTab, setSelectedReceipt } = usePOS();

  // Calculations for Dashboard
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const validTx = transactions.filter((t) => t.status === 'completed');

    // Today's transactions
    const todayTx = validTx.filter((t) => new Date(t.createdAt) >= today);
    const todaySales = todayTx.reduce((sum, t) => sum + t.total, 0);
    const todayCount = todayTx.length;
    const todayItemsSold = todayTx.reduce((sum, t) => sum + t.itemCount, 0);

    // This month's transactions
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthTx = validTx.filter((t) => new Date(t.createdAt) >= startOfMonth);
    const monthSales = monthTx.reduce((sum, t) => sum + t.total, 0);

    // Average Order Value
    const aov = todayCount > 0 ? Math.round(todaySales / todayCount) : 0;

    // 7-day revenue trend
    const last7Days: { dateStr: string; label: string; total: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const dayTx = validTx.filter((t) => {
        const txDate = new Date(t.createdAt);
        return txDate >= d && txDate < nextD;
      });

      const dayTotal = dayTx.reduce((sum, t) => sum + t.total, 0);
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      last7Days.push({
        dateStr: d.toISOString().split('T')[0],
        label: i === 0 ? 'Hari Ini' : `${dayNames[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`,
        total: dayTotal,
        count: dayTx.length,
      });
    }

    // Top selling items
    const itemSalesMap: Record<string, { name: string; category: string; qty: number; revenue: number; image: string }> = {};
    validTx.forEach((tx) => {
      tx.items.forEach((item) => {
        if (!itemSalesMap[item.menuId]) {
          itemSalesMap[item.menuId] = {
            name: item.name,
            category: item.category,
            qty: 0,
            revenue: 0,
            image: item.image,
          };
        }
        itemSalesMap[item.menuId].qty += item.quantity;
        itemSalesMap[item.menuId].revenue += item.subtotal;
      });
    });

    const topItems = Object.values(itemSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Sales by Category
    const categoryTotals: Record<string, number> = {};
    validTx.forEach((tx) => {
      tx.items.forEach((item) => {
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.subtotal;
      });
    });

    const totalCategoryRev = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;
    const categoryBreakdown = Object.entries(categoryTotals).map(([cat, total]) => ({
      category: cat,
      label: cat === 'mie-aceh' ? 'Mie Aceh' : cat === 'nasi' ? 'Nasi & Nasi Goreng' : cat === 'martabak' ? 'Martabak' : cat === 'roti-cane' ? 'Roti Cane' : cat === 'minuman' ? 'Minuman Khas' : 'Tambahan',
      total,
      percentage: Math.round((total / totalCategoryRev) * 100),
    })).sort((a, b) => b.total - a.total);

    return {
      todaySales,
      todayCount,
      todayItemsSold,
      monthSales,
      aov,
      last7Days,
      topItems,
      categoryBreakdown,
      recentTransactions: transactions.slice(0, 6),
    };
  }, [transactions]);

  const max7DayTotal = Math.max(...stats.last7Days.map((d) => d.total), 100000);
  const lowStockItems = inventory.filter((item) => item.status !== 'safe');

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#FFFDF7] space-y-6 text-[#1C1917]">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#166534] p-6 rounded-2xl text-white shadow-md">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Dashboard Pemilik & Ringkasan Penjualan</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {settings.storeName || 'Sistem POS & Kasir'}
          </h2>
          <p className="text-xs text-emerald-100/80 mt-1">
            Pantau omset harian, tren transaksi, dan status inventaris secara real-time.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('pos')}
          className="px-6 py-3.5 bg-white text-[#166534] hover:bg-stone-50 active:scale-95 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer self-start sm:self-auto uppercase tracking-wider"
        >
          <Receipt className="w-4 h-4" />
          <span>Buka Mesin Kasir</span>
        </button>
      </div>

      {/* Low Stock Warning Banner if any */}
      {lowStockItems.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-amber-950 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm text-[#1C1917]">
                Perhatian: {lowStockItems.length} Bahan/Bumbu Menipis atau Habis!
              </p>
              <p className="text-xs text-[#78716C] mt-0.5">
                {lowStockItems.map((i) => `${i.name} (${i.currentStock} ${i.unit})`).slice(0, 3).join(', ')}
                {lowStockItems.length > 3 ? '...' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('inventory')}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            Kelola Stok
          </button>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Omset Hari Ini */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
              Penjualan Hari Ini
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#166534]/10 text-[#166534] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-[#166534]">
              {formatRupiah(stats.todaySales)}
            </div>
            <div className="flex items-center gap-1 text-xs text-[#166534] font-semibold mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{stats.todayCount} transaksi hari ini</span>
            </div>
          </div>
        </div>

        {/* Card 2: Jumlah Transaksi */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
              Transaksi Hari Ini
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-[#1C1917]">
              {stats.todayCount} <span className="text-sm font-normal text-[#78716C]">Struk</span>
            </div>
            <div className="text-xs text-[#78716C] font-medium mt-1">
              Rata-rata: <span className="font-bold text-[#1C1917]">{formatRupiah(stats.aov)}</span>/struk
            </div>
          </div>
        </div>

        {/* Card 3: Omset Bulan Ini */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
              Omset Bulan Berjalan
            </span>
            <div className="w-9 h-9 rounded-xl bg-stone-100 text-[#1C1917] flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-[#1C1917]">
              {formatRupiah(stats.monthSales)}
            </div>
            <div className="text-xs text-[#78716C] font-medium mt-1">
              Akumulasi bulan ini
            </div>
          </div>
        </div>

        {/* Card 4: Porsi Terjual */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
              Porsi / Item Terjual
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-[#1C1917]">
              {stats.todayItemsSold} <span className="text-sm font-normal text-[#78716C]">Porsi</span>
            </div>
            <div className="text-xs text-[#166534] font-semibold mt-1">
              Dapur berjalan normal
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: 7-Day Revenue Trend & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 7 Days Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#1C1917] text-base">Tren Pendapatan 7 Hari Terakhir</h3>
              <p className="text-xs text-[#78716C]">Aktivitas penjualan per hari</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#166534] font-bold bg-[#166534]/10 px-3 py-1 rounded-full">
              <Calendar className="w-3.5 h-3.5" />
              <span>7 Hari Terakhir</span>
            </div>
          </div>

          {/* Bar Chart Representation */}
          <div className="pt-6 pb-2">
            <div className="h-52 flex items-end justify-between gap-2 sm:gap-4 border-b border-[#E7E5E4] pb-2">
              {stats.last7Days.map((day, idx) => {
                const heightPercent = Math.max(8, Math.round((day.total / max7DayTotal) * 100));
                const isToday = idx === stats.last7Days.length - 1;

                return (
                  <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    {/* Tooltip value */}
                    <div className="text-[10px] font-mono font-bold text-[#1C1917] opacity-0 group-hover:opacity-100 transition-opacity bg-stone-100 px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap">
                      {formatRupiah(day.total)}
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[42px] rounded-t-xl transition-all duration-300 relative ${
                        isToday
                          ? 'bg-[#166534] group-hover:bg-[#14532d]'
                          : 'bg-[#166534]/30 group-hover:bg-[#166534]/60'
                      }`}
                    >
                      {day.count > 0 && (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#78716C] font-mono hidden sm:block">
                          {day.count} tx
                        </span>
                      )}
                    </div>

                    {/* Date label */}
                    <span className={`text-[10px] sm:text-xs font-semibold truncate ${
                      isToday ? 'text-[#166534] font-bold' : 'text-[#78716C]'
                    }`}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Sales by Category */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-[#1C1917] text-base">Kontribusi Kategori Menu</h3>
            <p className="text-xs text-[#78716C]">Porsi penjualan per jenis menu</p>
          </div>

          <div className="space-y-3 pt-2">
            {stats.categoryBreakdown.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-[#1C1917]">
                  <span>{item.label}</span>
                  <span className="font-mono text-[#166534]">{formatRupiah(item.total)} ({item.percentage}%)</span>
                </div>
                <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.percentage}%` }}
                    className="h-full bg-[#166534] rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Top Selling Menu & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Best Sellers */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#1C1917] text-base flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#DC2626]" />
                <span>Menu Terlaris</span>
              </h3>
              <p className="text-xs text-[#78716C]">Favorit pelanggan warung</p>
            </div>
            <button
              onClick={() => setActiveTab('menu')}
              className="text-xs font-bold text-[#166534] hover:underline cursor-pointer"
            >
              Lihat Menu
            </button>
          </div>

          <div className="space-y-3">
            {stats.topItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#FFFDF7] transition-colors">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  idx === 0
                    ? 'bg-amber-500 text-stone-950'
                    : idx === 1
                    ? 'bg-stone-200 text-stone-800'
                    : idx === 2
                    ? 'bg-amber-800/20 text-amber-900'
                    : 'text-[#78716C]'
                }`}>
                  #{idx + 1}
                </span>

                <img
                  src={item.image || DEFAULT_MENU_IMAGE}
                  alt={item.name}
                  className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[#E7E5E4]"
                />

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-[#1C1917] truncate">{item.name}</h4>
                  <p className="text-[11px] text-[#78716C] font-mono">
                    {item.qty} porsi terjual • {formatRupiah(item.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions Feed */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#1C1917] text-base">Riwayat Transaksi Terkini</h3>
              <p className="text-xs text-[#78716C]">Aktivitas kasir terbaru</p>
            </div>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-xs font-bold text-[#166534] hover:underline cursor-pointer"
            >
              Semua Transaksi
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E7E5E4] text-[#78716C] font-bold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 px-2">No. Invoice</th>
                  <th className="pb-3 px-2">Waktu</th>
                  <th className="pb-3 px-2">Tipe / Meja</th>
                  <th className="pb-3 px-2">Total</th>
                  <th className="pb-3 px-2">Metode</th>
                  <th className="pb-3 px-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {stats.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#FFFDF7] transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-[#1C1917]">
                      {tx.invoiceNumber}
                    </td>
                    <td className="py-3 px-2 text-[#78716C]">
                      {formatDateTime(tx.createdAt)}
                    </td>
                    <td className="py-3 px-2">
                      {tx.orderType === 'dine_in' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#166534]/10 text-[#166534]">
                          {tx.tableNumber || 'Dine-In'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-[#1C1917]">
                          Bawa Pulang
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 font-mono font-bold text-[#166534]">
                      {formatRupiah(tx.total)}
                    </td>
                    <td className="py-3 px-2 uppercase font-semibold text-[#78716C] text-[11px]">
                      {tx.paymentMethod}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => setSelectedReceipt(tx)}
                        className="p-1 text-[#166534] hover:bg-[#166534]/10 rounded-lg transition-colors cursor-pointer"
                        title="Lihat Struk"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
