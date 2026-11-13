import React, { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import type { FinancialReportSummary, KasRecord, PengaturanKoperasi } from '../../types/koperasi';
import { apiFetch } from '../../utils/api';
import { exportWorkbookSheets, formatDateOnly, formatRupiah } from '../../utils/format';

interface AccountingReportsViewProps {
  kas: KasRecord[];
  summary: FinancialReportSummary;
  pengaturan: PengaturanKoperasi;
  onRefresh: () => void;
}

export const AccountingReportsView: React.FC<AccountingReportsViewProps> = ({
  kas,
  summary,
  pengaturan,
  onRefresh,
}) => {
  const [tab, setTab] = useState<'KAS' | 'LABA_RUGI' | 'NERACA' | 'SHU'>('LABA_RUGI');
  const [jenis, setJenis] = useState<'MASUK' | 'KELUAR'>('KELUAR');
  const [kategoriAkun, setKategoriAkun] = useState('PENGELUARAN_OPERASIONAL');
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddKas = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/finance/kas', {
        method: 'POST',
        body: JSON.stringify({
          jenis,
          kategori_akun: kategoriAkun,
          jumlah: Number(jumlah),
          keterangan,
        }),
      });
      setJumlah('');
      setKeterangan('');
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportAll = () => {
    const lr = summary.laba_rugi;
    const nr = summary.neraca;
    const shu = summary.alokasi_shu;
    exportWorkbookSheets(
      [
        {
          name: 'Laba_Rugi',
          rows: [
            { Pos: 'Pendapatan Penjualan', Nilai: lr.pendapatan_penjualan },
            { Pos: 'Pendapatan Bunga Pinjaman', Nilai: lr.pendapatan_bunga_pinjaman },
            { Pos: 'Total Pendapatan', Nilai: lr.total_pendapatan },
            { Pos: 'Pembelian Stok / HPP', Nilai: lr.pembelian_stok_hpp },
            { Pos: 'Pengeluaran Operasional', Nilai: lr.pengeluaran_operasional },
            { Pos: 'Total Beban', Nilai: lr.total_beban },
            { Pos: 'Laba Bersih / SHU', Nilai: lr.laba_bersih_shu },
          ],
        },
        {
          name: 'Neraca',
          rows: [
            { Kelompok: 'AKTIVA', Pos: 'Kas & Bank', Nilai: nr.aktiva.kas_dan_bank },
            { Kelompok: 'AKTIVA', Pos: 'Piutang Pinjaman Anggota', Nilai: nr.aktiva.piutang_pinjaman_anggota },
            { Kelompok: 'AKTIVA', Pos: 'Nilai Persediaan Barang', Nilai: nr.aktiva.nilai_persediaan_barang },
            { Kelompok: 'AKTIVA', Pos: 'TOTAL AKTIVA', Nilai: nr.aktiva.total_aktiva },
            { Kelompok: 'KEWAJIBAN', Pos: 'Simpanan Sukarela Anggota', Nilai: nr.kewajiban.simpanan_sukarela_anggota },
            { Kelompok: 'KEWAJIBAN', Pos: 'Hutang Supplier', Nilai: nr.kewajiban.hutang_supplier },
            { Kelompok: 'EKUITAS', Pos: 'Simpanan Pokok', Nilai: nr.ekuitas.simpanan_pokok_anggota },
            { Kelompok: 'EKUITAS', Pos: 'Simpanan Wajib', Nilai: nr.ekuitas.simpanan_wajib_anggota },
            { Kelompok: 'EKUITAS', Pos: 'Modal Koperasi', Nilai: nr.ekuitas.modal_koperasi },
            { Kelompok: 'EKUITAS', Pos: 'SHU Tahun Berjalan', Nilai: nr.ekuitas.shu_tahun_berjalan },
          ],
        },
        {
          name: 'Pembagian_SHU',
          rows: [
            { Alokasi: 'Total SHU', Nilai: shu.total_shu },
            { Alokasi: `Jasa Modal (${pengaturan.shu_jasa_modal_persen}%)`, Nilai: shu.jasa_modal },
            { Alokasi: `Jasa Anggota (${pengaturan.shu_jasa_anggota_persen}%)`, Nilai: shu.jasa_anggota },
            { Alokasi: `Dana Cadangan (${pengaturan.shu_cadangan_persen}%)`, Nilai: shu.dana_cadangan },
            { Alokasi: `Dana Pengurus (${pengaturan.shu_pengurus_persen}%)`, Nilai: shu.dana_pengurus },
            { Alokasi: `Dana Sosial (${pengaturan.shu_sosial_persen}%)`, Nilai: shu.dana_sosial },
          ],
        },
        {
          name: 'Buku_Kas',
          rows: kas.map((k) => ({
            No_Transaksi: k.nomor_transaksi,
            Tanggal: k.tanggal,
            Jenis: k.jenis,
            Kategori: k.kategori_akun,
            Jumlah: k.jumlah,
            Keterangan: k.keterangan,
          })),
        },
      ],
      `Laporan-Keuangan-Koperasi-${new Date().toISOString().slice(0, 10)}`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Keuangan & Laporan Akuntansi</h1>
          <p className="text-sm text-slate-500">
            Buku Kas otomatis, Laporan Laba Rugi, Neraca Koperasi, dan Perhitungan SHU.
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Cetak / PDF
          </button>
          <button
            type="button"
            onClick={handleExportAll}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <Download className="h-4 w-4" />
            Export Excel Lengkap
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="no-print flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5">
        {([
          { id: 'LABA_RUGI', label: 'Laporan Laba Rugi' },
          { id: 'NERACA', label: 'Laporan Neraca' },
          { id: 'SHU', label: 'Laporan SHU' },
          { id: 'KAS', label: 'Buku Kas Masuk & Keluar' },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === item.id ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'LABA_RUGI' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="font-display text-lg font-bold text-slate-900">Laporan Laba Rugi</h2>
            <p className="text-xs text-slate-500">
              {pengaturan.nama_koperasi} · {summary.periode}
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pendapatan</p>
            <div className="flex justify-between py-1">
              <span>Pendapatan Penjualan Ritel & Marketplace</span>
              <span className="font-mono-num font-semibold">{formatRupiah(summary.laba_rugi.pendapatan_penjualan)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Pendapatan Jasa / Bunga Pinjaman Anggota</span>
              <span className="font-mono-num font-semibold">{formatRupiah(summary.laba_rugi.pendapatan_bunga_pinjaman)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
              <span>Total Pendapatan</span>
              <span className="font-mono-num text-emerald-700">{formatRupiah(summary.laba_rugi.total_pendapatan)}</span>
            </div>

            <p className="pt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Beban & Pengeluaran</p>
            <div className="flex justify-between py-1">
              <span>Pembelian Stok Barang / HPP</span>
              <span className="font-mono-num font-semibold">{formatRupiah(summary.laba_rugi.pembelian_stok_hpp)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Beban Operasional Koperasi</span>
              <span className="font-mono-num font-semibold">{formatRupiah(summary.laba_rugi.pengeluaran_operasional)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
              <span>Total Beban</span>
              <span className="font-mono-num text-rose-700">{formatRupiah(summary.laba_rugi.total_beban)}</span>
            </div>

            <div className="mt-4 flex justify-between rounded-xl bg-emerald-50 p-4 text-base font-bold text-emerald-900">
              <span>Laba Bersih / Sisa Hasil Usaha (SHU)</span>
              <span className="font-mono-num">{formatRupiah(summary.laba_rugi.laba_bersih_shu)}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'NERACA' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
              AKTIVA (ASET KOPERASI)
            </h2>
            <div className="flex justify-between text-sm">
              <span>Kas & Bank</span>
              <span className="font-mono-num font-semibold">{formatRupiah(summary.neraca.aktiva.kas_dan_bank)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Piutang Pinjaman Anggota</span>
              <span className="font-mono-num font-semibold">{formatRupiah(summary.neraca.aktiva.piutang_pinjaman_anggota)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Nilai Persediaan Barang Dagang</span>
              <span className="font-mono-num font-semibold">{formatRupiah(summary.neraca.aktiva.nilai_persediaan_barang)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-emerald-700">
              <span>TOTAL AKTIVA</span>
              <span className="font-mono-num">{formatRupiah(summary.neraca.aktiva.total_aktiva)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
              KEWAJIBAN & EKUITAS
            </h2>
            <div className="flex justify-between text-sm">
              <span>Simpanan Sukarela Anggota</span>
              <span className="font-mono-num font-semibold">{formatRupiah(summary.neraca.kewajiban.simpanan_sukarela_anggota)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Hutang Usaha Supplier</span>
              <span className="font-mono-num font-semibold">{formatRupiah(summary.neraca.kewajiban.hutang_supplier)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
              <span>Simpanan Pokok Anggota</span>
              <span className="font-mono-num font-semibold">{formatRupiah(summary.neraca.ekuitas.simpanan_pokok_anggota)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Simpanan Wajib Anggota</span>
              <span className="font-mono-num font-semibold">{formatRupiah(summary.neraca.ekuitas.simpanan_wajib_anggota)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Modal Awal Koperasi</span>
              <span className="font-mono-num font-semibold">{formatRupiah(summary.neraca.ekuitas.modal_koperasi)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>SHU Tahun Berjalan</span>
              <span className="font-mono-num font-semibold">{formatRupiah(summary.neraca.ekuitas.shu_tahun_berjalan)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
              <span>TOTAL KEWAJIBAN & EKUITAS</span>
              <span className="font-mono-num">{formatRupiah(summary.neraca.total_kewajiban_dan_ekuitas)}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'SHU' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">Alokasi Sisa Hasil Usaha (SHU)</h2>
              <p className="text-xs text-slate-500">Berdasarkan persentase anggaran dasar koperasi</p>
            </div>
            <span className="font-mono-num text-xl font-bold text-emerald-700">
              {formatRupiah(summary.alokasi_shu.total_shu)}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: `Jasa Modal Simpanan (${pengaturan.shu_jasa_modal_persen}%)`, val: summary.alokasi_shu.jasa_modal },
              { label: `Jasa Transaksi Anggota (${pengaturan.shu_jasa_anggota_persen}%)`, val: summary.alokasi_shu.jasa_anggota },
              { label: `Dana Cadangan (${pengaturan.shu_cadangan_persen}%)`, val: summary.alokasi_shu.dana_cadangan },
              { label: `Dana Pengurus & Karyawan (${pengaturan.shu_pengurus_persen}%)`, val: summary.alokasi_shu.dana_pengurus },
              { label: `Dana Sosial & Pendidikan (${pengaturan.shu_sosial_persen}%)`, val: summary.alokasi_shu.dana_sosial },
            ].map((row) => (
              <div key={row.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-600">{row.label}</p>
                <p className="mt-1 font-mono-num text-lg font-bold text-slate-900">{formatRupiah(row.val)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'KAS' && (
        <div className="space-y-5">
          <form onSubmit={handleAddKas} className="no-print rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900">Catat Transaksi Kas Manual</h2>
            <div className="grid gap-3 sm:grid-cols-4">
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value as 'MASUK' | 'KELUAR')}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="MASUK">Kas Masuk</option>
                <option value="KELUAR">Kas Keluar</option>
              </select>
              <select
                value={kategoriAkun}
                onChange={(e) => setKategoriAkun(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="MODAL">Modal Koperasi</option>
                <option value="PENGELUARAN_OPERASIONAL">Pengeluaran Operasional</option>
                <option value="PEMBELIAN_STOK">Pembelian Stok Supplier</option>
                <option value="HUTANG">Pembayaran / Penerimaan Hutang</option>
                <option value="PIUTANG">Piutang Lainnya</option>
              </select>
              <input
                type="number"
                required
                min={1000}
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="Nominal (Rp)"
                className="rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                {submitting ? 'Menyimpan...' : 'Catat ke Buku Kas'}
              </button>
            </div>
            <input
              type="text"
              required
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Keterangan transaksi kas..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </form>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-base font-bold text-slate-900">Buku Besar Kas Koperasi</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-semibold">No. Transaksi</th>
                    <th className="py-2 pr-4 font-semibold">Tanggal</th>
                    <th className="py-2 pr-4 font-semibold">Kategori Akun</th>
                    <th className="py-2 pr-4 font-semibold">Keterangan</th>
                    <th className="py-2 text-right font-semibold">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kas.map((k) => (
                    <tr key={k.id_kas} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-4 font-mono-num font-semibold text-slate-900">{k.nomor_transaksi}</td>
                      <td className="py-2.5 pr-4 font-mono-num text-slate-500">{formatDateOnly(k.tanggal)}</td>
                      <td className="py-2.5 pr-4 text-slate-700">{k.kategori_akun.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{k.keterangan}</td>
                      <td
                        className={`py-2.5 text-right font-mono-num font-bold ${
                          k.jenis === 'MASUK' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {k.jenis === 'MASUK' ? '+' : '-'}
                        {formatRupiah(k.jumlah)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
