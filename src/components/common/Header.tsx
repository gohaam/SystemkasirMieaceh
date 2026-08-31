import React, { useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  Clock,
  Store,
  UserCheck,
  LogOut,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { formatTime, formatDate } from '../../utils/formatters';

export const Header: React.FC = () => {
  const {
    currentUser,
    logout,
    switchUser,
    users,
    settings,
    inventory,
    setActiveTab,
    isSidebarCollapsed,
    toggleSidebar,
    toggleMobileSidebar,
  } = usePOS();
  const [time, setTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lowStockCount = inventory.filter((item) => item.status !== 'safe').length;

  return (
    <header className="h-16 bg-[#FFFDF7] border-b border-[#E7E5E4] px-3 sm:px-4 md:px-6 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Left: Sidebar Toggle + Brand / Store identity */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          id="header-mobile-menu-btn"
          className="flex md:hidden p-2 rounded-xl text-stone-600 hover:text-stone-950 hover:bg-stone-100 border border-stone-200/80 transition-colors cursor-pointer"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5 text-[#166534]" />
        </button>

        {/* Desktop sidebar toggle button */}
        <button
          type="button"
          onClick={toggleSidebar}
          id="header-desktop-sidebar-toggle-btn"
          className="hidden md:flex p-2 rounded-xl text-stone-500 hover:text-[#166534] hover:bg-emerald-50 border border-stone-200/80 transition-colors cursor-pointer"
          title={isSidebarCollapsed ? 'Buka Menu Sidebar' : 'Ciutkan Menu Sidebar'}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-[#166534]" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-stone-600" />
          )}
        </button>

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#166534] flex items-center justify-center text-white shadow-xs shrink-0">
          <Store className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="font-bold text-[#166534] text-base sm:text-lg md:text-xl tracking-tight leading-none truncate max-w-[150px] sm:max-w-none">
              {settings.storeName || 'Mie Aceh Pak Ismail'}
            </h1>
            <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#166534]/10 text-[#166534]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#166534] animate-pulse"></span>
              POS Aktif
            </span>
          </div>
          <p className="text-[11px] text-[#78716C] mt-0.5 hidden sm:block truncate max-w-xs">
            {formatDate(time)} | Kasir: {currentUser?.name}
          </p>
        </div>
      </div>

      {/* Middle: Live Clock & Date */}
      <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-white border border-[#E7E5E4] rounded-full text-xs text-[#78716C] font-medium shadow-xs">
        <Clock className="w-3.5 h-3.5 text-[#166534]" />
        <span>{formatDate(time)}</span>
        <span className="text-stone-300">•</span>
        <span className="font-bold text-[#166534] font-mono">{formatTime(time)} WIB</span>
      </div>

      {/* Right: Low Stock Alert & User Menu */}
      <div className="flex items-center gap-3">
        {lowStockCount > 0 && (
          <button
            onClick={() => setActiveTab('inventory')}
            id="header-low-stock-alert"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            title={`${lowStockCount} bahan/stok menipis atau habis`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
            <span className="hidden sm:inline">Stok Menipis:</span>
            <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded-full text-[10px] font-bold">
              {lowStockCount}
            </span>
          </button>
        )}

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            id="user-profile-menu-button"
            className="flex items-center gap-2.5 p-1.5 pr-3 bg-white hover:bg-stone-50 rounded-xl border border-[#E7E5E4] transition-all cursor-pointer shadow-xs"
          >
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt={currentUser?.name}
              className="w-7 h-7 rounded-lg object-cover border border-stone-300"
            />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-[#1C1917] leading-tight">
                {currentUser?.name || 'Kasir'}
              </div>
              <div className="text-[10px] text-[#78716C] flex items-center gap-1.5 font-medium">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentUser?.active !== false ? 'bg-[#166534]' : 'bg-[#DC2626]'
                  }`}
                />
                <span>
                  {currentUser?.role === 'admin'
                    ? 'Owner / Admin'
                    : currentUser?.active !== false
                    ? 'Kasir (Shift Aktif)'
                    : 'Kasir (Shift Off)'}
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-[#78716C]" />
          </button>

          {/* User Popover */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowUserMenu(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#E7E5E4] py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-[#E7E5E4] bg-[#FFFDF7]">
                  <p className="text-[10px] text-[#78716C] uppercase tracking-wider font-bold">
                    Akun Bertugas
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <div>
                      <p className="text-sm font-bold text-[#1C1917] leading-tight">{currentUser?.name}</p>
                      <p className="text-xs text-[#78716C]">@{currentUser?.username}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        currentUser?.role === 'admin'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-[#166534] border border-emerald-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          currentUser?.active !== false ? 'bg-[#166534]' : 'bg-[#DC2626]'
                        }`}
                      />
                      {currentUser?.role === 'admin' ? 'ADMIN' : 'KASIR'}
                    </span>
                  </div>
                </div>

                {/* Quick Switch User - ADMIN ONLY */}
                {currentUser?.role === 'admin' ? (
                  <div className="py-2 border-b border-[#E7E5E4]">
                    <div className="px-4 mb-1.5 flex items-center justify-between">
                      <p className="text-[10px] font-bold text-[#78716C] uppercase tracking-wider">
                        Ganti Petugas / Akun
                      </p>
                      <span className="text-[9px] text-[#166534] font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Khusus Admin
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-stone-50">
                      {users.map((u) => {
                        const isCurrent = u.id === currentUser?.id;
                        const isOnlineShift = u.active;

                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              switchUser(u.id);
                              setShowUserMenu(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-[#FFFDF7] transition-colors cursor-pointer ${
                              isCurrent ? 'bg-emerald-50/80 font-bold text-[#166534]' : 'text-[#1C1917]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {/* Indicator Dot: Green for active/shift, Red for off */}
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isOnlineShift ? 'bg-[#166534]' : 'bg-[#DC2626]'
                                }`}
                                title={isOnlineShift ? 'Shift Aktif' : 'Sedang Off'}
                              />
                              <div className="truncate">
                                <span className="block truncate">{u.name}</span>
                                <span className="text-[10px] text-[#78716C] font-normal block">
                                  {isOnlineShift ? 'Shift Aktif' : 'Sedang Off'}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                u.role === 'admin'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-stone-100 text-[#78716C]'
                              }`}
                            >
                              {u.role}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-2.5 border-b border-[#E7E5E4] bg-stone-50/50">
                    <p className="text-[11px] text-[#78716C] leading-relaxed">
                      💡 Pergantian akun kasir hanya dapat dilakukan melalui menu login setelah logout atau oleh Admin.
                    </p>
                  </div>
                )}

                <div className="p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    id="logout-button"
                    className="w-full text-left px-3 py-2 text-xs font-bold text-[#DC2626] hover:bg-red-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
