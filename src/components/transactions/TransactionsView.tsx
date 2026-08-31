import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Transaction } from '../../types';
import { formatRupiah, formatDateTime } from '../../utils/formatters';
import { ReceiptModal } from '../common/ReceiptModal';
import { Modal } from '../common/Modal';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  Ban,
  Calendar,
  CreditCard,
  User,
  ArrowUpDown,
  Download,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { transactions, currentUser, cancelTransaction, selectedReceipt, setSelectedReceipt, exportTransactionsCSV } = usePOS();
  const isAdmin = currentUser?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterOrderType, setFilterOrderType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Void/Cancel modal state
  const [txToCancel, setTxToCancel] = useState<Transaction | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Pelanggan salah pesan / batal');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchInvoice = tx.invoiceNumber.toLowerCase().includes(q);
        const matchCustomer = tx.customerName?.toLowerCase().includes(q);
        const matchCashier = tx.cashierName.toLowerCase().includes(q);
        const matchItem = tx.items.some((i) => i.name.toLowerCase().includes(q));
        if (!matchInvoice && !matchCustomer && !matchCashier && !matchItem) return false;
      }
      // Payment
      if (filterPayment !== 'all' && tx.paymentMethod !== filterPayment) return false;
      // Order type
      if (filterOrderType !== 'all' && tx.orderType !== filterOrderType) return false;
      // Status
      if (filterStatus !== 'all' && tx.status !== filterStatus) return false;

      return true;
    });
  }, [transactions, searchQuery, filterPayment, filterOrderType, filterStatus]);

  const totalFilteredRevenue = filteredTransactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.total, 0);

  const handleConfirmCancel = async () => {
    if (!txToCancel) return;
    await cancelTransaction(txToCancel.id, cancelReason);
    setTxToCancel(null);
  };

  const handleExportCSV = () => {
    exportTransactionsCSV(filteredTransactions);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#FFFDF7] space-y-6 text-[#1C1917]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#166534]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
              Riwayat Transaksi Penjualan
            </h2>
          </div>
          <p className="text-xs text-[#78716C] mt-1">
            Lihat semua arsip transaksi kasir, detail struk, dan pembatalan transaksi (void)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            id="export-transactions-csv-btn"
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#166534] border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-2xs"
          >
            <Download className="w-4 h-4 text-[#166534]" />
            <span>Ekspor CSV</span>
          </button>

          <div className="px-4 py-2 bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl text-right">
            <p className="text-[10px] text-[#78716C] font-bold uppercase tracking-wider">
              Total Penjualan Sesuai Filter
            </p>
            <p className="text-lg font-black font-mono text-[#166534]">
              {formatRupiah(totalFilteredRevenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no. invoice, menu, kasir..."
              className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1C1917] placeholder-[#78716C]/60 focus:border-[#166534] focus:ring-1 focus:ring-[#166534] outline-hidden"
            />
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:border-[#166534] outline-hidden"
            >
              <option value="all">Semua Metode Pembayaran</option>
              <option value="cash">Tunai (Cash)</option>
              <option value="qris">QRIS</option>
              <option value="transfer">Transfer Bank</option>
              <option value="debit">Debit / EDC</option>
            </select>
          </div>

          {/* Order Type Filter */}
          <div>
            <select
              value={filterOrderType}
              onChange={(e) => setFilterOrderType(e.target.value)}
              className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:border-[#166534] outline-hidden"
            >
              <option value="all">Semua Tipe Pesanan</option>
              <option value="dine_in">Makan di Tempat (Dine-In)</option>
              <option value="take_away">Bawa Pulang (Takeaway)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:border-[#166534] outline-hidden"
            >
              <option value="all">Semua Status Transaksi</option>
              <option value="completed">Selesai (Sukses)</option>
              <option value="cancelled">Dibatalkan (Void)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FFFDF7] border-b border-[#E7E5E4] text-[#78716C] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">No. Invoice</th>
                <th className="py-3.5 px-4">Waktu</th>
                <th className="py-3.5 px-4">Kasir</th>
                <th className="py-3.5 px-4">Tipe & Meja</th>
                <th className="py-3.5 px-4">Item Menu</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Metode</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#166534]" />
                    <p className="font-bold text-[#1C1917]">Tidak ada data transaksi yang sesuai filter</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#FFFDF7]/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#1C1917]">
                      {tx.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 text-[#78716C] whitespace-nowrap">
                      {formatDateTime(tx.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#1C1917]">
                      {tx.cashierName}
                    </td>
                    <td className="py-3.5 px-4">
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
                    <td className="py-3.5 px-4 max-w-[200px] truncate text-[#78716C]">
                      {tx.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#166534] whitespace-nowrap">
                      {formatRupiah(tx.total)}
                    </td>
                    <td className="py-3.5 px-4 uppercase font-bold text-[#78716C] text-[10px]">
                      {tx.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4">
                      {tx.status === 'completed' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-[#166534] border border-green-200">
                          Selesai
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#DC2626] border border-red-200" title={tx.cancelReason}>
                          Dibatalkan
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedReceipt(tx)}
                          className="p-1.5 text-[#166534] hover:bg-[#166534]/10 rounded-lg transition-colors cursor-pointer"
                          title="Lihat / Cetak Struk"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isAdmin && tx.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => setTxToCancel(tx)}
                            className="p-1.5 text-[#78716C] hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Batalkan / Void Transaksi"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel/Void Confirmation Modal */}
      {txToCancel && (
        <Modal
          isOpen={Boolean(txToCancel)}
          onClose={() => setTxToCancel(null)}
          title="Batalkan (Void) Transaksi"
          subtitle={`No. Invoice: ${txToCancel.invoiceNumber}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-[#1C1917]">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-900">
              <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Peringatan Pembatalan Transaksi</p>
                <p className="text-[11px] text-[#DC2626] mt-0.5">
                  Membatalkan transaksi akan mengembalikan stok menu makanan dan mencatat log pembatalan oleh Admin.
                </p>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1C1917] mb-1">
                Alasan Pembatalan:
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl p-2.5 text-xs text-[#1C1917] focus:border-[#DC2626] outline-hidden"
                rows={3}
                required
              />
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-[#E7E5E4]">
              <button
                type="button"
                onClick={() => setTxToCancel(null)}
                className="px-4 py-2 font-semibold text-[#78716C] hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-[#DC2626] hover:bg-[#b91c1c] text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                Konfirmasi Void Transaksi
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        transaction={selectedReceipt}
      />
    </div>
  );
};
