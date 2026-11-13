import React, { useMemo, useState } from 'react';
import { Banknote, CheckCircle2, CreditCard, Minus, Plus, QrCode, ShoppingBag, Trash2, Wallet, X } from 'lucide-react';
import type {
  AnggotaRecord,
  PaymentMethod,
  PengaturanKoperasi,
  PesananRecord,
  ProdukRecord,
  UserRecord,
} from '../../types/koperasi';
import { apiFetch } from '../../utils/api';
import { formatRupiah } from '../../utils/format';
import { ProductImage, QrCodeCanvas } from '../common/PWAWidgets';

export interface CartItem {
  produk: ProdukRecord;
  qty: number;
}

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  user: UserRecord | null;
  anggota: AnggotaRecord | null;
  pengaturan: PengaturanKoperasi;
  onUpdateQty: (idProduk: string, qty: number) => void;
  onRemoveItem: (idProduk: string) => void;
  onOrderCreated: (order: PesananRecord, updatedAnggota: AnggotaRecord | null) => void;
  onRequireLogin: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  items,
  user,
  anggota,
  pengaturan,
  onUpdateQty,
  onRemoveItem,
  onOrderCreated,
  onRequireLogin,
}) => {
  const [metode, setMetode] = useState<PaymentMethod>('QRIS');
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => `chk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  const summary = useMemo(() => {
    let subtotalNormal = 0;
    let diskonAnggota = 0;
    let diskonPromo = 0;
    let total = 0;

    for (const item of items) {
      const p = item.produk;
      const base = p.harga_normal;
      const memberBase = anggota ? p.harga_anggota : p.harga_normal;
      const finalUnit = p.harga_promo && p.harga_promo < memberBase ? p.harga_promo : memberBase;

      subtotalNormal += base * item.qty;
      diskonAnggota += anggota ? Math.max(0, base - memberBase) * item.qty : 0;
      diskonPromo += Math.max(0, memberBase - finalUnit) * item.qty;
      total += finalUnit * item.qty;
    }

    return { subtotalNormal, diskonAnggota, diskonPromo, total };
  }, [items, anggota]);

  if (!open) return null;

  const handleCheckout = async () => {
    if (!user) {
      onRequireLogin();
      return;
    }
    if (items.length === 0) return;

    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ order: PesananRecord; anggota: AnggotaRecord | null }>('/api/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((i) => ({ id_produk: i.produk.id_produk, qty: i.qty })),
          metode_pembayaran: metode,
          channel: 'MARKETPLACE',
          catatan,
          idempotency_key: idempotencyKey,
        }),
      });
      setIdempotencyKey(`chk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      setCatatan('');
      onOrderCreated(res.order, res.anggota);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout gagal diproses.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-700" />
            <h2 className="font-display text-base font-bold text-slate-900">
              Keranjang Belanja ({items.reduce((s, i) => s + i.qty, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="h-10 w-10 text-slate-300" />
              <p className="mt-3 font-display text-sm font-semibold text-slate-900">Keranjang masih kosong</p>
              <p className="mt-1 text-xs text-slate-500">
                Tambahkan produk koperasi dari katalog untuk mulai berbelanja.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {items.map(({ produk, qty }) => {
                  const memberBase = anggota ? produk.harga_anggota : produk.harga_normal;
                  const unit = produk.harga_promo && produk.harga_promo < memberBase ? produk.harga_promo : memberBase;
                  return (
                    <div key={produk.id_produk} className="flex gap-3 py-3 first:pt-0">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        <ProductImage src={produk.foto_url} alt={produk.nama_produk} />
                      </div>
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900 line-clamp-1">{produk.nama_produk}</p>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(produk.id_produk)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-mono-num text-sm font-bold text-emerald-700">
                            {formatRupiah(unit * qty)}
                          </span>
                          <div className="flex items-center rounded-md border border-slate-200">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(produk.id_produk, qty - 1)}
                              className="p-1 text-slate-600 hover:bg-slate-100"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="font-mono-num w-7 text-center text-xs font-semibold">{qty}</span>
                            <button
                              type="button"
                              onClick={() => onUpdateQty(produk.id_produk, Math.min(produk.stok, qty + 1))}
                              className="p-1 text-slate-600 hover:bg-slate-100"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Payment Method */}
              <div className="space-y-2.5 border-t border-slate-200 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Metode Pembayaran
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {anggota && pengaturan.izinkan_bayar_saldo_koperasi && (
                    <button
                      type="button"
                      onClick={() => setMetode('SALDO_KOPERASI')}
                      className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-colors ${
                        metode === 'SALDO_KOPERASI'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Wallet className="h-3.5 w-3.5 text-emerald-700" />
                        Saldo Koperasi
                      </div>
                      <span className="mt-0.5 font-mono-num text-[11px] text-slate-500">
                        {formatRupiah(anggota.saldo_sukarela)}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setMetode('QRIS')}
                    className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-colors ${
                      metode === 'QRIS'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <QrCode className="h-3.5 w-3.5 text-emerald-700" />
                      QRIS Instan
                    </div>
                    <span className="mt-0.5 text-[11px] text-slate-500">Scan semua e-wallet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetode('TRANSFER_BANK')}
                    className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-colors ${
                      metode === 'TRANSFER_BANK'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-700" />
                      Transfer Bank
                    </div>
                    <span className="mt-0.5 text-[11px] text-slate-500">{pengaturan.bank_nama}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetode('TUNAI')}
                    className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-colors ${
                      metode === 'TUNAI'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Banknote className="h-3.5 w-3.5 text-emerald-700" />
                      Tunai di Gerai
                    </div>
                    <span className="mt-0.5 text-[11px] text-slate-500">Bayar saat ambil</span>
                  </button>
                </div>

                {metode === 'QRIS' && (
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <QrCodeCanvas
                      value={`00020101021226580014ID.CO.QRIS.WWW0215${pengaturan.qris_merchant_id}54${summary.total}5802ID5920${pengaturan.qris_merchant_nama}`}
                      size={76}
                    />
                    <div className="text-xs">
                      <p className="font-semibold text-slate-900">{pengaturan.qris_merchant_nama}</p>
                      <p className="font-mono-num text-slate-500">NMID: {pengaturan.qris_merchant_id}</p>
                      <p className="mt-1 text-emerald-700 font-medium">
                        QRIS siap dipindai setelah konfirmasi pesanan.
                      </p>
                    </div>
                  </div>
                )}

                {metode === 'TRANSFER_BANK' && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="font-semibold text-slate-900">{pengaturan.bank_nama}</p>
                    <p className="font-mono-num text-sm font-bold text-emerald-700">{pengaturan.bank_rekening}</p>
                    <p className="text-slate-600">a.n. {pengaturan.bank_atas_nama}</p>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Catatan Pesanan</label>
                  <input
                    type="text"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Contoh: Ambil jam 16.00 atau kirim ke blok B"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-3">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Normal</span>
                <span className="font-mono-num">{formatRupiah(summary.subtotalNormal)}</span>
              </div>
              {summary.diskonAnggota > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Diskon Harga Anggota</span>
                  <span className="font-mono-num">-{formatRupiah(summary.diskonAnggota)}</span>
                </div>
              )}
              {summary.diskonPromo > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Diskon Promo</span>
                  <span className="font-mono-num">-{formatRupiah(summary.diskonPromo)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <span>Total Pembayaran</span>
                <span className="font-mono-num text-emerald-700">{formatRupiah(summary.total)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleCheckout}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? 'Memproses Pesanan...' : user ? 'Konfirmasi & Checkout' : 'Masuk untuk Checkout'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
