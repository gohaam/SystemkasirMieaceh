import React, { useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import { PaymentMethod } from '../../types';
import { Modal } from '../common/Modal';
import { formatRupiah } from '../../utils/formatters';
import { QRISCard } from '../common/QRISCard';
import {
  Banknote,
  QrCode,
  Building2,
  CreditCard,
  CheckCircle,
  Copy,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    cartTotal,
    cartSubtotal,
    cartDiscountAmount,
    cartTaxAmount,
    cartItemCount,
    orderType,
    tableNumber,
    customerName,
    settings,
    completeTransaction,
    showToast,
  } = usePOS();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<number>(cartTotal);
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [selectedBankIndex, setSelectedBankIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Sync amountPaid when total changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setAmountPaid(cartTotal);
      setPaymentRef('');
      setIsProcessing(false);
    }
  }, [isOpen, cartTotal]);

  if (!isOpen) return null;

  const changeAmount = Math.max(0, amountPaid - cartTotal);
  const isCashInsufficient = paymentMethod === 'cash' && amountPaid < cartTotal;

  // Preset cash shortcuts
  const cashPresets = [
    { label: 'Uang Pas', value: cartTotal },
    { label: 'Rp 20.000', value: 20000 },
    { label: 'Rp 50.000', value: 50000 },
    { label: 'Rp 100.000', value: 100000 },
    { label: 'Rp 150.000', value: 150000 },
    { label: 'Rp 200.000', value: 200000 },
  ].filter((p) => p.value >= cartTotal || p.label === 'Uang Pas');

  const handleProcessCheckout = async () => {
    if (isCashInsufficient) {
      showToast('Nominal uang tunai yang dibayarkan kurang dari total tagihan.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await completeTransaction({
        paymentMethod,
        amountPaid: paymentMethod === 'cash' ? amountPaid : cartTotal,
        paymentReference: paymentRef.trim() || undefined,
      });
      setIsProcessing(false);
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Gagal memproses transaksi', 'error');
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} disalin ke clipboard!`, 'info');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pembayaran Transaksi"
      subtitle={`${orderType === 'dine_in' ? `Makan di Tempat (${tableNumber})` : 'Bawa Pulang'} • ${cartItemCount} item`}
      maxWidth="2xl"
    >
      <div className="space-y-6 text-[#1C1917]">
        {/* Total Header Banner */}
        <div className="bg-[#166534] p-5 rounded-2xl text-white shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-emerald-200 font-bold">
              Total Tagihan Pesanan
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-0.5">
              {formatRupiah(cartTotal)}
            </div>
            {customerName && (
              <p className="text-xs text-emerald-100 mt-1">Pelanggan: <span className="font-semibold text-white">{customerName}</span></p>
            )}
          </div>
          <div className="text-right text-xs space-y-0.5 text-emerald-100 border-l border-white/20 pl-4">
            <div>Subtotal: <span className="font-mono text-white">{formatRupiah(cartSubtotal)}</span></div>
            {cartDiscountAmount > 0 && (
              <div className="text-amber-300 font-semibold">Diskon: -{formatRupiah(cartDiscountAmount)}</div>
            )}
            {cartTaxAmount > 0 && (
              <div>PPN ({settings.taxRate}%): {formatRupiah(cartTaxAmount)}</div>
            )}
          </div>
        </div>

        {/* Payment Method Selector Tabs */}
        <div>
          <label className="block text-xs font-bold text-[#78716C] uppercase tracking-wider mb-2">
            Pilih Metode Pembayaran:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {settings.paymentMethods.cash && (
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('cash');
                  setAmountPaid(cartTotal);
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-[#166534] text-white border-[#166534] shadow-md font-bold'
                    : 'bg-white text-[#1C1917] border-[#E7E5E4] hover:bg-[#FFFDF7]'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs font-bold">Tunai (Cash)</span>
              </button>
            )}

            {settings.paymentMethods.qris && (
              <button
                type="button"
                onClick={() => setPaymentMethod('qris')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'qris'
                    ? 'bg-[#166534] text-white border-[#166534] shadow-md font-bold'
                    : 'bg-white text-[#1C1917] border-[#E7E5E4] hover:bg-[#FFFDF7]'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span className="text-xs font-bold">QRIS Standar</span>
              </button>
            )}

            {settings.paymentMethods.transfer && (
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'transfer'
                    ? 'bg-[#166534] text-white border-[#166534] shadow-md font-bold'
                    : 'bg-white text-[#1C1917] border-[#E7E5E4] hover:bg-[#FFFDF7]'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="text-xs font-bold">Transfer Bank</span>
              </button>
            )}

            {settings.paymentMethods.debit && (
              <button
                type="button"
                onClick={() => setPaymentMethod('debit')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'debit'
                    ? 'bg-[#166534] text-white border-[#166534] shadow-md font-bold'
                    : 'bg-white text-[#1C1917] border-[#E7E5E4] hover:bg-[#FFFDF7]'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs font-bold">Debit / EDC</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Payment Body */}
        {paymentMethod === 'cash' && (
          <div className="space-y-4 bg-[#FFFDF7] p-4 rounded-2xl border border-[#E7E5E4]">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#78716C] uppercase tracking-wider">
                  Nominal Diterima Kasir:
                </label>
                {isCashInsufficient && (
                  <span className="text-xs font-bold text-[#DC2626] animate-pulse">
                    Kurang {formatRupiah(cartTotal - amountPaid)}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                  Rp
                </span>
                <input
                  type="number"
                  id="cash-amount-input"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-white border border-[#E7E5E4] focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/20 rounded-xl pl-11 pr-4 py-3 text-lg font-mono font-bold text-[#1C1917] outline-hidden transition-all"
                  min={0}
                />
              </div>
            </div>

            {/* Quick cash pills */}
            <div>
              <span className="text-[11px] text-[#78716C] font-semibold block mb-1.5">
                Pilihan Cepat Uang Pas & Pecahan:
              </span>
              <div className="flex flex-wrap gap-2">
                {cashPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAmountPaid(preset.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      amountPaid === preset.value
                        ? 'bg-[#166534] text-white border-[#166534]'
                        : 'bg-white text-[#1C1917] border-[#E7E5E4] hover:bg-stone-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kembalian Visual Box */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#166534] uppercase tracking-wider">
                  Kembalian Pelanggan:
                </span>
                <div className="text-2xl font-black font-mono text-[#166534] mt-0.5">
                  {formatRupiah(changeAmount)}
                </div>
              </div>
              <CheckCircle className="w-8 h-8 text-[#166534] opacity-60" />
            </div>
          </div>
        )}

        {paymentMethod === 'qris' && (
          <div className="bg-[#FFFDF7] p-4 sm:p-5 rounded-2xl border border-[#E7E5E4] flex flex-col md:flex-row items-center gap-6">
            <div className="shrink-0">
              <QRISCard
                amount={cartTotal}
                merchantName={settings.qrisMerchantName || 'EDUKASI'}
                nmid={settings.qrisNmid || 'ID1026520319280'}
                terminal={settings.qrisA01 || 'A01'}
                printedBy={settings.qrisPrintedBy || '93600914'}
                version={settings.qrisVersion || 'v0.0.2026.05.15'}
                qrisImageUrl={settings.qrisImageUrl}
                size="md"
              />
            </div>

            <div className="flex-1 text-center md:text-left space-y-3 w-full">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#166534]/10 text-[#166534] rounded-full text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>QRIS Standar Nasional (GPN)</span>
              </div>
              <h4 className="font-bold text-[#1C1917] text-sm">
                Scan via BCA, GoPay, OVO, Dana, ShopeePay, Mandiri, BSI
              </h4>
              <p className="text-xs text-[#78350F] opacity-80 leading-relaxed">
                Arahkan kamera smartphone pelanggan ke kode QRIS di atas untuk membayar nominal tepat{' '}
                <span className="font-black text-[#166534]">{formatRupiah(cartTotal)}</span>.
              </p>

              <div className="pt-1">
                <label className="block text-[11px] font-semibold text-[#78350F] mb-1 text-left">
                  Nomor Referensi / RRN QRIS (Opsional):
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Contoh: RRN-99210234"
                  className="w-full bg-white border border-[#E7E5E4] focus:border-[#166534] rounded-xl px-3 py-2 text-xs text-[#1C1917] outline-hidden font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'transfer' && (
          <div className="space-y-4 bg-[#FFFDF7] p-4 rounded-2xl border border-[#E7E5E4]">
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#78350F] uppercase tracking-wider block">
                Rekening Tujuan Warung:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {settings.bankAccounts?.map((acc, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedBankIndex(idx)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedBankIndex === idx
                        ? 'bg-white border-[#166534] shadow-xs ring-1 ring-[#166534]/20'
                        : 'bg-white/60 border-[#E7E5E4] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#1C1917]">{acc.bank}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(acc.accountNumber, `No. Rekening ${acc.bank}`);
                        }}
                        className="text-[#78716C] hover:text-[#166534]"
                        title="Salin nomor"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="font-mono text-xs font-bold text-[#166534] mt-1">
                      {acc.accountNumber}
                    </p>
                    <p className="text-[10px] text-[#78716C] truncate">a.n {acc.accountName}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#78350F] mb-1">
                Nomor Referensi Transaksi Bank:
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Contoh: TRF-BCA-881923"
                className="w-full bg-white border border-[#E7E5E4] focus:border-[#166534] rounded-xl px-3 py-2 text-xs text-[#1C1917] outline-hidden font-mono"
              />
            </div>
          </div>
        )}

        {paymentMethod === 'debit' && (
          <div className="bg-[#FFFDF7] p-4 rounded-2xl border border-[#E7E5E4] space-y-3">
            <p className="text-xs text-[#78350F]">
              Silakan gesek atau masukkan kartu debit pelanggan pada mesin EDC Warung.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#78350F] mb-1">
                Nomor Approval / Trace Mesin EDC:
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Contoh: EDC-BCA-009182"
                className="w-full bg-white border border-[#E7E5E4] focus:border-[#166534] rounded-xl px-3 py-2 text-xs text-[#1C1917] outline-hidden font-mono"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#E7E5E4] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 text-xs font-semibold text-[#78716C] hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            id="confirm-checkout-btn"
            onClick={handleProcessCheckout}
            disabled={isCashInsufficient || isProcessing}
            className="flex-1 sm:flex-initial px-8 py-3.5 bg-[#166534] hover:bg-[#14532d] active:bg-[#166534] text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            <Receipt className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'Memproses Pembayaran...'
                : `Selesaikan & Bayar (${formatRupiah(cartTotal)})`}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
