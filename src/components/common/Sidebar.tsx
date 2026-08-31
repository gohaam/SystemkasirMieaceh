import React from 'react';
import { usePOS, TabView } from '../../context/POSContext';
import {
  LayoutDashboard,
  ShoppingBag,
  ReceiptText,
  QrCode,
  UtensilsCrossed,
  PackageCheck,
  BarChart3,
  Users2,
  Settings,
  LogOut,
  ShieldCheck,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    logout,
    cartItemCount,
    activePendingTableOrdersCount,
    settings,
    showToast,
    isSidebarCollapsed,
    toggleSidebar,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  } = usePOS();
  const isAdmin = currentUser?.role === 'admin';

  interface NavItem {
    id: TabView;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    adminOnly?: boolean;
  }

  const mainNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      adminOnly: true,
    },
    {
      id: 'pos',
      label: 'Kasir',
      icon: ShoppingBag,
      badge: cartItemCount > 0 ? cartItemCount : undefined,
    },
    {
      id: 'table-qr',
      label: 'QR Meja',
      icon: QrCode,
      badge: activePendingTableOrdersCount > 0 ? activePendingTableOrdersCount : undefined,
    },
    {
      id: 'transactions',
      label: 'Transaksi',
      icon: ReceiptText,
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: UtensilsCrossed,
      adminOnly: true,
    },
    {
      id: 'inventory',
      label: 'Stok',
      icon: PackageCheck,
    },
    {
      id: 'reports',
      label: 'Laporan',
      icon: BarChart3,
      adminOnly: true,
    },
  ];

  const secondaryNavItems: NavItem[] = [
    {
      id: 'users',
      label: 'Pengguna',
      icon: Users2,
      adminOnly: true,
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      icon: Settings,
      adminOnly: true,
    },
  ];

  const handleNavClick = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) {
      showToast('Halaman ini khusus untuk hak akses Admin/Pemilik.', 'warning');
      return;
    }
    setActiveTab(item.id);
    // Close mobile drawer on item selection
    setIsMobileSidebarOpen(false);
  };

  const renderNavButton = (item: NavItem, isCollapsedView: boolean) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const isRestricted = item.adminOnly && !isAdmin;

    return (
      <button
        key={item.id}
        id={`sidebar-nav-${item.id}`}
        onClick={() => handleNavClick(item)}
        title={isCollapsedView ? item.label : undefined}
        className={`w-full flex items-center ${
          isCollapsedView ? 'justify-center px-2' : 'justify-start px-3 gap-3'
        } py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer relative group ${
          isActive
            ? 'bg-[#166534]/10 text-[#166534] font-bold'
            : isRestricted
            ? 'text-[#78716C]/50 hover:text-[#78716C] hover:bg-stone-100/50 opacity-60'
            : 'text-[#78716C] hover:text-[#1C1917] hover:bg-stone-100'
        }`}
      >
        <Icon
          className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
            isActive ? 'text-[#166534]' : 'text-[#78716C] group-hover:text-[#1C1917]'
          }`}
        />
        {!isCollapsedView && <span className="truncate">{item.label}</span>}

        {/* Badge */}
        {item.badge !== undefined && (
          isCollapsedView ? (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 bg-[#DC2626] text-white rounded-full text-[9px] font-bold shadow-xs">
              {item.badge}
            </span>
          ) : (
            <span className="ml-auto flex items-center justify-center min-w-5 h-5 px-1.5 bg-[#DC2626] text-white rounded-full text-[10px] font-bold">
              {item.badge}
            </span>
          )
        )}

        {/* Lock icon for restricted */}
        {isRestricted && !isCollapsedView && (
          <span className="ml-auto text-[9px] text-[#78716C] bg-stone-100 px-1.5 py-0.5 rounded font-medium">
            Admin
          </span>
        )}

        {/* Active Indicator bar */}
        {isActive && (
          <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#166534] rounded-r-full" />
        )}

        {/* Hover Tooltip when collapsed */}
        {isCollapsedView && (
          <div className="absolute left-full ml-2.5 px-2.5 py-1 bg-stone-900 text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
            {item.label}
            {item.badge !== undefined && ` (${item.badge})`}
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      {/* 1. Mobile Drawer Backdrop & Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white text-[#1C1917] z-50 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-[#E7E5E4] flex items-center justify-between bg-[#FFFDF7]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#166534] rounded-xl flex items-center justify-center font-black text-white text-sm shadow-xs">
                  {settings.storeName ? settings.storeName.slice(0, 2).toUpperCase() : 'MI'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1C1917] leading-tight">
                    {settings.storeName || 'Mie Aceh'}
                  </h3>
                  <span className="text-[10px] text-[#78716C] font-semibold">
                    {settings.tagline || 'Pak Ismail'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 rounded-xl text-stone-500 hover:bg-stone-100 cursor-pointer"
                title="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <p className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Navigasi Utama
              </p>
              {mainNavItems.map((item) => renderNavButton(item, false))}

              <div className="my-3 border-t border-[#E7E5E4]" />

              <p className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Pengaturan & Admin
              </p>
              {secondaryNavItems.map((item) => renderNavButton(item, false))}
            </div>

            {/* Mobile Footer */}
            <div className="p-3 border-t border-[#E7E5E4] bg-[#FFFDF7]/70 space-y-2">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-stone-100/80">
                {isAdmin ? (
                  <ShieldCheck className="w-5 h-5 text-[#166534] shrink-0" />
                ) : (
                  <UserCircle className="w-5 h-5 text-[#78716C] shrink-0" />
                )}
                <div className="truncate">
                  <p className="text-xs font-bold text-[#1C1917] truncate">{currentUser?.name}</p>
                  <p className="text-[10px] text-[#78716C] font-semibold">
                    {isAdmin ? 'Admin / Pemilik' : 'Kasir'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar (Logout)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 select-none bg-white text-[#1C1917] border-r border-[#E7E5E4] shadow-xs transition-[width] duration-200 ease-in-out relative ${
          isSidebarCollapsed ? 'w-18' : 'w-60'
        }`}
      >
        {/* Top Section */}
        <div className="p-3">
          {/* Brand Header with Toggle Button */}
          <div
            className={`flex items-center ${
              isSidebarCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'
            } px-1.5 py-2 mb-2 border-b border-[#E7E5E4] pb-3`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 bg-[#166534] rounded-xl flex items-center justify-center font-black text-white text-sm shadow-xs shrink-0">
                {settings.storeName ? settings.storeName.slice(0, 2).toUpperCase() : 'MI'}
              </div>
              {!isSidebarCollapsed && (
                <div className="truncate">
                  <h3 className="font-bold text-sm text-[#1C1917] tracking-tight leading-tight truncate">
                    {settings.storeName || 'Mie Aceh'}
                  </h3>
                  <span className="text-[11px] text-[#78716C] font-semibold block truncate">
                    {settings.tagline || 'Pak Ismail'}
                  </span>
                </div>
              )}
            </div>

            {/* Toggle Collapse/Expand Button */}
            <button
              type="button"
              id="sidebar-toggle-btn"
              onClick={toggleSidebar}
              title={isSidebarCollapsed ? 'Buka Sidebar (Expand)' : 'Tutup / Ciutkan Sidebar (Collapse)'}
              className={`p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all cursor-pointer ${
                isSidebarCollapsed ? 'w-8 h-8 flex items-center justify-center mt-1' : ''
              }`}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-[#166534]" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-stone-500 hover:text-stone-900" />
              )}
            </button>
          </div>

          {/* Primary Nav Items */}
          <nav className="space-y-1 mt-2">
            {mainNavItems.map((item) => renderNavButton(item, isSidebarCollapsed))}
          </nav>

          {/* Divider */}
          <div className="my-3 border-t border-[#E7E5E4]" />

          {/* Secondary Nav Items */}
          <nav className="space-y-1">
            {secondaryNavItems.map((item) => renderNavButton(item, isSidebarCollapsed))}
          </nav>
        </div>

        {/* Bottom Profile & Logout */}
        <div className="p-3 border-t border-[#E7E5E4] bg-[#FFFDF7]/60 space-y-2">
          <div
            className={`flex items-center ${
              isSidebarCollapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2'
            } rounded-xl bg-stone-100/70`}
            title={isSidebarCollapsed ? `${currentUser?.name} (${isAdmin ? 'Admin' : 'Kasir'})` : undefined}
          >
            {isAdmin ? (
              <ShieldCheck className="w-5 h-5 text-[#166534] shrink-0" />
            ) : (
              <UserCircle className="w-5 h-5 text-[#78716C] shrink-0" />
            )}
            {!isSidebarCollapsed && (
              <div className="truncate">
                <p className="text-xs font-bold text-[#1C1917] truncate">{currentUser?.name}</p>
                <p className="text-[10px] text-[#78716C] uppercase tracking-wider font-semibold">
                  {isAdmin ? 'Admin / Pemilik' : 'Kasir'}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            id="sidebar-logout-btn"
            title={isSidebarCollapsed ? 'Keluar (Logout)' : undefined}
            className={`w-full flex items-center ${
              isSidebarCollapsed ? 'justify-center px-2' : 'justify-start px-3 gap-2.5'
            } py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50 rounded-xl transition-colors cursor-pointer`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

