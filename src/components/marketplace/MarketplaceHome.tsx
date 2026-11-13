import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Megaphone,
  Pencil,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Wallet,
  X,
} from 'lucide-react';
import type {
  AnggotaRecord,
  KategoriRecord,
  PengaturanKoperasi,
  PengumumanRecord,
  ProdukRecord,
  UserRecord,
} from '../../types/koperasi';
import { formatDateOnly, formatRupiah } from '../../utils/format';
import { BarcodeSvg, EmptyState, ProductImage, QrCodeCanvas, SkeletonGrid } from '../common/PWAWidgets';

interface MarketplaceHomeProps {
  loading: boolean;
  produk: ProdukRecord[];
  kategori: KategoriRecord[];
  pengumuman: PengumumanRecord[];
  pengaturan: PengaturanKoperasi;
  user: UserRecord | null;
  anggota: AnggotaRecord | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddToCart: (prod: ProdukRecord, qty?: number) => void;
  onNavigate: (tab: string) => void;
  onOpenLogin: () => void;
  onEditProduct?: (idProduk: string) => void;
}

export const MarketplaceHome: React.FC<MarketplaceHomeProps> = ({
  loading,
  produk,
  kategori,
  pengumuman,
  pengaturan,
  user,
  anggota,
  searchQuery,
  onSearchChange,
  onAddToCart,
  onNavigate,
  onOpenLogin,
  onEditProduct,
}) => {
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<'SEMUA' | 'UNGGULAN' | 'PROMO' | 'TERLARIS'>('SEMUA');
  const [sortOrder, setSortOrder] = useState<'DEFAULT' | 'TERBARU' | 'TERLARIS' | 'TERMURAH' | 'NAMA'>('DEFAULT');
  const [detailProduk, setDetailProduk] = useState<ProdukRecord | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const filteredProduk = useMemo(() => {
    let list = produk.filter((p) => p.status === 'AKTIF');
    if (selectedKategori !== 'ALL') {
      list = list.filter((p) => p.id_kategori === selectedKategori);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.nama_produk.toLowerCase().includes(q) ||
          p.nama_kategori.toLowerCase().includes(q) ||
          p.kode_produk.toLowerCase().includes(q) ||
          p.barcode.includes(q)
      );
    }
    if (filterMode === 'UNGGULAN') {
      list = list.filter((p) => p.unggulan);
    } else if (filterMode === 'PROMO') {
      list = list.filter((p) => p.harga_promo && p.harga_promo < p.harga_anggota);
    }

    const activeSort =
      filterMode === 'TERLARIS'
        ? 'TERLARIS'
        : sortOrder === 'DEFAULT'
        ? pengaturan.katalog_urutan_default || 'TERBARU'
        : sortOrder;

    const getEffectivePrice = (p: ProdukRecord) =>
      p.harga_promo && p.harga_promo < p.harga_anggota ? p.harga_promo : p.harga_anggota;

    if (activeSort === 'TERLARIS') {
      list = [...list].sort((a, b) => b.terjual - a.terjual);
    } else if (activeSort === 'TERMURAH') {
      list = [...list].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    } else if (activeSort === 'NAMA') {
      list = [...list].sort((a, b) => a.nama_produk.localeCompare(b.nama_produk, 'id'));
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return list;
  }, [produk, selectedKategori, searchQuery, filterMode, sortOrder, pengaturan.katalog_urutan_default]);

  const handleQuickAdd = (prod: ProdukRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(prod, 1);
    setJustAddedId(prod.id_produk);
    setTimeout(() => setJustAddedId(null), 900);
  };

  const totalSimpananAnggota = anggota
    ? anggota.saldo_pokok + anggota.saldo_wajib + anggota.saldo_sukarela
    : 0;

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid items-stretch lg:grid-cols-12">
          <div className="flex flex-col justify-between p-6 md:p-8 lg:col-span-6">
            <div>
              <p className="text-xs font-semibold tracking-wider text-emerald-700 uppercase">
                {pengaturan.branding} · Etalase Resmi Anggota
              </p>
              <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl [text-wrap:balance]">
                {pengaturan.katalog_hero_judul ||
                  'Belanja kebutuhan harian lebih hemat dengan harga khusus anggota koperasi.'}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {pengaturan.katalog_hero_subjudul ||
                  'Setiap transaksi otomatis tercatat dalam perhitungan Sisa Hasil Usaha (SHU) tahunan Anda dan mendukung produk UMKM anggota.'}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('katalog-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap"
              >
                <ShoppingBag className="h-4 w-4" />
                Belanja Sekarang
              </button>
              {!user ? (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
                >
                  Masuk Akun Anggota
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(user.role === 'ADMIN' ? 'admin-dashboard' : 'simpanan')}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
                >
                  {user.role === 'ADMIN' ? 'Buka Dashboard Admin' : 'Lihat Saldo Simpanan'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="relative min-h-[220px] bg-slate-100 lg:col-span-6">
            <ProductImage
              src={
                pengaturan.katalog_hero_foto ||
                '/images/hero_koperasi_banner_1794528004578.jpg'
              }
              alt={pengaturan.nama_koperasi}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Member Balance Strip & Announcements */}
      <section className="grid gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Informasi Saldo Anggota
            </span>
            <Wallet className="h-4 w-4 text-emerald-700" />
          </div>
          {anggota ? (
            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">Saldo Sukarela Siap Belanja</p>
                  <p className="font-mono-num text-2xl font-bold text-emerald-700">
                    {formatRupiah(anggota.saldo_sukarela)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total Simpanan</p>
                  <p className="font-mono-num text-sm font-semibold text-slate-900">
                    {formatRupiah(totalSimpananAnggota)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
                <span>
                  {anggota.nama} · <span className="font-mono-num">{anggota.kode_anggota}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('simpanan')}
                  className="font-semibold text-emerald-700 hover:underline whitespace-nowrap"
                >
                  Kartu QR & Mutasi
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                {user
                  ? `Masuk sebagai ${user.nama_lengkap} (${user.role}).`
                  : 'Masuk dengan akun anggota untuk menikmati harga khusus anggota dan bayar pakai saldo koperasi.'}
              </p>
              {!user && (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-600 whitespace-nowrap shrink-0"
                >
                  Masuk
                </button>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pengumuman & Info Koperasi
            </span>
            <Megaphone className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {pengumuman.slice(0, 2).map((info) => (
              <div key={info.id_pengumuman} className="py-2 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 line-clamp-1">{info.judul}</p>
                  <span className="font-mono-num text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                    {formatDateOnly(info.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600 line-clamp-1">{info.isi}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog Filter & Product Grid */}
      <section id="katalog-section" className="space-y-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">Katalog Produk Koperasi</h2>
            <p className="text-xs text-slate-500">
              Menampilkan {filteredProduk.length} produk · Harga anggota aktif otomatis saat checkout
            </p>
          </div>

          {/* Interactive Tabs & Sort / Customizer */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(['SEMUA', 'UNGGULAN', 'PROMO', 'TERLARIS'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterMode(tab)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    filterMode === tab
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'SEMUA'
                    ? 'Semua Produk'
                    : tab === 'UNGGULAN'
                    ? 'Unggulan'
                    : tab === 'PROMO'
                    ? 'Sedang Promo'
                    : 'Terlaris'}
                </button>
              ))}
            </div>

            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(
                  e.target.value as 'DEFAULT' | 'TERBARU' | 'TERLARIS' | 'TERMURAH' | 'NAMA'
                )
              }
              aria-label="Urutkan katalog"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="DEFAULT">Urutan: Default Koperasi</option>
              <option value="TERBARU">Urutan: Terbaru</option>
              <option value="TERLARIS">Urutan: Terlaris</option>
              <option value="TERMURAH">Urutan: Termurah</option>
              <option value="NAMA">Urutan: Nama A–Z</option>
            </select>

            {user?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => onNavigate('admin-produk')}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Custom Katalog
              </button>
            )}
          </div>
        </div>

        {/* Category Interactive Filter Row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedKategori('ALL')}
            className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              selectedKategori === 'ALL'
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Semua Kategori
          </button>
          {kategori.map((kat) => (
            <button
              key={kat.id_kategori}
              type="button"
              onClick={() => setSelectedKategori(kat.id_kategori)}
              className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedKategori === kat.id_kategori
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {kat.nama_kategori}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonGrid count={6} />
        ) : filteredProduk.length === 0 ? (
          <EmptyState
            title="Produk tidak ditemukan"
            description="Coba ubah kata kunci pencarian atau pilih kategori produk lainnya."
            actionLabel="Reset Filter"
            onAction={() => {
              setSelectedKategori('ALL');
              setFilterMode('SEMUA');
              onSearchChange('');
            }}
          />
        ) : (
          <div
            className={`grid grid-cols-2 gap-4 sm:grid-cols-3 ${
              pengaturan.katalog_kolom_desktop === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
            }`}
          >
            {filteredProduk.map((item) => {
              const effectivePrice =
                item.harga_promo && item.harga_promo < item.harga_anggota
                  ? item.harga_promo
                  : item.harga_anggota;
              const discountPct = Math.round(
                ((item.harga_normal - effectivePrice) / item.harga_normal) * 100
              );
              const isAdded = justAddedId === item.id_produk;

              return (
                <article
                  key={item.id_produk}
                  onClick={() => {
                    setDetailProduk(item);
                    setDetailQty(1);
                  }}
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                    <ProductImage
                      src={item.foto_url}
                      alt={item.nama_produk}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {pengaturan.katalog_tampil_badge_diskon !== false && discountPct > 0 && (
                      <span className="absolute right-2.5 top-2.5 rounded-md bg-amber-500 px-2 py-0.5 font-mono-num text-[11px] font-bold text-white shadow-sm">
                        -{discountPct}%
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500 truncate">
                        {item.nama_kategori} · Stok <span className="font-mono-num">{item.stok}</span>
                      </p>
                      <h3 className="mt-1 font-display text-sm font-semibold text-slate-900 line-clamp-2 sm:text-[15px]">
                        {item.nama_produk}
                      </h3>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono-num text-base font-bold text-emerald-700">
                          {formatRupiah(effectivePrice)}
                        </span>
                        {effectivePrice < item.harga_normal && (
                          <span className="font-mono-num text-xs text-slate-400 line-through">
                            {formatRupiah(item.harga_normal)}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Anggota {formatRupiah(item.harga_anggota)}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-mono-num font-medium">{item.rating.toFixed(1)}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono-num text-slate-500">{item.terjual} terjual</span>
                        </div>

                        <button
                          type="button"
                          disabled={item.stok <= 0}
                          onClick={(e) => handleQuickAdd(item, e)}
                          aria-label={`Tambah ${item.nama_produk} ke keranjang`}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-white transition-colors shrink-0 ${
                            isAdded
                              ? 'bg-amber-500'
                              : item.stok <= 0
                              ? 'bg-slate-300 cursor-not-allowed'
                              : 'bg-emerald-700 hover:bg-emerald-800'
                          }`}
                        >
                          {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Product Detail Modal (PDP) */}
      {detailProduk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <p className="font-mono-num text-xs font-medium text-slate-500">
                {detailProduk.kode_produk} · {detailProduk.nama_kategori}
              </p>
              <div className="flex items-center gap-2">
                {user?.role === 'ADMIN' && onEditProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = detailProduk.id_produk;
                      setDetailProduk(null);
                      onEditProduct(id);
                    }}
                    className="flex items-center gap-1 rounded-lg border border-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Produk
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetailProduk(null)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-12">
              <div className="space-y-4 md:col-span-5">
                <div className="aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <ProductImage src={detailProduk.foto_url} alt={detailProduk.nama_produk} />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-600">Barcode & QR Produk</p>
                    <BarcodeSvg value={detailProduk.barcode} height={30} />
                  </div>
                  <QrCodeCanvas
                    value={`KDP-PROD:${detailProduk.kode_produk}:${detailProduk.barcode}`}
                    size={72}
                  />
                </div>
              </div>

              <div className="flex flex-col justify-between md:col-span-7">
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    {detailProduk.nama_produk}
                  </h3>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <strong className="font-mono-num">{detailProduk.rating.toFixed(1)}</strong>
                    </span>
                    <span>·</span>
                    <span className="font-mono-num">{detailProduk.terjual} terjual</span>
                    <span>·</span>
                    <span className="font-mono-num">
                      Stok {detailProduk.stok} {detailProduk.satuan}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500">Harga Normal</p>
                        <p className="mt-0.5 font-mono-num font-semibold text-slate-700">
                          {formatRupiah(detailProduk.harga_normal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Harga Anggota</p>
                        <p className="mt-0.5 font-mono-num font-bold text-emerald-700">
                          {formatRupiah(detailProduk.harga_anggota)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Harga Promo</p>
                        <p className="mt-0.5 font-mono-num font-bold text-amber-600">
                          {detailProduk.harga_promo
                            ? formatRupiah(detailProduk.harga_promo)
                            : 'Tidak ada'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-slate-600">
                    {detailProduk.deskripsi || 'Produk berkualitas pilihan koperasi untuk memenuhi kebutuhan harian anggota.'}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
                  <div className="flex items-center rounded-lg border border-slate-300 bg-white">
                    <button
                      type="button"
                      onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                      className="px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      -
                    </button>
                    <span className="font-mono-num w-10 text-center text-sm font-semibold">
                      {detailQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailQty((q) => Math.min(detailProduk.stok, q + 1))}
                      className="px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={detailProduk.stok <= 0}
                    onClick={() => {
                      onAddToCart(detailProduk, detailQty);
                      setDetailProduk(null);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:bg-slate-300"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Tambah ke Keranjang
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
