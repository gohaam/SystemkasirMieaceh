import React, { useState, useEffect } from 'react';
import { TableOrder, StoreSettings } from '../../types';
import { formatCurrency, formatTime, formatDate } from '../../utils/formatters';
import { generateQRCodeDataURL } from '../../utils/qrGenerator';
import { QRISCard } from '../common/QRISCard';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Utensils,
  QrCode,
  Copy,
  Check,
  Smartphone,
  PhoneCall,
  PlusCircle,
  Receipt,
  Sparkles,
  Flame,
  ShieldCheck,
} from 'lucide-react';

interface CustomerOrderSuccessProps {
  order: TableOrder;
  settings: StoreSettings;
  onOrderMore: () => void;
}

export const CustomerOrderSuccess: React.FC<CustomerOrderSuccessProps> = ({
  order,
  settings,
  onOrderMore,
}) => {
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [dynamicQRISUrl, setDynamicQRISUrl] = useState<string>('');

  useEffect(() => {
    // Generate QRIS preview if qris payment
    if (order.paymentMethod === 'qris') {
      const qrisString = `00020101021226600016ID.CO.QRIS.WWW01189360091800000000000215MIEACEHISMAIL520458125303360540${order.total}5802ID5921MIE ACEH PAK ISMAIL6007JAKARTA6304`;
      generateQRCodeDataURL(qrisString, { width: 280, colorDark: '#166534' }).then((url) => {
        setDynamicQRISUrl(url);
      });
    }
  }, [order]);

  const handleCopyAccount = (acc: string) => {
    navigator.clipboard.writeText(acc);
    setCopiedAccount(acc);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  // Determine current step index
  const getStepIndex = () => {
    switch (order.orderStatus) {
      case 'pending':
        return 0;
      case 'cooking':
        return 1;
      case 'ready':
        return 2;
      case 'completed':
        return 3;
      default:
        return 0;
    }
  };

  const currentStep = getStepIndex();

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-[#1C1917] flex flex-col items-center p-4 sm:p-6">
      <div className="max-w-xl w-full space-y-5 pb-12">
        {/* Top Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-14 h-14 rounded-3xl bg-[#166534] text-white flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-8 h-8 text-white animate-bounce" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#166534] tracking-tight">
            Pesanan Berhasil Dikirim!
          </h2>
          <p className="text-xs sm:text-sm text-[#78716C]">
            Terima kasih, <b>{order.customerName}</b>. Dapur kami sedang memproses pesanan <b>{order.tableNumber}</b>.
          </p>
        </div>

        {/* Live Step Progress Tracker */}
        <div className="bg-white rounded-3xl p-5 border border-[#E7E5E4] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
              Status Pesanan Real-Time
            </span>
            <span className="text-xs font-mono text-[#166534] font-bold bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
              #{order.id}
            </span>
          </div>

          {/* Stepper Timeline */}
          <div className="grid grid-cols-4 gap-1 text-center relative">
            {[
              { label: 'Diterima', icon: Clock, desc: 'Dapur' },
              { label: 'Dimasak', icon: ChefHat, desc: 'Chef Rempah' },
              { label: 'Siap Saji', icon: Utensils, desc: 'Diantar' },
              { label: 'Selesai', icon: CheckCircle2, desc: 'Selesai' },
            ].map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = currentStep > idx;
              const isCurrent = currentStep === idx;

              return (
                <div key={idx} className="flex flex-col items-center space-y-1 z-10">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-[#166534] text-white shadow-md scale-110 ring-4 ring-[#166534]/20'
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[11px] font-bold ${
                      isCurrent ? 'text-[#166534]' : isCompleted ? 'text-emerald-800' : 'text-stone-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[9px] text-[#78716C] hidden sm:block">{step.desc}</span>
                </div>
              );
            })}
          </div>

          <div className="bg-[#FFFDF7] p-3 rounded-2xl border border-stone-200 text-xs text-center font-medium text-[#78716C]">
            ⏳ Perkiraan waktu penyajian: <b className="text-[#166534]">10 – 15 Menit</b>. Makanan dimasak segar langsung di wajan rempah!
          </div>
        </div>

        {/* Payment Guide Box */}
        <div className="bg-white rounded-3xl p-5 border border-[#E7E5E4] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
              Informasi Pembayaran
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                order.paymentStatus === 'paid_qris' || order.paymentStatus === 'paid_transfer'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {order.paymentStatus === 'paid_qris'
                ? 'QRIS Lunas'
                : order.paymentStatus === 'paid_transfer'
                ? 'Transfer Lunas'
                : 'Bayar Tunai di Kasir'}
            </span>
          </div>

          {/* QRIS Display if method is QRIS */}
          {order.paymentMethod === 'qris' && (
            <div className="text-center space-y-3 bg-[#FFFDF7] p-4 rounded-2xl border border-[#E7E5E4]">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-[#166534] rounded-full text-xs font-bold">
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan QRIS untuk Bayar Sekarang</span>
              </div>

              <div className="py-1">
                <QRISCard
                  amount={order.total}
                  merchantName={settings.qrisMerchantName || 'EDUKASI'}
                  nmid={settings.qrisNmid || 'ID1026520319280'}
                  terminal={settings.qrisA01 || 'A01'}
                  printedBy={settings.qrisPrintedBy || '93600914'}
                  version={settings.qrisVersion || 'v0.0.2026.05.15'}
                  qrisImageUrl={settings.qrisImageUrl}
                  size="sm"
                />
              </div>

              <div className="text-center space-y-0.5 pt-1">
                <p className="text-xs text-[#78716C]">Total Tagihan Pas:</p>
                <p className="text-xl font-black text-[#166534]">{formatCurrency(order.total)}</p>
                <p className="text-[10px] text-[#78716C]">
                  Mendukung GoPay, OVO, Dana, ShopeePay, BCA Mobile, Livin Mandiri, BRImo, BSI, dll.
                </p>
              </div>
            </div>
          )}

          {/* Cash Payment notice */}
          {order.paymentMethod === 'cash' && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs space-y-1.5 text-amber-900">
              <p className="font-bold text-sm">💵 Pembayaran Tunai di Meja / Kasir</p>
              <p>
                Silakan siapkan uang pas <b>{formatCurrency(order.total)}</b> saat pelayan mengantarkan pesanan ke <b>{order.tableNumber}</b> atau bayar di kasir setelah selesai makan.
              </p>
            </div>
          )}

          {/* Bank Transfer */}
          {order.paymentMethod === 'transfer' && settings.bankAccounts && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#1C1917]">Rekening Transfer Resmi:</p>
              <div className="space-y-2">
                {settings.bankAccounts.map((acc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#166534] block">{acc.bank}</span>
                      <span className="font-mono text-sm font-bold text-[#1C1917]">
                        {acc.accountNumber}
                      </span>
                      <span className="text-[10px] text-[#78716C] block">a/n {acc.accountName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount(acc.accountNumber)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 text-[#1C1917] rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    >
                      {copiedAccount === acc.accountNumber ? (
                        <Check className="w-3.5 h-3.5 text-[#166534]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedAccount === acc.accountNumber ? 'Tersalin' : 'Salin Rek'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Digital Receipt Summary */}
        <div className="bg-white rounded-3xl p-5 border border-[#E7E5E4] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#166534]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                Rincian Pesanan ({order.itemCount} Item)
              </span>
            </div>
            <span className="text-xs font-bold text-[#166534]">{order.tableNumber}</span>
          </div>

          <div className="divide-y divide-stone-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 font-bold text-[#1C1917]">
                    <span className="text-[#166534]">{item.quantity}x</span>
                    <span>{item.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-[#78716C]">
                    {item.options?.cookingStyle && (
                      <span className="bg-stone-100 px-1.5 py-0.5 rounded">
                        {item.options.cookingStyle}
                      </span>
                    )}
                    {item.options?.spiceLevel && (
                      <span className="bg-red-50 text-[#DC2626] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5" /> {item.options.spiceLevel}
                      </span>
                    )}
                    {item.options?.notes && <span>• Note: {item.options.notes}</span>}
                  </div>
                </div>
                <div className="font-bold text-[#1C1917]">{formatCurrency(item.subtotal)}</div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#E7E5E4] space-y-1 text-xs">
            <div className="flex justify-between text-[#78716C]">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-[#78716C]">
                <span>PB1 Restoran (10%)</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-[#166534] pt-1.5 border-t border-stone-200">
              <span>Total Pembayaran</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Customer Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onOrderMore}
            className="w-full py-3.5 px-4 bg-[#166534] hover:bg-[#14532d] active:scale-98 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Pesan Menu Tambahan / Minuman</span>
          </button>

        </div>
      </div>
    </div>
  );
};
