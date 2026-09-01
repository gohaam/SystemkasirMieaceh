import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { User, Role } from '../../types';
import { Modal } from '../common/Modal';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Lock,
  UserCheck,
} from 'lucide-react';

export const UsersView: React.FC = () => {
  const { users, currentUser, addUser, updateUser, deleteUser, toggleUserStatus, showToast } = usePOS();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('cashier');
  const [pin, setPin] = useState('');
  const [active, setActive] = useState(true);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setName('');
    setPhone('');
    setRole('cashier');
    setPin('1234');
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setName(user.name);
    setPhone(user.phone || '');
    setRole(user.role);
    setPin(user.pin || '1234');
    setActive(user.active);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim() || pin.length < 4) {
      showToast('Mohon lengkapi username, nama, dan PIN minimal 4 angka', 'error');
      return;
    }

    if (editingUser) {
      updateUser(editingUser.id, {
        username,
        name,
        phone,
        role,
        pin,
        active,
      });
    } else {
      addUser({
        username: username.toLowerCase().trim(),
        name,
        phone,
        role,
        pin,
        active,
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUser?.id) {
      showToast('Tidak dapat menghapus akun yang sedang Anda gunakan saat ini.', 'error');
      return;
    }

    const adminCount = users.filter((u) => u.role === 'admin').length;
    if (user.role === 'admin' && adminCount <= 1) {
      showToast('Harus tersisa minimal 1 akun Admin di dalam sistem.', 'error');
      return;
    }

    if (confirm(`Hapus pengguna "${user.name}" (${user.username})?`)) {
      deleteUser(user.id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#FFFDF7] space-y-6 text-[#1C1917]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-[#166534]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
              Kelola Akun Kasir & Pengguna
            </h2>
          </div>
          <p className="text-xs text-[#78716C] mt-1">
            Atur hak akses login, peran (Admin / Kasir), dan kode PIN rahasia untuk setiap staf
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          id="add-user-btn"
          className="px-5 py-2.5 bg-[#166534] hover:bg-[#14532d] active:scale-98 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Kasir / Staf Baru</span>
        </button>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#1C1917] text-sm">Hak Akses: Admin / Pemilik</h3>
            <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
              Memiliki akses tak terbatas ke seluruh sistem: Dashboard Keuangan, Laporan Penjualan, Manajemen Menu & HPP, Stok Bahan, Pembatalan (Void) Transaksi, serta Pengaturan Warung.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 text-[#166534] flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#1C1917] text-sm">Hak Akses: Kasir Operasional</h3>
            <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
              Dikhususkan untuk operasional kasir cepat: Input pesanan menu, kustomisasi bumbu & level pedas, cetak struk pembayaran, dan melihat riwayat transaksi harian.
            </p>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#E7E5E4]">
          <h3 className="font-bold text-[#1C1917] text-base">Daftar Pengguna Sistem</h3>
          <p className="text-xs text-[#78716C] mt-0.5">
            Total {users.length} akun terdaftar di sistem kasir
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FFFDF7] border-b border-[#E7E5E4] text-[#78716C] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Nama Lengkap</th>
                <th className="py-3.5 px-4">Username</th>
                <th className="py-3.5 px-4">No HP</th>
                <th className="py-3.5 px-4">Peran (Role)</th>
                <th className="py-3.5 px-4">Kode PIN</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[#FFFDF7]/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#1C1917]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-stone-100 text-[#1C1917] font-bold flex items-center justify-center text-xs">
                        {user.name.charAt(0)}
                      </div>
                      <span>{user.name}</span>
                      {user.id === currentUser?.id && (
                        <span className="px-1.5 py-0.2 bg-green-100 text-[#166534] text-[10px] rounded font-bold">
                          Anda
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#78716C]">@{user.username}</td>
                  <td className="py-3.5 px-4 text-[#1C1917]">
                    {user.phone ? user.phone : <span className="text-[#78716C]">-</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    {user.role === 'admin' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        ADMIN / PEMILIK
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-[#166534] border border-green-200">
                        KASIR
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#1C1917]">
                    ••••
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => toggleUserStatus(user.id)}
                      className="cursor-pointer group text-left"
                      title="Klik untuk ubah status shift / aktif"
                    >
                      {user.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-[#166534] border border-emerald-200 group-hover:bg-emerald-100 transition-colors">
                          <span className="w-2 h-2 rounded-full bg-[#166534]" />
                          <span>Shift Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-[#DC2626] border border-red-200 group-hover:bg-red-100 transition-colors">
                          <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                          <span>Off / Non-Aktif</span>
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(user)}
                        className="p-1.5 text-[#78716C] hover:text-[#166534] hover:bg-[#166534]/10 rounded-lg transition-colors cursor-pointer"
                        title="Edit Pengguna"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUser?.id}
                        className="p-1.5 text-[#78716C] hover:text-[#DC2626] hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                        title="Hapus Pengguna"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingUser ? 'Edit Data Pengguna' : 'Tambah Kasir / Admin Baru'}
          subtitle="Masukkan data akun dan 4-digit PIN rahasia"
          maxWidth="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs text-[#1C1917]">
            <div>
              <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                Nama Lengkap:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Teuku Rahmat"
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  Username (Untuk Login):
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="rahmat"
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                  No HP / WhatsApp:
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:border-[#166534] outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                Peran (Role):
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-semibold text-[#1C1917] focus:border-[#166534] outline-hidden"
              >
                <option value="cashier">Kasir (Cashier)</option>
                <option value="admin">Admin / Pemilik</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#1C1917] uppercase tracking-wider mb-1">
                Kode PIN Rahasia (4-6 Digit Angka):
              </label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="1234"
                className="w-full bg-[#FFFDF7] border border-[#E7E5E4] rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-widest text-[#1C1917] focus:border-[#166534] outline-hidden"
                required
              />
              <span className="text-[10px] text-[#78716C] mt-1 block">
                PIN digunakan oleh kasir saat membuka shift kasir atau berganti akun.
              </span>
            </div>

            <div className="pt-2 border-t border-[#E7E5E4]">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-[#FFFDF7] border border-[#E7E5E4]">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded text-[#166534] focus:ring-[#166534]"
                />
                <span className="font-bold text-[#1C1917]">Akun Aktif (Bisa digunakan untuk login)</span>
              </label>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-[#E7E5E4]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 font-semibold text-[#78716C] hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#166534] hover:bg-[#14532d] text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                {editingUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
