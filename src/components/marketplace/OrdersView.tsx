import React, { useMemo, useState } from 'react';
import { Check, FileText, Printer, QrCode, Search } from 'lucide-react';
import type { OrderStatus, PengaturanKoperasi, PesananRecord, UserRecord } from '../../types/koperasi';
import { apiFetch } from '../../utils/api';
import { formatDateTime, formatRupiah, ORDER_STATUS_LABEL } from '../../utils/format';
import { EmptyState, QrCodeCanvas, ReceiptModal } from '../common/PWAWidgets';

interface OrdersViewProps {
  orders: PesananRecord[];
  user: UserRecord;
  pengaturan: PengaturanKoperasi;
  onRefresh: () => void;
}

const ALL_STATUSES: Array<'SEMUA' | OrderStatus> = [
  'SEMUA',
  'MENUNGGU_PEMBAYARAN',
  'MENUNGGU_KONFIRMASI',
  'DIPROSES',
  'SIAP_DIAMBIL',
  'SELESAI',
  'DIBATALKAN',
];

export const OrdersView: React.FC<OrdersViewProps> = ({ orders, user, pengaturan, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | OrderStatus>('SEMUA');
  const [query, setQuery] = useState('');
  const [receiptOrder, setReceiptOrder] = useState<PesananRecord | null>(null);
  const [qrisOrder, setQrisOrder] = useState<PesananRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isStaff = user.role === 'ADMIN' || user.role === 'KASIR';

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'SEMUA' && o.status_pesanan !== statusFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return (
          o.nomor_pesanan.toLowerCase().includes(q) ||
          o.nama_pembeli.toLowerCase().includes(q) ||
          o.metode_pembayaran.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, query]);

  const handleConfirmPayment = async (order: PesananRecord) => {
    setBusyId(order.id_pesanan);
    try {
      await apiFetch(`/api/orders/${order.id_pesanan}/confirm-payment`, {
        method: 'POST',
        body: JSON.stringify({
          bukti_catatan: isStaff ? 'Diverifikasi oleh petugas' : 'Konfirmasi transfer oleh anggota',
        }),
      });
      onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setBusyId(orderId);
    try {
      await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status_pesanan: nextStatus }),
      });
      onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {isStaff ? 'Kelola Pesanan & Verifikasi Pembayaran' : 'Pesanan & Bukti Transaksi Saya'}
          </h1>
          <p className="text-sm text-slate-500">
            Pantau status pesanan mulai dari pembayaran hingga siap diambil di koperasi.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nomor pesanan / pembeli..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-emerald-700 focus:outline-none"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5">
        {ALL_STATUSES.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === st
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {st === 'SEMUA' ? 'Semua' : ORDER_STATUS_LABEL[st]?.label || st}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Belum ada pesanan"
          description="Pesanan belanja marketplace maupun transaksi kasir akan muncul di sini."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const stInfo = ORDER_STATUS_LABEL[order.status_pesanan] || {
              label: order.status_pesanan,
              colorClass: 'text-slate-700',
            };
            return (
              <div
                key={order.id_pesanan}
                className="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
              >
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="font-mono-num font-bold text-slate-900">{order.nomor_pesanan}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-medium text-slate-700">{order.nama_pembeli}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono-num text-slate-500">{formatDateTime(order.created_at)}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-600">{order.metode_pembayaran.replace('_', ' ')}</span>
                  </div>
                  <span className={`text-xs font-bold ${stInfo.colorClass}`}>{stInfo.label}</span>
                </div>

                <div className="mt-3 divide-y divide-slate-100">
                  {(order.items || []).map((item) => (
                    <div key={item.id_detail} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-slate-700">
                        {item.nama_produk}{' '}
                        <span className="font-mono-num text-xs text-slate-500">x{item.qty}</span>
                      </span>
                      <span className="font-mono-num font-semibold text-slate-900">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-xs text-slate-500">Total Pembayaran: </span>
                    <span className="font-mono-num text-base font-bold text-emerald-700">
                      {formatRupiah(order.total_bayar)}
                    </span>
                    {order.catatan && (
                      <p className="mt-0.5 text-xs text-slate-500">Catatan: {order.catatan}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {order.metode_pembayaran === 'QRIS' && order.status_pesanan === 'MENUNGGU_PEMBAYARAN' && (
                      <button
                        type="button"
                        onClick={() => setQrisOrder(order)}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-500 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        Tampilkan QRIS
                      </button>
                    )}

                    {!isStaff && order.status_pesanan === 'MENUNGGU_PEMBAYARAN' && (
                      <button
                        type="button"
                        disabled={busyId === order.id_pesanan}
                        onClick={() => handleConfirmPayment(order)}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Konfirmasi Sudah Bayar
                      </button>
                    )}

                    {isStaff && order.status_pesanan === 'MENUNGGU_KONFIRMASI' && (
                      <button
                        type="button"
                        disabled={busyId === order.id_pesanan}
                        onClick={() => handleConfirmPayment(order)}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Verifikasi Pembayaran
                      </button>
                    )}

                    {isStaff && (
                      <select
                        value={order.status_pesanan}
                        disabled={busyId === order.id_pesanan || order.status_pesanan === 'DIBATALKAN'}
                        onChange={(e) => handleStatusChange(order.id_pesanan, e.target.value as OrderStatus)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-700 focus:outline-none"
                      >
                        <option value="MENUNGGU_PEMBAYARAN">Menunggu Pembayaran</option>
                        <option value="MENUNGGU_KONFIRMASI">Menunggu Konfirmasi</option>
                        <option value="DIPROSES">Diproses</option>
                        <option value="SIAP_DIAMBIL">Siap Diambil</option>
                        <option value="SELESAI">Selesai</option>
                        <option value="DIBATALKAN">Dibatalkan</option>
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={() => setReceiptOrder(order)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Struk / Bukti
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {qrisOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <FileText className="mx-auto h-6 w-6 text-emerald-700" />
            <h3 className="mt-2 font-display text-lg font-bold text-slate-900">Pembayaran QRIS</h3>
            <p className="font-mono-num text-xs text-slate-500">{qrisOrder.nomor_pesanan}</p>
            <p className="mt-2 font-mono-num text-2xl font-bold text-emerald-700">
              {formatRupiah(qrisOrder.total_bayar)}
            </p>
            <div className="mt-4 flex justify-center">
              <QrCodeCanvas
                value={`00020101021226580014ID.CO.QRIS.WWW0215${pengaturan.qris_merchant_id}54${qrisOrder.total_bayar}5802ID`}
                size={180}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Pindai dengan mobile banking atau e-wallet (GoPay, OVO, DANA, ShopeePay), lalu klik Konfirmasi Sudah Bayar.
            </p>
            <button
              type="button"
              onClick={() => setQrisOrder(null)}
              className="mt-4 w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          pengaturan={pengaturan}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
};
