import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Store, KeyRound, User as UserIcon, Lock, UtensilsCrossed } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, settings } = usePOS();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !pin.trim()) return;

    setIsLoading(true);
    await login(username.trim(), pin.trim());
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-4 sm:p-6 text-[#1C1917]">
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl border border-[#E7E5E4] shadow-xl overflow-hidden">
        
        {/* Left Column: Brand Hero */}
        <div className="md:col-span-5 bg-[#166534] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden text-white">
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 mb-6 shadow-inner">
              <UtensilsCrossed className="w-7 h-7 text-amber-300" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              {settings.storeName || 'Mie Aceh Pak Ismail'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-2 leading-relaxed">
              {settings.tagline || 'Sistem Kasir & Manajemen Rumah Makan'}
            </p>
          </div>

          <div className="relative z-10 mt-12 pt-6 border-t border-white/15">
            <p className="text-[11px] text-emerald-200/80 font-medium">
              Sistem Point of Sale Resmi
            </p>
            <p className="text-xs text-white font-semibold mt-0.5">
              Masuk untuk mulai mengelola operasional
            </p>
          </div>
        </div>

        {/* Right Column: Clean Login Form */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#1C1917] tracking-tight">Masuk ke Sistem</h2>
            <p className="text-xs text-[#78716C] mt-1">
              Silakan masukkan Username dan Password / PIN akun Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="login-username-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username (contoh: admin)"
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#1C1917] placeholder-[#78716C]/50 transition-all outline-hidden font-medium"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1917] mb-1.5 uppercase tracking-wider">
                Password / Kode PIN
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  id="login-pin-input"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan password atau PIN"
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] focus:border-[#166534] focus:ring-2 focus:ring-[#166534]/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#1C1917] placeholder-[#78716C]/50 transition-all outline-hidden font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-[#166534] hover:bg-[#14532d] active:scale-[0.99] text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-white" />
              <span>{isLoading ? 'Memverifikasi...' : 'Masuk Sekarang'}</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
