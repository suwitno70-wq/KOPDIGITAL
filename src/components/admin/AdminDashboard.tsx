import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Landmark,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import type { AdminStatsResponse } from '../../types/koperasi';
import { formatDateTime, formatRupiah } from '../../utils/format';

interface AdminDashboardProps {
  stats: AdminStatsResponse;
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats, onNavigate }) => {
  const kpis = [
    { label: 'Total Anggota Aktif', value: String(stats.totalAnggota), icon: Users, action: 'admin-anggota' },
    { label: 'Total Produk Aktif', value: String(stats.totalProduk), icon: Package, action: 'admin-produk' },
    { label: 'Pesanan Hari Ini', value: String(stats.pesananHariIni), icon: ShoppingCart, action: 'orders' },
    { label: 'Penjualan Hari Ini', value: formatRupiah(stats.penjualanHariIni), icon: TrendingUp, action: 'orders' },
    { label: 'Total Simpanan Anggota', value: formatRupiah(stats.totalSimpanan), icon: Wallet, action: 'simpanan' },
    { label: 'Total Pinjaman Aktif', value: formatRupiah(stats.totalPinjamanAktif), icon: Landmark, action: 'pinjaman' },
    { label: 'Saldo Kas Koperasi', value: formatRupiah(stats.totalKas), icon: Wallet, action: 'keuangan' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Dashboard Administrator Koperasi</h1>
          <p className="text-sm text-slate-500">
            Ringkasan real-time keanggotaan, perdagangan ritel, simpan pinjam, dan likuiditas kas.
          </p>
        </div>
        {(stats.pesananMenungguVerifikasi > 0 || stats.pinjamanMenungguPersetujuan > 0) && (
          <div className="flex flex-wrap gap-2">
            {stats.pesananMenungguVerifikasi > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('orders')}
                className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                {stats.pesananMenungguVerifikasi} Pesanan Perlu Verifikasi
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            {stats.pinjamanMenungguPersetujuan > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('pinjaman')}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                {stats.pinjamanMenungguPersetujuan} Pinjaman Menunggu Persetujuan
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.action)}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-emerald-700"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-medium">{item.label}</span>
                <Icon className="h-4 w-4 text-emerald-700 shrink-0" />
              </div>
              <p className="mt-2 font-mono-num text-lg font-bold text-slate-900 sm:text-xl">
                {item.value}
              </p>
            </button>
          );
        })}
      </div>

      {/* Charts & Top Products */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">Grafik Penjualan 7 Hari Terakhir</h2>
              <p className="text-xs text-slate-500">Total omzet marketplace & kasir POS harian</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.grafikPenjualan}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}rb`}
                />
                <Tooltip
                  formatter={(value) => [
                    formatRupiah(Number(Array.isArray(value) ? value[0] : value || 0)),
                    'Penjualan',
                  ]}
                  contentStyle={{ borderRadius: 8, borderColor: '#E2E8F0', fontSize: 12 }}
                />
                <Bar dataKey="penjualan" fill="#0D6E4E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
          <h2 className="font-display text-base font-bold text-slate-900">Produk Terlaris</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {stats.produkTerlaris.map((p, idx) => (
              <div key={p.id_produk} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono-num text-xs font-bold text-slate-400">0{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{p.nama_produk}</p>
                    <p className="font-mono-num text-[11px] text-slate-500">
                      {formatRupiah(p.harga_anggota)} · Stok {p.stok}
                    </p>
                  </div>
                </div>
                <span className="font-mono-num text-xs font-bold text-emerald-700 whitespace-nowrap">
                  {p.terjual} terjual
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-slate-900">Aktivitas Sistem Terbaru</h2>
          <button
            type="button"
            onClick={() => onNavigate('admin-logs')}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Lihat Audit Log Lengkap
          </button>
        </div>
        <div className="mt-3 divide-y divide-slate-100 text-xs">
          {stats.aktivitasTerbaru.slice(0, 6).map((log) => (
            <div key={log.id_log} className="flex flex-col justify-between gap-1 py-2 sm:flex-row sm:items-center">
              <div>
                <span className="font-semibold text-slate-900">{log.username}</span>{' '}
                <span className="text-slate-400">·</span>{' '}
                <span className="font-mono-num text-emerald-700">{log.aksi}</span>{' '}
                <span className="text-slate-400">·</span>{' '}
                <span className="text-slate-600">{log.detail}</span>
              </div>
              <span className="font-mono-num text-[11px] text-slate-400 whitespace-nowrap">
                {formatDateTime(log.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
