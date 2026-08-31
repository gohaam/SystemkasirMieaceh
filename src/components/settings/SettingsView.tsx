import React, { useState, useRef } from 'react';
import { usePOS } from '../../context/POSContext';
import { StoreSettings } from '../../types';
import { QRISCard } from '../common/QRISCard';
import {
  Store,
  Receipt,
  Percent,
  CreditCard,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Database,
  Download,
  Upload,
  HardDrive,
  ShieldCheck,
  Printer,
  QrCode,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetAllData,
    showToast,
    backupDatabase,
    restoreDatabase,
    isElectron,
  } = usePOS();

  const [formState, setFormState] = useState<StoreSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrisFileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = <K extends keyof StoreSettings>(field: K, value: StoreSettings[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handlePaymentMethodToggle = (method: 'cash' | 'qris' | 'transfer' | 'debit') => {
    const current = { ...formState.paymentMethods };
    current[method] = !current[method];

    if (!current.cash && !current.qris && !current.transfer && !current.debit) {
      showToast('Minimal 1 metode pembayaran harus aktif.', 'error');
      return;
    }

    setFormState((prev) => ({ ...prev, paymentMethods: current }));
    setIsSaved(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings(formState);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch {
      showToast('Pengaturan gagal disimpan. Periksa ruang penyimpanan perangkat.', 'error');
    }
  };

  const handleQrisImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('File QRIS harus berupa gambar.', 'error');
      e.target.value = '';
      return;
    }

    const maxFileSize = isElectron ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
    if (file.size > maxFileSize) {
      showToast(`Ukuran gambar QRIS maksimal ${isElectron ? '5' : '2'} MB.`, 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleChange('qrisImageUrl', reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBackup = async () => {
    await backupDatabase();
  };

  const handleRestoreFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      confirm(
        `⚠️ KONFIRMASI RESTORE DATABASE:\nApakah Anda yakin ingin memulihkan database dari file "${file.name}"?\nData saat ini akan ditimpa dengan data dari file backup.`
      )
    ) {
      setIsRestoring(true);
      const success = await restoreDatabase(file);
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetData = () => {
    if (
      confirm(
        '⚠️ PERINGATAN: Apakah Anda yakin ingin mengosongkan seluruh data (menu, transaksi, stok, meja) untuk memulai bisnis baru dari 0?'
      )
    ) {
      resetAllData();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#FFFDF7] space-y-6 text-[#1C1917]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-6 h-6 text-[#166534]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
              Pengaturan Sistem & Database Offline
            </h2>
          </div>
          <p className="text-xs text-[#78716C] mt-1">
            Konfigurasi profil warung makan, cetakan struk thermal, pajak, dan backup database SQLite lokal
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-[#166534] border border-emerald-200">
            <HardDrive className="w-3.5 h-3.5 text-[#166534]" />
            <span>{isElectron ? 'Desktop Windows Native' : '100% Offline Database'}</span>
          </span>
          <button
            type="button"
            onClick={handleSaveSettings}
            id="save-settings-top-btn"
            className="px-5 py-2.5 bg-[#166534] hover:bg-[#14532d] active:scale-98 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>

      {isSaved && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-2 text-[#166534] text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Pengaturan warung berhasil disimpan ke database lokal!</span>
        </div>
      )}

      {/* Section: Backup & Restore SQLite Database */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#166534]" />
            <div>
              <h3 className="font-bold text-[#1C1917] text-base">Manajemen Backup & Restore Database</h3>
              <p className="text-xs text-[#78716C]">
                Ekspor seluruh data warung (produk, transaksi, kasir, stok) ke file lokal atau pulihkan data kapan saja tanpa internet
              </p>
            </div>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-600 hidden sm:block" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Backup */}
          <div className="p-5 bg-[#FFFDF7] rounded-2xl border border-[#E7E5E4] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[#1C1917] mb-1">
                <Download className="w-4 h-4 text-[#166534]" />
                <span>Backup Database Lokal</span>
              </div>
              <p className="text-xs text-[#78716C] leading-relaxed mb-4">
                Unduh snapshot lengkap database sistem kasir ke format file cadangan aman (.json / .sql dump). Simpan file di flashdisk atau drive komputer.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBackup}
              id="download-backup-btn"
              className="w-full py-2.5 px-4 bg-[#166534] hover:bg-[#14532d] active:scale-98 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor & Unduh Backup Database</span>
            </button>
          </div>

          {/* Card Restore */}
          <div className="p-5 bg-[#FFFDF7] rounded-2xl border border-[#E7E5E4] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[#1C1917] mb-1">
                <Upload className="w-4 h-4 text-amber-600" />
                <span>Pulihkan (Restore) Database</span>
              </div>
              <p className="text-xs text-[#78716C] leading-relaxed mb-4">
                Muat kembali data sistem kasir dari file cadangan sebelumnya. Berguna saat ganti laptop kasir atau memulihkan data.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleRestoreFileSelect}
              accept=".json,.sql,.db"
              className="hidden"
              id="restore-file-input"
            />
            <button
              type="button"
              disabled={isRestoring}
              onClick={() => fileInputRef.current?.click()}
              id="upload-restore-btn"
              className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 border border-stone-300 active:scale-98 text-[#1C1917] font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-[#166534]" />
              <span>{isRestoring ? 'Memulihkan Data...' : 'Pilih File Backup untuk Restore'}</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Profil Warung */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E7E5E4]">
            <Store className="w-5 h-5 text-[#166534]" />
            <h3 className="font-bold text-[#1C1917] text-base">Identitas & Kontak Warung</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                Nama Warung Makan:
              </label>
              <input
                type="text"
                value={formState.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden font-semibold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                Tagline / Slogan:
              </label>
              <input
                type="text"
                value={formState.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                Alamat Lengkap:
              </label>
              <input
                type="text"
                value={formState.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                Nomor Telepon / WhatsApp:
              </label>
              <input
                type="text"
                value={formState.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                Sertifikasi Halal (LPPOM / BPJPH):
              </label>
              <input
                type="text"
                value={formState.halalCertification || ''}
                onChange={(e) => handleChange('halalCertification', e.target.value)}
                placeholder="ID32110015608400224"
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#166534] focus:border-[#166534] outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                Ukuran Kertas Printer Struk:
              </label>
              <select
                value={formState.paperWidth}
                onChange={(e) => handleChange('paperWidth', e.target.value as '58mm' | '80mm')}
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:border-[#166534] outline-hidden"
              >
                <option value="58mm">Thermal 58mm (Standar Kasir)</option>
                <option value="80mm">Thermal 80mm (Lebar)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                Pesan Footer Struk:
              </label>
              <input
                type="text"
                value={formState.receiptFooter}
                onChange={(e) => handleChange('receiptFooter', e.target.value)}
                placeholder="Terima Kasih Atas Kunjungan Anda • Neusuet Mie Aceh"
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pajak & Layanan */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E7E5E4]">
            <Percent className="w-5 h-5 text-[#166534]" />
            <h3 className="font-bold text-[#1C1917] text-base">Pajak Pertambahan Nilai (PPN)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-3 p-3 bg-[#FFFDF7] rounded-2xl border border-[#E7E5E4]">
              <input
                type="checkbox"
                id="enable-tax-toggle"
                checked={formState.enableTax}
                onChange={(e) => handleChange('enableTax', e.target.checked)}
                className="rounded text-[#166534] focus:ring-[#166534] w-4 h-4"
              />
              <label htmlFor="enable-tax-toggle" className="cursor-pointer">
                <span className="font-bold text-[#1C1917] block">Kenakan Pajak Penjualan (PPN)</span>
                <span className="text-[11px] text-[#78716C]">Otomatis dihitung pada struk pembayaran</span>
              </label>
            </div>

            {formState.enableTax && (
              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Persentase Pajak (%):
                </label>
                <input
                  type="number"
                  value={formState.taxRate}
                  onChange={(e) => handleChange('taxRate', Number(e.target.value))}
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#1C1917] focus:border-[#166534] outline-hidden"
                  min={0}
                  max={100}
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 3: QRIS & Pembayaran Digital */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E5E4]">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#166534]" />
              <div>
                <h3 className="font-bold text-[#1C1917] text-base">Konfigurasi QRIS Standar Pembayaran Nasional</h3>
                <p className="text-xs text-[#78716C]">Data QRIS resmi untuk pembayaran digital pelanggan & kasir</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Nama Merchant QRIS:
                </label>
                <input
                  type="text"
                  value={formState.qrisMerchantName || ''}
                  onChange={(e) => handleChange('qrisMerchantName', e.target.value)}
                  placeholder="EDUKASI"
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-bold text-[#1C1917] focus:border-[#166534] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  NMID QRIS:
                </label>
                <input
                  type="text"
                  value={formState.qrisNmid || ''}
                  onChange={(e) => handleChange('qrisNmid', e.target.value)}
                  placeholder="ID1026520319280"
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#1C1917] focus:border-[#166534] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Terminal / Kode Lokasi:
                </label>
                <input
                  type="text"
                  value={formState.qrisA01 || ''}
                  onChange={(e) => handleChange('qrisA01', e.target.value)}
                  placeholder="A01"
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-mono font-semibold text-[#1C1917] focus:border-[#166534] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  ID Pencetak QRIS:
                </label>
                <input
                  type="text"
                  value={formState.qrisPrintedBy || ''}
                  onChange={(e) => handleChange('qrisPrintedBy', e.target.value)}
                  placeholder="93600914"
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-mono text-[#1C1917] focus:border-[#166534] outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Versi Cetak QRIS:
                </label>
                <input
                  type="text"
                  value={formState.qrisVersion || ''}
                  onChange={(e) => handleChange('qrisVersion', e.target.value)}
                  placeholder="v0.0.2026.05.15"
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-mono text-[#1C1917] focus:border-[#166534] outline-hidden"
                />
              </div>

              <div className="sm:col-span-2 rounded-xl border border-dashed border-[#B7CDBE] bg-emerald-50/50 p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                      Foto QRIS Resmi:
                    </label>
                    <p className="text-[11px] text-[#78716C]">
                      Upload gambar QRIS dari penyelenggara. Format JPG, PNG, atau WEBP, maksimal 5 MB.
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={qrisFileInputRef}
                    onChange={handleQrisImageSelect}
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    id="qris-image-input"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => qrisFileInputRef.current?.click()}
                      className="px-3 py-2 bg-[#166534] hover:bg-[#14532d] text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      {formState.qrisImageUrl ? 'Ganti Foto QRIS' : 'Upload Foto QRIS'}
                    </button>
                    {formState.qrisImageUrl && (
                      <button
                        type="button"
                        onClick={() => handleChange('qrisImageUrl', undefined)}
                        className="px-3 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-[#1C1917] rounded-xl font-bold text-xs transition-colors"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-2">
                Live Preview Standee QRIS
              </span>
              <QRISCard
                merchantName={formState.qrisMerchantName || 'EDUKASI'}
                nmid={formState.qrisNmid || 'ID1026520319280'}
                terminal={formState.qrisA01 || 'A01'}
                printedBy={formState.qrisPrintedBy || '93600914'}
                version={formState.qrisVersion || 'v0.0.2026.05.15'}
                qrisImageUrl={formState.qrisImageUrl}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Metode Pembayaran */}
        <div className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E7E5E4]">
            <CreditCard className="w-5 h-5 text-[#166534]" />
            <h3 className="font-bold text-[#1C1917] text-base">Metode Pembayaran yang Diterima</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { id: 'cash', label: '💵 Tunai (Cash)', active: formState.paymentMethods.cash },
              { id: 'qris', label: '📱 QRIS Standar', active: formState.paymentMethods.qris },
              { id: 'transfer', label: '🏦 Transfer Bank', active: formState.paymentMethods.transfer },
              { id: 'debit', label: '💳 Kartu Debit', active: formState.paymentMethods.debit },
            ].map((method) => (
              <div
                key={method.id}
                onClick={() => handlePaymentMethodToggle(method.id as any)}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                  method.active
                    ? 'bg-green-50 border-green-300 text-[#166534] font-bold'
                    : 'bg-[#FFFDF7] border-[#E7E5E4] text-[#78716C] opacity-60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={method.active}
                  readOnly
                  className="rounded text-[#166534] focus:ring-[#166534]"
                />
                <span>{method.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Save button bottom */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetData}
            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-[#DC2626] border border-red-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Kosongkan & Reset Sistem (Mulai dari Nol)</span>
          </button>

          <button
            type="submit"
            className="px-6 py-3 bg-[#166534] hover:bg-[#14532d] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md cursor-pointer transition-all"
          >
            Simpan Semua Pengaturan
          </button>
        </div>
      </form>
    </div>
  );
};
