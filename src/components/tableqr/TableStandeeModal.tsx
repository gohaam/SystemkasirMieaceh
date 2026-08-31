import React, { useEffect, useState, useRef } from 'react';
import { TableConfig, StoreSettings } from '../../types';
import { generateQRCodeDataURL, getTableOrderUrl } from '../../utils/qrGenerator';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Sparkles,
  Wifi,
  Utensils,
  Smartphone,
} from 'lucide-react';

interface TableStandeeModalProps {
  table: TableConfig | null;
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  onOpenCustomerView: (tableNumber: string) => void;
  allTables?: TableConfig[];
  isBatchMode?: boolean;
}

export const TableStandeeModal: React.FC<TableStandeeModalProps> = ({
  table,
  settings,
  isOpen,
  onClose,
  onOpenCustomerView,
  allTables = [],
  isBatchMode = false,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [batchQrs, setBatchQrs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<boolean>(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (isBatchMode && allTables.length > 0) {
      const loadAll = async () => {
        const qrMap: Record<string, string> = {};
        for (const t of allTables) {
          const url = getTableOrderUrl(t.tableNumber);
          qrMap[t.id] = await generateQRCodeDataURL(url, { width: 320, colorDark: '#166534' });
        }
        setBatchQrs(qrMap);
      };
      loadAll();
    } else if (table) {
      const url = getTableOrderUrl(table.tableNumber);
      generateQRCodeDataURL(url, { width: 320, colorDark: '#166534' }).then((res) => {
        setQrCodeUrl(res);
      });
    }
  }, [isOpen, table, isBatchMode, allTables]);

  if (!isOpen || (!table && !isBatchMode)) return null;

  const currentUrl = table ? getTableOrderUrl(table.tableNumber) : '';

  const handleCopyLink = () => {
    if (currentUrl) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl || !table) return;
    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `QR-${table.tableNumber.replace(/\s+/g, '_')}-MieAcehPakIsmail.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-2xl max-w-2xl w-full overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E7E5E4] flex items-center justify-between bg-[#FFFDF7] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#166534] flex items-center justify-center text-white shadow-xs">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[#1C1917] text-base leading-tight">
                {isBatchMode ? 'Cetak Semua Standee QR Meja' : `QR Code & Standee: ${table?.tableNumber}`}
              </h3>
              <p className="text-xs text-[#78716C]">
                {isBatchMode
                  ? `Siap cetak untuk total ${allTables.length} meja pelanggan`
                  : `${table?.tableName} • ${table?.location} (Kapasitas ${table?.capacity} Orang)`}
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

        {/* Modal Content / Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-stone-50/50">
          {/* Action Bar */}
          {!isBatchMode && table && (
            <div className="bg-white p-3 rounded-2xl border border-[#E7E5E4] flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs text-[#1C1917] font-medium truncate max-w-xs sm:max-w-md">
                <span className="text-[#78716C] shrink-0">URL Menu:</span>
                <span className="font-mono text-[#166534] truncate bg-green-50 px-2 py-1 rounded-lg text-[11px] border border-green-200">
                  {currentUrl}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-[#1C1917] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#166534]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin!' : 'Salin URL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCustomerView(table.tableNumber);
                  }}
                  className="px-3 py-1.5 bg-[#166534]/10 hover:bg-[#166534]/20 text-[#166534] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Mode Pelanggan</span>
                </button>
              </div>
            </div>
          )}

          {/* Printable Standee Cards Preview */}
          <div ref={printAreaRef} id="printable-standee-container" className="space-y-6">
            {!isBatchMode && table && (
              <div className="max-w-sm mx-auto bg-white rounded-3xl border-2 border-[#166534] p-6 shadow-md text-center relative overflow-hidden">
                {/* Top Banner */}
                <div className="absolute top-0 left-0 right-0 h-3 bg-[#166534]" />

                <div className="mt-1 flex items-center justify-center gap-1.5 text-[#166534] text-xs font-black uppercase tracking-wider">
                  <Utensils className="w-4 h-4" />
                  <span>{settings.storeName}</span>
                </div>
                <p className="text-[11px] text-[#78716C] mt-0.5">{settings.tagline}</p>

                {/* Table Number Pill */}
                <div className="my-4 inline-block bg-[#166534] text-white px-5 py-2 rounded-2xl shadow-sm">
                  <span className="block text-[10px] tracking-widest font-semibold uppercase opacity-90">
                    NOMOR MEJA
                  </span>
                  <span className="block text-2xl font-black tracking-tight">{table.tableNumber}</span>
                </div>

                {/* QR Code Container */}
                <div className="bg-[#FFFDF7] p-4 rounded-2xl border border-[#E7E5E4] max-w-[220px] mx-auto shadow-inner flex flex-col items-center justify-center">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt={`QR Code ${table.tableNumber}`}
                      className="w-44 h-44 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-xs text-[#78716C]">
                      Memuat QR...
                    </div>
                  )}
                  <span className="text-[10px] text-[#166534] font-bold mt-2 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" />
                    Scan dengan Kamera HP
                  </span>
                </div>

                {/* Instructions */}
                <div className="mt-4 pt-3 border-t border-dashed border-[#E7E5E4] space-y-1 text-left px-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1C1917]">
                    <span className="w-4 h-4 rounded-full bg-[#166534] text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    <span>Arahkan kamera HP ke QR Code</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1C1917]">
                    <span className="w-4 h-4 rounded-full bg-[#166534] text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    <span>Pilih menu, level pedas & gaya masak</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1C1917]">
                    <span className="w-4 h-4 rounded-full bg-[#166534] text-white text-[10px] flex items-center justify-center font-bold">3</span>
                    <span>Bayar via QRIS / Tunai di Kasir</span>
                  </div>
                </div>

                {/* Footer Wi-Fi Note */}
                <div className="mt-4 pt-3 border-t border-[#E7E5E4] flex items-center justify-center gap-2 text-[10px] text-[#78716C]">
                  <Wifi className="w-3 h-3 text-[#166534]" />
                  <span>Free Wi-Fi: <b>MieAceh_Guest</b> (Pass: <b>rempah123</b>)</span>
                </div>
              </div>
            )}

            {/* Batch mode grid */}
            {isBatchMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allTables.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white rounded-2xl border border-[#166534] p-4 shadow-xs text-center flex flex-col items-center justify-between"
                  >
                    <div className="text-[#166534] text-xs font-black uppercase">
                      {settings.storeName}
                    </div>
                    <div className="bg-[#166534] text-white px-3 py-1 rounded-xl text-sm font-black my-2">
                      {t.tableNumber} ({t.location})
                    </div>
                    {batchQrs[t.id] ? (
                      <img
                        src={batchQrs[t.id]}
                        alt={`QR ${t.tableNumber}`}
                        className="w-32 h-32 object-contain"
                      />
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center text-xs text-stone-400">
                        Memuat...
                      </div>
                    )}
                    <span className="text-[10px] font-bold text-[#166534] mt-1">
                      Scan untuk Pesan & Bayar
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-[#E7E5E4] bg-[#FFFDF7] flex items-center justify-between gap-3 shrink-0">
          {!isBatchMode && (
            <button
              type="button"
              onClick={handleDownloadQR}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-[#1C1917] text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#78716C]" />
              <span className="hidden sm:inline">Unduh PNG QR</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-[#1C1917] text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-[#166534] hover:bg-[#14532d] active:scale-98 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Standee / Stiker Meja</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
