import React, { useEffect } from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import { ToastContainer } from './components/common/ToastContainer';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { POSView } from './components/pos/POSView';
import { TableQRView } from './components/tableqr/TableQRView';
import { CustomerOrderPortal } from './components/customer/CustomerOrderPortal';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { MenuManagementView } from './components/menu/MenuManagementView';
import { InventoryView } from './components/inventory/InventoryView';
import { ReportsView } from './components/reports/ReportsView';
import { UsersView } from './components/users/UsersView';
import { SettingsView } from './components/settings/SettingsView';

const MainLayout: React.FC = () => {
  const {
    currentUser,
    activeTab,
    isCustomerMode,
    setIsCustomerMode,
    activeCustomerTable,
    setActiveCustomerTable,
  } = usePOS();

  // Check URL query parameters for table QR scan on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tableParam = urlParams.get('table');
      if (tableParam) {
        setActiveCustomerTable(decodeURIComponent(tableParam));
        setIsCustomerMode(true);
      }
    }
  }, [setActiveCustomerTable, setIsCustomerMode]);

  // If in Customer Self-Ordering Mode
  if (isCustomerMode) {
    return (
      <CustomerOrderPortal
        initialTableNumber={activeCustomerTable || ''}
      />
    );
  }

  // If not logged in and not customer mode
  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#FFFDF7] flex flex-col font-sans text-[#1C1917] selection:bg-[#166534]/20 select-none">
      {/* Top Navigation Header */}
      <Header />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Dynamic Main View */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative min-h-0">
          {activeTab === 'pos' && <POSView />}
          {activeTab === 'table-qr' && <div className="flex-1 overflow-y-auto h-full"><TableQRView /></div>}
          {activeTab === 'dashboard' && <div className="flex-1 overflow-y-auto h-full"><DashboardView /></div>}
          {activeTab === 'transactions' && <div className="flex-1 overflow-y-auto h-full"><TransactionsView /></div>}
          {activeTab === 'menu' && <div className="flex-1 overflow-y-auto h-full"><MenuManagementView /></div>}
          {activeTab === 'inventory' && <div className="flex-1 overflow-y-auto h-full"><InventoryView /></div>}
          {activeTab === 'reports' && <div className="flex-1 overflow-y-auto h-full"><ReportsView /></div>}
          {activeTab === 'users' && <div className="flex-1 overflow-y-auto h-full"><UsersView /></div>}
          {activeTab === 'settings' && <div className="flex-1 overflow-y-auto h-full"><SettingsView /></div>}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <POSProvider>
      <MainLayout />
      <ToastContainer />
    </POSProvider>
  );
}

