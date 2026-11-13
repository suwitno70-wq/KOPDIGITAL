import React, { useMemo, useState } from 'react';
import { Barcode, CheckCircle2, Minus, Plus, Printer, Search, Trash2, UserCheck } from 'lucide-react';
import type {
  AnggotaRecord,
  PaymentMethod,
  PengaturanKoperasi,
  PesananRecord,
  ProdukRecord,
} from '../../types/koperasi';
import { apiFetch } from '../../utils/api';
import { formatDateTime, formatRupiah } from '../../utils/format';
import { ProductImage, ReceiptModal } from '../common/PWAWidgets';

interface CashierPosViewProps {
  produk: ProdukRecord[];
  anggotaList: AnggotaRecord[];
  todayOrders: PesananRecord[];
  pengaturan: PengaturanKoperasi;
  onOrderCompleted: (order: PesananRecord) => void;
}

export const CashierPosView: React.FC<CashierPosViewProps> = ({
  produk,
  anggotaList,
  todayOrders,
  pengaturan,
  onOrderCompleted,
}) => {
  const [search, setSearch] = useState('');
  const [selectedAnggotaId, setSelectedAnggotaId] = useState<string>('');
  const [namaUmum, setNamaUmum] = useState('Pelanggan Gerai');
  const [cart, setCart] = useState<Array<{ produk: ProdukRecord; qty: number }>>([]);
  const [metode, setMetode] = useState<PaymentMethod>('TUNAI');
  const [uangDiterima, setUangDiterima] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receiptOrder, setReceiptOrder] = useState<PesananRecord | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  const selectedAnggota = useMemo(
    () => anggotaList.find((a) => a.id_anggota === selectedAnggotaId) || null,
    [anggotaList, selectedAnggotaId]
  );

  const filteredProduk = useMemo(() => {
    const q = search.trim().toLowerCase();
    return produk.filter((p) => {
      if (p.status !== 'AKTIF') return false;
      if (!q) return true;
      return (
        p.nama_produk.toLowerCase().includes(q) ||
        p.kode_produk.toLowerCase().includes(q) ||
        p.barcode.includes(q)
      );
    });
  }, [produk, search]);

  const addItem = (prod: ProdukRecord) => {
    if (prod.stok <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.produk.id_produk === prod.id_produk);
      if (existing) {
        return prev.map((i) =>
          i.produk.id_produk === prod.id_produk
            ? { ...i, qty: Math.min(prod.stok, i.qty + 1) }
            : i
        );
      }
      return [...prev, { produk: prod, qty: 1 }];
    });
  };

  const handleBarcodeEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !search.trim()) return;
    const exact = produk.find(
      (p) =>
        p.status === 'AKTIF' &&
        (p.barcode === search.trim() || p.kode_produk.toLowerCase() === search.trim().toLowerCase())
    );
    if (exact) {
      addItem(exact);
      setSearch('');
    }
  };

  const totalBayar = useMemo(() => {
    return cart.reduce((sum, item) => {
      const memberBase = selectedAnggota ? item.produk.harga_anggota : item.produk.harga_normal;
      const unit =
        item.produk.harga_promo && item.produk.harga_promo < memberBase
          ? item.produk.harga_promo
          : memberBase;
      return sum + unit * item.qty;
    }, 0);
  }, [cart, selectedAnggota]);

  const cashVal = Number(uangDiterima || 0);
  const kembalian = metode === 'TUNAI' ? Math.max(0, cashVal - totalBayar) : 0;

  const handleProcessSale = async () => {
    if (cart.length === 0) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ order: PesananRecord }>('/api/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((c) => ({ id_produk: c.produk.id_produk, qty: c.qty })),
          metode_pembayaran: metode,
          channel: 'POS_KASIR',
          target_anggota_id: selectedAnggotaId || null,
          nama_pembeli_umum: namaUmum,
          uang_diterima: metode === 'TUNAI' ? cashVal : totalBayar,
          idempotency_key: idempotencyKey,
        }),
      });
      setCart([]);
      setUangDiterima('');
      setIdempotencyKey(`pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      setReceiptOrder(res.order);
      onOrderCompleted(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaksi POS gagal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Terminal Kasir POS</h1>
          <p className="text-sm text-slate-500">
            Scan barcode produk, pilih anggota untuk harga khusus, dan cetak struk instan.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Product Picker */}
        <div className="space-y-4 lg:col-span-7">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleBarcodeEnter}
              placeholder="Ketik nama produk atau scan Barcode / SKU lalu tekan Enter..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm focus:border-emerald-700 focus:outline-none"
            />
            <Barcode className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filteredProduk.map((item) => {
              const memberBase = selectedAnggota ? item.harga_anggota : item.harga_normal;
              const price = item.harga_promo && item.harga_promo < memberBase ? item.harga_promo : memberBase;
              return (
                <button
                  key={item.id_produk}
                  type="button"
                  disabled={item.stok <= 0}
                  onClick={() => addItem(item)}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition-colors hover:border-emerald-700 disabled:opacity-50"
                >
                  <div className="aspect-[4/3] w-full bg-slate-100">
                    <ProductImage src={item.foto_url} alt={item.nama_produk} />
                  </div>
                  <div className="p-3">
                    <p className="font-mono-num text-[11px] text-slate-500">
                      {item.kode_produk} · Stok {item.stok}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-900 line-clamp-2">
                      {item.nama_produk}
                    </p>
                    <p className="mt-1.5 font-mono-num text-sm font-bold text-emerald-700">
                      {formatRupiah(price)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: POS Checkout Panel */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
          <div className="space-y-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <UserCheck className="h-4 w-4 text-emerald-700" />
              Identitas Pembeli
            </div>
            <select
              value={selectedAnggotaId}
              onChange={(e) => setSelectedAnggotaId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
            >
              <option value="">Pembeli Umum (Harga Normal / Promo)</option>
              {anggotaList.map((a) => (
                <option key={a.id_anggota} value={a.id_anggota}>
                  {a.kode_anggota} — {a.nama} (Saldo: {formatRupiah(a.saldo_sukarela)})
                </option>
              ))}
            </select>
            {!selectedAnggotaId && (
              <input
                type="text"
                value={namaUmum}
                onChange={(e) => setNamaUmum(e.target.value)}
                placeholder="Nama pembeli"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
              />
            )}
          </div>

          <div className="flex-1 divide-y divide-slate-100 py-3 max-h-64 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Belum ada item dipilih.</p>
            ) : (
              cart.map(({ produk: p, qty }) => {
                const memberBase = selectedAnggota ? p.harga_anggota : p.harga_normal;
                const unit = p.harga_promo && p.harga_promo < memberBase ? p.harga_promo : memberBase;
                return (
                  <div key={p.id_produk} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{p.nama_produk}</p>
                      <p className="font-mono-num text-[11px] text-slate-500">
                        {formatRupiah(unit)} x {qty}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) =>
                            prev
                              .map((i) => (i.produk.id_produk === p.id_produk ? { ...i, qty: i.qty - 1 } : i))
                              .filter((i) => i.qty > 0)
                          )
                        }
                        className="rounded border border-slate-200 p-1 hover:bg-slate-100"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-mono-num w-6 text-center text-xs font-semibold">{qty}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) =>
                            prev.map((i) =>
                              i.produk.id_produk === p.id_produk
                                ? { ...i, qty: Math.min(p.stok, i.qty + 1) }
                                : i
                            )
                          )
                        }
                        className="rounded border border-slate-200 p-1 hover:bg-slate-100"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCart((prev) => prev.filter((i) => i.produk.id_produk !== p.id_produk))}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="grid grid-cols-2 gap-2">
              {(['TUNAI', 'QRIS', 'TRANSFER_BANK', 'SALDO_KOPERASI'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={m === 'SALDO_KOPERASI' && !selectedAnggota}
                  onClick={() => setMetode(m)}
                  className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                    metode === m
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>

            {metode === 'TUNAI' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Uang Diterima</label>
                  <input
                    type="number"
                    value={uangDiterima}
                    onChange={(e) => setUangDiterima(e.target.value)}
                    placeholder={String(totalBayar)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 font-mono-num text-sm focus:border-emerald-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">Kembalian</label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono-num text-sm font-bold text-slate-900">
                    {formatRupiah(kembalian)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-baseline justify-between border-t border-slate-200 pt-3">
              <span className="text-sm font-semibold text-slate-700">Total Tagihan</span>
              <span className="font-mono-num text-2xl font-bold text-emerald-700">
                {formatRupiah(totalBayar)}
              </span>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={cart.length === 0 || submitting}
              onClick={handleProcessSale}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-300"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? 'Menyimpan Transaksi...' : 'Bayar & Cetak Struk'}
            </button>
          </div>
        </div>
      </div>

      {/* Daily Cashier Transactions */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-display text-base font-bold text-slate-900">Transaksi Hari Ini</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-semibold">No. Transaksi</th>
                <th className="py-2 pr-4 font-semibold">Waktu</th>
                <th className="py-2 pr-4 font-semibold">Pembeli</th>
                <th className="py-2 pr-4 font-semibold">Metode</th>
                <th className="py-2 pr-4 text-right font-semibold">Total</th>
                <th className="py-2 text-right font-semibold">Struk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {todayOrders.slice(0, 8).map((o) => (
                <tr key={o.id_pesanan} className="hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-mono-num font-semibold text-slate-900">{o.nomor_pesanan}</td>
                  <td className="py-2.5 pr-4 font-mono-num text-slate-500">{formatDateTime(o.created_at)}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{o.nama_pembeli}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{o.metode_pembayaran.replace('_', ' ')}</td>
                  <td className="py-2.5 pr-4 text-right font-mono-num font-bold text-emerald-700">
                    {formatRupiah(o.total_bayar)}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setReceiptOrder(o)}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Printer className="h-3 w-3" />
                      Struk
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
