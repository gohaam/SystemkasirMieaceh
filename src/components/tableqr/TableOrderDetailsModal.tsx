import React from 'react';
import { TableOrder, TableOrderStatus, TablePaymentStatus, PaymentMethod } from '../../types';
import { formatCurrency, formatTime, formatDate } from '../../utils/formatters';
import {
  X,
  Clock,
  User,
  Phone,
  Utensils,
  CheckCircle2,
  ChefHat,
  AlertCircle,
  QrCode,
  DollarSign,
  Receipt,
  Printer,
  Ban,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface TableOrderDetailsModalProps {
  order: TableOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: TableOrderStatus) => void;
  onUpdatePayment: (orderId: string, paymentStatus: TablePaymentStatus) => void;
  onConvertToTransaction: (orderId: string, paymentMethod?: PaymentMethod) => void;
  onCancelOrder: (orderId: string, reason?: string) => void;
}

export const TableOrderDetailsModal: React.FC<TableOrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdatePayment,
  onConvertToTransaction,
  onCancelOrder,
}) => {
  if (!isOpen || !order) return null;

  const getStatusBadge = (status: TableOrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-700 animate-spin" />
            Menunggu Konfirmasi
          </span>
        );
      case 'cooking':
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-full text-xs font-bold flex items-center gap-1.5">
            <ChefHat className="w-3.5 h-3.5 text-blue-700" />
            Sedang Dimasak Dapur
          </span>
        );
      case 'ready':
        return (
          <span className="px-3 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5 text-purple-700" />
            Siap Disajikan
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Selesai / Sudah Dibayar
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-900 border border-red-300 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Ban className="w-3.5 h-3.5 text-red-700" />
            Dibatalkan
          </span>
        );
    }
  };

  const getPaymentBadge = (payStatus: TablePaymentStatus, method: PaymentMethod) => {
    switch (payStatus) {
      case 'paid_qris':
        return (
          <span className="px-2.5 py-1 bg-green-100 text-green-900 border border-green-300 rounded-full text-[11px] font-bold flex items-center gap-1">
            <QrCode className="w-3 h-3 text-green-700" />
            QRIS Digital (Lunas)
          </span>
        );
      case 'paid_transfer':
        return (
          <span className="px-2.5 py-1 bg-sky-100 text-sky-900 border border-sky-300 rounded-full text-[11px] font-bold">
            Transfer Bank (Lunas)
          </span>
        );
      case 'paid_cashier':
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[11px] font-bold">
            Bayar di Kasir (Tunai)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-red-100 text-red-900 border border-red-300 rounded-full text-[11px] font-bold">
            Belum Bayar
          </span>
        );
    }
  };

  const handlePrintKitchenSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-2xl max-w-2xl w-full overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E7E5E4] flex items-center justify-between bg-[#FFFDF7] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#166534] text-white flex items-center justify-center font-black text-sm shadow-xs">
              {order.tableNumber.replace(/[^0-9]/g, '') || 'QR'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#1C1917] text-base leading-tight">
                  Pesanan {order.tableNumber}
                </h3>
                <span className="text-xs font-mono text-[#78716C]">#{order.id}</span>
              </div>
              <p className="text-xs text-[#78716C] mt-0.5">
                {formatDate(new Date(order.createdAt))} • {formatTime(new Date(order.createdAt))} WIB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-[#78716C] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-stone-50/50">
          {/* Status & Customer Summary */}
          <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E7E5E4]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Status Dapur</span>
                <div className="mt-1">{getStatusBadge(order.orderStatus)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#78716C] block">Pembayaran</span>
                <div className="mt-1">{getPaymentBadge(order.paymentStatus, order.paymentMethod)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#166534]" />
                <span className="text-[#78716C]">Pemesan:</span>
                <span className="font-bold text-[#1C1917]">{order.customerName || 'Tamu Meja'}</span>
              </div>
              {order.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#166534]" />
                  <span className="text-[#78716C]">WhatsApp:</span>
                  <span className="font-bold text-[#1C1917]">{order.customerPhone}</span>
                </div>
              )}
            </div>

            {order.notes && (
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Catatan Meja:</span> {order.notes}
                </div>
              </div>
            )}
          </div>

          {/* Ordered Menu Items List */}
          <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-3">
            <h4 className="font-bold text-[#1C1917] text-xs uppercase tracking-wider flex items-center justify-between">
              <span>Daftar Menu Dipesan ({order.itemCount} Item)</span>
              <button
                type="button"
                onClick={handlePrintKitchenSlip}
                className="text-[#166534] hover:underline flex items-center gap-1 normal-case font-semibold text-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Tiket Dapur
              </button>
            </h4>

            <div className="divide-y divide-stone-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#166534]/10 text-[#166534] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {item.quantity}x
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-[#1C1917] leading-tight">{item.name}</h5>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {item.options?.cookingStyle && (
                          <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md text-[10px] font-semibold">
                            {item.options.cookingStyle}
                          </span>
                        )}
                        {item.options?.spiceLevel && (
                          <span className="px-2 py-0.5 bg-red-50 text-[#DC2626] rounded-md text-[10px] font-bold flex items-center gap-0.5">
                            <Flame className="w-3 h-3 text-[#DC2626]" /> {item.options.spiceLevel}
                          </span>
                        )}
                      </div>
                      {item.options?.notes && (
                        <p className="text-xs text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded mt-1 inline-block">
                          Note: {item.options.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-[#1C1917]">{formatCurrency(item.subtotal)}</span>
                    <span className="block text-[10px] text-[#78716C]">@{formatCurrency(item.price)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="pt-3 border-t border-[#E7E5E4] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#78716C]">
                <span>Subtotal Pesanan</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.taxAmount > 0 && (
                <div className="flex justify-between text-[#78716C]">
                  <span>PB1 / Pajak Restoran (10%)</span>
                  <span>{formatCurrency(order.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#166534] pt-1 border-t border-stone-200">
                <span>Total Pembayaran</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Fast Status Change Actions */}
          <div className="bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-2.5">
            <h4 className="font-bold text-[#1C1917] text-xs uppercase tracking-wider">
              Ubah Status Alur Dapur
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => onUpdateStatus(order.id, 'pending')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  order.orderStatus === 'pending'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                Menunggu
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus(order.id, 'cooking')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  order.orderStatus === 'cooking'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                🍳 Dimasak
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus(order.id, 'ready')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  order.orderStatus === 'ready'
                    ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                🍜 Siap Saji
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus(order.id, 'completed')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  order.orderStatus === 'completed'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                ✅ Selesai
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#E7E5E4] bg-[#FFFDF7] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed' ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Batalkan pesanan ${order.id} dari ${order.tableNumber}?`)) {
                  onCancelOrder(order.id);
                  onClose();
                }
              }}
              className="px-3.5 py-2.5 text-xs font-bold text-[#DC2626] hover:bg-red-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" />
              <span>Batalkan Pesanan</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-[#1C1917] text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>

            {order.orderStatus !== 'completed' && (
              <button
                type="button"
                onClick={() => {
                  onConvertToTransaction(order.id);
                  onClose();
                }}
                className="px-5 py-2.5 bg-[#166534] hover:bg-[#14532d] active:scale-98 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>Konfirmasi Lunas & Masuk Transaksi POS</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
