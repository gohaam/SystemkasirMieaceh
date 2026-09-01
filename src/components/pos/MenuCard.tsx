import React from 'react';
import { MenuItem } from '../../types';
import { DEFAULT_MENU_IMAGE, formatRupiah } from '../../utils/formatters';
import { Plus, Flame, Sparkles } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  cartItemCount?: number;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, onSelect, cartItemCount = 0 }) => {
  const isOutOfStock = !item.isAvailable || item.stock <= 0;

  return (
    <div
      id={`menu-card-${item.id}`}
      onClick={() => !isOutOfStock && onSelect(item)}
      className={`bg-white rounded-2xl overflow-hidden shadow-xs border border-[#E7E5E4] flex flex-col justify-between transition-all duration-200 group text-left select-none relative ${
        isOutOfStock
          ? 'opacity-60 cursor-not-allowed bg-stone-100'
          : 'cursor-pointer hover:shadow-md hover:border-[#166534]/50 hover:-translate-y-0.5'
      }`}
    >
      {/* Popular / Best Seller Ribbon */}
      {item.isPopular && !isOutOfStock && (
        <div className="absolute top-2.5 left-2.5 z-10 bg-[#DC2626] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>FAVORIT</span>
        </div>
      )}

      {/* Cart Quantity indicator badge */}
      {cartItemCount > 0 && (
        <div className="absolute top-2.5 right-2.5 z-10 bg-[#166534] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white">
          {cartItemCount}
        </div>
      )}

      {/* Image container */}
      <div className="relative h-32 md:h-36 w-full bg-stone-100 overflow-hidden shrink-0">
        <img
          src={item.image || DEFAULT_MENU_IMAGE}
          alt={item.name}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            isOutOfStock ? 'grayscale' : ''
          }`}
          loading="lazy"
        />

        {/* Customization Indicators */}
        {(item.spicyOptions || item.cookingStyleOptions) && !isOutOfStock && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            {item.spicyOptions && (
              <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5 text-red-400" />
                Pedas
              </span>
            )}
            {item.cookingStyleOptions && (
              <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium">
                Kuah/Goreng
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-[#1C1917] text-sm md:text-base leading-snug line-clamp-2">
            {item.name}
          </h3>
          <p className="text-[11px] text-[#78716C] line-clamp-1 mt-0.5">
            {item.description}
          </p>
        </div>

        {/* Price & Stock info */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#E7E5E4]">
          <span className="text-[#166534] font-bold text-base md:text-lg font-mono">
            {formatRupiah(item.price)}
          </span>

          <div>
            {isOutOfStock ? (
              <span className="text-[10px] px-2 py-0.5 bg-red-100 text-[#DC2626] rounded-md font-bold uppercase tracking-wider">
                Habis
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 bg-[#166534]/10 text-[#166534] rounded-md font-semibold uppercase tracking-wider">
                Tersedia
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
