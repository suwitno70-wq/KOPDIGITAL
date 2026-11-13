import React, { useState } from 'react';
import { Lock, UserPlus, X } from 'lucide-react';
import type { AnggotaRecord, UserRecord } from '../../types/koperasi';
import { apiFetch, setStoredToken } from '../../utils/api';

interface LoginModalProps {
  onSuccess: (payload: { token: string; user: UserRecord; anggota: AnggotaRecord | null }) => void;
  onClose?: () => void;
  allowClose?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess, onClose, allowClose = true }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [nik, setNik] = useState('');
  const [alamat, setAlamat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'LOGIN') {
        const res = await apiFetch<{ token: string; user: UserRecord; anggota: AnggotaRecord | null }>(
          '/api/auth/login',
          {
            method: 'POST',
            body: JSON.stringify({ username, password }),
          }
        );
        setStoredToken(res.token);
        onSuccess(res);
      } else {
        const res = await apiFetch<{ token: string; user: UserRecord; anggota: AnggotaRecord | null }>(
          '/api/auth/register',
          {
            method: 'POST',
            body: JSON.stringify({
              username,
              password,
              nama_lengkap: namaLengkap,
              email,
              no_hp: noHp,
              nik,
              alamat,
            }),
          }
        );
        setStoredToken(res.token);
        onSuccess(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              KREATIF BY WITNO
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
              {mode === 'LOGIN' ? 'Masuk Koperasi Digital Pro' : 'Daftar Anggota Baru'}
            </h2>
          </div>
          {allowClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setError(''); }}
            className={`rounded-md py-2 text-xs font-semibold transition-colors ${
              mode === 'LOGIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => { setMode('REGISTER'); setError(''); }}
            className={`rounded-md py-2 text-xs font-semibold transition-colors ${
              mode === 'REGISTER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar Anggota
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {mode === 'REGISTER' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Nomor HP</label>
                  <input
                    type="tel"
                    required
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    placeholder="0812..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">NIK (Opsional)</label>
                  <input
                    type="text"
                    value={nik}
                    onChange={(e) => setNik(e.target.value)}
                    placeholder="16 digit NIK"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Alamat Domisili</label>
                <input
                  type="text"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Alamat lengkap"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Username atau Email</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
          >
            {mode === 'LOGIN' ? <Lock className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {loading ? 'Memproses...' : mode === 'LOGIN' ? 'Masuk Sekarang' : 'Daftar & Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
};
