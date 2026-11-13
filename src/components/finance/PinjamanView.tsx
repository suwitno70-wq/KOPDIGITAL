import React, { useMemo, useState } from 'react';
import { Calculator, Check, Landmark, X } from 'lucide-react';
import type {
  AnggotaRecord,
  AngsuranRecord,
  PengaturanKoperasi,
  PinjamanRecord,
  UserRecord,
} from '../../types/koperasi';
import { apiFetch } from '../../utils/api';
import { formatDateOnly, formatDateTime, formatRupiah, LOAN_STATUS_LABEL } from '../../utils/format';
import { EmptyState } from '../common/PWAWidgets';

interface PinjamanViewProps {
  user: UserRecord;
  anggotaSaya: AnggotaRecord | null;
  anggotaList: AnggotaRecord[];
  pinjaman: PinjamanRecord[];
  angsuran: AngsuranRecord[];
  pengaturan: PengaturanKoperasi;
  onRefresh: () => void;
}

export const PinjamanView: React.FC<PinjamanViewProps> = ({
  user,
  anggotaSaya,
  anggotaList,
  pinjaman,
  angsuran,
  pengaturan,
  onRefresh,
}) => {
  const isAdmin = user.role === 'ADMIN';
  const isStaff = user.role === 'ADMIN' || user.role === 'KASIR';

  const [nominal, setNominal] = useState('3000000');
  const [tenor, setTenor] = useState('6');
  const [tujuan, setTujuan] = useState('');
  const [targetAnggota, setTargetAnggota] = useState(anggotaList[0]?.id_anggota || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busyLoanId, setBusyLoanId] = useState<string | null>(null);

  const simulasi = useMemo(() => {
    const p = Math.max(0, Number(nominal || 0));
    const t = Math.max(1, Number(tenor || 1));
    const rate = pengaturan.bunga_pinjaman_persen_per_bulan;
    const totalBunga = Math.round((p * rate * t) / 100);
    const totalKewajiban = p + totalBunga;
    const perBulan = Math.round(totalKewajiban / t);
    return { totalBunga, totalKewajiban, perBulan, rate };
  }, [nominal, tenor, pengaturan.bunga_pinjaman_persen_per_bulan]);

  const handleAjukan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      await apiFetch('/api/pinjaman/ajukan', {
        method: 'POST',
        body: JSON.stringify({
          id_anggota: isAdmin ? targetAnggota : anggotaSaya?.id_anggota,
          jumlah_pinjaman: Number(nominal),
          tenor_bulan: Number(tenor),
          tujuan,
        }),
      });
      setTujuan('');
      setSuccessMsg('Pengajuan pinjaman berhasil dikirim dan menunggu persetujuan pengurus.');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengajukan pinjaman.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeputusan = async (id: string, keputusan: 'SETUJUI' | 'TOLAK') => {
    setBusyLoanId(id);
    try {
      await apiFetch(`/api/pinjaman/${id}/keputusan`, {
        method: 'POST',
        body: JSON.stringify({ keputusan }),
      });
      onRefresh();
    } finally {
      setBusyLoanId(null);
    }
  };

  const handleBayarAngsuran = async (id: string) => {
    setBusyLoanId(id);
    try {
      await apiFetch(`/api/pinjaman/${id}/angsuran`, {
        method: 'POST',
        body: JSON.stringify({ metode: 'TUNAI', denda: 0 }),
      });
      onRefresh();
    } finally {
      setBusyLoanId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          {isStaff ? 'Manajemen Pinjaman & Angsuran' : 'Pinjaman Anggota & Simulasi Angsuran'}
        </h1>
        <p className="text-sm text-slate-500">
          Bunga koperasi flat <span className="font-mono-num font-semibold">{pengaturan.bunga_pinjaman_persen_per_bulan}%</span> per bulan · Transparan dan tercatat otomatis ke kas.
        </p>
      </div>

      {/* Pengajuan & Simulasi */}
      {(anggotaSaya || isAdmin) && (
        <div className="grid gap-6 lg:grid-cols-12">
          <form onSubmit={handleAjukan} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 lg:col-span-7">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-emerald-700" />
              <h2 className="font-display text-base font-bold text-slate-900">Ajukan Pinjaman Baru</h2>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                {successMsg}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {isAdmin && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">Anggota Peminjam</label>
                  <select
                    value={targetAnggota}
                    onChange={(e) => setTargetAnggota(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
                  >
                    {anggotaList.map((a) => (
                      <option key={a.id_anggota} value={a.id_anggota}>
                        {a.kode_anggota} — {a.nama} (Plafon: {formatRupiah(a.limit_kredit)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Nominal Pinjaman (Rp)</label>
                <input
                  type="number"
                  min={500000}
                  step={100000}
                  required
                  value={nominal}
                  onChange={(e) => setNominal(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Tenor (Bulan)</label>
                <select
                  value={tenor}
                  onChange={(e) => setTenor(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono-num text-sm focus:border-emerald-700 focus:outline-none"
                >
                  {[3, 6, 9, 12, 18, 24].map((m) => (
                    <option key={m} value={m}>
                      {m} Bulan
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Tujuan Penggunaan Dana</label>
              <input
                type="text"
                required
                value={tujuan}
                onChange={(e) => setTujuan(e.target.value)}
                placeholder="Contoh: Tambahan modal usaha warung atau biaya pendidikan"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Pinjaman'}
            </button>
          </form>

          <div className="rounded-xl border border-slate-200 bg-slate-900 p-5 text-white lg:col-span-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <Calculator className="h-4 w-4" />
              Simulasi Angsuran Otomatis
            </div>
            <p className="mt-3 text-xs text-slate-300">Estimasi Angsuran per Bulan</p>
            <p className="font-mono-num text-3xl font-bold text-white">
              {formatRupiah(simulasi.perBulan)}
            </p>
            <div className="mt-5 space-y-2 border-t border-slate-700 pt-4 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Pokok Pinjaman</span>
                <span className="font-mono-num">{formatRupiah(Number(nominal || 0))}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Bunga ({simulasi.rate}% x {tenor} bln)</span>
                <span className="font-mono-num">{formatRupiah(simulasi.totalBunga)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-2 font-bold text-amber-300">
                <span>Total Pengembalian</span>
                <span className="font-mono-num">{formatRupiah(simulasi.totalKewajiban)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daftar Pinjaman */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-display text-base font-bold text-slate-900">Daftar Pinjaman</h2>
        {pinjaman.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Belum ada pinjaman" description="Pengajuan pinjaman anggota akan tampil di sini." />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {pinjaman.map((p) => {
              const st = LOAN_STATUS_LABEL[p.status] || { label: p.status, colorClass: 'text-slate-700' };
              return (
                <div key={p.id_pinjaman} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono-num font-bold text-slate-900">{p.nomor_pinjaman}</span>
                        <span className="text-slate-300">·</span>
                        <span className="font-semibold text-slate-800">{p.nama_anggota}</span>
                        <span className="text-slate-300">·</span>
                        <span className={`font-bold ${st.colorClass}`}>{st.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{p.tujuan}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] text-slate-500">Sisa Tagihan</p>
                      <p className="font-mono-num text-base font-bold text-emerald-700">
                        {formatRupiah(p.sisa_tagihan)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs sm:grid-cols-4">
                    <div>
                      <span className="text-slate-500">Plafon Pinjaman</span>
                      <p className="font-mono-num font-semibold text-slate-900">{formatRupiah(p.jumlah_pinjaman)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Angsuran / Bulan</span>
                      <p className="font-mono-num font-semibold text-slate-900">{formatRupiah(p.angsuran_per_bulan)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Tenor & Bunga</span>
                      <p className="font-mono-num font-semibold text-slate-900">
                        {p.tenor_bulan} bln · {p.bunga_persen}%
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Jatuh Tempo Berikutnya</span>
                      <p className="font-mono-num font-semibold text-slate-900">
                        {p.jatuh_tempo_berikutnya ? formatDateOnly(p.jatuh_tempo_berikutnya) : '-'}
                      </p>
                    </div>
                  </div>

                  {(isAdmin || isStaff) && (
                    <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                      {isAdmin && p.status === 'MENUNGGU_PERSETUJUAN' && (
                        <>
                          <button
                            type="button"
                            disabled={busyLoanId === p.id_pinjaman}
                            onClick={() => handleKeputusan(p.id_pinjaman, 'TOLAK')}
                            className="flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            <X className="h-3.5 w-3.5" />
                            Tolak
                          </button>
                          <button
                            type="button"
                            disabled={busyLoanId === p.id_pinjaman}
                            onClick={() => handleKeputusan(p.id_pinjaman, 'SETUJUI')}
                            className="flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Setujui & Cairkan
                          </button>
                        </>
                      )}

                      {isStaff && p.status === 'AKTIF' && (
                        <button
                          type="button"
                          disabled={busyLoanId === p.id_pinjaman}
                          onClick={() => handleBayarAngsuran(p.id_pinjaman)}
                          className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                        >
                          Catat Bayar Angsuran ({formatRupiah(p.angsuran_per_bulan)})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Riwayat Angsuran */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-display text-base font-bold text-slate-900">Riwayat Pembayaran Angsuran</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-semibold">No. Transaksi</th>
                <th className="py-2 pr-4 font-semibold">No. Pinjaman</th>
                <th className="py-2 pr-4 font-semibold">Ke-</th>
                <th className="py-2 pr-4 font-semibold">Tanggal</th>
                <th className="py-2 pr-4 text-right font-semibold">Pokok</th>
                <th className="py-2 pr-4 text-right font-semibold">Bunga</th>
                <th className="py-2 text-right font-semibold">Total Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {angsuran.map((a) => (
                <tr key={a.id_angsuran} className="hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-mono-num font-semibold text-slate-900">{a.nomor_transaksi}</td>
                  <td className="py-2.5 pr-4 font-mono-num text-slate-600">{a.nomor_pinjaman}</td>
                  <td className="py-2.5 pr-4 font-mono-num">Ke-{a.angsuran_ke}</td>
                  <td className="py-2.5 pr-4 font-mono-num text-slate-500">{formatDateTime(a.created_at)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono-num">{formatRupiah(a.pokok_dibayar)}</td>
                  <td className="py-2.5 pr-4 text-right font-mono-num">{formatRupiah(a.bunga_dibayar)}</td>
                  <td className="py-2.5 text-right font-mono-num font-bold text-emerald-700">
                    {formatRupiah(a.total_bayar)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
