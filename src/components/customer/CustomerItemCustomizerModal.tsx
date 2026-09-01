import React, { useState } from 'react';
import { MenuItem, CartItemOption, CookingStyle, SpiceLevel } from '../../types';
import { DEFAULT_MENU_IMAGE, formatCurrency } from '../../utils/formatters';
import { X, Flame, ChefHat, Plus, Minus, Check, MessageSquare } from 'lucide-react';

interface CustomerItemCustomizerModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, options: CartItemOption, quantity: number) => void;
}

export const CustomerItemCustomizerModal: React.FC<CustomerItemCustomizerModalProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  if (!isOpen || !item) return null;

  const isMieAceh = item.category === 'mie-aceh' || item.name.toLowerCase().includes('mie aceh');
  const hasCookingStyle = item.cookingStyleOptions || isMieAceh;
  const hasSpicy = item.spicyOptions || isMieAceh;

  const [cookingStyle, setCookingStyle] = useState<CookingStyle>('Kering');
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>('Sedang');
  const [notes, setNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const cookingStylesList = isMieAceh
    ? [
        { id: 'Kering', desc: 'Goreng Kering' },
        { id: 'Basah', desc: 'Tumis Nyemek' },
        { id: 'Kuah', desc: 'Kuah Rempah' },
      ]
    : [
        { id: 'Kering', desc: 'Goreng Kering' },
        { id: 'Kuah', desc: 'Kuah Berkaldu' },
      ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const options: CartItemOption = {};
    if (hasCookingStyle) {
      options.cookingStyle = cookingStyle;
    }
    if (hasSpicy) {
      options.spiceLevel = spiceLevel;
    }
    if (notes.trim()) {
      options.notes = notes.trim();
    }

    onAddToCart(item, options, quantity);
    onClose();
  };

  const totalPrice = item.price * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-[#E7E5E4] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Image & Info */}
        <div className="relative h-44 sm:h-52 bg-stone-100 shrink-0">
          <img
            src={item.image || DEFAULT_MENU_IMAGE}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-3 left-4 right-4 text-white">
            <h3 className="font-bold text-lg sm:text-xl leading-tight">{item.name}</h3>
            <p className="text-xs text-white/80 line-clamp-1 mt-0.5">{item.description}</p>
            <p className="text-base font-black text-amber-300 mt-1">{formatCurrency(item.price)}</p>
          </div>
        </div>

        {/* Customization Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Cooking Style (For Mie Aceh and Kwetiaw/Bihun/Capcay) */}
          {hasCookingStyle && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1C1917] flex items-center gap-1.5 uppercase tracking-wider">
                <ChefHat className="w-4 h-4 text-[#166534]" />
                <span>Pilih Gaya Masak (Wajib)</span>
              </label>
              <div className={`grid ${cookingStylesList.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                {cookingStylesList.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setCookingStyle(style.id as CookingStyle)}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      cookingStyle === style.id
                        ? 'border-[#166534] bg-[#166534]/10 text-[#166534] font-bold shadow-xs'
                        : 'border-[#E7E5E4] bg-white text-[#1C1917] hover:bg-stone-50'
                    }`}
                  >
                    <span className="block text-xs font-bold">{style.id}</span>
                    <span className="block text-[10px] text-[#78716C] mt-0.5">{style.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Spice Level */}
          {hasSpicy && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#1C1917] flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-4 h-4 text-[#DC2626]" />
                <span>Tingkat Kepedasan Rempah</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Biasa', label: 'Biasa (Tidak Pedas)' },
                  { id: 'Sedang', label: 'Sedang (Standar)' },
                  { id: 'Pedas', label: 'Pedas Nampol' },
                  { id: 'Super Pedas', label: 'Super Pedas 🔥' },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSpiceLevel(lvl.id as SpiceLevel)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      spiceLevel === lvl.id
                        ? 'border-[#DC2626] bg-red-50 text-[#DC2626] font-bold shadow-xs'
                        : 'border-[#E7E5E4] bg-white text-[#1C1917] hover:bg-stone-50'
                    }`}
                  >
                    <span className="block text-xs">{lvl.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Special Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1C1917] flex items-center gap-1.5 uppercase tracking-wider">
              <MessageSquare className="w-4 h-4 text-[#78716C]" />
              <span>Catatan Khusus (Opsional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Jangan pakai tauge, acar bawang dipisah, es sedikit..."
              className="w-full px-3.5 py-2.5 border border-[#E7E5E4] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-[#166534]"
            />
          </div>

          {/* Quantity Controls & Add Button */}
          <div className="pt-3 border-t border-[#E7E5E4] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-xl bg-white text-[#1C1917] flex items-center justify-center hover:bg-stone-50 transition-colors shadow-xs cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center font-bold text-sm text-[#1C1917]">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-xl bg-[#166534] text-white flex items-center justify-center hover:bg-[#14532d] transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-[#166534] hover:bg-[#14532d] active:scale-98 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-between shadow-md transition-all cursor-pointer"
            >
              <span>+ Tambah ke Pesanan</span>
              <span>{formatCurrency(totalPrice)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
