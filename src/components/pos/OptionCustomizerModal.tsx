import React, { useState } from 'react';
import { MenuItem, CookingStyle, SpiceLevel } from '../../types';
import { Modal } from '../common/Modal';
import { DEFAULT_MENU_IMAGE, formatRupiah } from '../../utils/formatters';
import { Flame, Utensils, MessageSquare, Plus } from 'lucide-react';

interface OptionCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem | null;
  onConfirm: (options: { cookingStyle?: CookingStyle; spiceLevel?: SpiceLevel; notes?: string }) => void;
}

export const OptionCustomizerModal: React.FC<OptionCustomizerModalProps> = ({
  isOpen,
  onClose,
  item,
  onConfirm,
}) => {
  if (!item) return null;

  const isMieAceh = item.category === 'mie-aceh' || item.name.toLowerCase().includes('mie aceh');
  const cookingStyles: CookingStyle[] = isMieAceh ? ['Kering', 'Basah', 'Kuah'] : ['Kering', 'Kuah'];
  const [cookingStyle, setCookingStyle] = useState<CookingStyle>('Kering');
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>('Sedang');
  const [notes, setNotes] = useState<string>('');

  const spiceLevels: { id: SpiceLevel; label: string; desc: string }[] = [
    { id: 'Biasa', label: 'Biasa', desc: 'Tidak Pedas' },
    { id: 'Sedang', label: 'Sedang', desc: 'Pedas Gurih' },
    { id: 'Pedas', label: 'Pedas', desc: 'Pedas Mantap' },
    { id: 'Super Pedas', label: 'Super Pedas', desc: 'Ekstra Cabai' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      cookingStyle: item.cookingStyleOptions ? cookingStyle : undefined,
      spiceLevel: item.spicyOptions ? spiceLevel : undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kustomisasi Pesanan"
      subtitle={item.name}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Item summary banner */}
        <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
          <img src={item.image || DEFAULT_MENU_IMAGE} alt={item.name} className="w-14 h-14 rounded-lg object-cover" />
          <div className="flex-1">
            <h4 className="font-bold text-stone-900 text-sm">{item.name}</h4>
            <p className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
              {formatRupiah(item.price)}
            </p>
          </div>
        </div>

        {/* Cooking Style (Kuah, Goreng, Tumis) */}
        {item.cookingStyleOptions && (
          <div>
            <label className="block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-[#78716C]" />
              <span>Pilihan Tipe Masak:</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {cookingStyles.map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setCookingStyle(style)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                    cookingStyle === style
                      ? 'bg-[#166534] text-white border-[#166534] shadow-xs'
                      : 'bg-white text-[#1C1917] border-[#E7E5E4] hover:bg-[#FFFDF7]'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Spice Level */}
        {item.spicyOptions && (
          <div>
            <label className="block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>Tingkat Kepedasan:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {spiceLevels.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setSpiceLevel(lvl.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer flex flex-col items-center justify-center ${
                    spiceLevel === lvl.id
                      ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-xs'
                      : 'bg-white text-[#1C1917] border-[#E7E5E4] hover:bg-[#FFFDF7]'
                  }`}
                >
                  <span>{lvl.label}</span>
                  <span className={`text-[10px] font-normal ${spiceLevel === lvl.id ? 'text-white/80' : 'text-stone-400'}`}>
                    {lvl.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Notes */}
        <div>
          <label className="block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#78716C]" />
            <span>Catatan Khusus (Opsional):</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Tanpa tauge, acar bawang pisah, gula sedikit"
            className="w-full bg-[#FFFDF7] border border-[#E7E5E4] focus:border-[#166534] focus:ring-1 focus:ring-[#166534] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1917] placeholder-[#78716C]/60 outline-hidden transition-all"
          />
        </div>

        {/* Submit */}
        <div className="pt-3 border-t border-[#E7E5E4] flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-[#78716C] hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#166534] hover:bg-[#14532d] active:bg-[#166534] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Masukkan ke Keranjang</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
