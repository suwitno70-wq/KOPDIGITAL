import React, { useEffect, useState } from 'react';
import {
  Download,
  ExternalLink,
  ImagePlus,
  Pencil,
  Plus,
  QrCode,
  Shield,
  SlidersHorizontal,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  AnggotaRecord,
  KategoriRecord,
  LogAktivitasRecord,
  PengaturanKoperasi,
  PengumumanRecord,
  ProdukRecord,
  SupplierRecord,
  UserRecord,
  UserRole,
} from '../../types/koperasi';
import { apiFetch, getStoredToken } from '../../utils/api';
import { exportToExcel, formatDateTime, formatRupiah } from '../../utils/format';
import { BarcodeSvg, ProductImage, QrCodeCanvas } from '../common/PWAWidgets';

interface MasterDataProps {
  produk: ProdukRecord[];
  kategori: KategoriRecord[];
  anggota: AnggotaRecord[];
  users: UserRecord[];
  supplier: SupplierRecord[];
  pengumuman: PengumumanRecord[];
  logs: LogAktivitasRecord[];
  pengaturan: PengaturanKoperasi;
  onRefresh: () => void;
}

const IMAGE_PRESETS = [
  { label: 'Beras Organik', url: '/images/prod_beras_organik_1794528005705.jpg' },
  { label: 'Kopi Arabika', url: '/images/prod_kopi_arabika_1794528004723.jpg' },
  { label: 'Madu Hutan', url: '/images/prod_madu_hutan_1794528004581.jpg' },
  { label: 'Minyak Kelapa VCO', url: '/images/prod_minyak_kelapa_1794528007328.jpg' },
  { label: 'Batik Koperasi', url: '/images/prod_batik_koperasi_1794528007074.jpg' },
  { label: 'Gula Aren', url: '/images/prod_gula_aren_1794528006522.jpg' },
  { label: 'Set Piring Keramik (Pecah Belah)', url: '/images/prod_set_piring_keramik_1794532836936.jpg' },
  { label: 'Set Gelas Kaca (Pecah Belah)', url: '/images/prod_set_gelas_kaca_1794532836365.jpg' },
  { label: 'Digital Rice Cooker (Elektronik)', url: '/images/prod_rice_cooker_1794532837700.jpg' },
  { label: 'Blender Kaca (Elektronik)', url: '/images/prod_blender_kaca_1794532836548.jpg' },
];

const HERO_PRESETS = [
  { label: 'Banner Utama Gerai Koperasi', url: '/images/hero_koperasi_banner_1794528004578.jpg' },
  { label: 'Etalase Pecah Belah Keramik', url: '/images/prod_set_piring_keramik_1794532836936.jpg' },
  { label: 'Etalase Elektronik Dapur', url: '/images/prod_rice_cooker_1794532837700.jpg' },
  { label: 'Etalase Kopi & Sembako', url: '/images/prod_kopi_arabika_1794528004723.jpg' },
];

async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}

