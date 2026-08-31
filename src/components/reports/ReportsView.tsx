import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { formatRupiah, formatDateTime } from '../../utils/formatters';
import {
  BarChart3,
  Calendar,
  Download,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  PieChart,
  Percent,
  Wallet,
  ShoppingBag,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { transactions, menuItems } = usePOS();

  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('month');

  // Filter transactions based on date range
  const filteredTransactions = useMemo(() => {
    const valid = transactions.filter((t) => t.status === 'completed');
    const now = new Date();

    if (dateRange === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return valid.filter((t) => new Date(t.createdAt) >= start);
    }
    if (dateRange === 'yesterday') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return valid.filter((t) => {
        const d = new Date(t.createdAt);
        return d >= start && d < end;
      });
    }
    if (dateRange === 'week') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      return valid.filter((t) => new Date(t.createdAt) >= start);
    }
    if (dateRange === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return valid.filter((t) => new Date(t.createdAt) >= start);
    }
    return valid;
  }, [transactions, dateRange]);

  // Financial Metrics
  const summary = useMemo(() => {
    const grossSales = filteredTransactions.reduce((s, t) => s + t.subtotal, 0);
    const totalDiscount = filteredTransactions.reduce((s, t) => s + (t.discountAmount || 0), 0);
    const totalTax = filteredTransactions.reduce((s, t) => s + (t.taxAmount || 0), 0);
    const netRevenue = filteredTransactions.reduce((s, t) => s + t.total, 0);
    const txCount = filteredTransactions.length;
    const totalPorsi = filteredTransactions.reduce((s, t) => s + t.itemCount, 0);

    // Calculate approximate COGS (HPP)
    let totalCOGS = 0;
    filteredTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        const menuItem = menuItems.find((m) => m.id === item.menuId);
        const cost = menuItem?.costPrice || item.costPrice || item.price * 0.6;
        totalCOGS += cost * item.quantity;
      });
    });

    const grossProfit = netRevenue - totalCOGS - totalTax;
    const marginPercent = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 100) : 0;

    // Payment methods breakdown
    const paymentMap: Record<string, { count: number; total: number }> = {
      cash: { count: 0, total: 0 },
      qris: { count: 0, total: 0 },
      transfer: { count: 0, total: 0 },
      debit: { count: 0, total: 0 },
    };

    filteredTransactions.forEach((t) => {
      if (paymentMap[t.paymentMethod]) {
        paymentMap[t.paymentMethod].count += 1;
        paymentMap[t.paymentMethod].total += t.total;
      }
    });

    return {
      grossSales,
      totalDiscount,
      totalTax,
      netRevenue,
      txCount,
      totalPorsi,
      totalCOGS,
      grossProfit,
      marginPercent,
      paymentMap,
    };
  }, [filteredTransactions, menuItems]);

  // Export CSV
  const handleExportCSV = () => {
    const delimiter = ';';
    const escapeCsvValue = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'No. Invoice',
      'Tanggal & Waktu',
      'Kasir',
      'Tipe Pesanan',
      'Metode Bayar',
      'Subtotal (Rp)',
      'Diskon (Rp)',
      'PPN (Rp)',
      'Total Akhir (Rp)',
      'Status',
    ];
    const rows = filteredTransactions.map((tx) => {
      const paymentMethod =
        tx.paymentMethod === 'cash'
          ? 'Tunai'
          : tx.paymentMethod === 'qris'
            ? 'QRIS'
            : tx.paymentMethod === 'transfer'
              ? 'Transfer Bank'
              : 'Debit / EDC';

      return [
        tx.invoiceNumber,
        formatDateTime(tx.createdAt),
        tx.cashierName,
        tx.orderType === 'dine_in' ? 'Makan di Tempat' : 'Bawa Pulang',
        paymentMethod,
        tx.subtotal,
        tx.discountAmount || 0,
        tx.taxAmount || 0,
        tx.total,
        tx.status === 'completed' ? 'Selesai' : 'Dibatalkan',
      ].map(escapeCsvValue).join(delimiter);
    });

    const csv = '\uFEFF' + [headers.map(escapeCsvValue).join(delimiter), ...rows].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Penjualan_Mie_Aceh_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#FFFDF7] space-y-6 text-[#1C1917]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#166534]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
              Laporan Keuangan & Penjualan
            </h2>
          </div>
          <p className="text-xs text-[#78716C] mt-1">
            Analisis omset kotor, laba bersih (estimasi HPP modal), pajak, dan metode pembayaran
          </p>
        </div>

        {/* Date Filter & Export Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[#FFFDF7] p-1 rounded-xl border border-[#E7E5E4] flex text-xs font-semibold">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'yesterday', label: 'Kemarin' },
              { id: 'week', label: '7 Hari' },
              { id: 'month', label: 'Bulan Ini' },
              { id: 'all', label: 'Semua' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateRange(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateRange === tab.id
                    ? 'bg-[#166534] text-white shadow-xs font-bold'
                    : 'text-[#78716C] hover:text-[#166534]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            id="export-csv-btn"
            className="px-4 py-2.5 bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omset */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs">
          <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
            Total Omset Bersih
          </span>
          <div className="text-2xl font-black font-mono text-[#166534] mt-2">
            {formatRupiah(summary.netRevenue)}
          </div>
          <p className="text-xs text-[#78716C] mt-1">
            Dari {summary.txCount} transaksi berhasil
          </p>
        </div>

        {/* Laba Kotor */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs">
          <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
            Estimasi Laba Kotor
          </span>
          <div className="text-2xl font-black font-mono text-[#166534] mt-2">
            {formatRupiah(summary.grossProfit)}
          </div>
          <p className="text-xs text-[#166534] font-semibold mt-1">
            Margin Laba: ~{summary.marginPercent}%
          </p>
        </div>

        {/* Total HPP Modal */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs">
          <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
            Estimasi Modal HPP Bahan
          </span>
          <div className="text-2xl font-black font-mono text-[#1C1917] mt-2">
            {formatRupiah(summary.totalCOGS)}
          </div>
          <p className="text-xs text-[#78716C] mt-1">
            Biaya bahan baku {summary.totalPorsi} porsi
          </p>
        </div>

        {/* Pajak & Diskon */}
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs">
          <span className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
            Pajak PPN & Diskon
          </span>
          <div className="text-xl font-bold font-mono text-[#1C1917] mt-2">
            Pajak: {formatRupiah(summary.totalTax)}
          </div>
          <p className="text-xs text-[#DC2626] font-mono mt-0.5">
            Diskon: -{formatRupiah(summary.totalDiscount)}
          </p>
        </div>
      </div>

      {/* Payment breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-4">
        <h3 className="font-bold text-[#1C1917] text-base">Rincian Penerimaan Kas Berdasarkan Metode Bayar</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {[
            { id: 'cash', label: '💵 Tunai (Cash)', data: summary.paymentMap.cash },
            { id: 'qris', label: '📱 QRIS Standar', data: summary.paymentMap.qris },
            { id: 'transfer', label: '🏦 Transfer Bank', data: summary.paymentMap.transfer },
            { id: 'debit', label: '💳 Debit / EDC', data: summary.paymentMap.debit },
          ].map((item) => (
            <div key={item.id} className="p-4 bg-[#FFFDF7] rounded-xl border border-[#E7E5E4] space-y-1">
              <span className="text-xs font-bold text-[#1C1917]">{item.label}</span>
              <div className="text-xl font-black font-mono text-[#166534]">
                {formatRupiah(item.data.total)}
              </div>
              <p className="text-[11px] text-[#78716C] font-semibold">
                {item.data.count} kali transaksi
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
