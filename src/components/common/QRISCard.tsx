import React, { useEffect, useState } from 'react';
import { generateQRCodeDataURL } from '../../utils/qrGenerator';

interface QRISCardProps {
  amount?: number;
  merchantName?: string;
  nmid?: string;
  terminal?: string;
  printedBy?: string;
  version?: string;
  qrisImageUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const QRISCard: React.FC<QRISCardProps> = ({
  amount,
  merchantName = 'EDUKASI',
  nmid = 'ID1026520319280',
  terminal = 'A01',
  printedBy = '93600914',
  version = 'v0.0.2026.05.15',
  qrisImageUrl,
  className = '',
  size = 'md',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    // Standard QRIS payload string format with NMID and optional dynamic amount
    const qrisPayload = amount
      ? `00020101021226680016ID.CO.QRIS.WWW0118${printedBy}00000000000215${nmid}0303UMI520458125303360540${amount}5802ID5907${merchantName}6008KARAWANG61054136162070703${terminal}6304`
      : `00020101021126680016ID.CO.QRIS.WWW0118${printedBy}00000000000215${nmid}0303UMI5204581253033605802ID5907${merchantName}6008KARAWANG61054136162070703${terminal}6304`;

    const pixelWidth = size === 'lg' ? 380 : size === 'sm' ? 200 : 280;
    generateQRCodeDataURL(qrisPayload, {
      width: pixelWidth,
      margin: 1,
      colorDark: '#000000',
      colorLight: '#FFFFFF',
    }).then((url) => {
      if (url) setQrDataUrl(url);
    });
  }, [amount, merchantName, nmid, terminal, printedBy, size]);

  const maxCardWidth = size === 'lg' ? 'max-w-[400px]' : size === 'sm' ? 'max-w-[260px]' : 'max-w-[320px]';

  return (
    <div
      className={`relative bg-white text-stone-900 rounded-2xl shadow-xl overflow-hidden border border-stone-200 flex flex-col items-center mx-auto ${maxCardWidth} ${className}`}
    >
      {/* Decorative Red Top-Left and Bottom-Right Triangles matching QRIS standard */}
      <div className="absolute top-0 left-0 w-16 h-28 bg-[#EF4444] -rotate-45 -translate-x-12 -translate-y-12 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-[#EF4444] -rotate-45 translate-x-12 translate-y-12 pointer-events-none" />

      {/* Header with National Logos */}
      <div className="w-full px-5 pt-4 pb-2 flex items-center justify-between z-10">
        {/* QRIS Logo */}
        <div className="flex items-center gap-1.5">
          <div className="bg-black text-white px-2 py-0.5 rounded-sm font-black text-sm tracking-tighter flex items-center">
            QRIS
          </div>
          <div className="text-[7px] font-bold leading-tight text-stone-700 uppercase">
            QR Code Standar<br />Pembayaran Nasional
          </div>
        </div>

        {/* GPN Logo */}
        <div className="flex items-center gap-1">
          <div className="w-6 h-6 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-600 fill-current">
              <path d="M12 2L4 7v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V7l-8-5zm0 2.2l6 3.8v5c0 4.4-3 8.6-6 9.8-3-1.2-6-5.4-6-9.8V8l6-3.8z"/>
              <path d="M12 6l-4 4h3v4h2v-4h3z" />
            </svg>
          </div>
          <span className="font-black text-xs text-blue-900 tracking-wider">GPN</span>
        </div>
      </div>

      {/* Merchant Title & NMID */}
      <div className="text-center px-4 pt-1 pb-1 z-10">
        <h3 className="font-black text-base tracking-wider text-stone-900 uppercase">
          {merchantName}
        </h3>
        <p className="text-[11px] font-bold text-stone-700 font-mono tracking-tight mt-0.5">
          NMID: {nmid}
        </p>
        <p className="text-[10px] font-bold text-stone-500 font-mono">{terminal}</p>
      </div>

      {/* QR Code Container */}
      <div className="p-3 bg-white border border-stone-100 rounded-xl shadow-xs my-1 z-10 flex flex-col items-center">
        {qrisImageUrl || qrDataUrl ? (
          <img
            src={qrisImageUrl || qrDataUrl}
            alt={`QRIS ${merchantName}`}
            className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-md"
          />
        ) : (
          <div className="w-48 h-48 sm:w-56 sm:h-56 bg-stone-100 animate-pulse rounded-md flex items-center justify-center text-xs text-stone-400">
            Memuat QRIS...
          </div>
        )}
      </div>

      {/* Amount Tag if dynamic payment */}
      {amount && amount > 0 && (
        <div className="my-1 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 font-black text-xs font-mono z-10">
          Nominal: Rp {amount.toLocaleString('id-ID')}
        </div>
      )}

      {/* Footer Instructions */}
      <div className="w-full px-4 pt-2 pb-3 text-center z-10 border-t border-stone-100 mt-1 bg-stone-50/70">
        <p className="font-black text-[11px] tracking-wide text-stone-900 uppercase">
          SATU QRIS UNTUK SEMUA
        </p>
        <p className="text-[8.5px] text-stone-500">
          Cek aplikasi penyelenggara di: <span className="font-semibold text-stone-700">www.aspi-qris.id</span>
        </p>

        {/* Steps icons */}
        <div className="flex items-center justify-center gap-4 mt-2 text-[8px] text-stone-600 font-medium">
          <div className="flex flex-col items-center">
            <span className="w-4 h-4 rounded-full bg-stone-200 flex items-center justify-center text-[9px] font-bold text-stone-800 mb-0.5">1</span>
            <span>Buka QRIS App</span>
          </div>
          <div className="text-stone-300">➔</div>
          <div className="flex flex-col items-center">
            <span className="w-4 h-4 rounded-full bg-stone-200 flex items-center justify-center text-[9px] font-bold text-stone-800 mb-0.5">2</span>
            <span>Scan & Cek</span>
          </div>
          <div className="text-stone-300">➔</div>
          <div className="flex flex-col items-center">
            <span className="w-4 h-4 rounded-full bg-[#166534] text-white flex items-center justify-center text-[9px] font-bold mb-0.5">3</span>
            <span>Bayar Tuntas</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[8px] text-stone-400 font-mono mt-2 pt-1 border-t border-stone-200/60">
          <span>Dicetak oleh: {printedBy}</span>
          <span>Versi: {version}</span>
        </div>
      </div>
    </div>
  );
};