const ImagePickerField: React.FC<{
  label: string;
  value: string;
  onChange: (url: string) => void;
  presets: { label: string; url: string }[];
}> = ({ label, value, onChange, presets }) => {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    if (file.size > 3 * 1024 * 1024) {
      setErr('Ukuran file maksimal 3 MB.');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await apiFetch<{ url: string }>('/api/admin/upload-image', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, dataUrl }),
      });
      onChange(res.url);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Gagal upload gambar.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <ImagePlus className="h-3.5 w-3.5 text-emerald-700" />
          {label}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-700 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">
          <Upload className="h-3 w-3" />
          {uploading ? 'Mengunggah...' : 'Upload Foto Sendiri'}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      <div className="flex items-start gap-3">
        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ProductImage src={value} alt={label} className="h-full w-full object-cover" />
        </div>
        <div className="flex-1 space-y-1.5">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Tempel URL gambar custom (https://... atau /uploads/...)"
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-700 focus:outline-none"
          />
          <select
            value={presets.some((p) => p.url === value) ? value : ''}
            onChange={(e) => {
              if (e.target.value) onChange(e.target.value);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
          >
            <option value="">-- Atau pilih foto studio preset --</option>
            {presets.map((img) => (
              <option key={img.url} value={img.url}>
                Preset: {img.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {err && <p className="text-[11px] font-medium text-rose-600">{err}</p>}
    </div>
  );
};

export const ProductsManagerView: React.FC<
  Pick<MasterDataProps, 'produk' | 'kategori' | 'supplier' | 'pengaturan' | 'onRefresh'> & {
    initialEditProductId?: string | null;
    onClearInitialEdit?: () => void;
    onNavigate?: (tab: string) => void;
  }
> = ({
  produk,
  kategori,
  supplier,
  pengaturan,
  onRefresh,
  initialEditProductId,
  onClearInitialEdit,
  onNavigate,
}) => {
  const [subTab, setSubTab] = useState<'PRODUK' | 'KATEGORI' | 'ETALASE'>('PRODUK');
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchProduk, setSearchProduk] = useState('');
  const [filterKat, setFilterKat] = useState('ALL');
  const [showInactive, setShowInactive] = useState(false);
  const [notice, setNotice] = useState('');

  // Add Product Form State
  const [nama, setNama] = useState('');
  const [kode, setKode] = useState('');
  const [barcodeBaru, setBarcodeBaru] = useState('');
  const [idKat, setIdKat] = useState(kategori[0]?.id_kategori || '');
  const [idSup, setIdSup] = useState(supplier[0]?.id_supplier || '');
  const [deskripsiBaru, setDeskripsiBaru] = useState('');
  const [hargaNormal, setHargaNormal] = useState('');
  const [hargaAnggota, setHargaAnggota] = useState('');
  const [hargaPromo, setHargaPromo] = useState('');
  const [stok, setStok] = useState('25');
  const [satuan, setSatuan] = useState('Pcs');
  const [fotoUrl, setFotoUrl] = useState(IMAGE_PRESETS[0].url);
  const [unggulan, setUnggulan] = useState(true);

  // Edit Product Modal State
  const [editingProd, setEditingProd] = useState<ProdukRecord | null>(null);
  const [qrModalProd, setQrModalProd] = useState<ProdukRecord | null>(null);

  // Category CRUD State
  const [katBaru, setKatBaru] = useState('');
  const [katDescBaru, setKatDescBaru] = useState('');
  const [editingKat, setEditingKat] = useState<KategoriRecord | null>(null);

  // Storefront Catalog Customization State
  const [catalogCfg, setCatalogCfg] = useState({
    katalog_hero_judul: pengaturan.katalog_hero_judul,
    katalog_hero_subjudul: pengaturan.katalog_hero_subjudul,
    katalog_hero_foto: pengaturan.katalog_hero_foto,
    katalog_urutan_default: pengaturan.katalog_urutan_default,
    katalog_tampil_badge_diskon: pengaturan.katalog_tampil_badge_diskon,
    katalog_kolom_desktop: pengaturan.katalog_kolom_desktop,
  });

  useEffect(() => {
    setCatalogCfg({
      katalog_hero_judul: pengaturan.katalog_hero_judul,
      katalog_hero_subjudul: pengaturan.katalog_hero_subjudul,
      katalog_hero_foto: pengaturan.katalog_hero_foto,
      katalog_urutan_default: pengaturan.katalog_urutan_default,
      katalog_tampil_badge_diskon: pengaturan.katalog_tampil_badge_diskon,
      katalog_kolom_desktop: pengaturan.katalog_kolom_desktop,
    });
  }, [pengaturan]);

  useEffect(() => {
    if (initialEditProductId) {
      const target = produk.find((p) => p.id_produk === initialEditProductId);
      if (target) {
        setSubTab('PRODUK');
        setEditingProd({ ...target });
      }
      onClearInitialEdit?.();
    }
  }, [initialEditProductId, produk, onClearInitialEdit]);

  const flashNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const handleAddProduk = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/produk', {
      method: 'POST',
      body: JSON.stringify({
        nama_produk: nama,
        kode_produk: kode || undefined,
        barcode: barcodeBaru || undefined,
        id_kategori: idKat || kategori[0]?.id_kategori,
        id_supplier: idSup || supplier[0]?.id_supplier,
        deskripsi: deskripsiBaru,
        harga_normal: Number(hargaNormal),
        harga_anggota: Number(hargaAnggota || hargaNormal),
        harga_promo: hargaPromo ? Number(hargaPromo) : null,
        stok: Number(stok),
        satuan,
        foto_url: fotoUrl,
        unggulan,
      }),
    });
    setNama('');
    setKode('');
    setBarcodeBaru('');
    setDeskripsiBaru('');
    setHargaNormal('');
    setHargaAnggota('');
    setHargaPromo('');
    setShowAddForm(false);
    flashNotice('Produk baru berhasil ditambahkan ke katalog.');
    onRefresh();
  };

  const handleSaveEditProduk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProd) return;
    await apiFetch(`/api/admin/produk/${editingProd.id_produk}`, {
      method: 'PUT',
      body: JSON.stringify({
        nama_produk: editingProd.nama_produk,
        kode_produk: editingProd.kode_produk,
        barcode: editingProd.barcode,
        id_kategori: editingProd.id_kategori,
        id_supplier: editingProd.id_supplier,
        deskripsi: editingProd.deskripsi,
        harga_normal: Number(editingProd.harga_normal),
        harga_anggota: Number(editingProd.harga_anggota),
        harga_promo: editingProd.harga_promo ? Number(editingProd.harga_promo) : null,
        stok: Number(editingProd.stok),
        stok_min: Number(editingProd.stok_min),
        satuan: editingProd.satuan,
        foto_url: editingProd.foto_url,
        unggulan: editingProd.unggulan,
        status: editingProd.status,
      }),
    });
    setEditingProd(null);
    flashNotice('Perubahan produk berhasil disimpan.');
    onRefresh();
  };

  const handleToggleProdukStatus = async (p: ProdukRecord) => {
    if (p.status === 'AKTIF') {
      await apiFetch(`/api/admin/produk/${p.id_produk}`, { method: 'DELETE' });
      flashNotice(`Produk "${p.nama_produk}" dinonaktifkan dari etalase.`);
    } else {
      await apiFetch(`/api/admin/produk/${p.id_produk}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'AKTIF' }),
      });
      flashNotice(`Produk "${p.nama_produk}" diaktifkan kembali.`);
    }
    onRefresh();
  };

  const handleAddKat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!katBaru.trim()) return;
    await apiFetch('/api/admin/kategori', {
      method: 'POST',
      body: JSON.stringify({ nama_kategori: katBaru, deskripsi: katDescBaru }),
    });
    setKatBaru('');
    setKatDescBaru('');
    flashNotice('Kategori baru ditambahkan.');
    onRefresh();
  };

  const handleSaveEditKat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKat) return;
    await apiFetch(`/api/admin/kategori/${editingKat.id_kategori}`, {
      method: 'PUT',
      body: JSON.stringify({
        nama_kategori: editingKat.nama_kategori,
        deskripsi: editingKat.deskripsi,
        urutan: Number(editingKat.urutan),
        status: editingKat.status,
      }),
    });
    setEditingKat(null);
    flashNotice('Kategori berhasil diperbarui.');
    onRefresh();
  };

  const handleDeleteKat = async (k: KategoriRecord) => {
    await apiFetch(`/api/admin/kategori/${k.id_kategori}`, { method: 'DELETE' });
    flashNotice(`Kategori "${k.nama_kategori}" diperbarui.`);
    onRefresh();
  };

  const handleSaveCatalogCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/pengaturan', {
      method: 'PUT',
      body: JSON.stringify(catalogCfg),
    });
    flashNotice('Tampilan etalase & banner katalog berhasil diperbarui.');
    onRefresh();
  };

  const filteredProduk = produk.filter((p) => {
    if (!showInactive && p.status !== 'AKTIF') return false;
    if (filterKat !== 'ALL' && p.id_kategori !== filterKat) return false;
    if (searchProduk.trim()) {
      const q = searchProduk.trim().toLowerCase();
      return (
        p.nama_produk.toLowerCase().includes(q) ||
        p.kode_produk.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.nama_kategori.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Kustomisasi Katalog, Produk & Kategori</h1>
          <p className="text-sm text-slate-500">
            Ubah produk, foto custom, kategori etalase, banner hero, dan tata letak katalog sesuai kebutuhan koperasi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('beranda')}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 whitespace-nowrap"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Lihat Etalase
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              exportToExcel(
                'Katalog_Produk',
                produk.map((p) => ({
                  Kode: p.kode_produk,
                  Barcode: p.barcode,
                  Nama: p.nama_produk,
                  Kategori: p.nama_kategori,
                  Harga_Normal: p.harga_normal,
                  Harga_Anggota: p.harga_anggota,
                  Harga_Promo: p.harga_promo || 0,
                  Stok: p.stok,
                  Terjual: p.terjual,
                  Status: p.status,
                })),
                'Produk-Koperasi'
              )
            }
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Download className="h-4 w-4 text-emerald-700" />
            Export Excel
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          {notice}
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5">
        <button
          type="button"
          onClick={() => setSubTab('PRODUK')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            subTab === 'PRODUK' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          Daftar & Edit Produk ({produk.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('KATEGORI')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            subTab === 'KATEGORI' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Tag className="h-3.5 w-3.5" />
          Kelola Kategori ({kategori.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('ETALASE')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            subTab === 'ETALASE' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Tampilan Etalase & Banner
        </button>
      </div>

      {/* TAB 1: PRODUK */}
      {subTab === 'PRODUK' && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchProduk}
                onChange={(e) => setSearchProduk(e.target.value)}
                placeholder="Cari nama produk, SKU, atau barcode..."
                className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
              />
              <select
                value={filterKat}
                onChange={(e) => setFilterKat(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                <option value="ALL">Semua Kategori</option>
                {kategori.map((k) => (
                  <option key={k.id_kategori} value={k.id_kategori}>
                    {k.nama_kategori}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                Tampilkan nonaktif
              </label>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showAddForm ? 'Tutup Form Tambah' : 'Tambah Produk Baru'}
            </button>
          </div>

          {/* Collapsible Add Product Form */}
          {showAddForm && (
            <form onSubmit={handleAddProduk} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <h2 className="font-display text-base font-bold text-slate-900">Tambah Produk Baru ke Katalog</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Nama Produk *</label>
                  <input
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Mis. Set Mangkuk Keramik 6 Pcs"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Kode SKU (opsional)</label>
                  <input
                    type="text"
                    value={kode}
                    onChange={(e) => setKode(e.target.value)}
                    placeholder="Otomatis jika kosong"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Barcode (opsional)</label>
                  <input
                    type="text"
                    value={barcodeBaru}
                    onChange={(e) => setBarcodeBaru(e.target.value)}
                    placeholder="Otomatis jika kosong"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Kategori</label>
                  <select
                    value={idKat}
                    onChange={(e) => setIdKat(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    {kategori.map((k) => (
                      <option key={k.id_kategori} value={k.id_kategori}>
                        {k.nama_kategori}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Harga Normal (Rp) *</label>
                  <input
                    type="number"
                    required
                    value={hargaNormal}
                    onChange={(e) => setHargaNormal(e.target.value)}
                    placeholder="120000"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Harga Anggota (Rp)</label>
                  <input
                    type="number"
                    value={hargaAnggota}
                    onChange={(e) => setHargaAnggota(e.target.value)}
                    placeholder="Sama dengan harga normal jika kosong"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Harga Promo (Rp, opsional)</label>
                  <input
                    type="number"
                    value={hargaPromo}
                    onChange={(e) => setHargaPromo(e.target.value)}
                    placeholder="Kosongkan jika tidak promo"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Stok Awal *</label>
                  <input
                    type="number"
                    required
                    value={stok}
                    onChange={(e) => setStok(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Satuan</label>
                  <input
                    type="text"
                    value={satuan}
                    onChange={(e) => setSatuan(e.target.value)}
                    placeholder="Pcs / Set / Kg / Unit"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-600">Deskripsi Produk</label>
                <textarea
                  rows={2}
                  value={deskripsiBaru}
                  onChange={(e) => setDeskripsiBaru(e.target.value)}
                  placeholder="Tulis spesifikasi, bahan, garansi, atau keunggulan produk..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <ImagePickerField
                label="Foto Produk (Upload Sendiri, Tempel URL, atau Pilih Preset)"
                value={fotoUrl}
                onChange={setFotoUrl}
                presets={IMAGE_PRESETS}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <select
                    value={idSup}
                    onChange={(e) => setIdSup(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  >
                    {supplier.map((s) => (
                      <option key={s.id_supplier} value={s.id_supplier}>
                        Supplier: {s.nama_supplier}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-slate-700">
                    <input type="checkbox" checked={unggulan} onChange={(e) => setUnggulan(e.target.checked)} />
                    Tampilkan di Unggulan
                  </label>
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Simpan Produk Baru
                </button>
              </div>
            </form>
          )}

          {/* Product Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-semibold">Foto</th>
                    <th className="py-2 pr-4 font-semibold">SKU / Barcode</th>
                    <th className="py-2 pr-4 font-semibold">Nama Produk</th>
                    <th className="py-2 pr-4 text-right font-semibold">Normal</th>
                    <th className="py-2 pr-4 text-right font-semibold">Anggota / Promo</th>
                    <th className="py-2 pr-4 text-right font-semibold">Stok</th>
                    <th className="py-2 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProduk.map((p) => (
                    <tr key={p.id_produk} className={`hover:bg-slate-50 ${p.status === 'NONAKTIF' ? 'opacity-60' : ''}`}>
                      <td className="py-2.5 pr-3">
                        <div className="h-11 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          <ProductImage src={p.foto_url} alt={p.nama_produk} className="h-full w-full object-cover" />
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 font-mono-num">
                        <div className="font-semibold text-slate-900">{p.kode_produk}</div>
                        <div className="text-[11px] text-slate-400">{p.barcode}</div>
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span>{p.nama_produk}</span>
                          {p.status === 'NONAKTIF' && (
                            <span className="text-[10px] font-bold uppercase text-rose-600">(Nonaktif)</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.nama_kategori}
                          {p.unggulan ? ' · Unggulan' : ''}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono-num">{formatRupiah(p.harga_normal)}</td>
                      <td className="py-2.5 pr-4 text-right font-mono-num">
                        <div className="font-bold text-emerald-700">{formatRupiah(p.harga_anggota)}</div>
                        {p.harga_promo && (
                          <div className="text-[11px] font-semibold text-amber-600">
                            Promo {formatRupiah(p.harga_promo)}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono-num font-semibold">
                        {p.stok} <span className="font-normal text-slate-400">{p.satuan}</span>
                      </td>
                      <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setEditingProd({ ...p })}
                          className="inline-flex items-center gap-1 rounded border border-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrModalProd(p)}
                          className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <QrCode className="h-3 w-3" />
                          QR
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleProdukStatus(p)}
                          className={`inline-flex items-center rounded border px-2 py-1 text-[11px] font-semibold ${
                            p.status === 'AKTIF'
                              ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {p.status === 'AKTIF' ? <Trash2 className="h-3.5 w-3.5" /> : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KATEGORI */}
      {subTab === 'KATEGORI' && (
        <div className="space-y-5">
          <form onSubmit={handleAddKat} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900">Tambah Kategori Katalog</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                required
                value={katBaru}
                onChange={(e) => setKatBaru(e.target.value)}
                placeholder="Nama kategori baru..."
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
              />
              <input
                type="text"
                value={katDescBaru}
                onChange={(e) => setKatDescBaru(e.target.value)}
                placeholder="Deskripsi singkat kategori (opsional)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Simpan Kategori Baru
              </button>
            </div>
          </form>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Urutan</th>
                    <th className="py-2 pr-4 font-semibold">Nama Kategori</th>
                    <th className="py-2 pr-4 font-semibold">Deskripsi</th>
                    <th className="py-2 pr-4 text-right font-semibold">Produk</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...kategori]
                    .sort((a, b) => a.urutan - b.urutan)
                    .map((k) => {
                      const count = produk.filter((p) => p.id_kategori === k.id_kategori && p.status === 'AKTIF').length;
                      return (
                        <tr key={k.id_kategori} className="hover:bg-slate-50">
                          <td className="py-2.5 pr-4 font-mono-num font-bold text-slate-700">#{k.urutan}</td>
                          <td className="py-2.5 pr-4 font-semibold text-slate-900">{k.nama_kategori}</td>
                          <td className="py-2.5 pr-4 text-slate-600">{k.deskripsi || '-'}</td>
                          <td className="py-2.5 pr-4 text-right font-mono-num">{count} item</td>
                          <td className="py-2.5 pr-4">
                            <span
                              className={`text-xs font-semibold ${
                                k.status === 'AKTIF' ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {k.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-right space-x-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setEditingKat({ ...k })}
                              className="inline-flex items-center gap-1 rounded border border-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKat(k)}
                              className="inline-flex items-center rounded border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                            >
                              {count > 0 ? 'Nonaktifkan' : 'Hapus'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ETALASE & BANNER CUSTOMIZER */}
      {subTab === 'ETALASE' && (
        <form onSubmit={handleSaveCatalogCustomization} className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">Kustomisasi Etalase & Banner Katalog</h2>
            <p className="text-xs text-slate-500">
              Atur teks promosi utama, foto banner etalase, urutan default produk, serta jumlah kolom grid di Beranda.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Judul Utama Banner Katalog</label>
              <input
                type="text"
                required
                value={catalogCfg.katalog_hero_judul}
                onChange={(e) => setCatalogCfg({ ...catalogCfg, katalog_hero_judul: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Subjudul / Deskripsi Banner</label>
              <textarea
                rows={2}
                value={catalogCfg.katalog_hero_subjudul}
                onChange={(e) => setCatalogCfg({ ...catalogCfg, katalog_hero_subjudul: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <ImagePickerField
              label="Foto Banner Hero Etalase"
              value={catalogCfg.katalog_hero_foto}
              onChange={(url) => setCatalogCfg({ ...catalogCfg, katalog_hero_foto: url })}
              presets={HERO_PRESETS}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Urutan Default Katalog</label>
                <select
                  value={catalogCfg.katalog_urutan_default}
                  onChange={(e) =>
                    setCatalogCfg({
                      ...catalogCfg,
                      katalog_urutan_default: e.target.value as PengaturanKoperasi['katalog_urutan_default'],
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="TERBARU">Terbaru Ditambahkan</option>
                  <option value="TERLARIS">Paling Laris (Terjual Terbanyak)</option>
                  <option value="TERMURAH">Harga Anggota Termurah</option>
                  <option value="NAMA">Nama Produk (A – Z)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Kolom Grid Katalog (Desktop)</label>
                <select
                  value={catalogCfg.katalog_kolom_desktop}
                  onChange={(e) =>
                    setCatalogCfg({
                      ...catalogCfg,
                      katalog_kolom_desktop: Number(e.target.value) === 3 ? 3 : 4,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value={4}>4 Kolom (Standar Marketplace)</option>
                  <option value={3}>3 Kolom (Kartu Lebih Besar)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={catalogCfg.katalog_tampil_badge_diskon}
                onChange={(e) =>
                  setCatalogCfg({ ...catalogCfg, katalog_tampil_badge_diskon: e.target.checked })
                }
              />
              Tampilkan badge persentase diskon (-%) pada kartu produk
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Simpan Kustomisasi Etalase
            </button>
          </div>
        </form>
      )}

      {/* Edit Product Modal */}
      {editingProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveEditProduk}
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 my-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">Edit Detail Produk</h3>
                <p className="font-mono-num text-xs text-slate-500">{editingProd.id_produk}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProd(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={editingProd.nama_produk}
                  onChange={(e) => setEditingProd({ ...editingProd, nama_produk: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Kode SKU</label>
                <input
                  type="text"
                  required
                  value={editingProd.kode_produk}
                  onChange={(e) => setEditingProd({ ...editingProd, kode_produk: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Barcode</label>
                <input
                  type="text"
                  required
                  value={editingProd.barcode}
                  onChange={(e) => setEditingProd({ ...editingProd, barcode: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Kategori</label>
                <select
                  value={editingProd.id_kategori}
                  onChange={(e) => setEditingProd({ ...editingProd, id_kategori: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  {kategori.map((k) => (
                    <option key={k.id_kategori} value={k.id_kategori}>
                      {k.nama_kategori}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Supplier</label>
                <select
                  value={editingProd.id_supplier}
                  onChange={(e) => setEditingProd({ ...editingProd, id_supplier: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  {supplier.map((s) => (
                    <option key={s.id_supplier} value={s.id_supplier}>
                      {s.nama_supplier}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Harga Normal (Rp)</label>
                <input
                  type="number"
                  required
                  value={editingProd.harga_normal}
                  onChange={(e) => setEditingProd({ ...editingProd, harga_normal: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Harga Anggota (Rp)</label>
                <input
                  type="number"
                  required
                  value={editingProd.harga_anggota}
                  onChange={(e) => setEditingProd({ ...editingProd, harga_anggota: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Harga Promo (Rp, opsional)</label>
                <input
                  type="number"
                  value={editingProd.harga_promo ?? ''}
                  onChange={(e) =>
                    setEditingProd({
                      ...editingProd,
                      harga_promo: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="Kosongkan jika tidak promo"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Stok</label>
                  <input
                    type="number"
                    required
                    value={editingProd.stok}
                    onChange={(e) => setEditingProd({ ...editingProd, stok: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Satuan</label>
                  <input
                    type="text"
                    required
                    value={editingProd.satuan}
                    onChange={(e) => setEditingProd({ ...editingProd, satuan: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Deskripsi Produk</label>
                <textarea
                  rows={2}
                  value={editingProd.deskripsi}
                  onChange={(e) => setEditingProd({ ...editingProd, deskripsi: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
            </div>

            <ImagePickerField
              label="Foto Produk (Upload Sendiri, URL Custom, atau Preset)"
              value={editingProd.foto_url}
              onChange={(url) => setEditingProd({ ...editingProd, foto_url: url })}
              presets={IMAGE_PRESETS}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingProd.unggulan}
                    onChange={(e) => setEditingProd({ ...editingProd, unggulan: e.target.checked })}
                  />
                  Produk Unggulan
                </label>
                <select
                  value={editingProd.status}
                  onChange={(e) =>
                    setEditingProd({
                      ...editingProd,
                      status: e.target.value === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF',
                    })
                  }
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold"
                >
                  <option value="AKTIF">Status: AKTIF</option>
                  <option value="NONAKTIF">Status: NONAKTIF</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProd(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingKat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <form
            onSubmit={handleSaveEditKat}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-base font-bold text-slate-900">Edit Kategori</h3>
              <button type="button" onClick={() => setEditingKat(null)} className="rounded p-1 text-slate-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nama Kategori</label>
              <input
                type="text"
                required
                value={editingKat.nama_kategori}
                onChange={(e) => setEditingKat({ ...editingKat, nama_kategori: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Deskripsi</label>
              <input
                type="text"
                value={editingKat.deskripsi}
                onChange={(e) => setEditingKat({ ...editingKat, deskripsi: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Urutan Tampil</label>
                <input
                  type="number"
                  min={1}
                  value={editingKat.urutan}
                  onChange={(e) => setEditingKat({ ...editingKat, urutan: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
                <select
                  value={editingKat.status}
                  onChange={(e) =>
                    setEditingKat({
                      ...editingKat,
                      status: e.target.value === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF',
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="AKTIF">AKTIF</option>
                  <option value="NONAKTIF">NONAKTIF</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingKat(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Simpan Kategori
              </button>
            </div>
          </form>
        </div>
      )}

      {qrModalProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <h3 className="font-display text-base font-bold text-slate-900">{qrModalProd.nama_produk}</h3>
            <p className="font-mono-num text-xs text-slate-500">{qrModalProd.kode_produk}</p>
            <div className="mt-4 flex flex-col items-center gap-4">
              <QrCodeCanvas value={`KDP-PROD:${qrModalProd.kode_produk}:${qrModalProd.barcode}`} size={130} />
              <BarcodeSvg value={qrModalProd.barcode} height={44} />
            </div>
            <button
              type="button"
              onClick={() => setQrModalProd(null)}
              className="mt-5 w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const MembersUsersManagerView: React.FC<Pick<MasterDataProps, 'anggota' | 'users' | 'onRefresh'>> = ({
  anggota,
  users,
  onRefresh,
}) => {
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [nik, setNik] = useState('');
  const [alamat, setAlamat] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [qrAnggota, setQrAnggota] = useState<AnggotaRecord | null>(null);

  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffNama, setStaffNama] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('KASIR');

  const handleAddAnggota = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/anggota', {
      method: 'POST',
      body: JSON.stringify({ nama, no_hp: noHp, nik, alamat, username, password }),
    });
    setNama(''); setNoHp(''); setNik(''); setAlamat(''); setUsername(''); setPassword('');
    onRefresh();
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        username: staffUsername,
        password: staffPassword,
        nama_lengkap: staffNama,
        role: staffRole,
        email: `${staffUsername}@koperasi.id`,
        no_hp: '-',
      }),
    });
    setStaffUsername(''); setStaffPassword(''); setStaffNama('');
    onRefresh();
  };

  const handleToggleUser = async (id: string) => {
    await apiFetch(`/api/admin/users/${id}/toggle`, { method: 'PATCH' });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Kelola Anggota & Hak Akses Pengguna</h1>
        <p className="text-sm text-slate-500">Registrasi anggota koperasi, kartu QR anggota, serta manajemen akun Admin & Kasir.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleAddAnggota} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="font-display text-base font-bold text-slate-900">Daftarkan Anggota Baru</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input required value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Lengkap" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
            <input required value={noHp} onChange={(e) => setNoHp(e.target.value)} placeholder="Nomor HP" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
            <input value={nik} onChange={(e) => setNik(e.target.value)} placeholder="NIK" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
            <input value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username Login" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password Login" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          </div>
          <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
            Simpan Anggota
          </button>
        </form>

        <form onSubmit={handleAddStaff} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="font-display text-base font-bold text-slate-900">Tambah Akun Pengurus / Kasir</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input required value={staffNama} onChange={(e) => setStaffNama(e.target.value)} placeholder="Nama Lengkap" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
            <select value={staffRole} onChange={(e) => setStaffRole(e.target.value as UserRole)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs">
              <option value="KASIR">Petugas / Kasir</option>
              <option value="ADMIN">Admin Koperasi</option>
            </select>
            <input required value={staffUsername} onChange={(e) => setStaffUsername(e.target.value)} placeholder="Username" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
            <input required type="password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} placeholder="Password" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          </div>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
            Buat Akun Pengguna
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-display text-base font-bold text-slate-900">Daftar Anggota Koperasi ({anggota.length})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-semibold">Kode</th>
                <th className="py-2 pr-4 font-semibold">Nama & Kontak</th>
                <th className="py-2 pr-4 text-right font-semibold">Total Simpanan</th>
                <th className="py-2 pr-4 text-right font-semibold">Limit Kredit</th>
                <th className="py-2 text-right font-semibold">Kartu QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {anggota.map((a) => (
                <tr key={a.id_anggota} className="hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-mono-num font-bold text-slate-900">{a.kode_anggota}</td>
                  <td className="py-2.5 pr-4">
                    <div className="font-semibold text-slate-900">{a.nama}</div>
                    <div className="text-[11px] text-slate-500">{a.no_hp} · {a.alamat}</div>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono-num font-bold text-emerald-700">
                    {formatRupiah(a.saldo_pokok + a.saldo_wajib + a.saldo_sukarela)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono-num">{formatRupiah(a.limit_kredit)}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setQrAnggota(a)}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <QrCode className="h-3 w-3" />
                      Kartu QR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-display text-base font-bold text-slate-900">Daftar Akun Pengguna (RBAC)</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-semibold">Username</th>
                <th className="py-2 pr-4 font-semibold">Nama Lengkap</th>
                <th className="py-2 pr-4 font-semibold">Role</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id_user} className="hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-mono-num font-semibold text-slate-900">{u.username}</td>
                  <td className="py-2.5 pr-4 text-slate-800">{u.nama_lengkap}</td>
                  <td className="py-2.5 pr-4 font-semibold text-emerald-700">{u.role}</td>
                  <td className="py-2.5 pr-4">{u.status}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleUser(u.id_user)}
                      className="rounded border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {u.status === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {qrAnggota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Kartu Anggota Resmi</p>
            <h3 className="mt-1 font-display text-lg font-bold text-slate-900">{qrAnggota.nama}</h3>
            <p className="font-mono-num text-xs text-slate-500">{qrAnggota.kode_anggota}</p>
            <div className="mt-4 flex justify-center">
              <QrCodeCanvas value={qrAnggota.qr_token} size={150} />
            </div>
            <button
              type="button"
              onClick={() => setQrAnggota(null)}
              className="mt-5 w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const SupplierManagerView: React.FC<Pick<MasterDataProps, 'supplier' | 'onRefresh'>> = ({
  supplier,
  onRefresh,
}) => {
  const [nama, setNama] = useState('');
  const [kontak, setKontak] = useState('');
  const [noHp, setNoHp] = useState('');
  const [alamat, setAlamat] = useState('');
  const [kategori, setKategori] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/supplier', {
      method: 'POST',
      body: JSON.stringify({
        nama_supplier: nama,
        kontak_person: kontak,
        no_hp: noHp,
        alamat,
        kategori_pasokan: kategori,
      }),
    });
    setNama(''); setKontak(''); setNoHp(''); setAlamat(''); setKategori('');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Kelola Mitra Supplier</h1>
        <p className="text-sm text-slate-500">Daftar pemasok barang dagangan dan saldo hutang usaha koperasi.</p>
      </div>

      <form onSubmit={handleAdd} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <input required value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Supplier / Gapoktan" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          <input value={kontak} onChange={(e) => setKontak(e.target.value)} placeholder="Kontak Person" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          <input value={noHp} onChange={(e) => setNoHp(e.target.value)} placeholder="Nomor HP" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          <input value={kategori} onChange={(e) => setKategori(e.target.value)} placeholder="Kategori Pasokan" className="rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          <input value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat" className="rounded-lg border border-slate-300 px-3 py-2 text-xs sm:col-span-2" />
        </div>
        <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
          Tambah Supplier
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-semibold">Kode</th>
                <th className="py-2 pr-4 font-semibold">Supplier</th>
                <th className="py-2 pr-4 font-semibold">Pasokan</th>
                <th className="py-2 pr-4 font-semibold">Kontak</th>
                <th className="py-2 text-right font-semibold">Hutang Usaha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supplier.map((s) => (
                <tr key={s.id_supplier} className="hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-mono-num font-bold text-slate-900">{s.kode_supplier}</td>
                  <td className="py-2.5 pr-4 font-semibold text-slate-800">{s.nama_supplier}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{s.kategori_pasokan}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{s.kontak_person} · {s.no_hp}</td>
                  <td className="py-2.5 text-right font-mono-num font-semibold text-amber-700">
                    {formatRupiah(s.hutang_usaha)}
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

export const SettingsAnnouncementsView: React.FC<
  Pick<MasterDataProps, 'pengaturan' | 'pengumuman' | 'onRefresh'>
> = ({ pengaturan, pengumuman, onRefresh }) => {
  const [cfg, setCfg] = useState<PengaturanKoperasi>(pengaturan);
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const handleSaveCfg = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/pengaturan', {
      method: 'PUT',
      body: JSON.stringify(cfg),
    });
    setSavedMsg('Pengaturan profil koperasi berhasil disimpan.');
    onRefresh();
  };

  const handleAddPengumuman = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/pengumuman', {
      method: 'POST',
      body: JSON.stringify({ judul, isi, kategori: 'UMUM', prioritas: 'NORMAL' }),
    });
    setJudul('');
    setIsi('');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Pengaturan Koperasi & Pengumuman</h1>
        <p className="text-sm text-slate-500">Sesuaikan identitas koperasi, bunga pinjaman, rekening bank, QRIS, dan pengumuman anggota.</p>
      </div>

      <form onSubmit={handleSaveCfg} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900">Profil & Kebijakan Koperasi</h2>
        {savedMsg && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            {savedMsg}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Nama Koperasi</label>
            <input value={cfg.nama_koperasi} onChange={(e) => setCfg({ ...cfg, nama_koperasi: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Branding</label>
            <input value={cfg.branding} onChange={(e) => setCfg({ ...cfg, branding: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Alamat Koperasi</label>
            <input value={cfg.alamat} onChange={(e) => setCfg({ ...cfg, alamat: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Bunga Pinjaman (%/bln)</label>
            <input type="number" step="0.1" value={cfg.bunga_pinjaman_persen_per_bulan} onChange={(e) => setCfg({ ...cfg, bunga_pinjaman_persen_per_bulan: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Nama Bank & Rekening</label>
            <input value={`${cfg.bank_nama} - ${cfg.bank_rekening}`} onChange={(e) => {
              const [b, ...rest] = e.target.value.split('-');
              setCfg({ ...cfg, bank_nama: b.trim(), bank_rekening: rest.join('-').trim() });
            }} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Merchant ID QRIS</label>
            <input value={cfg.qris_merchant_id} onChange={(e) => setCfg({ ...cfg, qris_merchant_id: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-num text-xs" />
          </div>
        </div>
        <button type="submit" className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
          Simpan Pengaturan
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900">Terbitkan Pengumuman Baru</h2>
        <form onSubmit={handleAddPengumuman} className="space-y-3">
          <input required value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul Pengumuman" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          <textarea required rows={3} value={isi} onChange={(e) => setIsi(e.target.value)} placeholder="Isi pesan pengumuman untuk anggota..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs" />
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
            Publikasikan Pengumuman
          </button>
        </form>

        <div className="divide-y divide-slate-100 border-t border-slate-200 pt-3">
          {pengumuman.map((p) => (
            <div key={p.id_pengumuman} className="py-2.5">
              <p className="text-sm font-semibold text-slate-900">{p.judul}</p>
              <p className="mt-0.5 text-xs text-slate-600">{p.isi}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AuditBackupView: React.FC<Pick<MasterDataProps, 'logs'>> = ({
  logs,
}) => {
  const [page, setPage] = useState(1);
  const perPage = 12;
  const totalPages = Math.max(1, Math.ceil(logs.length / perPage));
  const slice = logs.slice((page - 1) * perPage, page * perPage);

  const handleDownloadBackup = async () => {
    const token = getStoredToken();
    const res = await fetch('/api/admin/backup', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-koperasi-digital-pro-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Audit Log & Backup Database</h1>
          <p className="text-sm text-slate-500">Jejak keamanan seluruh transaksi dan ekspor cadangan database 16 tabel.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <Download className="h-4 w-4" />
            Backup Database (JSON)
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Shield className="h-4 w-4 text-emerald-700" />
          Menampilkan halaman {page} dari {totalPages} ({logs.length} aktivitas tercatat)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-semibold">Waktu</th>
                <th className="py-2 pr-4 font-semibold">User / Role</th>
                <th className="py-2 pr-4 font-semibold">Modul / Aksi</th>
                <th className="py-2 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slice.map((l) => (
                <tr key={l.id_log} className="hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-mono-num text-slate-500 whitespace-nowrap">{formatDateTime(l.timestamp)}</td>
                  <td className="py-2.5 pr-4 font-medium text-slate-900 whitespace-nowrap">{l.username} · {l.role}</td>
                  <td className="py-2.5 pr-4 font-mono-num text-emerald-700 whitespace-nowrap">{l.modul} / {l.aksi}</td>
                  <td className="py-2.5 text-slate-600">{l.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
};
