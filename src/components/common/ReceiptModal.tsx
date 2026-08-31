import React, { useRef } from 'react';
import { Transaction } from '../../types';
import { Modal } from '../common/Modal';
import { usePOS } from '../../context/POSContext';
import { formatRupiah, formatDateTime } from '../../utils/formatters';
import { Printer, CheckCircle2, Copy } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  const { settings, showToast } = usePOS();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyReceiptText = () => {
    let text = `================================\n`;
    text += `   ${settings.storeName.toUpperCase()}\n`;
    text += `   ${settings.address}\n`;
    text += `   Telp/WA: ${settings.phone}\n`;
    text += `================================\n`;
    text += `No. Struk : ${transaction.invoiceNumber}\n`;
    text += `Tanggal   : ${formatDateTime(transaction.createdAt)}\n`;
    text += `Kasir     : ${transaction.cashierName}\n`;
    text += `Tipe      : ${transaction.orderType === 'dine_in' ? `Makan di Tempat (${transaction.tableNumber})` : 'Bawa Pulang'}\n`;
    if (transaction.customerName) text += `Pelanggan : ${transaction.customerName}\n`;
    text += `--------------------------------\n`;
    transaction.items.forEach((item) => {
      text += `${item.name}\n`;
      if (item.options?.cookingStyle || item.options?.spiceLevel) {
        text += ` (${item.options.cookingStyle || ''} ${item.options.spiceLevel ? `• ${item.options.spiceLevel}` : ''})\n`;
      }
      text += ` ${item.quantity}x @${formatRupiah(item.price)} = ${formatRupiah(item.subtotal)}\n`;
    });
    text += `--------------------------------\n`;
    text += `Subtotal  : ${formatRupiah(transaction.subtotal)}\n`;
    if (transaction.discountAmount > 0) {
      text += `Diskon    : -${formatRupiah(transaction.discountAmount)}\n`;
    }
    if (transaction.taxAmount > 0) {
      text += `PPN (10%) : ${formatRupiah(transaction.taxAmount)}\n`;
    }
    text += `TOTAL     : ${formatRupiah(transaction.total)}\n`;
    text += `Bayar (${transaction.paymentMethod.toUpperCase()}): ${formatRupiah(transaction.amountPaid)}\n`;
    text += `Kembalian : ${formatRupiah(transaction.changeAmount)}\n`;
    text += `================================\n`;
    text += `${settings.receiptFooter}\n`;
    text += `================================\n`;

    navigator.clipboard.writeText(text);
    showToast('Teks struk berhasil disalin!', 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Struk Pembayaran"
      subtitle={`No. Invoice: ${transaction.invoiceNumber}`}
      maxWidth="md"
    >
      <div className="space-y-5 text-[#1C1917]">
        {/* Success Header Indicator */}
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[#166534]">
          <CheckCircle2 className="w-5 h-5 text-[#166534] shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Transaksi Sukses!</p>
            <p className="text-emerald-800">Pembayaran telah tercatat dan stok otomatis diperbarui.</p>
          </div>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div
          ref={receiptRef}
          id="printable-receipt"
          className="p-6 bg-white border border-[#E7E5E4] rounded-2xl shadow-xs font-mono text-stone-900 text-xs max-w-sm mx-auto select-all leading-relaxed"
        >
          {/* Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-stone-400">
            <h2 className="font-extrabold text-sm uppercase tracking-wide text-[#166534]">
              {settings.storeName}
            </h2>
            <p className="text-[10px] text-stone-600">{settings.address}, {settings.city}</p>
            <p className="text-[10px] text-stone-600">Telp: {settings.phone}</p>
            {settings.halalCertification && (
              <p className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 inline-block mt-0.5">
                HALAL: {settings.halalCertification}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="py-2.5 border-b border-dashed border-stone-400 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-stone-600">Invoice:</span>
              <span className="font-bold">{transaction.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">Waktu:</span>
              <span>{formatDateTime(transaction.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">Kasir:</span>
              <span>{transaction.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">Pesanan:</span>
              <span className="font-bold">
                {transaction.orderType === 'dine_in'
                  ? `Dine-in (${transaction.tableNumber || 'Meja'})`
                  : 'Bawa Pulang (Takeaway)'}
              </span>
            </div>
            {transaction.customerName && (
              <div className="flex justify-between">
                <span className="text-stone-600">Pelanggan:</span>
                <span>{transaction.customerName}</span>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="py-2.5 border-b border-dashed border-stone-400 space-y-2">
            {transaction.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span className="truncate pr-2">{item.name}</span>
                  <span className="shrink-0">{formatRupiah(item.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-stone-600">
                  <span>
                    {item.quantity} x {formatRupiah(item.price)}
                    {item.options?.cookingStyle ? ` (${item.options.cookingStyle})` : ''}
                    {item.options?.spiceLevel ? ` • ${item.options.spiceLevel}` : ''}
                  </span>
                </div>
                {item.options?.notes && (
                  <div className="text-[10px] text-stone-500 italic">
                    Note: {item.options.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-stone-600">Subtotal:</span>
              <span>{formatRupiah(transaction.subtotal)}</span>
            </div>
            {transaction.discountAmount > 0 && (
              <div className="flex justify-between text-[#166534] font-semibold">
                <span>Diskon {transaction.discountName ? `(${transaction.discountName})` : ''}:</span>
                <span>-{formatRupiah(transaction.discountAmount)}</span>
              </div>
            )}
            {transaction.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-600">PPN ({transaction.taxRate}%):</span>
                <span>{formatRupiah(transaction.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-black pt-1 border-t border-stone-200 text-[#166534]">
              <span>TOTAL AKHIR:</span>
              <span>{formatRupiah(transaction.total)}</span>
            </div>
          </div>

          {/* Payment & Change */}
          <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-stone-600">Metode:</span>
              <span className="uppercase font-bold">{transaction.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">Jumlah Bayar:</span>
              <span>{formatRupiah(transaction.amountPaid)}</span>
            </div>
            <div className="flex justify-between font-bold text-[#166534]">
              <span>Kembalian:</span>
              <span>{formatRupiah(transaction.changeAmount)}</span>
            </div>
            {transaction.paymentReference && (
              <div className="flex justify-between text-[10px] text-stone-500">
                <span>Ref:</span>
                <span>{transaction.paymentReference}</span>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="pt-3 text-center text-[10px] text-stone-500 space-y-1 whitespace-pre-line">
            <p>{settings.receiptFooter}</p>
            <p className="text-[9px] text-stone-400">IG: {settings.instagram} • Neusuet Mie Aceh</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2 justify-between pt-2 border-t border-[#E7E5E4]">
          <button
            type="button"
            onClick={handleCopyReceiptText}
            className="px-3 py-2 text-xs font-semibold text-[#1C1917] hover:bg-stone-100 rounded-xl border border-[#E7E5E4] flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-4 h-4 text-[#78716C]" />
            <span>Salin Teks Struk</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              id="print-receipt-btn"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-200" />
              <span>Cetak Struk (Print)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Transaksi Baru
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
