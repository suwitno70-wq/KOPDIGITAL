import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, Search, Wallet } from 'lucide-react';
import type {
  AnggotaRecord,
  SimpananJenis,
  SimpananRecord,
  SimpananTipe,
  UserRecord,
} from '../../types/koperasi';
import { apiFetch } from '../../utils/api';
import { exportToExcel, formatDateTime, formatRupiah } from '../../utils/format';
import { EmptyState, QrCodeCanvas } from '../common/PWAWidgets';

interface SimpananViewProps {
  user: UserRecord;
  anggotaSaya: AnggotaRecord | null;
  riwayat: SimpananRecord[];
  rekapAnggota: AnggotaRecord[];
  onRefresh: () => void;
}

export const SimpananView: React.FC<SimpananViewProps> = ({
  user,
  anggotaSaya,
  riwayat,
  rekapAnggota,
  onRefresh,
}) => {
  const isStaff = user.role === 'ADMIN' || user.role === 'KASIR';
  const [selectedAnggotaId, setSelectedAnggotaId] = useState(rekapAnggota[0]?.id_anggota || '');
  const [jenis, setJenis] = useState<SimpananJenis>('SUKARELA');
  const [tipe, setTipe] = useState<SimpananTipe>('SETOR');
  const [jumlah, setJumlah] = useState('');
  const [metode, setMetode] = useState('TUNAI');
  const [keterangan, setKeterangan] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const filteredRiwayat = useMemo(() => {
    const q = search.trim().toLowerCase();
    return riwayat.filter(
      (r) =>
        !q ||
        r.nomor_transaksi.toLowerCase().includes(q) ||
        r.nama_anggota.toLowerCase().includes(q) ||
        r.jenis_simpanan.toLowerCase().includes(q)
    );
  }, [riwayat, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      await apiFetch('/api/simpanan/transaksi', {
        method: 'POST',
        body: JSON.stringify({
          id_anggota: selectedAnggotaId || rekapAnggota[0]?.id_anggota,
          jenis_simpanan: jenis,
          tipe,
          jumlah: Number(jumlah),
          metode,
          keterangan,
        }),
      });
      setJumlah('');
      setKeterangan('');
      setSuccessMsg(`Transaksi ${tipe} Simpanan ${jenis} berhasil dicatat.`);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses simpanan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    exportToExcel(
      'Mutasi_Simpanan',
      filteredRiwayat.map((r) => ({
        Nomor_Transaksi: r.nomor_transaksi,
        Tanggal: formatDateTime(r.created_at),
        Nama_Anggota: r.nama_anggota,
        Jenis_Simpanan: r.jenis_simpanan,
        Tipe: r.tipe,
        Jumlah: r.jumlah,
        Saldo_Sesudah: r.saldo_sesudah,
        Metode: r.metode,
        Keterangan: r.keterangan,
      })),
      `Laporan-Simpanan-${new Date().toISOString().slice(0, 10)}`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {isStaff ? 'Manajemen Simpanan Anggota' : 'Simpanan & Kartu Anggota Digital'}
          </h1>
          <p className="text-sm text-slate-500">
            Kelola Simpanan Pokok, Simpanan Wajib, dan Simpanan Sukarela secara transparan.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 self-start"
        >
          <Download className="h-4 w-4 text-emerald-700" />
          Export Excel
        </button>
      </div>

      {/* Member Digital Card & Balances */}
      {anggotaSaya && (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Portofolio Simpanan Anda
                </p>
                <p className="font-display text-lg font-bold text-slate-900">{anggotaSaya.nama}</p>
              </div>
              <Wallet className="h-5 w-5 text-emerald-700" />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3.5">
                <p className="text-xs text-slate-500">Simpanan Pokok</p>
                <p className="mt-1 font-mono-num text-lg font-bold text-slate-900">
                  {formatRupiah(anggotaSaya.saldo_pokok)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">Terkunci selama aktif</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3.5">
                <p className="text-xs text-slate-500">Simpanan Wajib</p>
                <p className="mt-1 font-mono-num text-lg font-bold text-slate-900">
                  {formatRupiah(anggotaSaya.saldo_wajib)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">Iuran rutin bulanan</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3.5">
                <p className="text-xs text-emerald-800">Simpanan Sukarela</p>
                <p className="mt-1 font-mono-num text-lg font-bold text-emerald-700">
                  {formatRupiah(anggotaSaya.saldo_sukarela)}
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-700">Dapat ditarik & belanja</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-emerald-900 p-5 text-white lg:col-span-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                Kartu Anggota QR
              </p>
              <p className="mt-1 font-display text-base font-bold">{anggotaSaya.nama}</p>
              <p className="font-mono-num text-xs text-emerald-200">{anggotaSaya.kode_anggota}</p>
              <p className="mt-3 text-[11px] text-emerald-100">
                Tunjukkan QR ini kepada kasir saat berbelanja di gerai koperasi.
              </p>
            </div>
            <QrCodeCanvas value={anggotaSaya.qr_token} size={96} className="shrink-0 p-1.5" />
          </div>
        </div>
      )}

      {/* Staff Form: Setor / Tarik */}
      {isStaff && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">
              Catat Setoran / Penarikan Simpanan
            </h2>
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Pilih Anggota</label>
              <select
                value={selectedAnggotaId || rekapAnggota[0]?.id_anggota || ''}
                onChange={(e) => setSelectedAnggotaId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
              >
                {rekapAnggota.map((a) => (
                  <option key={a.id_anggota} value={a.id_anggota}>
                    {a.kode_anggota} — {a.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Jenis Simpanan</label>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value as SimpananJenis)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
              >
                <option value="POKOK">Simpanan Pokok</option>
                <option value="WAJIB">Simpanan Wajib</option>
                <option value="SUKARELA">Simpanan Sukarela</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Tipe Transaksi</label>
              <select
                value={tipe}
                onChange={(e) => setTipe(e.target.value as SimpananTipe)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
              >
                <option value="SETOR">Setor Simpanan</option>
                <option value="TARIK">Tarik Simpanan</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Nominal (Rp)</label>
              <input
                type="number"
                required
                min={1000}
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="150000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Metode</label>
              <select
                value={metode}
                onChange={(e) => setMetode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
              >
                <option value="TUNAI">Tunai</option>
                <option value="TRANSFER_BANK">Transfer Bank</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Keterangan mutasi (contoh: Simpanan wajib bulan November 2026)"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Mutasi'}
            </button>
          </div>
        </form>
      )}

      {/* Rekap Seluruh Anggota (Staff Only) */}
      {isStaff && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-display text-base font-bold text-slate-900">Rekap Simpanan Seluruh Anggota</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-semibold">Kode</th>
                  <th className="py-2 pr-4 font-semibold">Nama Anggota</th>
                  <th className="py-2 pr-4 text-right font-semibold">Pokok</th>
                  <th className="py-2 pr-4 text-right font-semibold">Wajib</th>
                  <th className="py-2 pr-4 text-right font-semibold">Sukarela</th>
                  <th className="py-2 text-right font-semibold">Total Simpanan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rekapAnggota.map((a) => (
                  <tr key={a.id_anggota} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-4 font-mono-num font-semibold text-slate-900">{a.kode_anggota}</td>
                    <td className="py-2.5 pr-4 font-medium text-slate-800">{a.nama}</td>
                    <td className="py-2.5 pr-4 text-right font-mono-num">{formatRupiah(a.saldo_pokok)}</td>
                    <td className="py-2.5 pr-4 text-right font-mono-num">{formatRupiah(a.saldo_wajib)}</td>
                    <td className="py-2.5 pr-4 text-right font-mono-num text-emerald-700 font-semibold">
                      {formatRupiah(a.saldo_sukarela)}
                    </td>
                    <td className="py-2.5 text-right font-mono-num font-bold text-slate-900">
                      {formatRupiah(a.saldo_pokok + a.saldo_wajib + a.saldo_sukarela)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Riwayat Mutasi Simpanan */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-base font-bold text-slate-900">Riwayat Mutasi Simpanan</h2>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor atau anggota..."
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-xs focus:border-emerald-700 focus:outline-none"
            />
          </div>
        </div>

        {filteredRiwayat.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Belum ada mutasi simpanan" description="Mutasi setoran dan penarikan akan tampil di sini." />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-semibold">No. Transaksi</th>
                  <th className="py-2 pr-4 font-semibold">Tanggal</th>
                  <th className="py-2 pr-4 font-semibold">Anggota</th>
                  <th className="py-2 pr-4 font-semibold">Jenis / Tipe</th>
                  <th className="py-2 pr-4 text-right font-semibold">Nominal</th>
                  <th className="py-2 text-right font-semibold">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRiwayat.map((r) => (
                  <tr key={r.id_simpanan} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-4 font-mono-num font-semibold text-slate-900">{r.nomor_transaksi}</td>
                    <td className="py-2.5 pr-4 font-mono-num text-slate-500">{formatDateTime(r.created_at)}</td>
                    <td className="py-2.5 pr-4 text-slate-800">{r.nama_anggota}</td>
                    <td className="py-2.5 pr-4">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        {r.tipe === 'SETOR' ? (
                          <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-700" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        {r.tipe} · {r.jenis_simpanan}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 pr-4 text-right font-mono-num font-bold ${
                        r.tipe === 'SETOR' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {r.tipe === 'SETOR' ? '+' : '-'}
                      {formatRupiah(r.jumlah)}
                    </td>
                    <td className="py-2.5 text-right font-mono-num font-semibold text-slate-900">
                      {formatRupiah(r.saldo_sesudah)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
